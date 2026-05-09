"""
Chart widget for high-performance interactive charting in Jupyter notebooks.
Using Chart.js for reliable cross-browser support.
"""
import anywidget
import traitlets
import pathlib
import numpy as np


class ChartWidget(anywidget.AnyWidget):
    """An interactive charting widget powered by Chart.js."""
    
    # Path to the JavaScript module (built version)
    _esm = pathlib.Path(__file__).parent / "dist" / "widget.js"
    _css = pathlib.Path(__file__).parent / "style.css"
    
    # Widget state synchronized between Python and JavaScript
    chart_type = traitlets.Unicode("line").tag(sync=True)
    series_data = traitlets.List([]).tag(sync=True)
    chart_options = traitlets.Dict({}).tag(sync=True)
    
    # Chart configuration
    width = traitlets.Int(800).tag(sync=True)
    height = traitlets.Int(400).tag(sync=True)
    title = traitlets.Unicode("").tag(sync=True)
    x_label = traitlets.Unicode("").tag(sync=True)
    y_label = traitlets.Unicode("").tag(sync=True)
    
    # Interaction state
    animation_enabled = traitlets.Bool(True).tag(sync=True)
    tooltips_enabled = traitlets.Bool(True).tag(sync=True)
    legend_enabled = traitlets.Bool(True).tag(sync=True)
    
    # Events
    clicked_point = traitlets.Dict({}).tag(sync=True)
    hover_point = traitlets.Dict({}).tag(sync=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    
    def add_series(self, x=None, y=None, data=None, series_type=None, name=None, color=None, **options):
        """Add a new data series to the chart.
        
        Args:
            x: X values (optional if data is provided)
            y: Y values (optional if data is provided)
            data: List of [x, y] pairs (alternative to x, y)
            series_type: Type of series ('line', 'scatter', 'bar', etc.)
            name: Name of the series
            color: Color of the series
            **options: Additional Chart.js dataset options
        """
        if data is not None:
            # Data provided as [[x, y], ...] pairs
            if isinstance(data, np.ndarray):
                data = data.tolist()
        elif x is not None and y is not None:
            # Data provided as separate x, y arrays
            if isinstance(x, np.ndarray):
                x = x.tolist()
            if isinstance(y, np.ndarray):
                y = y.tolist()
            data = [[x[i], y[i]] for i in range(len(x))]
        else:
            raise ValueError("Must provide either 'data' or both 'x' and 'y'")
        
        series = {
            'type': series_type or self.chart_type,
            'data': data,
            'name': name or f'Series {len(self.series_data) + 1}',
        }
        
        if color:
            series['color'] = color
            
        # Add any additional options
        series.update(options)
        
        current_series = list(self.series_data)
        current_series.append(series)
        self.series_data = current_series
    
    def clear_series(self):
        """Clear all data series."""
        self.series_data = []
    
    def update_series(self, index, x=None, y=None, data=None):
        """Update an existing series with new data."""
        if data is not None:
            if isinstance(data, np.ndarray):
                data = data.tolist()
        elif x is not None and y is not None:
            if isinstance(x, np.ndarray):
                x = x.tolist()
            if isinstance(y, np.ndarray):
                y = y.tolist()
            data = [[x[i], y[i]] for i in range(len(x))]
        else:
            raise ValueError("Must provide either 'data' or both 'x' and 'y'")
        
        if 0 <= index < len(self.series_data):
            current_series = list(self.series_data)
            current_series[index]['data'] = data
            self.series_data = current_series
    
    def set_options(self, **options):
        """Update chart options."""
        self.chart_options = {**self.chart_options, **options}