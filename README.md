# NOTE: None of this actually works

This is some experiments with trying out creating some composable linked anywidget widgets in Jupyter notebooks and attempt to have them work statically exported as HTML via JupyterBook.

This is currently mostly vibe-coded slop - the widgets work in a `jupyter lab` environment, but currently not in static exports.

# Anywidget Composable Geospatial Widgets

Interactive geospatial widgets for Jupyter notebooks that work in static HTML exports.

## Overview

This project demonstrates how to build composable, interactive widgets using `anywidget` that:
- Work seamlessly in Jupyter notebooks
- Enable inter-widget communication
- Function in static HTML exports via JupyterBook/MyST
- Integrate with geospatial visualization libraries like `lonboard`

## Quick Start

### Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install MyST with anywidget support:
```bash
npm install -g mystmd
# or if you prefer using the package.json:
npm install
```

3. Run Jupyter Lab:
```bash
jupyter lab
```

### Building Static Site

Build the static HTML site with MyST:
```bash
myst build --html
# or
npm run build
```

Serve the static site locally:
```bash
python -m http.server -d _build/html
# or
npm run serve
```

## Project Structure

```
├── widgets/              # Reusable anywidget modules
├── notebooks/            # Tutorial notebooks
├── examples/             # Advanced examples
├── tests/                # Widget tests
├── CLAUDE.md            # Technical documentation
└── myst.yml             # MyST/JupyterBook configuration
```

## Key Features

### 🎯 Composable Widgets
- Modular widget design
- Shared state management
- Event-based communication

### 🗺️ Geospatial Focus
- Integration with lonboard
- GPU-accelerated map rendering
- Support for large datasets

### 📊 Static Export Support
- Widgets work without Python kernel
- Client-side interactivity preserved
- JupyterBook/MyST compatible

### 🔄 Inter-Widget Communication
- Multiple communication patterns
- Backbone model sharing
- Custom event system

## Examples

### Simple Counter Widget
A basic widget demonstrating anywidget fundamentals.

### Map with Time Slider
Interactive map visualization with temporal controls.

### Linked Statistical Views
Multiple widgets sharing selection state.

### Spatial Filtering
Draw regions on a map to filter data in connected widgets.

## Development

### Creating a New Widget

1. Create a new directory in `widgets/`
2. Add Python class extending `anywidget.AnyWidget`
3. Create JavaScript module with `render` function
4. Add widget to a notebook for testing

### Testing

Run the test suite:
```bash
pytest tests/
```

### Contributing

See [CLAUDE.md](CLAUDE.md) for technical details and contribution guidelines.

## Resources

- [Anywidget Documentation](https://anywidget.dev/)
- [Lonboard Documentation](https://developmentseed.org/lonboard/)
- [MyST Documentation](https://mystmd.org/)
- [JupyterBook Documentation](https://jupyterbook.org/)

## License

MIT

## Acknowledgments

This project builds on the excellent work of:
- The anywidget team for simplifying widget development
- Development Seed for lonboard
- The JupyterBook/MyST team for static publishing support
