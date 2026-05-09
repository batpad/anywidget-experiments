"""
DateRangeFilterBinder — a tiny anywidget that wires a TerraDateRangeSlider's
startDate/endDate to a lonboard layer's filter_range, entirely in JS so it
works on a static page with no kernel attached.

Construct it with the slider and the layer:

    binder = DateRangeFilterBinder(slider=slider, layer=layer)
    display(slider, lonboard.Map(layer), binder)

The binder polls the live `<terra-date-range-slider>` Lit element for
startDate/endDate changes (the only place the user's input is reliably
visible in static export — see widget.js for the gory details) and writes
`[start_s, end_s]` to every registered proxy of the layer's model_id. In
JupyterLab the kernel-side widget manager keeps a single canonical model
per id, so the binder falls back to `widget_manager.get_model(layer)` and
writes once.

Layer plumbing requirements:
- The layer must be a lonboard layer (or any anywidget) with `filter_range`
  as a sync trait. The intended setup is `extensions=[DataFilterExtension(
  filter_size=1)]` plus `get_filter_value=<seconds-since-epoch column>`.
- Use seconds, not milliseconds: DataFilterExtension compares as float32
  in the shader and ms timestamps (~1.78e12) overflow the 2^24 exact-
  integer range. Seconds (~1.78e9) round-trip cleanly.
- Cast pandas datetimes via `.astype("datetime64[s]").astype("int64")` —
  modern pandas defaults to `datetime64[us]`, so a naive `// 10**9` is
  off by 1000x.
"""
import anywidget
import traitlets
import pathlib

from ipywidgets import Widget, widget_serialization


class DateRangeFilterBinder(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "widget.js"

    slider = traitlets.Instance(Widget, allow_none=True).tag(
        sync=True, **widget_serialization
    )
    layer = traitlets.Instance(Widget, allow_none=True).tag(
        sync=True, **widget_serialization
    )
