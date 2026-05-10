// NYCDashboard — bucket toggles + live stats for the NYC buildings notebook.
//
// Resolution strategy mirrors the eq_dashboard pattern:
//   - In static export, look up the layer model via host.waitForModel
//   - In JupyterLab, fall back to model.widget_manager.get_model
// Writes hit the resolved layer's `visible` trait.

function rgbaCss(rgba) {
    if (!rgba || rgba.length < 3) return "rgba(200,200,200,0.85)";
    const a = (rgba[3] != null ? rgba[3] : 255) / 255;
    return `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${a.toFixed(3)})`;
}

function fmtNumber(n) {
    if (n == null || !Number.isFinite(n)) return "—";
    return Math.round(n).toLocaleString("en-US");
}

function fmtFixed(n, decimals) {
    if (n == null || !Number.isFinite(n)) return "—";
    return n.toFixed(decimals);
}

function tweenNumber(elNode, from, to, fmt, durationMs = 500) {
    const start = performance.now();
    const startVal = Number(from) || 0;
    const targetVal = Number(to) || 0;
    const delta = targetVal - startVal;
    function step(t) {
        const f = Math.max(0, Math.min(1, (t - start) / durationMs));
        const eased = 1 - Math.pow(1 - f, 3);
        const v = startVal + delta * eased;
        elNode.textContent = fmt(v);
        if (f < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

async function resolveLayer(host, model, uuid) {
    if (host && typeof host.waitForModel === "function") {
        try {
            return await host.waitForModel(uuid, { timeout: 5000 });
        } catch (e) {
            // fall through to JLab path
        }
    }
    if (model.widget_manager && typeof model.widget_manager.get_model === "function") {
        try {
            return await model.widget_manager.get_model(uuid);
        } catch (e) {
            console.warn("[nyc-dash] widget_manager.get_model failed:", e);
        }
    }
    return null;
}

function render({ model, el, host }) {
    const title = model.get("title") || "NYC Buildings";
    const subtitle = model.get("subtitle") || "";
    const buckets = model.get("bucket_definitions") || [];
    const layerUuids = model.get("layer_uuids") || {};
    const statsTables = model.get("stats_tables") || {};
    let bucketStates = { ...(model.get("bucket_states") || {}) };

    // Initialize any missing buckets to true
    for (const b of buckets) {
        if (bucketStates[b.key] === undefined) bucketStates[b.key] = true;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "nyc-dashboard";
    wrapper.innerHTML = `
        <div class="nd-header">
            <div class="nd-title-block">
                <h3>${title}</h3>
                <div class="nd-subtitle">${subtitle}</div>
            </div>
            <div class="nd-status"></div>
        </div>
        <div class="nd-body">
            <div class="nd-buckets">
                <div class="nd-section-label">Show buildings by height</div>
                <div class="nd-bucket-list"></div>
            </div>
            <div class="nd-stats">
                <div class="nd-stat">
                    <div class="nd-stat-num" data-stat="count">—</div>
                    <div class="nd-stat-label">buildings shown</div>
                </div>
                <div class="nd-stat">
                    <div class="nd-stat-num" data-stat="total_floor_area_m2">—</div>
                    <div class="nd-stat-label">total floor area (m²)</div>
                </div>
                <div class="nd-stat">
                    <div class="nd-stat-num" data-stat="mean_levels">—</div>
                    <div class="nd-stat-label">avg floors</div>
                </div>
            </div>
        </div>
    `;
    el.appendChild(wrapper);

    const list = wrapper.querySelector(".nd-bucket-list");
    const status = wrapper.querySelector(".nd-status");
    const statEls = {
        count: wrapper.querySelector('[data-stat="count"]'),
        total_floor_area_m2: wrapper.querySelector('[data-stat="total_floor_area_m2"]'),
        mean_levels: wrapper.querySelector('[data-stat="mean_levels"]'),
    };

    // Cache resolved layer models so we don't re-await every toggle.
    const layerCache = {};
    function getLayer(key) {
        if (layerCache[key] !== undefined) return layerCache[key];
        const uuid = layerUuids[key];
        if (!uuid) return Promise.resolve(null);
        layerCache[key] = resolveLayer(host, model, uuid);
        return layerCache[key];
    }

    function setVisible(key, visible) {
        getLayer(key).then((layerModel) => {
            if (!layerModel) return;
            try {
                layerModel.set("visible", !!visible);
                if (typeof layerModel.save_changes === "function") {
                    try { layerModel.save_changes(); } catch (e) {}
                }
            } catch (e) {
                console.warn("[nyc-dash] set visible failed for", key, e);
            }
        });
    }

    // Cross-widget link to the ChartGPU widget. Same resolver as for layers
    // (host.waitForModel in static export, widget_manager.get_model in JLab).
    let chartCache = null;
    function getChart() {
        if (chartCache !== null) return chartCache;
        const uuid = model.get("chart_uuid");
        if (!uuid) return Promise.resolve(null);
        chartCache = resolveLayer(host, model, uuid);
        return chartCache;
    }

    function syncChartVisibility() {
        getChart().then((chartModel) => {
            if (!chartModel) return;
            const vis = buckets.map(b => bucketStates[b.key] !== false);
            try {
                chartModel.set("series_visibility", vis);
                if (typeof chartModel.save_changes === "function") {
                    try { chartModel.save_changes(); } catch (e) {}
                }
            } catch (e) {
                console.warn("[nyc-dash] chart visibility sync failed:", e);
            }
        });
    }

    // Build the bucket UI rows
    for (const b of buckets) {
        const row = document.createElement("label");
        row.className = "nd-bucket-row";
        const swatchColor = rgbaCss(b.color || [200, 200, 200, 200]);
        row.innerHTML = `
            <input type="checkbox" ${bucketStates[b.key] !== false ? "checked" : ""} />
            <span class="nd-swatch" style="background:${swatchColor}"></span>
            <span class="nd-bucket-label">${b.label}</span>
            <span class="nd-bucket-count">${(b.count || 0).toLocaleString()}</span>
        `;
        const cb = row.querySelector("input");
        cb.addEventListener("change", () => {
            bucketStates[b.key] = cb.checked;
            setVisible(b.key, cb.checked);
            syncChartVisibility();
            updateStats();
            try {
                model.set("bucket_states", { ...bucketStates });
                model.save_changes();
            } catch (e) {}
        });
        list.appendChild(row);
    }

    // Compute stats key from current bucket_states by walking buckets in order
    let prevStats = { count: 0, total_floor_area_m2: 0, mean_levels: 0 };
    function statsKey() {
        return buckets.map(b => bucketStates[b.key] !== false ? "1" : "0").join("");
    }
    function updateStats() {
        const key = statsKey();
        const stats = statsTables[key] || { count: 0, total_floor_area_m2: 0, mean_levels: 0 };
        tweenNumber(statEls.count, prevStats.count || 0, stats.count || 0, fmtNumber);
        tweenNumber(statEls.total_floor_area_m2, prevStats.total_floor_area_m2 || 0, stats.total_floor_area_m2 || 0, fmtNumber);
        tweenNumber(statEls.mean_levels, prevStats.mean_levels || 0, stats.mean_levels || 0, (v) => fmtFixed(v, 1));
        prevStats = stats;
    }

    // Initial pass: apply visibility from bucket_states + populate stats
    let resolvedCount = 0;
    Promise.all(buckets.map(b =>
        getLayer(b.key).then((layerModel) => {
            if (layerModel) {
                resolvedCount++;
                try {
                    layerModel.set("visible", bucketStates[b.key] !== false);
                    if (typeof layerModel.save_changes === "function") {
                        try { layerModel.save_changes(); } catch (e) {}
                    }
                } catch (e) {}
            }
        })
    )).then(() => {
        status.textContent = resolvedCount > 0
            ? `linked to ${resolvedCount} of ${buckets.length} layers`
            : "⚠️ no layers found";
        syncChartVisibility();
        updateStats();
    });
}

export default { render };
