// HurricaneDashboard — controls a lonboard map by toggling layer visibility
// based on a flood-depth threshold slider.

window.__widgetRegistry = window.__widgetRegistry || new Map();
window.__widgetEvents = window.__widgetEvents || new EventTarget();

function pollFor(predicate, timeout = 5000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const tick = () => {
            const v = predicate();
            if (v != null) return resolve(v);
            if (Date.now() - start > timeout) return reject(new Error("timeout"));
            setTimeout(tick, 50);
        };
        tick();
    });
}

function tweenNumber(el, from, to, durationMs = 600) {
    const start = performance.now();
    const startVal = Number(from) || 0;
    const delta = (Number(to) || 0) - startVal;
    function step(t) {
        const f = Math.max(0, Math.min(1, (t - start) / durationMs));
        // ease-out cubic
        const e = 1 - Math.pow(1 - f, 3);
        const v = Math.round(startVal + delta * e);
        el.textContent = v.toLocaleString();
        if (f < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function render({ model, el }) {
    const widgetId = "hurricane_dashboard_" + Math.random().toString(36).slice(2, 8);
    window.__widgetRegistry.set(widgetId, model);

    const storm = model.get("storm_name") || "Hurricane";
    const subtitle = model.get("storm_subtitle") || "";
    const layerUuids = model.get("layer_uuids") || {};
    const initialVisible = model.get("initial_visible") || {};
    const toggleLayers = model.get("toggle_layers") || [];
    const labels = model.get("threshold_labels") || ["all"];
    const thresholdLayerMap = model.get("threshold_layer_map") || [];
    const statsTables = model.get("stats_tables") || [];


    const wrapper = document.createElement("div");
    wrapper.className = "hurricane-dashboard";
    wrapper.innerHTML = `
        <div class="hd-amber-flash"></div>
        <div class="hd-header">
            <div class="hd-eye" aria-hidden="true"></div>
            <div class="hd-title">
                <h3>${storm}</h3>
                <div class="hd-subtitle">${subtitle}</div>
            </div>
        </div>

        <div class="hd-section">
            <div class="hd-section-label">Layers</div>
            <div class="hd-toggles"></div>
        </div>

        <div class="hd-section">
            <div class="hd-section-label">Show buildings with flood</div>
            <div class="hd-slider-wrap">
                <div class="hd-slider-track">
                    <div class="hd-slider-fill"></div>
                    <div class="hd-slider-thumb" tabindex="0" role="slider"
                         aria-valuemin="0" aria-valuemax="${labels.length - 1}"></div>
                    <div class="hd-slider-stops">
                        ${labels.map((l, i) => `<span data-i="${i}">${l}</span>`).join("")}
                    </div>
                </div>
            </div>
        </div>

        <div class="hd-stats">
            <div class="hd-stat">
                <span class="num" data-stat="buildings">0</span>
                <span class="label">buildings shown</span>
            </div>
            <div class="hd-stat">
                <span class="num" data-stat="hospitals">0</span>
                <span class="label">hospitals affected</span>
            </div>
            <div class="hd-stat">
                <span class="num" data-stat="people_est">0</span>
                <span class="label">people (est)</span>
            </div>
        </div>

        <div class="hd-status"></div>
    `;
    el.appendChild(wrapper);

    const togglesGrid = wrapper.querySelector(".hd-toggles");
    const sliderTrack = wrapper.querySelector(".hd-slider-track");
    const sliderFill = wrapper.querySelector(".hd-slider-fill");
    const sliderThumb = wrapper.querySelector(".hd-slider-thumb");
    const sliderStops = wrapper.querySelectorAll(".hd-slider-stops span");
    const status = wrapper.querySelector(".hd-status");
    const flash = wrapper.querySelector(".hd-amber-flash");
    const statEls = {
        buildings: wrapper.querySelector('[data-stat="buildings"]'),
        hospitals: wrapper.querySelector('[data-stat="hospitals"]'),
        people_est: wrapper.querySelector('[data-stat="people_est"]'),
    };

    // ---- layer registry helpers --------------------------------------------
    const reg = window.__myst_widgets;
    if (!reg) {
        status.textContent = "❌ window.__myst_widgets not initialized";
        return;
    }

    function setVisible(layerKey, visible) {
        const uuid = layerUuids[layerKey];
        if (!uuid) return;
        const m = reg.get(uuid);
        if (!m) return;
        try {
            m.set("visible", !!visible);
        } catch (e) {
            console.warn("[hd] set visible failed for", layerKey, e);
        }
    }

    // ---- layer toggle checkboxes -------------------------------------------
    const toggleState = {};
    for (const t of toggleLayers) {
        const key = t.key;
        const init = initialVisible[key] !== false;
        toggleState[key] = init;
        const lab = document.createElement("label");
        lab.className = "hd-toggle";
        lab.innerHTML = `<input type="checkbox" ${init ? "checked" : ""} /> <span>${t.label}</span>`;
        const cb = lab.querySelector("input");
        cb.addEventListener("change", () => {
            toggleState[key] = cb.checked;
            setVisible(key, cb.checked);
        });
        togglesGrid.appendChild(lab);
    }

    // ---- threshold slider --------------------------------------------------
    let threshold = model.get("threshold") || 0;
    let crossedAmber = false;

    function applyThreshold(t) {
        const visibleSet = new Set(thresholdLayerMap[t] || []);
        // Walk every building-layer key that appears in any threshold map
        const allBuildingKeys = new Set();
        for (const list of thresholdLayerMap) {
            for (const k of list) allBuildingKeys.add(k);
        }
        for (const k of allBuildingKeys) {
            setVisible(k, visibleSet.has(k));
        }
        // Update stats
        const stats = statsTables[t] || { buildings: 0, hospitals: 0, people_est: 0 };
        const prev = statsTables[threshold] || { buildings: 0, hospitals: 0, people_est: 0 };
        for (const k of Object.keys(statEls)) {
            tweenNumber(statEls[k], prev[k] || 0, stats[k] || 0);
        }
        // Slider geometry
        const pct = labels.length > 1 ? (t / (labels.length - 1)) * 100 : 0;
        sliderFill.style.width = pct + "%";
        sliderThumb.style.left = pct + "%";
        sliderStops.forEach((s, i) => s.classList.toggle("active", i === t));
        sliderThumb.setAttribute("aria-valuenow", String(t));
        // Whimsy: amber tint the first time we cross to the deepest bucket
        if (t === labels.length - 1 && !crossedAmber) {
            crossedAmber = true;
            flash.classList.add("on");
            setTimeout(() => flash.classList.remove("on"), 360);
        }
        threshold = t;
        try {
            model.set("threshold", t);
            model.save_changes();
        } catch (e) {}
    }

    function pickFromX(clientX) {
        const r = sliderTrack.getBoundingClientRect();
        const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
        const t = Math.round(f * (labels.length - 1));
        applyThreshold(t);
    }
    let dragging = false;
    sliderTrack.addEventListener("mousedown", (e) => {
        dragging = true;
        pickFromX(e.clientX);
    });
    window.addEventListener("mousemove", (e) => {
        if (dragging) pickFromX(e.clientX);
    });
    window.addEventListener("mouseup", () => (dragging = false));
    sliderTrack.addEventListener("touchstart", (e) => {
        if (e.touches.length) pickFromX(e.touches[0].clientX);
    }, { passive: true });
    sliderTrack.addEventListener("touchmove", (e) => {
        if (e.touches.length) pickFromX(e.touches[0].clientX);
    }, { passive: true });
    sliderStops.forEach((s) => {
        s.style.pointerEvents = "auto";
        s.addEventListener("click", () => applyThreshold(Number(s.dataset.i)));
    });
    sliderThumb.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" && threshold < labels.length - 1) applyThreshold(threshold + 1);
        else if (e.key === "ArrowLeft" && threshold > 0) applyThreshold(threshold - 1);
    });

    // ---- initial wiring ----------------------------------------------------
    // Wait for the first registered lonboard layer, then apply initial state.
    const firstUuid = Object.values(layerUuids)[0];
    pollFor(() => firstUuid && reg.get(firstUuid), 6000)
        .then(() => {
            // Initial layer visibility from initial_visible
            for (const t of toggleLayers) {
                setVisible(t.key, initialVisible[t.key] !== false);
            }
            applyThreshold(threshold);
            status.textContent = `linked to ${Object.keys(layerUuids).length} map layers`;
        })
        .catch(() => {
            status.textContent = "⚠️ map layers not found — registry timeout";
        });
}

export default { render };
