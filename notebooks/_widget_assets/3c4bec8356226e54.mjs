// === MyST static-export shim begins ===
function __mystBase64ToArrayBuffer(b64) {
  const bin = (typeof atob === 'function') ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const len = bin.length;
  const buf = new ArrayBuffer(len);
  const view = new Uint8Array(buf);
  for (let i = 0; i < len; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

// Port of put_buffers from @jupyter-widgets/base/src/utils.ts. Splices DataView
// instances into a state object at the addressed paths. Mutates state in place.
function __mystPutBuffers(state, bufferPaths, buffers) {
  for (let i = 0; i < bufferPaths.length; i++) {
    const path = bufferPaths[i];
    let buf = buffers[i];
    if (!(buf instanceof DataView)) {
      buf = new DataView(buf instanceof ArrayBuffer ? buf : buf.buffer);
    }
    let obj = state;
    for (let j = 0; j < path.length - 1; j++) obj = obj[path[j]];
    obj[path[path.length - 1]] = buf;
  }
}

function __mystApplyBuffers(state, buffersList) {
  if (!buffersList || buffersList.length === 0) return;
  const paths = buffersList.map(function (b) { return b.path; });
  const arrayBuffers = buffersList.map(function (b) { return __mystBase64ToArrayBuffer(b.data); });
  __mystPutBuffers(state, paths, arrayBuffers);
}

// Lightweight model proxy used for sub-models referenced via IPY_MODEL_<id>.
// Implements the subset of WidgetModel that anywidget-style frontends typically use.
class __MystSubModel {
  constructor(state, buffers) {
    // Deep-clone state, replacing nulls at buffer paths with DataViews after.
    this._state = JSON.parse(JSON.stringify(state || {}));
    __mystApplyBuffers(this._state, buffers || []);
    this._listeners = new Map();
  }
  get(key) { return this._state[key]; }
  set(key, value) {
    const prev = this._state[key];
    this._state[key] = value;
    this._fire('change:' + key, { name: key, old: prev, new: value });
    this._fire('change', { name: key, old: prev, new: value });
  }
  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(fn);
    return this;
  }
  off(event, fn) {
    const arr = this._listeners.get(event);
    if (!arr) return this;
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
    return this;
  }
  _fire(event, payload) {
    const arr = this._listeners.get(event);
    if (!arr) return;
    for (const fn of arr.slice()) {
      try { fn(payload); } catch (e) { console.error('[myst-shim] listener error', e); }
    }
  }
  save_changes() {}
  send() {}
  // Convenience for places that expect a widget_manager on every model.
  get widget_manager() { return this.__widget_manager; }
  set widget_manager(wm) { this.__widget_manager = wm; }
}

// React's createRoot() wipes the el's children when mounting, so a CSS <link>
// the renderer appended into el gets blown away (visible with lonboard.Map,
// where Tailwind's .h-full / .flex / .w-full stop applying and deck.gl's
// container expands unbounded). Workaround: inject our own <style> as a sibling
// of el (directly into the shadow root). The CSS text was inlined into the model
// by the static-export plugin so the runtime URL doesn't matter.
function __mystEnsureShadowCss(el, cssText, cacheKey) {
  if (!el || !cssText) return;
  const root = el.getRootNode && el.getRootNode();
  if (!root || root === document) return;
  const key = cacheKey || cssText.length.toString();
  if (root.querySelector('style[data-myst-css="' + key + '"]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-myst-css', key);
  style.textContent = cssText;
  root.appendChild(style);
}

function __mystSetupModel(model) {
  if (!model || model.__mystSetupDone) return;
  model.__mystSetupDone = true;

  // (1) Patch methods that MystAnyModel stubs to throw "not implemented yet". These are
  //     methods on the prototype (regular data properties), so direct assignment shadows
  //     them on the instance. save_changes/send are no-ops with no kernel; off is a no-op
  //     since the page is render-once and doesn't need real listener cleanup.
  model.save_changes = function () {};
  model.send = function () {};
  model.off = function () {};

  // (2) Hydrate root buffers into the model's top-level state via mutation.
  // We don't have direct access to MystAnyModel's internal _state map here, so we
  // walk via model.get/set on the top-level keys: read top-level value, mutate the
  // nested object in place, set it back. This works because put_buffers operates
  // on the same object reference.
  const rootBuffers = (typeof model.get === 'function' && model.get('_myst_buffers')) || [];
  if (Array.isArray(rootBuffers) && rootBuffers.length > 0) {
    const grouped = new Map();
    for (const buf of rootBuffers) {
      const topKey = buf.path[0];
      if (!grouped.has(topKey)) grouped.set(topKey, []);
      grouped.get(topKey).push(buf);
    }
    for (const [topKey, bufs] of grouped.entries()) {
      const topVal = model.get(topKey);
      if (topVal == null) continue;
      const localPaths = bufs.map(function (b) { return b.path.slice(1); });
      const arrayBuffers = bufs.map(function (b) { return __mystBase64ToArrayBuffer(b.data); });
      // Special-case: when the entire top-level value is the buffer (path length 1),
      // we have to set() it back since there's nothing to mutate in place.
      if (bufs.length === 1 && bufs[0].path.length === 1) {
        model.set(topKey, new DataView(arrayBuffers[0]));
      } else {
        __mystPutBuffers(topVal, localPaths, arrayBuffers);
      }
    }
  }

  // (3) Build sub-model registry from _myst_submodels and attach a widget_manager stub.
  const submodels = (typeof model.get === 'function' && model.get('_myst_submodels')) || {};
  const cache = new Map();
  const wm = {
    get_model: function (id) {
      if (cache.has(id)) return Promise.resolve(cache.get(id));
      const entry = submodels[id];
      if (!entry) return Promise.reject(new Error('[myst-shim] unknown sub-model: ' + id));
      const proxy = new __MystSubModel(entry.state, entry.buffers);
      proxy.widget_manager = wm;
      proxy.model_id = id;
      proxy.name = entry.model_name;
      proxy.module = entry.model_module;
      cache.set(id, proxy);
      return Promise.resolve(proxy);
    },
    resolve_url: function (url) { return Promise.resolve(url); },
  };
  // MystAnyModel exposes widget_manager as a getter-only property on its prototype
  // that throws "does not exist". Plain assignment is silently dropped (no setter);
  // we install a data property on the instance to shadow the prototype getter.
  Object.defineProperty(model, 'widget_manager', {
    configurable: true,
    writable: true,
    value: wm,
  });
}
// === MyST static-export shim ends ===

// Counter widget JavaScript module
// Demonstrates basic anywidget patterns and inter-widget communication

// Global widget registry for inter-widget communication
window.__widgetRegistry = window.__widgetRegistry || new Map();
window.__widgetEvents = window.__widgetEvents || new EventTarget();

function render({ model, el }) {
    // Register this widget's render model in the global registry
    // (must happen in render, not initialize, because the render proxy is the live one)
    const widgetId = model.get('widget_id');
    window.__widgetRegistry.set(widgetId, model);
    model.on('destroy', () => {
        window.__widgetRegistry.delete(widgetId);
    });
    window.__widgetEvents.dispatchEvent(new CustomEvent('widget-registered', {
        detail: { widgetId }
    }));

    // Create widget container
    const container = document.createElement('div');
    container.className = 'counter-widget';
    
    // Create label
    const label = document.createElement('h3');
    label.textContent = model.get('label');
    container.appendChild(label);
    
    // Create value display
    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'counter-value';
    valueDisplay.textContent = model.get('value');
    container.appendChild(valueDisplay);
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'counter-buttons';
    
    // Decrement button
    const decrementBtn = document.createElement('button');
    decrementBtn.textContent = '-';
    decrementBtn.onclick = () => {
        const currentValue = model.get('value');
        model.set('value', currentValue - 1);
        model.save_changes();
        
        // Emit custom event for inter-widget communication
        window.__widgetEvents.dispatchEvent(new CustomEvent('counter-changed', {
            detail: {
                widgetId: model.get('widget_id'),
                value: currentValue - 1,
                action: 'decrement'
            }
        }));
    };
    buttonContainer.appendChild(decrementBtn);
    
    // Increment button
    const incrementBtn = document.createElement('button');
    incrementBtn.textContent = '+';
    incrementBtn.onclick = () => {
        const currentValue = model.get('value');
        model.set('value', currentValue + 1);
        model.save_changes();
        
        // Emit custom event for inter-widget communication
        window.__widgetEvents.dispatchEvent(new CustomEvent('counter-changed', {
            detail: {
                widgetId: model.get('widget_id'),
                value: currentValue + 1,
                action: 'increment'
            }
        }));
    };
    buttonContainer.appendChild(incrementBtn);
    
    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset';
    resetBtn.onclick = () => {
        model.set('value', 0);
        model.save_changes();
        
        // Emit custom event
        window.__widgetEvents.dispatchEvent(new CustomEvent('counter-changed', {
            detail: {
                widgetId: model.get('widget_id'),
                value: 0,
                action: 'reset'
            }
        }));
    };
    buttonContainer.appendChild(resetBtn);
    
    container.appendChild(buttonContainer);
    
    // Add info section
    const infoSection = document.createElement('div');
    infoSection.className = 'counter-info';
    infoSection.innerHTML = `<small>Widget ID: ${model.get('widget_id')}</small>`;
    container.appendChild(infoSection);
    
    // Update display when value changes
    model.on('change:value', () => {
        valueDisplay.textContent = model.get('value');
        valueDisplay.classList.add('value-changed');
        setTimeout(() => {
            valueDisplay.classList.remove('value-changed');
        }, 300);
    });
    
    // Update label when it changes
    model.on('change:label', () => {
        label.textContent = model.get('label');
    });
    
    // Listen for events from other widgets
    const handleExternalEvent = (event) => {
        // Only respond to events from other widgets
        if (event.detail.widgetId !== model.get('widget_id')) {
            console.log(`Widget ${model.get('widget_id')} received event from ${event.detail.widgetId}`);
            // Could implement synchronized behavior here
        }
    };
    
    window.__widgetEvents.addEventListener('counter-changed', handleExternalEvent);
    
    // Clean up event listener on destroy
    el.addEventListener('remove', () => {
        window.__widgetEvents.removeEventListener('counter-changed', handleExternalEvent);
    });
    
    // Append to element
    el.appendChild(container);
}
const __mystUserDefault = {  render  };

// === MyST static-export shim re-export begins ===
const __mystOrigInit = (typeof __mystUserDefault === 'object' && __mystUserDefault) ? __mystUserDefault.initialize : (typeof initialize === 'function' ? initialize : undefined);
const __mystOrigRender = (typeof __mystUserDefault === 'object' && __mystUserDefault) ? __mystUserDefault.render : (typeof render === 'function' ? render : undefined);

export default {
  initialize(args) { __mystSetupModel(args.model); return __mystOrigInit?.(args); },
  render(args) {
    __mystSetupModel(args.model);
    // Re-inject the CSS as a <style> sibling of args.el so it survives the user's
    // React/DOM-replacing render. CSS text was inlined into the model by the
    // static-export plugin.
    if (args.model && args.model.get) {
      __mystEnsureShadowCss(args.el, args.model.get('_myst_css_text'), args.model.get('_myst_css_key'));
    }
    return __mystOrigRender?.(args);
  },
};
// === MyST static-export shim re-export ends ===
