# Installation and Setup Guide

## Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher (for MyST)
- Git

## Quick Start

### 1. Clone the Repository

```bash
cd /Users/sanjay/seed/anywidget-experiments
```

### 2. Create a Virtual Environment (Recommended)

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 4. Install MyST with Anywidget Support

**Important:** You need the latest version of MyST (>=1.3.0) for anywidget support.

```bash
npm install -g mystmd
# Or if you prefer local installation:
npm install
```

Verify the installation:
```bash
myst --version  # Should be >=1.3.0
```

### 5. Launch Jupyter Lab

```bash
jupyter lab
```

Navigate to the `notebooks/` directory and open `01_getting_started.ipynb` to begin.

## Testing the Installation

### Test Widgets in Jupyter

1. Open Jupyter Lab: `jupyter lab`
2. Navigate to `notebooks/01_getting_started.ipynb`
3. Run all cells
4. Verify that:
   - Counter widgets appear and are interactive
   - Linked widgets update when source widgets change
   - No errors appear in the browser console

### Test Static HTML Export

1. Build the static site:
```bash
myst build --html
```

2. Serve the static site:
```bash
python -m http.server 8000 -d _build/html
```

3. Open http://localhost:8000 in your browser
4. Navigate to the notebooks section
5. Verify that widgets are still interactive without a Python kernel

## Troubleshooting

### Issue: Widgets not appearing in Jupyter

**Solution:** Ensure Jupyter widgets extension is enabled:
```bash
jupyter labextension list
```

If not listed, install:
```bash
jupyter labextension install @jupyter-widgets/jupyterlab-manager
```

### Issue: MyST build fails

**Solution:** Check MyST version:
```bash
myst --version
```

Must be >=1.3.0 for anywidget support. Update if needed:
```bash
npm update -g mystmd
```

### Issue: Import errors for widgets

**Solution:** The notebooks add the parent directory to the Python path. If running outside notebooks, ensure the widgets directory is in your Python path:

```python
import sys
sys.path.insert(0, '/Users/sanjay/seed/anywidget-experiments')
```

### Issue: Static widgets not interactive

**Possible causes:**
1. Browser blocking JavaScript - check console for errors
2. MyST version too old - update to latest
3. Widget JavaScript errors - check browser console

## Development Workflow

### Creating New Widgets

1. Create a new directory in `widgets/`:
```bash
mkdir widgets/my_widget
```

2. Create the widget files:
```bash
touch widgets/my_widget/__init__.py
touch widgets/my_widget/widget.py
touch widgets/my_widget/widget.js
touch widgets/my_widget/style.css
```

3. Implement the widget following the patterns in existing widgets

### Testing Changes

After making changes:

1. Restart Jupyter kernel
2. Reload the browser page
3. Re-run notebook cells
4. Test in static export

### Building Documentation

Build the full documentation site:
```bash
myst build --html
```

Clean build (if needed):
```bash
myst clean
myst build --html
```

## Next Steps

1. **Explore Examples**: Start with `notebooks/01_getting_started.ipynb`
2. **Read Documentation**: See `CLAUDE.md` for technical details
3. **Create Custom Widgets**: Follow patterns in `widgets/counter_widget/`
4. **Test Static Export**: Verify widgets work without Python kernel
5. **Contribute**: Create new widgets and examples

## Support

For issues or questions:
- Check the troubleshooting section above
- Review `CLAUDE.md` for technical details
- Open an issue on GitHub with details about your environment and error messages