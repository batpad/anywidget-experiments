"""
Matplotlib-compatible API for ChartGPU widget.
"""
import numpy as np
from .widget import ChartGPUWidget


class ChartGPUPlot:
    """A matplotlib-style plotting interface for ChartGPU."""
    
    def __init__(self, figsize=(10, 6), gpu=True):
        """Initialize a new ChartGPU plot.
        
        Args:
            figsize: Tuple of (width, height) in inches (converted to pixels)
            gpu: Whether to use GPU acceleration (always True for ChartGPU)
        """
        # Convert inches to pixels (assuming 100 DPI)
        self.width = int(figsize[0] * 100)
        self.height = int(figsize[1] * 100)
        
        self.widget = ChartGPUWidget(
            width=self.width,
            height=self.height
        )
        
        self.series = []
        self.colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
                       '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
        self.color_index = 0
    
    def plot(self, x, y=None, label=None, color=None, marker=None, linestyle='-', **kwargs):
        """Plot y versus x as lines and/or markers.
        
        Args:
            x: X data
            y: Y data (if None, x is used as y and indices as x)
            label: Label for the series
            color: Color of the line
            marker: Marker style (currently ignored, using line)
            linestyle: Line style (currently ignored)
        """
        if y is None:
            y = x
            x = np.arange(len(y))
        
        # Convert to list of [x, y] pairs
        if isinstance(x, np.ndarray):
            x = x.tolist()
        if isinstance(y, np.ndarray):
            y = y.tolist()
        
        data = [[x[i], y[i]] for i in range(len(x))]
        
        # Auto-assign color if not provided
        if color is None:
            color = self.colors[self.color_index % len(self.colors)]
            self.color_index += 1
        
        self.widget.add_series(
            data, 
            series_type="line",
            name=label or f"Series {len(self.series) + 1}",
            color=color
        )
        
        self.series.append({
            'data': data,
            'label': label,
            'color': color,
            'type': 'line'
        })
        
        return self
    
    def scatter(self, x, y, s=None, c=None, alpha=1.0, label=None, **kwargs):
        """Create a scatter plot.
        
        Args:
            x: X data
            y: Y data
            s: Size of markers (currently ignored)
            c: Color of markers
            alpha: Transparency (currently ignored)
            label: Label for the series
        """
        # Convert to list of [x, y] pairs
        if isinstance(x, np.ndarray):
            x = x.tolist()
        if isinstance(y, np.ndarray):
            y = y.tolist()
        
        data = [[x[i], y[i]] for i in range(len(x))]
        
        # Auto-assign color if not provided
        if c is None:
            c = self.colors[self.color_index % len(self.colors)]
            self.color_index += 1
        
        self.widget.add_series(
            data,
            series_type="scatter",
            name=label or f"Series {len(self.series) + 1}",
            color=c
        )
        
        self.series.append({
            'data': data,
            'label': label,
            'color': c,
            'type': 'scatter'
        })
        
        return self
    
    def bar(self, x, height, width=0.8, label=None, color=None, **kwargs):
        """Create a bar plot.
        
        Args:
            x: X positions of bars
            height: Heights of bars
            width: Width of bars (currently ignored)
            label: Label for the series
            color: Color of bars
        """
        # Convert to list of [x, y] pairs
        if isinstance(x, np.ndarray):
            x = x.tolist()
        if isinstance(height, np.ndarray):
            height = height.tolist()
        
        data = [[x[i], height[i]] for i in range(len(x))]
        
        # Auto-assign color if not provided
        if color is None:
            color = self.colors[self.color_index % len(self.colors)]
            self.color_index += 1
        
        self.widget.add_series(
            data,
            series_type="bar",
            name=label or f"Series {len(self.series) + 1}",
            color=color
        )
        
        self.series.append({
            'data': data,
            'label': label,
            'color': color,
            'type': 'bar'
        })
        
        return self
    
    def xlabel(self, label):
        """Set the x-axis label."""
        self.widget.x_label = label
        return self
    
    def ylabel(self, label):
        """Set the y-axis label."""
        self.widget.y_label = label
        return self
    
    def title(self, title):
        """Set the plot title."""
        self.widget.title = title
        return self
    
    def legend(self, loc='best', **kwargs):
        """Enable legend (location currently ignored)."""
        # ChartGPU handles legend automatically
        return self
    
    def grid(self, visible=True, **kwargs):
        """Enable or disable grid."""
        # ChartGPU handles grid through theme
        return self
    
    def xlim(self, xmin=None, xmax=None):
        """Set x-axis limits."""
        if xmin is not None and xmax is not None:
            self.widget.set_zoom(x_range=[xmin, xmax])
        return self
    
    def ylim(self, ymin=None, ymax=None):
        """Set y-axis limits."""
        if ymin is not None and ymax is not None:
            self.widget.set_zoom(y_range=[ymin, ymax])
        return self
    
    def show(self):
        """Display the interactive ChartGPU widget."""
        return self.widget
    
    def figure(self, figsize=None):
        """Create a new figure (for compatibility)."""
        if figsize:
            self.width = int(figsize[0] * 100)
            self.height = int(figsize[1] * 100)
            self.widget.width = self.width
            self.widget.height = self.height
        return self
    
    def clf(self):
        """Clear the current figure."""
        self.widget.clear_series()
        self.series = []
        self.color_index = 0
        return self
    
    def savefig(self, filename, format='png', **kwargs):
        """Save the figure (triggers download in browser)."""
        self.widget.export_image(format=format)
        return self


# Convenience function to mimic plt.subplots()
def subplots(nrows=1, ncols=1, figsize=(10, 6), **kwargs):
    """Create a figure and a set of subplots (simplified version).
    
    Note: Currently only supports single plot (nrows=1, ncols=1)
    """
    if nrows != 1 or ncols != 1:
        raise NotImplementedError("ChartGPU currently only supports single plots")
    
    fig = ChartGPUPlot(figsize=figsize)
    return fig, fig