"""
Matplotlib-compatible API for Chart widget.
"""
import numpy as np
from .widget import ChartWidget


class ChartPlot:
    """A matplotlib-style plotting interface for interactive charts."""
    
    def __init__(self, figsize=(10, 6)):
        """Initialize a new chart plot.
        
        Args:
            figsize: Tuple of (width, height) in inches (converted to pixels)
        """
        # Convert inches to pixels (assuming 100 DPI)
        self.width = int(figsize[0] * 100)
        self.height = int(figsize[1] * 100)
        
        self.widget = ChartWidget(
            width=self.width,
            height=self.height
        )
        
        self.colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
                       '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
        self.color_index = 0
    
    def plot(self, x, y=None, label=None, color=None, marker=None, linestyle='-', linewidth=2, alpha=1.0, **kwargs):
        """Plot y versus x as lines and/or markers.
        
        Args:
            x: X data
            y: Y data (if None, x is used as y and indices as x)
            label: Label for the series
            color: Color of the line
            marker: Marker style (converts to scatter if 'o')
            linestyle: Line style ('-', '--', ':', '' for none)
            linewidth: Width of the line
            alpha: Transparency
        """
        if y is None:
            y = x
            x = np.arange(len(y))
        
        # Auto-assign color if not provided
        if color is None:
            color = self.colors[self.color_index % len(self.colors)]
            self.color_index += 1
        
        # Determine chart type based on marker and linestyle
        if marker == 'o' and linestyle in ['', 'none', None]:
            series_type = 'scatter'
        else:
            series_type = 'line'
        
        # Prepare options
        options = {
            'tension': 0 if linestyle == '-' else 0.4 if linestyle == '--' else 0.1,
            'borderWidth': linewidth,
            'pointRadius': 3 if marker else 0
        }
        
        self.widget.add_series(
            x=x,
            y=y,
            series_type=series_type,
            name=label,
            color=color,
            **options
        )
        
        return self
    
    def scatter(self, x, y, s=None, c=None, alpha=1.0, label=None, **kwargs):
        """Create a scatter plot.
        
        Args:
            x: X data
            y: Y data
            s: Size of markers
            c: Color of markers
            alpha: Transparency
            label: Label for the series
        """
        # Auto-assign color if not provided
        if c is None:
            c = self.colors[self.color_index % len(self.colors)]
            self.color_index += 1
        
        # Calculate point radius from size
        point_radius = 5 if s is None else min(max(3, s / 10), 20)
        
        self.widget.add_series(
            x=x,
            y=y,
            series_type='scatter',
            name=label,
            color=c,
            pointRadius=point_radius
        )
        
        return self
    
    def bar(self, x, height, width=0.8, label=None, color=None, **kwargs):
        """Create a bar plot.
        
        Args:
            x: X positions of bars
            height: Heights of bars
            width: Width of bars
            label: Label for the series
            color: Color of bars
        """
        # Auto-assign color if not provided
        if color is None:
            color = self.colors[self.color_index % len(self.colors)]
            self.color_index += 1
        
        self.widget.add_series(
            x=x,
            y=height,
            series_type='bar',
            name=label,
            color=color
        )
        
        return self
    
    def hist(self, x, bins=20, label=None, color=None, **kwargs):
        """Create a histogram.
        
        Args:
            x: Data to bin
            bins: Number of bins
            label: Label for the series
            color: Color of bars
        """
        # Calculate histogram
        counts, edges = np.histogram(x, bins=bins)
        centers = (edges[:-1] + edges[1:]) / 2
        
        return self.bar(centers, counts, width=(edges[1]-edges[0])*0.9, 
                       label=label, color=color)
    
    def fill_between(self, x, y1, y2=0, alpha=0.3, color=None, label=None, **kwargs):
        """Fill area between two curves.
        
        Args:
            x: X data
            y1: Y data for first curve
            y2: Y data for second curve (default 0)
            alpha: Transparency
            color: Fill color
            label: Label
        """
        if color is None:
            color = self.colors[self.color_index % len(self.colors)]
            self.color_index += 1
        
        # Create area chart by using fill option
        self.widget.add_series(
            x=x,
            y=y1,
            series_type='line',
            name=label,
            color=color,
            fill=True,
            tension=0.1
        )
        
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
        """Enable/disable legend."""
        self.widget.legend_enabled = loc is not None
        return self
    
    def grid(self, visible=True, **kwargs):
        """Enable or disable grid."""
        # Chart.js shows grid by default
        return self
    
    def xlim(self, xmin=None, xmax=None):
        """Set x-axis limits."""
        if xmin is not None and xmax is not None:
            self.widget.set_options(scales={'x': {'min': xmin, 'max': xmax}})
        return self
    
    def ylim(self, ymin=None, ymax=None):
        """Set y-axis limits."""
        if ymin is not None and ymax is not None:
            self.widget.set_options(scales={'y': {'min': ymin, 'max': ymax}})
        return self
    
    def show(self):
        """Display the interactive chart widget."""
        return self.widget
    
    def figure(self, figsize=None):
        """Update figure size."""
        if figsize:
            self.width = int(figsize[0] * 100)
            self.height = int(figsize[1] * 100)
            self.widget.width = self.width
            self.widget.height = self.height
        return self
    
    def clf(self):
        """Clear the current figure."""
        self.widget.clear_series()
        self.color_index = 0
        return self
    
    def tight_layout(self):
        """Compatibility method (Chart.js handles layout automatically)."""
        return self


# Convenience function to mimic plt.subplots()
def subplots(nrows=1, ncols=1, figsize=(10, 6), **kwargs):
    """Create a figure and a set of subplots.
    
    Note: Currently only supports single plot (nrows=1, ncols=1)
    """
    if nrows != 1 or ncols != 1:
        raise NotImplementedError("Currently only supports single plots")
    
    fig = ChartPlot(figsize=figsize)
    return fig, fig