# Anywidget Composable Geospatial Widgets - Technical Documentation

## Project Vision

This project explores creating a set of composable, interactive widgets for geospatial data visualization in Jupyter notebooks that also work when exported as static HTML through JupyterBook. The goal is to enable complex interactivity patterns similar to reactive documents, where widgets can communicate with each other client-side, enabling rich user experiences even without an active Python kernel.

## Key Technologies

### Anywidget
- **Purpose**: Simplifies Jupyter widget development by using standard ES modules instead of complex webpack builds
- **Architecture**: Python class + ES module with lifecycle hooks (initialize, render)
- **Advantages**:
  - No build step required
  - Standard ES modules work everywhere
  - Simpler than ipywidgets
  - Compatible with ipywidgets ecosystem

### Lonboard
- **Purpose**: Fast, GPU-accelerated geospatial visualization in Jupyter
- **Built on**: anywidget + deck.gl
- **Capabilities**: Can render millions of points efficiently using WebGL
- **Data transfer**: Uses Apache Arrow for efficient binary data transfer

### JupyterBook/MyST
- **Purpose**: Creates static websites from Jupyter notebooks
- **Anywidget support**: native in current `mystmd` (the `anywidget` directive renders standalone widgets)
- **Gap we fill**: notebook-cell anywidget outputs and cross-widget communication in static HTML — covered by `plugins/anywidget-static-export.mjs`

## Technical Architecture

### Widget State Management

Anywidget uses a Backbone.js model for state synchronization:

```python
# Python side
class MyWidget(anywidget.AnyWidget):
    _esm = "widget.js"
    value = traitlets.Int(0).tag(sync=True)  # Synced with JS
```

```javascript
// JavaScript side
export function render({ model, el }) {
    // Access state
    const value = model.get("value");

    // Listen to changes
    model.on("change:value", () => {
        const newValue = model.get("value");
        // Update UI
    });

    // Update state
    model.set("value", 42);
    model.save_changes();  // Sync to Python
}
```

### Static-host runtime (cross-widget communication in static HTML)

When a notebook is rendered through `plugins/anywidget-static-export.mjs`, every widget is mounted with an extra `host` argument:

```javascript
export default {
    render({ model, el, host }) {
        // host is only present in static-export builds.
        // In a JupyterLab kernel context, host is undefined.
    },
};
```

The host is a thin per-page facade over a registry of every widget on the page. Widgets use it to find each other instead of poking at shared globals. The full plugin internals (registry, sub-model proxies, buffer hydration, CSS injection workarounds) are documented in [`plugins/README.md`](plugins/README.md).

#### Host API

| Method | Returns | Notes |
|---|---|---|
| `host.getModel(ref)` | `Promise<Model>` | Resolves immediately if `ref` is already registered, rejects otherwise. |
| `host.waitForModel(ref, { timeout = 5000 })` | `Promise<Model>` | Resolves when `ref` registers (now or later). Rejects on timeout. Use this when the target widget might mount after you. |
| `host.getWidget(ref)` | `Promise<{exports, render}>` | Like `getModel` but returns the widget binding (with the `exports` object the widget's `initialize` returned). |
| `host.on(event, fn)` / `host.off(event, fn)` / `host.emit(event, detail)` | — | Scoped lifecycle events. The host emits `model:registered` and `widget:registered` as widgets come online; widgets can use these directly or just rely on `waitForModel`. |

#### What `ref` can be

A model is registered under multiple keys, so `ref` can be any of:
- The user-set `widget_id` trait (the recommended way for widgets you author).
- The Python class path `_anywidget_id` (e.g. `"lonboard._map.Map"`).
- The kernel UUID (`model_id`), with or without an `IPY_MODEL_` / `anywidget:` prefix.
- For lonboard sub-models: `_layer_type:<type>` or `_control_type:<type>` aliases (first widget with that type wins the alias slot).

#### Event boundary

The host's events are deliberately small: lifecycle (`model:registered`, `widget:registered`) only. Widget-to-widget data flow stays on the model: `model.on('change:value', ...)`. There is no AFM-style global event bus.

#### Canonical examples

- `widgets/linked_counter/widget.js` — `host.waitForModel(linkTo)` to find another widget by id, then subscribe to its `change:value` / `change:linked_value`.
- `widgets/widget_binder/widget.js` — resolve a source and a target by id, apply a linear transform, write to a dotted target field (`view_state.zoom`).
- `widgets/hurricane_dashboard/widget.js` — resolve lonboard layer sub-models by UUID and toggle their `visible` trait.

#### `jslink` / `jsdlink` lifting

For simple direct trait mirroring you don't need a connector widget — call `widgets.jslink((a, 'value'), (b, 'value'))` (bidirectional) or `widgets.jsdlink((src, 'value'), (tgt, 'value'))` (one-way) like in any ipywidgets notebook. The static-export plugin scans the notebook's `widget-state` for `LinkModel` / `DirectionalLinkModel` entries, attaches a page-level link manifest to the exported anywidget models, and the shared static host registry wires change listeners once both endpoints register. Behavior matches upstream `widget_link.ts` (same `_updating` re-entrancy guard, initial-sync push at bind time).

**Use jslink when:** you want plain `a.value <-> b.value` (or `a.foo -> b.foo`) mirroring with no transform.

**Reach for a connector widget when:** you need a transform (`WidgetBinder`'s linear `multiplier`/`offset`, or `LinkedCounterWidget`'s mirror/sum/diff modes), nested-path writes (`view_state.zoom`), or any conditional logic.

**Static-export caveat:** both endpoints must be anywidgets. Vanilla ipywidgets controls (e.g. `IntSlider`) work in JupyterLab but have no ESM bundle in the static build, so they don't register in the host and `waitForModel` will time out for them. In JupyterLab live mode `jslink`/`jsdlink` work natively for any combination of widgets — the synthesized runtime only ships in static export.

Demo: `notebooks/11_jslink_demo.ipynb`.

#### Debugging escape hatch (do not use in app code)

The internal registry lives at `window.__myst_anywidget_hosts: Map<scope, Registry>`, keyed by `document.baseURI`. Useful from DevTools:

```javascript
const reg = window.__myst_anywidget_hosts.get(document.baseURI);
reg.all();                       // every registered model
reg.get('zoom_ctrl');            // lookup by any key
```

This is internal plumbing — not a stable API. Application widgets should always go through the `host` argument.

### Static HTML Export Challenges

When exporting to static HTML via JupyterBook:

1. **No Python Kernel**: Widgets must function purely client-side
2. **State Preservation**: Initial state from notebook execution is preserved via traits
3. **Communication**: Must use JavaScript-only patterns (no Python callbacks) — see the host runtime above
4. **Data**: Large datasets must be embedded or loaded from external sources

### Solutions for Static Export

1. **Trait-based State**: Use `sync=True` traits for all state that needs to persist
2. **Client-side Logic**: Implement all interactivity in JavaScript
3. **Cross-widget interop**: Use the `host` runtime; never assume a global registry
4. **Data Embedding**: Use base64 or JSON for small datasets, external files for large ones

## Widget Development Guidelines

### 1. Widget Structure
```
widget_name/
├── __init__.py       # Python widget class
├── widget.py         # Main widget implementation
├── widget.js         # JavaScript module
└── style.css         # Optional — many widgets in this repo inline CSS via `_css` instead
```

### 2. Python Widget Class
```python
import anywidget
import traitlets

class CustomWidget(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "widget.js"
    _css = pathlib.Path(__file__).parent / "style.css"  # Optional

    # Synchronized state
    value = traitlets.Int(0).tag(sync=True)
    data = traitlets.List([]).tag(sync=True)

    # Python-only state
    _private = traitlets.Any()
```

### 3. JavaScript Module
```javascript
export default {
    render({ model, el, host }) {
        // Create UI
        const container = document.createElement('div');
        el.appendChild(container);

        // React to state changes
        model.on('change:value', () => updateUI());

        // Handle user interactions
        container.addEventListener('click', () => {
            model.set('value', model.get('value') + 1);
            try { model.save_changes(); } catch (e) {}  // no-op in static export
        });

        // Cross-widget interop (static export only — host is undefined in kernel context):
        if (host) {
            host.waitForModel('other_widget_id').then(other => {
                other.on('change:value', () => { /* react */ });
            });
        }
    },
};
```

### 4. Testing Strategy
- Unit tests for Python logic
- JavaScript tests using Jest or similar
- Integration tests in notebooks
- Static export validation

## Composable Widget Patterns

### Base Classes
Create base widget classes that handle common functionality:

```python
class GeoWidget(anywidget.AnyWidget):
    """Base class for geospatial widgets"""
    bounds = traitlets.List([]).tag(sync=True)
    selected_features = traitlets.List([]).tag(sync=True)

    def filter_by_bounds(self, data):
        """Common geospatial filtering logic"""
        pass
```

## Current Implementation State

### Widgets Built
- **CounterWidget** (`widgets/counter_widget/`) — Simple counter with `+/-/Reset` buttons. No registry code; the static-export plugin registers it under its `widget_id` automatically.
- **LinkedCounterWidget** (`widgets/linked_counter/`) — Counter that links to another widget via the `link_to` trait. Supports mirror/sum/diff modes. Resolves the target through `host.waitForModel(link_to)`. Reads `linked_value` from upstream LinkedCounterWidgets, `value` from plain CounterWidgets, so chains compose.
- **WidgetBinder** (`widgets/widget_binder/`) — Static-export-only utility that wires `source.<source_field>` → `target.<target_field>` with an optional linear transform. Resolves both ends via `host.waitForModel`. Supports dotted target paths (e.g. `view_state.zoom`).
- **HurricaneDashboard** (`widgets/hurricane_dashboard/`) — Slider + checkbox panel that toggles lonboard layer visibility by resolving each layer model through `host.waitForModel(uuid)` and setting its `visible` trait.
- **NameExplorer** (`widgets/name_explorer/`) — Standalone, ~500-line vanilla-JS visualization for the SSA names notebook. Doesn't use cross-widget interop; included here for completeness.

## Known Limitations

1. **Cross-widget interop is JS-only**: The `host` runtime is only available in static-export builds. In a JupyterLab kernel context, `host` is `undefined`; use Python observers instead.
2. **Large Data**: Static exports embed widget state directly in the page JSON. Pages with multiple lonboard maps add up quickly.
3. **Browser Compatibility**: Modern browsers only (ES modules + shadow DOM required).
4. **Performance**: Complex interactions may be slower in static HTML.
5. **Lonboard `view_state` is uncontrolled** — see [`docs/lonboard-uncontrolled-viewstate.md`](docs/lonboard-uncontrolled-viewstate.md). External JS-only binders can't drive the viewport without a remount; bind to layer-level traits instead.

## Development Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run Jupyter Lab
jupyter lab

# Build the static site (runs prebuild → mystmd)
npm run build

# Or invoke mystmd directly (skips the prebuild step that re-executes lonboard notebooks)
myst build --html

# Serve static site
npm run serve   # or: python -m http.server -d _build/html

# Run tests
pytest tests/
```

## Installation Notes

### Critical Dependencies
- **mystmd**: any current version (the `anywidget` directive support has been in for a while now)
- **anywidget**: latest version
- **lonboard**: for geospatial visualization
- **jupyterlab**: for development environment

See [`INSTALL.md`](INSTALL.md) for full setup steps.

## Resources

- [Anywidget Documentation](https://anywidget.dev/)
- [Lonboard Documentation](https://developmentseed.org/lonboard/)
- [JupyterBook Documentation](https://jupyterbook.org/)
- [MyST Widgets Guide](https://mystmd.org/guide/widgets)
- [Backbone.js Events](https://backbonejs.org/#Events)
- [`plugins/README.md`](plugins/README.md) — full breakdown of the static-export plugin and its workarounds

## Contributing Upstream

Areas where we may need to contribute to upstream projects:

1. **JupyterBook/MyST**: lift the static-host runtime + cell-output anywidget rendering into mystmd / myst-theme proper (see `plugins/README.md` for the per-hack upstream notes)
2. **Anywidget**: standardize patterns for widget coordination
3. **Documentation**: examples of complex widget interactions
