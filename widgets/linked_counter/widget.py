"""
Linked counter widget that responds to other counter widgets.
Demonstrates inter-widget communication patterns.
"""
import anywidget
import traitlets
import pathlib


class LinkedCounterWidget(anywidget.AnyWidget):
    """A counter widget that can be linked to other counters."""
    
    _esm = pathlib.Path(__file__).parent / "widget.js"
    _css = pathlib.Path(__file__).parent / "style.css"
    
    # Widget state
    value = traitlets.Int(0).tag(sync=True)
    label = traitlets.Unicode("Linked Counter").tag(sync=True)
    widget_id = traitlets.Unicode("linked_counter_1").tag(sync=True)
    
    # Linking configuration
    link_to = traitlets.Unicode("").tag(sync=True)  # ID of widget to link to
    link_mode = traitlets.Unicode("mirror").tag(sync=True)  # mirror, sum, diff
    
    # Status
    status = traitlets.Unicode("Ready").tag(sync=True)
    linked_value = traitlets.Int(0).tag(sync=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.observe(self._on_value_change, names=['value'])
        
    def _on_value_change(self, change):
        """Update status when value changes."""
        self.status = f"Value changed: {change['old']} → {change['new']}"