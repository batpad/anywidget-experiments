import Chart from 'chart.js/auto';

function render({ model, el }) {
    // Create container and canvas
    const container = document.createElement('div');
    container.style.width = `${model.get('width')}px`;
    container.style.height = `${model.get('height')}px`;
    container.style.position = 'relative';
    
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    el.appendChild(container);
    
    let chart = null;
    
    // Color palette
    const colors = [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ];
    
    // Helper to format series data for Chart.js
    function formatSeriesData(seriesData) {
        const datasets = [];
        
        seriesData.forEach((series, index) => {
            const color = series.color || colors[index % colors.length];
            
            // Convert data to Chart.js format
            let formattedData;
            if (series.data && series.data.length > 0) {
                if (Array.isArray(series.data[0])) {
                    // Data is [[x, y], ...]
                    formattedData = series.data.map(point => ({
                        x: point[0],
                        y: point[1]
                    }));
                } else {
                    // Data is already in {x, y} format or simple array
                    formattedData = series.data;
                }
            } else {
                formattedData = [];
            }
            
            const dataset = {
                label: series.name || `Series ${index + 1}`,
                data: formattedData,
                borderColor: color,
                backgroundColor: color + '33',  // Add transparency
                type: series.type || 'line',
                fill: series.fill !== undefined ? series.fill : false,
                tension: series.tension || 0.1,
                pointRadius: series.pointRadius !== undefined ? series.pointRadius : 3,
                pointHoverRadius: 5,
                borderWidth: series.borderWidth || 2
            };
            
            // Handle scatter type
            if (series.type === 'scatter') {
                dataset.showLine = false;
                dataset.pointRadius = series.pointRadius || 5;
            }
            
            // Handle bar type
            if (series.type === 'bar') {
                dataset.backgroundColor = color + '80';
            }
            
            datasets.push(dataset);
        });
        
        return datasets;
    }
    
    // Build chart options from model
    function buildOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: model.get('animation_enabled') ? 750 : 0
            },
            interaction: {
                mode: 'nearest',
                intersect: false,
                axis: 'x'
            },
            plugins: {
                title: {
                    display: !!model.get('title'),
                    text: model.get('title'),
                    font: { size: 16 }
                },
                legend: {
                    display: model.get('legend_enabled') !== false,
                    position: 'top'
                },
                tooltip: {
                    enabled: model.get('tooltips_enabled') !== false,
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: !!model.get('x_label'),
                        text: model.get('x_label')
                    }
                },
                y: {
                    title: {
                        display: !!model.get('y_label'),
                        text: model.get('y_label')
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const element = elements[0];
                    const datasetIndex = element.datasetIndex;
                    const index = element.index;
                    const dataset = chart.data.datasets[datasetIndex];
                    const point = dataset.data[index];
                    model.set('clicked_point', {
                        series: datasetIndex,
                        index: index,
                        x: point.x,
                        y: point.y,
                        label: dataset.label
                    });
                    model.save_changes();
                }
            },
            onHover: (event, elements) => {
                if (elements.length > 0) {
                    const element = elements[0];
                    const datasetIndex = element.datasetIndex;
                    const index = element.index;
                    const dataset = chart.data.datasets[datasetIndex];
                    const point = dataset.data[index];
                    model.set('hover_point', {
                        series: datasetIndex,
                        index: index,
                        x: point.x,
                        y: point.y,
                        label: dataset.label
                    });
                    model.save_changes();
                }
            }
        };
    }
    
    // Create or update chart
    function createOrUpdateChart() {
        const datasets = formatSeriesData(model.get('series_data'));
        const options = buildOptions();
        
        // Apply custom options if provided
        const customOptions = model.get('chart_options');
        if (customOptions) {
            // Deep merge custom options
            Object.assign(options, customOptions);
            if (customOptions.scales) {
                Object.assign(options.scales, customOptions.scales);
            }
            if (customOptions.plugins) {
                Object.assign(options.plugins, customOptions.plugins);
            }
        }
        
        const config = {
            type: model.get('chart_type') || 'line',
            data: { datasets },
            options
        };
        
        if (!chart) {
            chart = new Chart(canvas, config);
        } else {
            chart.data = config.data;
            chart.options = config.options;
            chart.update();
        }
    }
    
    // Initial creation
    if (model.get('series_data') && model.get('series_data').length > 0) {
        createOrUpdateChart();
    }
    
    // Watch for changes
    model.on('change:series_data', () => {
        createOrUpdateChart();
    });
    
    model.on('change:title change:x_label change:y_label', () => {
        if (chart) {
            chart.options.plugins.title.display = !!model.get('title');
            chart.options.plugins.title.text = model.get('title');
            chart.options.scales.x.title.display = !!model.get('x_label');
            chart.options.scales.x.title.text = model.get('x_label');
            chart.options.scales.y.title.display = !!model.get('y_label');
            chart.options.scales.y.title.text = model.get('y_label');
            chart.update();
        }
    });
    
    model.on('change:width change:height', () => {
        container.style.width = `${model.get('width')}px`;
        container.style.height = `${model.get('height')}px`;
        if (chart) {
            chart.resize();
        }
    });
    
    model.on('change:animation_enabled change:tooltips_enabled change:legend_enabled', () => {
        if (chart) {
            createOrUpdateChart();
        }
    });
    
    model.on('change:chart_options', () => {
        if (chart) {
            createOrUpdateChart();
        }
    });
    
    // Cleanup
    return () => {
        if (chart) {
            chart.destroy();
        }
    };
}

export default { render };