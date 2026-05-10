import { createChart } from 'chartgpu';

async function render({ model, el }) {
    // Create container for the chart
    const container = document.createElement('div');
    container.style.width = `${model.get('width')}px`;
    container.style.height = `${model.get('height')}px`;
    container.style.position = 'relative';
    el.appendChild(container);
    
    // Check for WebGPU support
    if (!navigator.gpu) {
        container.innerHTML = `
            <div style="padding: 20px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">
                <strong>⚠️ WebGPU Not Available</strong><br>
                ChartGPU requires WebGPU support. Please use Chrome 113+, Edge 113+, or Safari 18+.
            </div>
        `;
        model.set('gpu_available', false);
        model.save_changes();
        return;
    }
    
    model.set('gpu_available', true);
    model.save_changes();
    
    let chart = null;
    
    // Helper to convert series data to ChartGPU format
    function formatSeriesData(seriesData) {
        const vis = model.get('series_visibility') || [];
        return seriesData.map((series, i) => {
            const formattedSeries = {
                type: series.type || 'line',
                data: series.data,
            };

            if (series.name) formattedSeries.name = series.name;
            if (series.color) formattedSeries.color = series.color;
            if (vis[i] === false) formattedSeries.visible = false;

            return formattedSeries;
        });
    }
    
    // Helper to build chart configuration
    function buildChartConfig() {
        const config = {
            series: formatSeriesData(model.get('series_data')),
        };
        
        // Add title and labels if available
        const title = model.get('title');
        const xLabel = model.get('x_label');
        const yLabel = model.get('y_label');
        
        if (title) {
            config.title = { text: title };
        }
        
        // Add theme
        const theme = model.get('theme');
        if (theme) {
            config.theme = theme;
        }
        
        // Add interaction options
        if (model.get('zoom_enabled')) {
            config.dataZoom = [{ type: 'inside' }];
        }
        
        if (model.get('tooltips_enabled')) {
            config.tooltip = { enabled: true };
        }
        
        if (model.get('crosshair_enabled')) {
            config.crosshair = { enabled: true };
        }
        
        // Performance monitoring
        if (model.get('show_fps')) {
            config.performance = {
                monitor: true,
                position: 'top-right'
            };
        }
        
        // Apply custom options
        const customOptions = model.get('chart_options');
        if (customOptions) {
            Object.assign(config, customOptions);
        }
        
        return config;
    }
    
    // Create or update the chart
    async function createOrUpdateChart() {
        const config = buildChartConfig();
        
        if (!chart) {
            try {
                console.log('Creating ChartGPU chart with config:', config);
                chart = await createChart(container, config);
                console.log('ChartGPU chart created successfully:', chart);
                
                // ChartGPU doesn't use .on() for events, skip event handlers for now
                console.log('Chart created, skipping event handlers (ChartGPU uses different event API)');
            } catch (error) {
                console.error('Failed to create ChartGPU chart:', error);
                container.innerHTML = `
                    <div style="padding: 20px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
                        <strong>Error Creating Chart</strong><br>
                        ${error.message}<br>
                        <small>Check browser console for details</small>
                    </div>
                `;
            }
        } else {
            // Update existing chart
            try {
                if (chart && typeof chart.setOption === 'function') {
                    // ChartGPU uses setOption instead of update
                    chart.setOption(config);
                } else {
                    console.warn('Chart does not support setOption, recreating...');
                    // Destroy and recreate if update not supported
                    if (chart && typeof chart.destroy === 'function') {
                        chart.destroy();
                    }
                    chart = null;
                    createOrUpdateChart(); // Recursive call to recreate
                }
            } catch (error) {
                console.error('Failed to update chart:', error);
            }
        }
    }
    
    // Initial chart creation
    if (model.get('series_data') && model.get('series_data').length > 0) {
        createOrUpdateChart();
    }
    
    // Watch for model changes
    model.on('change:series_data', () => {
        createOrUpdateChart();
    });

    model.on('change:series_visibility', () => {
        createOrUpdateChart();
    });
    
    model.on('change:chart_options', () => {
        const options = model.get('chart_options');
        if (options && options.resetZoom && chart && typeof chart.resetZoom === 'function') {
            chart.resetZoom();
            // Clear the resetZoom flag
            const newOptions = { ...options };
            delete newOptions.resetZoom;
            model.set('chart_options', newOptions);
            model.save_changes();
        } else {
            createOrUpdateChart();
        }
    });
    
    model.on('change:theme', () => {
        createOrUpdateChart();
    });
    
    model.on('change:title change:x_label change:y_label', () => {
        createOrUpdateChart();
    });
    
    model.on('change:width change:height', () => {
        container.style.width = `${model.get('width')}px`;
        container.style.height = `${model.get('height')}px`;
        if (chart && typeof chart.resize === 'function') {
            chart.resize();
        }
    });
    
    model.on('change:zoom_enabled change:tooltips_enabled change:crosshair_enabled change:show_fps', () => {
        createOrUpdateChart();
    });
    
    // Handle custom messages from Python
    model.on('msg:custom', (msg) => {
        if (msg.type === 'export' && chart && typeof chart.export === 'function') {
            chart.export(msg.format || 'png');
        }
    });
    
    // Cleanup
    return () => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    };
}

export default { render };