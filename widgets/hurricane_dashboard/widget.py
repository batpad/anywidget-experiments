"""HurricaneDashboard — slider + layer-toggle panel that drives a lonboard map.

The notebook builds one lonboard layer per flood-depth bucket (dry, shallow,
deep, drowned) plus a flood polygon, hospitals, and an optional basemap.
The dashboard resolves layer models through ``host.getModel`` by UUID and
toggles layer visibility based on the slider state. All stats are precomputed
in Python and shipped as a small ``stats_tables`` list.
"""
import pathlib

import anywidget
import traitlets


class HurricaneDashboard(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "widget.js"
    _css = pathlib.Path(__file__).parent / "style.css"

    storm_name = traitlets.Unicode("Hurricane Helene").tag(sync=True)
    storm_subtitle = traitlets.Unicode(
        "Asheville, NC · 27 Sept 2024"
    ).tag(sync=True)

    # {"flood": "uuid", "buildings_shallow": "uuid", ...}
    layer_uuids = traitlets.Dict({}).tag(sync=True)

    # Initial visibility per layer key (overrides the layer's own default).
    initial_visible = traitlets.Dict({}).tag(sync=True)

    # 0 = "all buildings", 1 = "≥ shallow", 2 = "≥ deep", 3 = "drowned only"
    threshold = traitlets.Int(0).tag(sync=True)
    threshold_labels = traitlets.List(
        ["all buildings", "≥ shallow flood", "≥ knee-deep", "drowned"]
    ).tag(sync=True)

    # threshold_layer_map[t] = list of building-layer keys that should be
    # visible at threshold t. Hospital + flood + basemap layers are
    # controlled by the user-toggleable checkboxes, not the threshold.
    threshold_layer_map = traitlets.List([]).tag(sync=True)

    # Per-threshold aggregate stats:
    #   [{"buildings": int, "hospitals": int, "people_est": int}, ...]
    stats_tables = traitlets.List([]).tag(sync=True)

    # Layers that get a user-facing toggle checkbox, in display order.
    # Each entry: {"key": "flood", "label": "Flood extent"}
    toggle_layers = traitlets.List([]).tag(sync=True)
