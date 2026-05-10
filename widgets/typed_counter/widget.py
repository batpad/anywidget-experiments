"""TypeScript counter widget — the golden template for new anywidgets in this repo.

Identical behaviour to ``widgets.counter_widget.CounterWidget`` but the JS side is
written in TypeScript and bundled with esbuild. Copy this directory and rename the
class when starting a new bundled-TS widget.
"""

import pathlib

import anywidget
import traitlets


class TypedCounterWidget(anywidget.AnyWidget):
    """Counter widget with increment/decrement buttons (TypeScript implementation)."""

    _esm = pathlib.Path(__file__).parent / "dist" / "widget.js"
    _css = pathlib.Path(__file__).parent / "style.css"

    value = traitlets.Int(0).tag(sync=True)
    label = traitlets.Unicode("Counter").tag(sync=True)
    widget_id = traitlets.Unicode("typed_counter_1").tag(sync=True)
    last_change = traitlets.Dict({}).tag(sync=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.observe(self._on_value_change, names=["value"])

    def _on_value_change(self, change):
        self.last_change = {
            "old": change["old"],
            "new": change["new"],
            "widget_id": self.widget_id,
        }

    def reset(self) -> None:
        self.value = 0

    def increment(self, amount: int = 1) -> None:
        self.value += amount

    def decrement(self, amount: int = 1) -> None:
        self.value -= amount
