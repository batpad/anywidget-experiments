# TypeScript-ification plan

A draft plan to deepen TypeScript adoption across this repo. Not yet approved — exists for review and feedback.

## Context

Phase-1 cleanup is done (ToC numbering, golden TS widget, vitest tests, CI). Three things to take on next:

1. The **plugin** (`plugins/anywidget-static-export.mjs`, 934 lines) is the largest piece of untyped code in the repo. Its AST/widget-state shapes are non-trivial and are the most-touched surface when debugging — typing them pays back fast.
2. **Widgets** are mostly loose JS. We have one TS golden template (`typed_counter`); converting two more genuinely complex widgets (`name_explorer`, `chart_widget`) shows the pattern at scale and produces shared types worth reusing.
3. The **Python ↔ JS boundary** is currently unenforced. Traitlets in Python and a TS interface in JS drift independently — there's no compile-time or test-time check that `traitlets.Int(0)` on the Python side corresponds to `value: number` on the TS side. We want a "best-practice" recipe that catches drift and is opt-in for widget authors who want plain JS.

Outcome: the plugin and two widgets are TypeScript, there's a documented msgspec-based recipe for keeping the Python and TS sides in sync, and authors who don't want the ceremony can still write loose JS or hand-typed interfaces.

Scope decisions baked in:
- **2 widgets** to convert: `name_explorer` + `chart_widget`.
- **Primary type-bridge**: msgspec → JSON Schema → `.d.ts` codegen.

---

## Task 1 — Plugin → TypeScript

### Layout

- **Source**: `plugins/anywidget-static-export.ts` (replaces the `.mjs`).
- **Compiled output**: `plugins/dist/anywidget-static-export.mjs` (committed, just like the bundled widgets commit `dist/widget.js`). Keeps the build artifact next to its source and avoids a top-level `dist/` namespace clash.
- **Type definitions**: `plugins/types.ts` — interfaces authored in this repo for the shapes mystmd doesn't publish types for.
- **`jslink-runtime.mjs`**: stays as `.mjs` for now (it's loaded as a string asset and embedded into output assets verbatim — no runtime benefit to converting).

### `plugins/types.ts` — the interfaces to author

Group by source:

**MyST AST** (best-effort; mystmd doesn't ship types we can `import`):

```ts
export interface MystNode { type: string; children?: MystNode[]; [k: string]: unknown; }
export interface MystRoot extends MystNode { type: "root"; children: MystNode[]; }
export interface MystOutput extends MystNode {
  type: "output";
  jupyter_data?: { data?: Record<string, JupyterMimeBundle> };
}
export interface AnywidgetNode extends MystNode {
  type: "anywidget";
  esm: string;
  model: AnywidgetModel;
  id: string;
  key: string;
  children: [];
}
export interface MystFile { path?: string; history?: string[]; }
```

**Jupyter notebook + widget-state**:

```ts
export interface JupyterMimeBundle { content: unknown; }   // mystmd wraps the raw value
export interface NotebookFile {
  cells: Array<{ cell_type: string; outputs?: NotebookOutput[] }>;
  metadata: { widgets?: Record<string, WidgetStateBundle> };
}
export interface WidgetStateBundle { state: Record<string, WidgetStateEntry>; }
export interface WidgetStateEntry {
  model_module: string;
  model_module_version?: string;
  model_name: string;
  state: Record<string, unknown>;
  buffers?: WidgetBuffer[];
}
export interface WidgetBuffer { encoding: "base64"; path: Array<string | number>; data: string; }
```

**Plugin output (the contract `@myst-theme/anywidget` consumes — capture this carefully, it's load-bearing)**:

```ts
export interface AnywidgetModel {
  // user state, plus:
  _myst_root_id: string;
  _myst_buffers: WidgetBuffer[];
  _myst_submodels: Record<string, SubModel>;
  _myst_anywidget_id?: string;
  _myst_css_text?: string;
  _myst_css_key?: string;
  [k: string]: unknown;
}
export interface AssetRefs { module: string; sourceModule: string; runtime: string; state: string; css?: string; }
export interface ManifestPage { source: string; widgets: ManifestWidgetEntry[]; }
export interface Manifest { runtime: string; pages: Record<string, ManifestPage>; widgets: ManifestWidgetEntry[]; }
```

### Build

- Add `typescript` and `esbuild` (already a devDep) usage. Build script:
  ```json
  "build-plugin": "esbuild plugins/anywidget-static-export.ts --bundle --format=esm --platform=node --packages=external --outfile=plugins/dist/anywidget-static-export.mjs"
  ```
  - `--bundle` is fine because the only imports are `node:fs`/`node:path`/`node:crypto`/`node:url` (kept external by `--packages=external`) and the local `jslink-runtime.mjs` (read at runtime via `fs.readFileSync`, not imported).
- Add `"prebuild": "npm run build-plugin && npm run build-widgets && jupyter nbconvert ..."` so `myst build` always sees a fresh compiled plugin.
- Add `"typecheck-plugin": "tsc --noEmit -p plugins"` and a `plugins/tsconfig.json` (strict, ES2022, moduleResolution: bundler).
- Add to CI's `tests.yml`: `npm run build-plugin && npm run typecheck-plugin` before `npm test`.

### Wiring updates

- `myst.yml` line 16: `- plugins/anywidget-static-export.mjs` → `- plugins/dist/anywidget-static-export.mjs`.
- `tests/helpers.mjs` line 18: `PLUGIN_PATH` → `plugins/dist/anywidget-static-export.mjs`.
- `.gitignore`: leave `plugins/dist/` *committed* (so cloning works without a build step). Mirror chart_widget's pattern.

### Verification

```
npm run build-plugin
npm run typecheck-plugin
npm test                    # all 8 existing plugin tests pass
npx myst build --html       # full pipeline produces same output
```

---

## Task 2 — Widget conversions: `name_explorer` + `chart_widget`

### `widgets/name_explorer/` — loose JS → bundled TS (558 lines of JS, the highest-value conversion)

**New layout** (mirrors `typed_counter` + `chart_widget`):
```
widgets/name_explorer/
  package.json           # esbuild build, tsc --noEmit
  tsconfig.json
  src/
    index.ts             # converted from current widget.js
    model.ts             # generated; see Task 3
  dist/widget.js         # build output, committed
  widget.py              # _esm path: "dist/widget.js"
```

**Model surface** (deeply nested — TS pays off here):
```ts
export interface NamePeak { year: number; rank: number; count: number; }
export interface NameExplorerModel {
  trajectories: Record<string, number[]>;     // key = "Name|Sex"
  peaks: Record<string, NamePeak>;
  twins: Record<string, string[]>;
  era_captions: Record<string, string>;       // decade → caption
  name_index: string[];
  selected: string;
  birth_year: number;
  year_start: number;
  year_end: number;
}
```

`src/index.ts` uses `RenderProps<NameExplorerModel>` from `@anywidget/types`.

### `widgets/chart_widget/` — bundled JS → bundled TS

**Already has** `package.json`, `src/index.js`, `dist/`. The conversion is small:
- Rename `src/index.js` → `src/index.ts`.
- Add `tsconfig.json`.
- Update `package.json`: `build` → `esbuild src/index.ts ...`, add `typecheck`.
- Chart.js v4 ships its own types — no `@types/chart.js` needed.
- Define a typed `ChartModel` interface — `series_data`, `chart_options`, the click/hover event dicts.

### Shared types

`widgets/_shared/types.ts`:
```ts
export type RGBAColor = [number, number, number, number];
export interface ChartPointEvent { series: number; index: number; x: number; y: number; label: string; }
export interface SeriesData {
  type: "line" | "scatter" | "bar";
  data: Array<[number, number]> | Array<{ x: number; y: number }>;
  name: string;
  color?: string;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  borderWidth?: number;
}
```

Both widgets import from `widgets/_shared/types.ts` (relative path, no package). When the next widget is converted (likely `chartgpu_widget`, which has a near-identical series shape), it imports the same.

### Verification

```
npm run install-widgets
npm run build-widgets        # all four bundled widgets build
npm run typecheck            # new root script: typechecks all TS widgets
npx myst build --html        # name_explorer + chart_widget render in their notebooks
```

Visually verify in the browser that the converted widgets still render identically (notebooks 5 and 8).

---

## Task 3 — Python ↔ JS type bridge: `msgspec` recipe

The "best practice" path for widget authors who want strict typing across the boundary. **Opt-in** — typed_counter and the two converted widgets adopt it as exemplars; existing widgets keep traitlets only.

### Per-widget layout addition

```
widgets/<name>/
  model.py            # msgspec.Struct mirror of traitlets surface (NEW)
  src/model.d.ts      # generated from model.py — DO NOT EDIT (NEW)
  …everything else unchanged…
```

`model.py`:
```python
import msgspec

class CounterModel(msgspec.Struct):
    value: int = 0
    label: str = "Counter"
    widget_id: str = "typed_counter_1"
    last_change: dict = {}
```

`widget.py` keeps its existing `traitlets.Int/Unicode/...` declarations — traitlets remains the runtime source of truth (it's what anywidget hooks into for sync). `model.py` is a parallel **type-only** declaration.

### Schema → `.d.ts` codegen

`scripts/gen-types.py` (NEW):
```python
import importlib, json
from pathlib import Path
import msgspec.json

WIDGETS = [
    ("typed_counter", "CounterModel"),
    ("name_explorer", "NameExplorerModel"),
    ("chart_widget",  "ChartModel"),
]

ROOT = Path(__file__).parent.parent
for widget_dir, struct_name in WIDGETS:
    mod = importlib.import_module(f"widgets.{widget_dir}.model")
    schema = msgspec.json.schema(getattr(mod, struct_name))
    out = ROOT / "widgets" / widget_dir / "model.schema.json"
    out.write_text(json.dumps(schema, indent=2) + "\n")
    print(f"wrote {out.relative_to(ROOT)}")
```

`package.json` scripts (NEW):
```json
"gen-schemas": "python scripts/gen-types.py",
"gen-dts": "for d in widgets/typed_counter widgets/name_explorer widgets/chart_widget; do npx json-schema-to-typescript $d/model.schema.json > $d/src/model.d.ts; done",
"gen-types": "npm run gen-schemas && npm run gen-dts"
```

Each widget's `src/index.ts` imports the generated `.d.ts`:
```ts
import type { CounterModel } from "./model";
import type { RenderProps } from "@anywidget/types";
function render({ model }: RenderProps<CounterModel>) { … }
```

### Sync check (the test that catches drift)

`tests/python-ts-sync.test.mjs` (NEW):
- For each widget in the list, spawn `python -c "from widgets.X.widget import Y; ..."` to introspect the traitlets and emit the field name + class name (e.g., `{"value": "Int", "label": "Unicode"}`).
- Compare against the corresponding `model.py` `msgspec.Struct` fields (introspect via a second subprocess), using a fixed mapping table:
  ```
  Int → int, Unicode → str, Bool → bool, Float → float,
  List(...) → list, Dict(...) → dict, Bytes → bytes
  ```
- Assert: traitlet field set == msgspec field set, and each pair's types map cleanly via the table.
- Run as part of `npm test`.

This test is the safety net that makes "double-bookkeeping (traitlets + msgspec.Struct)" trustworthy. If a developer adds `traitlets.Float("foo")` without updating `model.py`, the test fails with a clear message.

### Three documented "levels" — the menu for widget authors

Add to `AGENTS.md` (or a new `widgets/AGENTS.md`):

| Level | What you author | What you get | Right for |
|---|---|---|---|
| **0 — Loose JS** | `widget.py` + `widget.js` | Works, no types | Quick prototypes, one-off widgets |
| **1 — Hand-typed TS** | `widget.py` + `src/index.ts` + manual `interface FooModel`. esbuild bundles. | TS types on the JS side; no enforcement against Python | Most widgets that don't want extra Python deps |
| **2 — msgspec bridge** | `widget.py` + `model.py` (msgspec.Struct) + `src/index.ts` (imports generated `model.d.ts`) | Single source of truth on the Python side; sync test catches drift; types auto-sync via codegen | Widgets that want guarantees, or are part of a public template / library |

`typed_counter` is the canonical Level-2 example. `chart_widget` and `name_explorer` adopt Level 2. Other widgets stay at Level 0/1 as they are today.

### Verification

```
pip install msgspec                                   # add to requirements.txt
npm install --save-dev json-schema-to-typescript      # add to devDeps
npm run gen-types                                     # produces three model.schema.json + three model.d.ts
npm run typecheck                                     # all TS widgets compile against generated types
npm test                                              # sync test passes for all three widgets
```

End-to-end: in `widgets/typed_counter/widget.py`, change `value = traitlets.Int(0)` to `traitlets.Float(0.0)` without updating `model.py`. Run `npm test` — expect a clear failure pointing at the mismatch.

---

## Order of operations

1. **Task 1** (plugin → TS) — independent, biggest typing win, lowest risk because tests already cover behaviour.
2. **Task 2 widget A** (`chart_widget` → TS) — small change, validates the bundled-widget TS pattern works for an existing build.
3. **Task 2 widget B** (`name_explorer` → TS) — bigger change, exercises the loose-JS-to-bundled-TS path that future authors will follow.
4. **Task 3** (msgspec bridge) — last, because it needs typed_counter + chart_widget + name_explorer in place to demonstrate.

Do tasks 1 & 2A in parallel if convenient — they touch disjoint files.

---

## Refactor suggestions still on the shelf (no code changes here)

These were carried over from the previous plan; revisit after this round:

| # | Suggestion | Effort |
|---|---|---|
| 1 | Split plugin into pure (`transform.ts`) + impure (`emit.ts`) halves | M |
| 2 | Document the rewritten `anywidget` AST node contract as an exported TS interface | S (becomes free in Task 1) |
| 3 | Replace silent early-exits in the transform with `debug` logs gated on `DEBUG_ANYWIDGET_EXPORT` | S |
| 4 | Replace `nanoidLike()` (random hex) with deterministic key from `rootId + sourcePath` for cache-friendly builds | S |

---

## Open questions / risks

- **mystmd doesn't publish AST types**. We author best-effort interfaces in `plugins/types.ts`. Risk: mystmd changes a shape we relied on. Mitigation: the existing 8 plugin tests + sync test + `myst build` smoke test catch breakage at build-time, and the types are loose (`[k: string]: unknown`) at edges.
- **Committing build artifacts** (`plugins/dist/anywidget-static-export.mjs`, `widgets/*/dist/widget.js`) is consistent with chart_widget convention but creates merge-noise in PRs. Acceptable for this repo — it's an experiments repo, not a publishable package.
- **msgspec types vs traitlets types** are not 1:1 perfectly. e.g. `traitlets.Dict()` doesn't constrain key/value types but msgspec `dict[str, int]` does. The sync test treats both as "dict-shaped" and accepts. Document the mapping table clearly in `AGENTS.md` so authors know the rules.
- **Python introspection in tests** requires the Python venv to be available in CI. CI's `tests.yml` doesn't set up Python today — Task 3 needs to add Python setup to that workflow (use `actions/setup-python@v5`, mirror `deploy.yml`).

---

## Critical files

- `plugins/anywidget-static-export.mjs` (Task 1 source — converts to `.ts`)
- `plugins/jslink-runtime.mjs` (Task 1 — stays as-is)
- `tests/helpers.mjs` line 18 (Task 1 — PLUGIN_PATH update)
- `myst.yml` line 16 (Task 1 — plugin path update)
- `widgets/chart_widget/{src/index.js, package.json}` (Task 2A)
- `widgets/name_explorer/widget.js` (Task 2B — extract to `src/index.ts`)
- `widgets/typed_counter/{widget.py, src/index.ts}` (Task 3 — adopt msgspec recipe as canonical example)
- `scripts/gen-types.py`, `tests/python-ts-sync.test.mjs` (Task 3 — new files)
- `.github/workflows/tests.yml` (Task 3 — add Python setup)
- `AGENTS.md` (Task 3 — document the three levels)
