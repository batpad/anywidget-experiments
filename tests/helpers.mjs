// Shared test scaffolding for tests/static-export.test.mjs.
//
// The plugin re-reads the source `.ipynb` from `file.path`, then walks a
// hand-built AST to find `output` nodes carrying widget-view MIME data.
// These helpers (a) load the plugin's transform function in isolation,
// (b) stage fixtures in a tmpdir so the plugin can write sidecar assets
// without polluting the real notebooks/ directory, and (c) build a minimal
// AST tree that exercises the same code paths a real mystmd parse would.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = path.resolve(__dirname, "..");
const PLUGIN_PATH = path.join(REPO_ROOT, "plugins", "anywidget-static-export.mjs");
const FIXTURES_DIR = path.join(__dirname, "fixtures");

const WIDGET_VIEW_MIME = "application/vnd.jupyter.widget-view+json";

// Load the plugin's transform function. The plugin exports
// `{ name, transforms: [{ plugin: factory }] }` where `factory()` returns
// the actual async `(tree, file) => {}` we want to call.
export async function loadTransform() {
  const mod = await import(PLUGIN_PATH);
  const factory = mod.default.transforms[0].plugin;
  return factory();
}

// Run `fn` against a fresh copy of `<fixturesDir>/<fixtureName>` placed in
// a per-call tmpdir. The tmpdir is removed when `fn` resolves or throws.
export async function inTmpDir(fixtureName, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anywidget-test-"));
  const dest = path.join(dir, fixtureName);
  fs.copyFileSync(path.join(FIXTURES_DIR, fixtureName), dest);
  try {
    return await fn({ dir, notebookPath: dest });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Build a minimal MyST AST tree for the notebook at `notebookPath`.
//
// Mirrors what mystmd produces when parsing a notebook: each code cell becomes
// a `block` containing one `output` node per output, with each MIME entry
// wrapped as `{ content: <data> }` (so `parseViewMime` can read it).
export function buildAstForNotebook(notebookPath) {
  const nb = JSON.parse(fs.readFileSync(notebookPath, "utf8"));
  const blocks = [];
  for (const cell of nb.cells ?? []) {
    if (cell.cell_type !== "code") continue;
    const outputNodes = [];
    for (const out of cell.outputs ?? []) {
      const data = out.data ?? {};
      const wrappedData = {};
      for (const [mime, value] of Object.entries(data)) {
        wrappedData[mime] = { content: value };
      }
      outputNodes.push({ type: "output", jupyter_data: { data: wrappedData } });
    }
    if (outputNodes.length === 0) continue;
    blocks.push({ type: "block", children: outputNodes });
  }
  return { type: "root", children: blocks };
}

// Walk the AST and return all nodes whose type matches `type`.
export function nodesOfType(tree, type) {
  const out = [];
  function visit(n) {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) {
      n.forEach(visit);
      return;
    }
    if (n.type === type) out.push(n);
    if (Array.isArray(n.children)) n.children.forEach(visit);
  }
  visit(tree);
  return out;
}

// Sorted directory listing — handy for snapshot-style assertions.
export function assetsIn(assetDir) {
  if (!fs.existsSync(assetDir)) return [];
  return fs.readdirSync(assetDir).sort();
}

export { WIDGET_VIEW_MIME };
