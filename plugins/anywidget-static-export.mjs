// Rewrites notebook `output` nodes that carry application/vnd.jupyter.widget-view+json
// into `anywidget` AST nodes that the myst-theme @myst-theme/anywidget renderer can render
// without a Jupyter kernel.
//
// Phase 1 (counter widgets): rewrite the cell-output's widget-view to an anywidget node,
//   write the user's _esm/_css to disk, and shim model.save_changes so kernelless interaction
//   doesn't throw.
//
// Phase 2 (binary-buffer widgets like lonboard): when the cell-output's widget-view points
//   at a non-anywidget container (VBox/HBox), walk into children to find the anywidget
//   descendant. Bundle every transitively-referenced sub-model (layers, basemap, layout, ...)
//   alongside its `buffers` array into `node.model._myst_submodels`. The wrapper shim
//   port-of-`put_buffers` then reconstructs DataViews at runtime, and a stub
//   `model.widget_manager.get_model(id)` returns sub-model proxies on demand.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ASSET_DIR_NAME = '_widget_assets';
const WIDGET_VIEW_MIME = 'application/vnd.jupyter.widget-view+json';
const WIDGET_STATE_MIME = 'application/vnd.jupyter.widget-state+json';
const IPY_MODEL_PREFIX = 'IPY_MODEL_';

function findOutputs(node, results = []) {
  if (!node || typeof node !== 'object') return results;
  if (Array.isArray(node)) {
    for (const n of node) findOutputs(n, results);
    return results;
  }
  if (node.type === 'output') results.push(node);
  if (Array.isArray(node.children)) {
    for (const c of node.children) findOutputs(c, results);
  }
  return results;
}

function shortHash(str) {
  return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
}

function parseViewMime(viewMime) {
  if (!viewMime) return null;
  const raw = typeof viewMime.content === 'string' ? viewMime.content : null;
  if (raw) {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return viewMime.content ?? null;
}

function nanoidLike() {
  return crypto.randomBytes(10).toString('hex');
}

// Walk references in a state object: returns list of model_ids reachable via
// IPY_MODEL_<id> strings (top-level or inside nested arrays/objects).
function collectIpyRefs(value, out = []) {
  if (typeof value === 'string') {
    if (value.startsWith(IPY_MODEL_PREFIX)) out.push(value.slice(IPY_MODEL_PREFIX.length));
    return out;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectIpyRefs(v, out);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectIpyRefs(v, out);
    return out;
  }
  return out;
}

// Walk children of a container (jupyter-widgets/controls VBox/HBox) to find the first
// descendant whose state has `_anywidget_id`. Returns its model_id, or null.
function findAnywidgetDescendant(modelId, widgetState, visited = new Set()) {
  if (visited.has(modelId)) return null;
  visited.add(modelId);
  const entry = widgetState[modelId];
  if (!entry) return null;
  if (entry.model_module === 'anywidget') return modelId;
  const children = entry.state?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      if (typeof child === 'string' && child.startsWith(IPY_MODEL_PREFIX)) {
        const found = findAnywidgetDescendant(
          child.slice(IPY_MODEL_PREFIX.length),
          widgetState,
          visited,
        );
        if (found) return found;
      }
    }
  }
  return null;
}

// Build a flat sub-model bundle: every widget reachable transitively from rootId via
// IPY_MODEL_<id> strings. Returns { <id>: { state, buffers, model_module, model_name } }.
// rootId itself is NOT included (its state lives in node.model).
function buildSubModels(rootId, widgetState) {
  const out = {};
  const queue = [...collectIpyRefs(widgetState[rootId]?.state)];
  const seen = new Set([rootId]);
  while (queue.length > 0) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    const entry = widgetState[id];
    if (!entry) continue;
    out[id] = {
      state: entry.state ?? {},
      buffers: entry.buffers ?? [],
      model_module: entry.model_module,
      model_name: entry.model_name,
    };
    queue.push(...collectIpyRefs(entry.state));
  }
  return out;
}

// MyST's MystAnyModel.save_changes throws "not implemented yet". The shim below also
// adds: base64→DataView buffer hydration (port of @jupyter-widgets/base/utils.ts:put_buffers),
// a `widget_manager.get_model(id)` stub backed by node.model._myst_submodels, and
// sub-model proxies with .get/.set/.on/.save_changes/.send so the host widget's frontend
// (e.g. lonboard) can resolve layer/basemap/layout sub-models without a real kernel.
const SHIM_HEADER = `// === MyST static-export shim begins ===
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

`;

const SHIM_FOOTER = `

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
`;

// Common forms of default export we see in the wild:
//  (a) `export default { render };`              — hand-written widgets (counter, etc.)
//  (b) `export default RENDER_OBJ;`              — short-hand declaration
//  (c) `export { O0r as default };`              — bundled / tree-shaken (lonboard's _esm)
//  (d) `export { default as O0r, X as Y };`      — multi-name renamed export with default
const EXPORT_DEFAULT_OBJECT_RE = /(^|[\n;])\s*export\s+default\s+\{([\s\S]*?)\}\s*;?/m;
const EXPORT_DEFAULT_IDENT_RE = /(^|[\n;])\s*export\s+default\s+([A-Za-z_$][\w$]*)\s*;?/m;
const EXPORT_NAMED_DEFAULT_RE = /(^|[\n;\s])export\s*\{([^}]*?\bas\s+default\b[^}]*?)\}\s*;?/m;

function rewriteNamedDefaultExport(source) {
  // Find `export { ..., FOO as default, ... };` and rewrite to:
  //   - declare `__mystUserDefault = FOO`
  //   - keep any other named exports intact (e.g. `export { X as Y };`)
  const match = source.match(EXPORT_NAMED_DEFAULT_RE);
  if (!match) return null;
  const inner = match[2];
  // Parse comma-separated specifiers like "A, B as default, C as D"
  const specs = inner.split(',').map((s) => s.trim()).filter(Boolean);
  let defaultIdent = null;
  const survivors = [];
  for (const spec of specs) {
    const asMatch = spec.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
    if (asMatch && asMatch[2] === 'default') {
      defaultIdent = asMatch[1];
    } else {
      survivors.push(spec);
    }
  }
  if (!defaultIdent) return null;
  const replacement = `${match[1]}const __mystUserDefault = ${defaultIdent};` +
    (survivors.length > 0 ? ` export { ${survivors.join(', ')} };` : '');
  return source.replace(EXPORT_NAMED_DEFAULT_RE, replacement);
}

function wrapEsmForStatic(source) {
  let rewritten = source;

  // Try the named-default form first; bundlers prefer it for tree-shaken output.
  const namedRewrite = rewriteNamedDefaultExport(rewritten);
  if (namedRewrite !== null) {
    return SHIM_HEADER + namedRewrite + SHIM_FOOTER;
  }

  if (EXPORT_DEFAULT_OBJECT_RE.test(rewritten)) {
    rewritten = rewritten.replace(EXPORT_DEFAULT_OBJECT_RE, '$1const __mystUserDefault = { $2 };');
  } else if (EXPORT_DEFAULT_IDENT_RE.test(rewritten)) {
    rewritten = rewritten.replace(EXPORT_DEFAULT_IDENT_RE, '$1const __mystUserDefault = $2;');
  } else {
    // Last-resort marker: no rewrite happened; bail out.
    return source;
  }
  return SHIM_HEADER + rewritten + SHIM_FOOTER;
}

// Build the AST `node.model` payload: the root widget's user state, plus our private
// _myst_* keys for the runtime shim to consume.
function buildInitialModel(rootId, widgetState) {
  const rootEntry = widgetState[rootId];
  if (!rootEntry) return {};
  const state = rootEntry.state || {};
  const model = {};
  for (const [key, value] of Object.entries(state)) {
    if (key.startsWith('_')) continue; // skip _esm, _css, _model_module, etc.
    model[key] = value;                 // keep IPY_MODEL_<id> strings for unpack_models
  }
  model._myst_buffers = rootEntry.buffers ?? [];
  model._myst_submodels = buildSubModels(rootId, widgetState);
  // Identifiers the runtime shim uses to register the model in window.__myst_widgets
  // so cross-widget interop (binders, controllers, etc.) can find each other.
  model._myst_root_id = rootId;
  if (state._anywidget_id) model._myst_anywidget_id = state._anywidget_id;
  return model;
}

const transformPlugin = () => async (tree, file) => {
  const sourcePath = file?.path ?? file?.history?.[0];
  if (!sourcePath || !sourcePath.endsWith('.ipynb')) return;
  if (!fs.existsSync(sourcePath)) return;

  let notebook;
  try {
    notebook = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  } catch {
    return;
  }

  const widgetState = notebook?.metadata?.widgets?.[WIDGET_STATE_MIME]?.state;
  if (!widgetState) return;

  const sourceDir = path.dirname(sourcePath);
  const assetDir = path.join(sourceDir, ASSET_DIR_NAME);
  if (!fs.existsSync(assetDir)) fs.mkdirSync(assetDir, { recursive: true });

  let rewriteCount = 0;
  for (const node of findOutputs(tree)) {
    const data = node?.jupyter_data?.data;
    const viewMime = data?.[WIDGET_VIEW_MIME];
    if (!viewMime) continue;

    const view = parseViewMime(viewMime);
    const cellViewModelId = view?.model_id;
    if (!cellViewModelId) continue;

    // Phase 2: if the cell output points at a container (VBox/HBox), walk into
    // children for the first anywidget descendant. Phase 1 widgets resolve to themselves.
    const rootId = findAnywidgetDescendant(cellViewModelId, widgetState);
    if (!rootId) continue;

    const entry = widgetState[rootId];
    const state = entry.state || {};
    const esm = state._esm;
    const css = state._css;
    if (!esm) continue;

    const wrappedEsm = wrapEsmForStatic(esm);
    const esmName = `${shortHash(wrappedEsm)}.mjs`;
    const esmFile = path.join(assetDir, esmName);
    if (!fs.existsSync(esmFile)) fs.writeFileSync(esmFile, wrappedEsm);

    let cssRel;
    if (css) {
      const cssName = `${shortHash(css)}.css`;
      const cssFile = path.join(assetDir, cssName);
      if (!fs.existsSync(cssFile)) fs.writeFileSync(cssFile, css);
      cssRel = `${ASSET_DIR_NAME}/${cssName}`;
    }

    delete node.jupyter_data;
    node.type = 'anywidget';
    node.esm = `${ASSET_DIR_NAME}/${esmName}`;
    // We intentionally do NOT set node.css here — the renderer would inject it via
    // a `<link>` inside the user's render-target div, which React's createRoot wipes
    // for widgets like lonboard. Instead we inline the CSS text on the model and the
    // runtime shim attaches a <style> element directly to the shadow root.
    node.model = buildInitialModel(rootId, widgetState);
    if (css) {
      node.model._myst_css_text = css;
      node.model._myst_css_key = shortHash(css);
    }
    node.id = rootId;
    node.children = [];
    if (!node.key) node.key = nanoidLike();

    rewriteCount += 1;
  }

  if (rewriteCount > 0) {
    console.log(`[anywidget-static-export] rewrote ${rewriteCount} widget(s) in ${path.basename(sourcePath)}`);
  }
};

export default {
  name: 'anywidget-static-export',
  transforms: [
    {
      name: 'anywidget-from-notebook-outputs',
      stage: 'project',
      plugin: transformPlugin,
    },
  ],
};
