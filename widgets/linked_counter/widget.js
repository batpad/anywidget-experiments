// Linked counter widget that demonstrates inter-widget communication

function resolveLinkedModel(host, id) {
    if (!host || typeof host.waitForModel !== "function") {
        return Promise.reject(new Error("host.waitForModel is unavailable"));
    }
    return host.waitForModel(id, { timeout: 5000 });
}

function render({ model, el, host }) {
    const container = document.createElement('div');
    container.className = 'linked-counter-widget';
    
    // Header with label
    const header = document.createElement('div');
    header.className = 'widget-header';
    header.innerHTML = `
        <h3>${model.get('label')}</h3>
        <span class="widget-id">${model.get('widget_id')}</span>
    `;
    container.appendChild(header);
    
    // Value display
    const valueSection = document.createElement('div');
    valueSection.className = 'value-section';
    valueSection.innerHTML = `
        <div class="main-value">
            <span class="value-label">Value:</span>
            <span class="value-display">${model.get('value')}</span>
        </div>
        <div class="linked-value">
            <span class="value-label">Linked:</span>
            <span class="linked-display">${model.get('linked_value')}</span>
        </div>
    `;
    container.appendChild(valueSection);
    
    // Controls
    const controls = document.createElement('div');
    controls.className = 'controls';
    
    const decrementBtn = document.createElement('button');
    decrementBtn.textContent = '-';
    decrementBtn.onclick = () => {
        model.set('value', model.get('value') - 1);
        try { model.save_changes(); } catch(e) {}
    };
    
    const incrementBtn = document.createElement('button');
    incrementBtn.textContent = '+';
    incrementBtn.onclick = () => {
        model.set('value', model.get('value') + 1);
        try { model.save_changes(); } catch(e) {}
    };
    
    controls.appendChild(decrementBtn);
    controls.appendChild(incrementBtn);
    container.appendChild(controls);
    
    // Link configuration
    const linkConfig = document.createElement('div');
    linkConfig.className = 'link-config';
    linkConfig.innerHTML = `
        <div class="config-row">
            <label>Link to:</label>
            <input type="text" class="link-to-input" value="${model.get('link_to')}" placeholder="Widget ID">
        </div>
        <div class="config-row">
            <label>Mode:</label>
            <select class="link-mode-select">
                <option value="mirror" ${model.get('link_mode') === 'mirror' ? 'selected' : ''}>Mirror</option>
                <option value="sum" ${model.get('link_mode') === 'sum' ? 'selected' : ''}>Sum</option>
                <option value="diff" ${model.get('link_mode') === 'diff' ? 'selected' : ''}>Difference</option>
            </select>
        </div>
    `;
    container.appendChild(linkConfig);
    
    // Status
    const status = document.createElement('div');
    status.className = 'status';
    status.textContent = model.get('status');
    container.appendChild(status);
    
    // Setup event handlers
    const linkToInput = linkConfig.querySelector('.link-to-input');
    const linkModeSelect = linkConfig.querySelector('.link-mode-select');
    
    linkToInput.addEventListener('change', (e) => {
        model.set('link_to', e.target.value);
        try { model.save_changes(); } catch(_) {}
        updateLinkedValue();
    });

    linkModeSelect.addEventListener('change', (e) => {
        model.set('link_mode', e.target.value);
        try { model.save_changes(); } catch(_) {}
        updateLinkedValue();
    });

    let linkedModelRef = null;
    
    // Function to update linked value based on mode
    function updateLinkedValue() {
        const linkTo = model.get('link_to');
        if (!linkTo) return;

        resolveLinkedModel(host, linkTo).then((linkedModel) => {
            const mode = model.get('link_mode');
            const myValue = model.get('value');
            // For linked counters, read linked_value (the output); for regular counters, read value
            const hasLinkedValue = linkedModel.get('linked_value') !== undefined;
            const linkedValue = hasLinkedValue ? linkedModel.get('linked_value') : linkedModel.get('value');
            let newLinkedValue = 0;
            switch(mode) {
                case 'mirror':
                    newLinkedValue = linkedValue;
                    break;
                case 'sum':
                    newLinkedValue = myValue + linkedValue;
                    break;
                case 'diff':
                    newLinkedValue = myValue - linkedValue;
                    break;
            }
            
            model.set('linked_value', newLinkedValue);
            model.set('status', `Linked to ${linkTo} (${mode})`);
            try { model.save_changes(); } catch(e) {}
        }).catch(() => {
            model.set('status', `Cannot find widget: ${linkTo}`);
            try { model.save_changes(); } catch(e) {}
        });
    }
    
    // Listen for changes to linked widget
    function setupLinkedListener() {
        const linkTo = model.get('link_to');
        if (!linkTo) return;

        resolveLinkedModel(host, linkTo).then((linkedModel) => {
            if (linkedModelRef === linkedModel) {
                updateLinkedValue();
                return;
            }
            if (linkedModelRef && typeof linkedModelRef.off === 'function') {
                linkedModelRef.off('change:value', updateLinkedValue);
                linkedModelRef.off('change:linked_value', updateLinkedValue);
            }
            linkedModelRef = linkedModel;
            linkedModel.on('change:value', updateLinkedValue);
            linkedModel.on('change:linked_value', updateLinkedValue);
            updateLinkedValue();
        }).catch(updateLinkedValue);
    }
    
    // Update displays when values change
    model.on('change:value', () => {
        container.querySelector('.value-display').textContent = model.get('value');
        updateLinkedValue();
    });
    
    model.on('change:linked_value', () => {
        container.querySelector('.linked-display').textContent = model.get('linked_value');
    });
    
    model.on('change:status', () => {
        status.textContent = model.get('status');
    });
    
    model.on('change:link_to', () => {
        setupLinkedListener();
    });
    
    // Initial setup
    setupLinkedListener();
    updateLinkedValue();
    
    el.appendChild(container);
}

export default { render };
