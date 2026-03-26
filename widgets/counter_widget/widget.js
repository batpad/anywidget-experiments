// Counter widget JavaScript module
// Demonstrates basic anywidget patterns and inter-widget communication

// Global widget registry for inter-widget communication
window.__widgetRegistry = window.__widgetRegistry || new Map();
window.__widgetEvents = window.__widgetEvents || new EventTarget();

function render({ model, el }) {
    // Register this widget's render model in the global registry
    // (must happen in render, not initialize, because the render proxy is the live one)
    const widgetId = model.get('widget_id');
    window.__widgetRegistry.set(widgetId, model);
    model.on('destroy', () => {
        window.__widgetRegistry.delete(widgetId);
    });
    window.__widgetEvents.dispatchEvent(new CustomEvent('widget-registered', {
        detail: { widgetId }
    }));

    // Create widget container
    const container = document.createElement('div');
    container.className = 'counter-widget';
    
    // Create label
    const label = document.createElement('h3');
    label.textContent = model.get('label');
    container.appendChild(label);
    
    // Create value display
    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'counter-value';
    valueDisplay.textContent = model.get('value');
    container.appendChild(valueDisplay);
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'counter-buttons';
    
    // Decrement button
    const decrementBtn = document.createElement('button');
    decrementBtn.textContent = '-';
    decrementBtn.onclick = () => {
        const currentValue = model.get('value');
        model.set('value', currentValue - 1);
        try { model.save_changes(); } catch(e) {}
        
        // Emit custom event for inter-widget communication
        window.__widgetEvents.dispatchEvent(new CustomEvent('counter-changed', {
            detail: {
                widgetId: model.get('widget_id'),
                value: currentValue - 1,
                action: 'decrement'
            }
        }));
    };
    buttonContainer.appendChild(decrementBtn);
    
    // Increment button
    const incrementBtn = document.createElement('button');
    incrementBtn.textContent = '+';
    incrementBtn.onclick = () => {
        const currentValue = model.get('value');
        model.set('value', currentValue + 1);
        try { model.save_changes(); } catch(e) {}
        
        // Emit custom event for inter-widget communication
        window.__widgetEvents.dispatchEvent(new CustomEvent('counter-changed', {
            detail: {
                widgetId: model.get('widget_id'),
                value: currentValue + 1,
                action: 'increment'
            }
        }));
    };
    buttonContainer.appendChild(incrementBtn);
    
    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset';
    resetBtn.onclick = () => {
        model.set('value', 0);
        try { model.save_changes(); } catch(e) {}
        
        // Emit custom event
        window.__widgetEvents.dispatchEvent(new CustomEvent('counter-changed', {
            detail: {
                widgetId: model.get('widget_id'),
                value: 0,
                action: 'reset'
            }
        }));
    };
    buttonContainer.appendChild(resetBtn);
    
    container.appendChild(buttonContainer);
    
    // Add info section
    const infoSection = document.createElement('div');
    infoSection.className = 'counter-info';
    infoSection.innerHTML = `<small>Widget ID: ${model.get('widget_id')}</small>`;
    container.appendChild(infoSection);
    
    // Update display when value changes
    model.on('change:value', () => {
        valueDisplay.textContent = model.get('value');
        valueDisplay.classList.add('value-changed');
        setTimeout(() => {
            valueDisplay.classList.remove('value-changed');
        }, 300);
    });
    
    // Update label when it changes
    model.on('change:label', () => {
        label.textContent = model.get('label');
    });
    
    // Listen for events from other widgets
    const handleExternalEvent = (event) => {
        // Only respond to events from other widgets
        if (event.detail.widgetId !== model.get('widget_id')) {
            console.log(`Widget ${model.get('widget_id')} received event from ${event.detail.widgetId}`);
            // Could implement synchronized behavior here
        }
    };
    
    window.__widgetEvents.addEventListener('counter-changed', handleExternalEvent);
    
    // Clean up event listener on destroy
    el.addEventListener('remove', () => {
        window.__widgetEvents.removeEventListener('counter-changed', handleExternalEvent);
    });
    
    // Append to element
    el.appendChild(container);
}

export default { render };