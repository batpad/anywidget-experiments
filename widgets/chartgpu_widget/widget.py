"""
ChartGPU widget for high-performance GPU-accelerated charting in Jupyter notebooks.
"""
import anywidget
import traitlets
import pathlib
import numpy as np


class ChartGPUWidget(anywidget.AnyWidget):
    """A high-performance charting widget powered by WebGPU via ChartGPU library."""
    
    # Path to the JavaScript module (built version)
    _esm = pathlib.Path(__file__).parent / "dist" / "widget.js"
    _css = pathlib.Path(__file__).parent / "style.css"
    
    # Widget state synchronized between Python and JavaScript
    chart_type = traitlets.Unicode("line").tag(sync=True)
    series_data = traitlets.List([]).tag(sync=True)
    series_visibility = traitlets.List([]).tag(sync=True)
    chart_options = traitlets.Dict({}).tag(sync=True)
    theme = traitlets.Unicode("light").tag(sync=True)
    
    # Chart configuration
    width = traitlets.Int(800).tag(sync=True)
    height = traitlets.Int(400).tag(sync=True)
    title = traitlets.Unicode("").tag(sync=True)
    x_label = traitlets.Unicode("").tag(sync=True)
    y_label = traitlets.Unicode("").tag(sync=True)
    
    # Interaction state
    zoom_enabled = traitlets.Bool(True).tag(sync=True)
    tooltips_enabled = traitlets.Bool(True).tag(sync=True)
    crosshair_enabled = traitlets.Bool(True).tag(sync=True)
    
    # Performance monitoring
    show_fps = traitlets.Bool(False).tag(sync=True)
    gpu_available = traitlets.Bool(False).tag(sync=True)
    
    # Events
    selection = traitlets.Dict({}).tag(sync=True)
    hover_data = traitlets.Dict({}).tag(sync=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.observe(self._on_series_change, names=['series_data'])
    
    def _on_series_change(self, change):
        """Handle series data changes."""
        pass
    
    def add_series(self, data, series_type=None, name=None, color=None):
        """Add a new data series to the chart."""
        if isinstance(data, np.ndarray):
            data = data.tolist()
        
        series = {
            'type': series_type or self.chart_type,
            'data': data,
            'name': name or f'Series {len(self.series_data) + 1}',
        }
        
        if color:
            series['color'] = color
        
        current_series = list(self.series_data)
        current_series.append(series)
        self.series_data = current_series
    
    def clear_series(self):
        """Clear all data series."""
        self.series_data = []
    
    def update_series(self, index, data):
        """Update an existing series with new data."""
        if isinstance(data, np.ndarray):
            data = data.tolist()
        
        if 0 <= index < len(self.series_data):
            current_series = list(self.series_data)
            current_series[index]['data'] = data
            self.series_data = current_series
    
    def append_data(self, series_index, new_points):
        """Append new data points to an existing series (for streaming)."""
        if isinstance(new_points, np.ndarray):
            new_points = new_points.tolist()
        
        if 0 <= series_index < len(self.series_data):
            current_series = list(self.series_data)
            current_series[series_index]['data'].extend(new_points)
            self.series_data = current_series
    
    def set_zoom(self, x_range=None, y_range=None):
        """Set the zoom range programmatically."""
        zoom_config = {}
        if x_range:
            zoom_config['x'] = {'min': x_range[0], 'max': x_range[1]}
        if y_range:
            zoom_config['y'] = {'min': y_range[0], 'max': y_range[1]}
        
        self.chart_options = {**self.chart_options, 'zoom': zoom_config}
    
    def reset_zoom(self):
        """Reset zoom to show all data."""
        self.chart_options = {**self.chart_options, 'resetZoom': True}
    
    def export_image(self, format='png'):
        """Export the chart as an image."""
        self.send({'type': 'export', 'format': format})