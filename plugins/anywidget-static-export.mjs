// Rewrites notebook `output` nodes that carry application/vnd.jupyter.widget-view+json
// into `anywidget` AST nodes that the myst-theme @myst-theme/anywidget renderer can render
// without a Jupyter kernel. ESM and CSS for each widget are written to disk and referenced
// by relative path so the built-in transformWidgetStaticAssetsToDisk picks them up.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ASSET_DIR_NAME = '_widget_assets';
const WIDGET_VIEW_MIME = 'application/vnd.jupyter.widget-view+json';
const WIDGET_STATE_MIME = 'application/vnd.jupyter.widget-state+json';

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

function buildInitialModel(state) {
  const model = {};
  for (const [key, value] of Object.entries(state || {})) {
    if (key.startsWith('_')) continue;
    if (typeof value === 'string' && value.startsWith('IPY_MODEL_')) continue;
    model[key] = value;
  }
  return model;
}

function nanoidLike() {
  return crypto.randomBytes(10).toString('hex');
}

// MyST's MystAnyModel.save_changes throws "not implemented yet". In a static
// export there is no kernel to sync to, so we replace it with a no-op via the
// `initialize` hook that the renderer calls before `render`. We rewrite the
// user's `export default { ... }` so we can compose with whatever they exported.
const SHIM_HEADER = `// === MyST static-export shim begins ===
function __mystPatchModel(model) {
  if (!model || model.__mystPatched) return;
  const origSave = model.save_changes;
  model.save_changes = function () {
    try { if (typeof origSave === 'function') origSave.call(this); } catch (_) {}
  };
  model.__mystPatched = true;
}
// === MyST static-export shim ends ===

`;

const SHIM_FOOTER = `

// === MyST static-export shim re-export begins ===
const __mystOrigInit = (typeof __mystUserDefault === 'object' && __mystUserDefault) ? __mystUserDefault.initialize : (typeof initialize === 'function' ? initialize : undefined);
const __mystOrigRender = (typeof __mystUserDefault === 'object' && __mystUserDefault) ? __mystUserDefault.render : (typeof render === 'function' ? render : undefined);

export default {
  initialize(args) { __mystPatchModel(args.model); return __mystOrigInit?.(args); },
  render(args) { __mystPatchModel(args.model); return __mystOrigRender?.(args); },
};
// === MyST static-export shim re-export ends ===
`;

const EXPORT_DEFAULT_OBJECT_RE = /^[ \t]*export\s+default\s+\{([\s\S]*?)\}\s*;?[ \t]*$/m;
const EXPORT_DEFAULT_IDENT_RE = /^[ \t]*export\s+default\s+([A-Za-z_$][\w$]*)\s*;?[ \t]*$/m;

function wrapEsmForStatic(source) {
  let rewritten = source;
  if (EXPORT_DEFAULT_OBJECT_RE.test(rewritten)) {
    rewritten = rewritten.replace(EXPORT_DEFAULT_OBJECT_RE, 'const __mystUserDefault = { $1 };');
  } else if (EXPORT_DEFAULT_IDENT_RE.test(rewritten)) {
    rewritten = rewritten.replace(EXPORT_DEFAULT_IDENT_RE, 'const __mystUserDefault = $1;');
  } else {
    // Couldn't find an `export default`; bail out and keep the original (no shim).
    // Static rendering will work but save_changes will still throw on user click.
    return source;
  }
  return SHIM_HEADER + rewritten + SHIM_FOOTER;
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
    const modelId = view?.model_id;
    if (!modelId) continue;

    const entry = widgetState[modelId];
    if (!entry || entry.model_module !== 'anywidget') continue;

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
    if (cssRel) node.css = cssRel;
    node.model = buildInitialModel(state);
    node.id = modelId;
    node.children = [];
    if (!node.key) node.key = nanoidLike();

    rewriteCount += 1;
  }

  if (rewriteCount > 0) {
    // Surface progress; mystmd captures plugin logs in build output.
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
