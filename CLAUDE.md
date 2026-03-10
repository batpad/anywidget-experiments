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
- **Recent addition**: PR #2602 added anywidget support (merged)
- **Important**: Must use latest mystmd version (>=1.3.0) for anywidget support
- **Challenge**: Client-side inter-widget communication not yet fully supported
- **Opportunity**: We may need to contribute upstream to enable this

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

### Inter-Widget Communication Patterns

#### Pattern 1: Shared State Model (Recommended)
Widgets share a common data model that acts as a communication bus:

```javascript
// Create a shared state manager
class WidgetStateManager {
    constructor() {
        this.state = {};
        this.listeners = {};
    }
    
    set(key, value) {
        this.state[key] = value;
        this.notify(key, value);
    }
    
    subscribe(key, callback) {
        if (!this.listeners[key]) this.listeners[key] = [];
        this.listeners[key].push(callback);
    }
    
    notify(key, value) {
        if (this.listeners[key]) {
            this.listeners[key].forEach(cb => cb(value));
        }
    }
}

// Global instance (in static HTML context)
window.__widgetState = window.__widgetState || new WidgetStateManager();
```

#### Pattern 2: Custom Events
Use browser's native CustomEvent API for widget communication:

```javascript
// Widget A: Dispatch event
el.dispatchEvent(new CustomEvent('widget-update', {
    detail: { widgetId: 'mapWidget', data: selectedPoints },
    bubbles: true
}));

// Widget B: Listen for events
document.addEventListener('widget-update', (e) => {
    if (e.detail.widgetId === 'mapWidget') {
        // React to map widget updates
    }
});
```

#### Pattern 3: Backbone Model Sharing
Leverage anywidget's existing Backbone infrastructure:

```javascript
// In widget initialization
export function initialize({ model }) {
    // Store reference globally for cross-widget access
    window.__widgetModels = window.__widgetModels || {};
    window.__widgetModels[model.get('_model_id')] = model;
}

// In another widget
export function render({ model, el }) {
    // Access another widget's model
    const otherModel = window.__widgetModels['other-widget-id'];
    if (otherModel) {
        otherModel.on('change:value', () => {
            // React to changes
        });
    }
}
```

### Static HTML Export Challenges

When exporting to static HTML via JupyterBook:

1. **No Python Kernel**: Widgets must function purely client-side
2. **State Preservation**: Initial state from notebook execution is preserved via traits
3. **Communication**: Must use JavaScript-only patterns (no Python callbacks)
4. **Data**: Large datasets must be embedded or loaded from external sources

### Solutions for Static Export

1. **Trait-based State**: Use `sync=True` traits for all state that needs to persist
2. **Client-side Logic**: Implement all interactivity in JavaScript
3. **LocalStorage**: For persistence across page reloads
4. **Data Embedding**: Use base64 or JSON for small datasets, external files for large ones

## Widget Development Guidelines

### 1. Widget Structure
```
widget_name/
├── __init__.py       # Python widget class
├── widget.py         # Main widget implementation
├── widget.js         # JavaScript module
└── style.css        # Optional styles
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
export function initialize({ model }) {
    // One-time setup
    // Register global state manager
    // Set up cross-widget communication
}

export function render({ model, el }) {
    // Create UI
    const container = document.createElement('div');
    el.appendChild(container);
    
    // Set up event handlers
    model.on('change:value', () => updateUI());
    
    // Handle user interactions
    container.addEventListener('click', () => {
        model.set('value', model.get('value') + 1);
        model.save_changes();
    });
}
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

### Widget Registry
Maintain a registry of active widgets for coordination:

```javascript
class WidgetRegistry {
    constructor() {
        this.widgets = new Map();
    }
    
    register(id, widget) {
        this.widgets.set(id, widget);
        this.notifyRegistration(id, widget);
    }
    
    get(id) {
        return this.widgets.get(id);
    }
    
    broadcast(event, data) {
        this.widgets.forEach(widget => {
            if (widget.handleEvent) {
                widget.handleEvent(event, data);
            }
        });
    }
}
```

## Implementation Priorities

### Phase 1: Proof of Concept
1. Simple widget with anywidget
2. Basic lonboard integration
3. Two widgets communicating client-side
4. Static HTML export test

### Phase 2: Core Widgets
1. Time slider widget
2. Category selector widget
3. Statistics display widget
4. Filter controls widget

### Phase 3: Advanced Integration
1. Complex multi-widget coordination
2. Large dataset handling
3. Performance optimization
4. Upstream contributions to JupyterBook

## Known Limitations

1. **Client-side Communication**: Not officially supported in JupyterBook yet
2. **Large Data**: Static exports have size limitations
3. **Browser Compatibility**: Modern browsers only (ES modules required)
4. **Performance**: Complex interactions may be slower in static HTML

## Development Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run Jupyter Lab
jupyter lab

# Build JupyterBook (using MyST directly)
myst build --html

# Serve static site
python -m http.server -d _build/html

# Run tests
pytest tests/
```

## Installation Notes

### Critical Dependencies
- **mystmd**: Must use version >=1.3.0 which includes anywidget support (PR #2602)
- **anywidget**: Latest version for best compatibility
- **lonboard**: For geospatial visualization
- **jupyterlab**: For development environment

### Installing MyST with Anywidget Support
```bash
# Install via npm (recommended for latest version)
npm install -g mystmd

# Verify version
myst --version  # Should be >=1.3.0
```

## Resources

- [Anywidget Documentation](https://anywidget.dev/)
- [Lonboard Documentation](https://developmentseed.org/lonboard/)
- [JupyterBook Documentation](https://jupyterbook.org/)
- [MyST Widgets Guide](https://mystmd.org/guide/widgets)
- [Backbone.js Events](https://backbonejs.org/#Events)
- [MyST PR #2602 - Anywidget Support](https://github.com/jupyter-book/mystmd/pull/2602)

## Contributing Upstream

Areas where we may need to contribute to upstream projects:

1. **JupyterBook/MyST**: Client-side widget communication support
2. **Anywidget**: Enhanced patterns for widget coordination
3. **Documentation**: Examples of complex widget interactions

## Success Metrics

- [ ] Widgets work in JupyterLab
- [ ] Widgets work in static HTML exports  
- [ ] Inter-widget communication functions without Python kernel
- [ ] Performance with 100k+ data points
- [ ] Clear documentation and examples
- [ ] Reusable patterns for community