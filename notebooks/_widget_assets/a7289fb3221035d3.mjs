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

// Cross-widget interop registry. Populated by __mystSetupModel for each root and
// every transitively-referenced sub-model. Keyed by widget_id (user-set), by
// _anywidget_id (Python class path, e.g. "lonboard._map.Map"), and by model_id
// (UUID from the kernel). Lookups can use any of these keys.
function __mystRegistry() {
  if (!window.__myst_widgets) {
    const _byKey = new Map();
    const _all = [];
    window.__myst_widgets = {
      register: function (model, keys) {
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          if (k && !_byKey.has(k)) _byKey.set(k, model);
        }
        if (_all.indexOf(model) < 0) _all.push(model);
      },
      get: function (key) { return _byKey.get(key); },
      findFirst: function (pred) { return _all.find(pred); },
      filter: function (pred) { return _all.filter(pred); },
      all: function () { return _all.slice(); },
    };
  }
  return window.__myst_widgets;
}

function __mystKeysForState(state, rootId) {
  const keys = [
    rootId,
    state && state.widget_id,
    state && state._anywidget_id,
  ];
  // Alias by lonboard layer/control type so binder widgets can target a layer
  // without knowing its UUID. Note: only the FIRST widget with a given
  // _layer_type / _control_type wins the alias slot.
  if (state && state._layer_type) keys.push('_layer_type:' + state._layer_type);
  if (state && state._control_type) keys.push('_control_type:' + state._control_type);
  return keys;
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

  // (3) Build sub-model registry from _myst_submodels and attach a widget_manager
  //     stub. We pre-create every proxy at setup time (rather than lazily on first
  //     get_model call) so the cross-widget registry is fully populated before any
  //     widget on the page calls into it (e.g. a binder widget looking up a target).
  const submodels = (typeof model.get === 'function' && model.get('_myst_submodels')) || {};
  const cache = new Map();
  const reg = __mystRegistry();
  for (const [id, entry] of Object.entries(submodels)) {
    const proxy = new __MystSubModel(entry.state, entry.buffers);
    proxy.model_id = id;
    proxy.name = entry.model_name;
    proxy.module = entry.model_module;
    cache.set(id, proxy);
    reg.register(proxy, __mystKeysForState(entry.state, id));
  }
  const wm = {
    get_model: function (id) {
      if (cache.has(id)) return Promise.resolve(cache.get(id));
      // Late-arrival fallback: build the proxy if for some reason it wasn't pre-created.
      const entry = submodels[id];
      if (!entry) return Promise.reject(new Error('[myst-shim] unknown sub-model: ' + id));
      const proxy = new __MystSubModel(entry.state, entry.buffers);
      proxy.widget_manager = wm;
      proxy.model_id = id;
      proxy.name = entry.model_name;
      proxy.module = entry.model_module;
      cache.set(id, proxy);
      reg.register(proxy, __mystKeysForState(entry.state, id));
      return Promise.resolve(proxy);
    },
    resolve_url: function (url) { return Promise.resolve(url); },
  };
  // Wire widget_manager onto every sub-model proxy (post-cache so we don't capture
  // wm in the loop above before it's defined).
  for (const proxy of cache.values()) proxy.widget_manager = wm;
  // MystAnyModel exposes widget_manager as a getter-only property on its prototype
  // that throws "does not exist". Plain assignment is silently dropped (no setter);
  // we install a data property on the instance to shadow the prototype getter.
  Object.defineProperty(model, 'widget_manager', {
    configurable: true,
    writable: true,
    value: wm,
  });

  // (4) Register the root model in the cross-widget registry. Pull keys from the
  //     private _myst_* fields we stashed in buildInitialModel.
  const rootId = (typeof model.get === 'function' && model.get('_myst_root_id')) || null;
  const widgetIdField = (typeof model.get === 'function' && model.get('widget_id')) || null;
  const anywidgetIdField = (typeof model.get === 'function' && model.get('_myst_anywidget_id')) || null;
  reg.register(model, [rootId, widgetIdField, anywidgetIdField]);
}
// === MyST static-export shim ends ===

// Linked counter widget that demonstrates inter-widget communication

// Ensure globals exist
window.__widgetRegistry = window.__widgetRegistry || new Map();
window.__widgetEvents = window.__widgetEvents || new EventTarget();

function render({ model, el }) {
    // Register this widget's render model in the global registry
    const widgetId = model.get('widget_id');
    console.log(`[${widgetId}] render() called, registering in registry (size before: ${window.__widgetRegistry.size})`);
    window.__widgetRegistry.set(widgetId, model);
    model.on('destroy', () => {
        window.__widgetRegistry.delete(widgetId);
    });
    window.__widgetEvents.dispatchEvent(new CustomEvent('widget-registered', {
        detail: { widgetId }
    }));

    const container = document.createElement('div');
    container.className = 'linked-counter-widget';
    
    // Header with label
    const header = document.createElement('div');
    header.className = 'widget-header';
    header.innerHTML = `
        <h3>${model.get('label')}</h3>
        <span class="widget-id">${model.get('widget_id')}</span>
    `;
    container.appendChild(header);
    
    // Value display
    const valueSection = document.createElement('div');
    valueSection.className = 'value-section';
    valueSection.innerHTML = `
        <div class="main-value">
            <span class="value-label">Value:</span>
            <span class="value-display">${model.get('value')}</span>
        </div>
        <div class="linked-value">
            <span class="value-label">Linked:</span>
            <span class="linked-display">${model.get('linked_value')}</span>
        </div>
    `;
    container.appendChild(valueSection);
    
    // Controls
    const controls = document.createElement('div');
    controls.className = 'controls';
    
    const decrementBtn = document.createElement('button');
    decrementBtn.textContent = '-';
    decrementBtn.onclick = () => {
        model.set('value', model.get('value') - 1);
        model.save_changes();
    };
    
    const incrementBtn = document.createElement('button');
    incrementBtn.textContent = '+';
    incrementBtn.onclick = () => {
        model.set('value', model.get('value') + 1);
        model.save_changes();
    };
    
    controls.appendChild(decrementBtn);
    controls.appendChild(incrementBtn);
    container.appendChild(controls);
    
    // Link configuration
    const linkConfig = document.createElement('div');
    linkConfig.className = 'link-config';
    linkConfig.innerHTML = `
        <div class="config-row">
            <label>Link to:</label>
            <input type="text" class="link-to-input" value="${model.get('link_to')}" placeholder="Widget ID">
        </div>
        <div class="config-row">
            <label>Mode:</label>
            <select class="link-mode-select">
                <option value="mirror" ${model.get('link_mode') === 'mirror' ? 'selected' : ''}>Mirror</option>
                <option value="sum" ${model.get('link_mode') === 'sum' ? 'selected' : ''}>Sum</option>
                <option value="diff" ${model.get('link_mode') === 'diff' ? 'selected' : ''}>Difference</option>
            </select>
        </div>
    `;
    container.appendChild(linkConfig);
    
    // Status
    const status = document.createElement('div');
    status.className = 'status';
    status.textContent = model.get('status');
    container.appendChild(status);
    
    // Setup event handlers
    const linkToInput = linkConfig.querySelector('.link-to-input');
    const linkModeSelect = linkConfig.querySelector('.link-mode-select');
    
    linkToInput.addEventListener('change', (e) => {
        model.set('link_to', e.target.value);
        model.save_changes();
        updateLinkedValue();
    });
    
    linkModeSelect.addEventListener('change', (e) => {
        model.set('link_mode', e.target.value);
        model.save_changes();
        updateLinkedValue();
    });
    
    // Function to update linked value based on mode
    function updateLinkedValue() {
        const linkTo = model.get('link_to');
        if (!linkTo) return;

        const linkedModel = window.__widgetRegistry?.get(linkTo);
        if (!linkedModel) {
            model.set('status', `Cannot find widget: ${linkTo}`);
            model.save_changes();
            return;
        }

        const mode = model.get('link_mode');
        const myValue = model.get('value');
        // For linked counters, read linked_value (the output); for regular counters, read value
        const hasLinkedValue = linkedModel.get('linked_value') !== undefined;
        const linkedValue = hasLinkedValue ? linkedModel.get('linked_value') : linkedModel.get('value');
        console.log(`[${widgetId}] updateLinkedValue: linkTo=${linkTo}, mode=${mode}, myValue=${myValue}, hasLinkedValue=${hasLinkedValue}, linkedValue=${linkedValue}`);
        
        let newLinkedValue = 0;
        switch(mode) {
            case 'mirror':
                newLinkedValue = linkedValue;
                break;
            case 'sum':
                newLinkedValue = myValue + linkedValue;
                break;
            case 'diff':
                newLinkedValue = myValue - linkedValue;
                break;
        }
        
        model.set('linked_value', newLinkedValue);
        model.set('status', `Linked to ${linkTo} (${mode})`);
        model.save_changes();
    }
    
    // Listen for changes to linked widget
    function setupLinkedListener() {
        const linkTo = model.get('link_to');
        if (!linkTo) { console.log(`[${widgetId}] setupLinkedListener: no link_to`); return; }

        const linkedModel = window.__widgetRegistry?.get(linkTo);
        if (linkedModel) {
            console.log(`[${widgetId}] setupLinkedListener: FOUND ${linkTo} in registry, attaching listeners`);
            linkedModel.on('change:value', updateLinkedValue);
            linkedModel.on('change:linked_value', updateLinkedValue);
            updateLinkedValue();
        } else {
            console.log(`[${widgetId}] setupLinkedListener: ${linkTo} NOT in registry, waiting...`);
            // Target not registered yet — wait for it
            const handler = (event) => {
                if (event.detail.widgetId === linkTo) {
                    console.log(`[${widgetId}] setupLinkedListener: ${linkTo} just registered! Retrying.`);
                    window.__widgetEvents.removeEventListener('widget-registered', handler);
                    setupLinkedListener(); // retry now that it's registered
                }
            };
            window.__widgetEvents.addEventListener('widget-registered', handler);
        }
    }
    
    // Update displays when values change
    model.on('change:value', () => {
        container.querySelector('.value-display').textContent = model.get('value');
        updateLinkedValue();
    });
    
    model.on('change:linked_value', () => {
        container.querySelector('.linked-display').textContent = model.get('linked_value');
    });
    
    model.on('change:status', () => {
        status.textContent = model.get('status');
    });
    
    model.on('change:link_to', () => {
        setupLinkedListener();
    });
    
    // Initial setup
    setupLinkedListener();
    updateLinkedValue();
    
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
