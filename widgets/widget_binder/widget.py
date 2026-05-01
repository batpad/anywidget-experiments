"""
WidgetBinder — a tiny anywidget that wires a source widget's trait change to a
target widget's trait, entirely in JS at render time. Used to demonstrate
cross-widget interop in MyST static export, e.g. "counter value drives lonboard
map zoom" with no kernel.

The binding is identified by:
  source_widget_id     — looked up in window.__myst_widgets (matches widget_id,
                         _anywidget_id, or model_id)
  source_field         — trait name to subscribe to on the source
  target_widget_id     — same lookup as source
  target_field         — dotted path on target ("view_state.zoom" merges into
                         the existing view_state object)
  multiplier, offset   — linear transform applied to the source value
                         (target = source * multiplier + offset)
"""
import anywidget
import traitlets
import pathlib


class WidgetBinder(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "widget.js"

    source_widget_id = traitlets.Unicode("").tag(sync=True)
    source_field = traitlets.Unicode("value").tag(sync=True)
    target_widget_id = traitlets.Unicode("").tag(sync=True)
    target_field = traitlets.Unicode("").tag(sync=True)
    multiplier = traitlets.Float(1.0).tag(sync=True)
    offset = traitlets.Float(0.0).tag(sync=True)
    label = traitlets.Unicode("").tag(sync=True)
