"""EqDashboard — depth-band legend filter + live aggregate stats panel.

Sits below the map in notebook 07. The legend has one row per depth band
with a colour swatch, label, count, and toggle checkbox. Toggling a band
writes to the layer's ``filter_categories`` (so the map's GPU-side
``DataFilterExtension(category_size=1)`` filter shows/hides those points).
The stats panel walks the per-row arrays in JS and recomputes count,
magnitude mean/max/min, depth mean, and tsunami count whenever either
the slider's ``filter_range`` or our ``filter_categories`` changes.

Phase 1 of this widget renders only the layout shell — no live wiring.
Phase 2 (separate edit) adds the polling loop and stats compute.

Per-row arrays are shipped as raw ``bytes`` (numpy array .tobytes()) and
reconstituted as typed arrays on the JS side. anywidget's standard buffer
protocol carries them efficiently in JupyterLab; the static-export plugin
inlines them as base64 in ``_myst_buffers`` so the page works without a
kernel.
"""
import pathlib

import anywidget
import traitlets

from ipywidgets import Widget, widget_serialization


class EqDashboard(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "widget.js"
    _css = pathlib.Path(__file__).parent / "style.css"

    # The lonboard ScatterplotLayer this dashboard reads from / writes to.
    layer = traitlets.Instance(Widget, allow_none=True).tag(
        sync=True, **widget_serialization
    )

    # Per-row arrays (~17k entries each). Sent as raw bytes; the JS side
    # constructs typed-array views.
    mag = traitlets.Bytes(b"").tag(sync=True)            # float32
    depth_km = traitlets.Bytes(b"").tag(sync=True)       # float32
    depth_band = traitlets.Bytes(b"").tag(sync=True)     # uint8
    tsunami = traitlets.Bytes(b"").tag(sync=True)        # uint8
    filter_value = traitlets.Bytes(b"").tag(sync=True)   # float64 (seconds)

    # Total row count — duplicated for convenience so JS doesn't have to
    # divide by typed-array element size to figure it out.
    n_total = traitlets.Int(0).tag(sync=True)

    # Band metadata. One entry per band, in display order:
    #   {"index": 0, "label": "Shallow", "color": [r,g,b,a],
    #    "min_km": 0.0, "max_km": 50.0}
    bands = traitlets.List([]).tag(sync=True)
