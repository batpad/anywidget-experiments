"""NameExplorer — animated 144-year ranking of US baby names.

Trajectories are precomputed in the notebook and shipped to the browser as
plain int arrays keyed by "Name|Sex" (e.g. "Mary|F"). The widget handles
typeahead lookup, the sweeping line chart, the trajectory-twins panel,
era captions, and a couple of whimsy beats (confetti, rocket Easter egg).
"""
import pathlib

import anywidget
import traitlets


class NameExplorer(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "widget.js"
    _css = pathlib.Path(__file__).parent / "style.css"

    # {"Mary|F": [7065, 6919, ...]} — one int per year from year_start..year_end
    trajectories = traitlets.Dict({}).tag(sync=True)

    # {"Mary|F": {"year": 1921, "rank": 1, "count": 70963}}
    peaks = traitlets.Dict({}).tag(sync=True)

    # {"Mary|F": ["Margaret|F", "Helen|F", "Ruth|F", "Dorothy|F"]}
    twins = traitlets.Dict({}).tag(sync=True)

    # {"1880": "the gilded age — Mary, John, William ruled", ...}
    # Decade keys are strings because JSON does not allow int keys.
    era_captions = traitlets.Dict({}).tag(sync=True)

    # Sorted list of "Name|Sex" keys for the typeahead.
    name_index = traitlets.List([]).tag(sync=True)

    # Currently-selected key. Default picks Mary|F if present.
    selected = traitlets.Unicode("").tag(sync=True)

    # Optional birth year highlight (0 = none).
    birth_year = traitlets.Int(0).tag(sync=True)

    year_start = traitlets.Int(1880).tag(sync=True)
    year_end = traitlets.Int(2023).tag(sync=True)
