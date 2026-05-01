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

// WidgetBinder: subscribe to a source widget's trait change and write to a
// target widget's trait. Both widgets are looked up via window.__myst_widgets,
// which the static-export shim populates with all root + sub-models on the page.
//
// In a JupyterLab kernel context this widget does nothing useful — Python
// observers are the right tool there. This is for static export, where there's
// no kernel and we need a JS-only binding.

function pollFor(predicate, timeout) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const tick = () => {
            const v = predicate();
            if (v !== undefined && v !== null) return resolve(v);
            if (Date.now() - start > timeout) {
                return reject(new Error("[binder] timeout"));
            }
            setTimeout(tick, 50);
        };
        tick();
    });
}

// Set a value at a dotted path on a target model. For leaf paths we simply
// model.set(key, value). For nested paths (e.g. "view_state.zoom"), we read
// the top-level object, merge the leaf, and set it back so listeners see the
// change as a single update.
function setByPath(model, path, value) {
    const parts = path.split(".");
    if (parts.length === 1) {
        model.set(parts[0], value);
        return;
    }
    const topKey = parts[0];
    const existing = model.get(topKey);
    const next = (existing && typeof existing === "object") ? { ...existing } : {};
    let cursor = next;
    for (let i = 1; i < parts.length - 1; i++) {
        const k = parts[i];
        cursor[k] = (cursor[k] && typeof cursor[k] === "object") ? { ...cursor[k] } : {};
        cursor = cursor[k];
    }
    cursor[parts[parts.length - 1]] = value;
    model.set(topKey, next);
}

function render({ model, el }) {
    const sourceId = model.get("source_widget_id");
    const sourceField = model.get("source_field") || "value";
    const targetId = model.get("target_widget_id");
    const targetField = model.get("target_field");
    const multiplier = model.get("multiplier");
    const offset = model.get("offset");
    const label = model.get("label") || `${sourceId}.${sourceField} → ${targetId}.${targetField}`;

    el.style.fontFamily = "ui-monospace, SFMono-Regular, monospace";
    el.style.fontSize = "12px";
    el.style.padding = "8px 12px";
    el.style.borderRadius = "6px";
    el.style.background = "#f6f8fa";
    el.style.color = "#24292e";
    el.style.border = "1px solid #e1e4e8";
    el.style.maxWidth = "fit-content";

    const status = document.createElement("div");
    el.appendChild(status);
    status.textContent = `🔗 binder: waiting…  (${label})`;

    const reg = window.__myst_widgets;
    if (!reg) {
        status.textContent = "❌ window.__myst_widgets not initialized; binder cannot run";
        return;
    }

    Promise.all([
        pollFor(() => reg.get(sourceId), 5000),
        pollFor(() => reg.get(targetId), 5000),
    ]).then(([source, target]) => {
        const apply = () => {
            const raw = source.get(sourceField);
            const next = (typeof raw === "number") ? raw * multiplier + offset : raw;
            setByPath(target, targetField, next);
        };
        source.on(`change:${sourceField}`, apply);
        apply(); // also fire once at startup so the target reflects current source state
        status.textContent = `✅ ${label}`;
    }).catch(err => {
        status.textContent = `❌ binder failed: ${err.message}`;
        console.error("[binder] failed", err, { sourceId, targetId });
    });
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
