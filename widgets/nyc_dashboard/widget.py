"""NYCDashboard — bucket toggles + live stats for the NYC buildings notebook.

Resolves lonboard PolygonLayer model_ids passed in `layer_uuids` and toggles
their `visible` trait based on user checkbox interaction. Stats are
precomputed in Python for every possible bucket-on/off combination
(2**N states for N buckets) so the JS just does a dict lookup on each tick.
"""
import pathlib

import anywidget
import traitlets


class NYCDashboard(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "widget.js"
    _css = pathlib.Path(__file__).parent / "style.css"

    title = traitlets.Unicode("NYC Buildings").tag(sync=True)
    subtitle = traitlets.Unicode("").tag(sync=True)

    # {"b_1": "uuid", "b_2_4": "uuid", ...} — one entry per bucket
    layer_uuids = traitlets.Dict({}).tag(sync=True)

    # Display order + UI metadata. Each entry:
    #   {"key": "b_1", "label": "1 floor", "color": [r, g, b, a], "count": 1234}
    bucket_definitions = traitlets.List([]).tag(sync=True)

    # Current on/off state per bucket. Defaults to all on.
    bucket_states = traitlets.Dict({}).tag(sync=True)

    # Precomputed stats keyed by bit-string in bucket_definitions order.
    # E.g. with 5 buckets, "11111" = all on, "00001" = only the last bucket.
    # Each value: {"count": int, "total_floor_area_m2": int, "mean_levels": float}
    stats_tables = traitlets.Dict({}).tag(sync=True)
