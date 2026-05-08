// DateRangeFilterBinder: write [start_s, end_s] to a lonboard layer's
// filter_range whenever a TerraDateRangeSlider's startDate/endDate change.
//
// In JupyterLab the kernel-side widget manager keeps a single canonical
// model per id, so we resolve the layer once via widget_manager.get_model
// and write to it directly. In static export the picture is a lot messier
// — see the comments below for the four hazards we work around.
//
// We read the slider's state from its DOM element rather than its model
// because in static export the wrapper-managed slider model is not the
// same instance as the proxy registered in the per-page host, so neither
// `change:startDate` subscriptions nor `_state.startDate` polling reflects
// user input. The Lit element does, so we read off it directly.

const ONE_DAY_S = 86400;

function dateToSeconds(s) {
    return Math.floor(new Date(s).getTime() / 1000);
}

function stripIpy(id) {
    return id ? String(id).replace(/^IPY_MODEL_/, "") : id;
}

// HAZARD 1: the `host` argument render() receives is a scoped facade with
// only getModel/waitForModel/getWidget/on/off/emit. To enumerate every
// proxy registered for a given model_id we need the per-page registry,
// which lives at window.__myst_anywidget_hosts.get(<page-url>).
function getStaticRegistry() {
    const hosts = window.__myst_anywidget_hosts;
    if (!hosts || typeof hosts.get !== "function") return null;
    for (const v of hosts.values()) return v;  // typically one host per page
    return null;
}

// HAZARD 2: same model_id, multiple proxies. lonboard.Map and our binder
// can each register a separate proxy of the same layer sub-model, and
// trait writes only land on the proxy you addressed. The fix is to write
// to *every* proxy that matches.
function findAllInRegistry(reg, id) {
    if (!reg) return [];
    if (typeof reg.filter === "function") return reg.filter((w) => w && w.model_id === id);
    if (typeof reg.all === "function") return reg.all().filter((w) => w && w.model_id === id);
    return [];
}

// HAZARD 3: the slider's wrapper-managed model isn't the same instance as
// any proxy in the per-page registry, so subscribing to the registered
// proxy's `change:startDate` never fires on user drag. The Lit element is
// the actual user-input sink and updates synchronously — read off that.
function findSliderElement() {
    // Static export: each anywidget mounts inside a .myst-anywidget shadow root.
    for (const host of document.querySelectorAll(".myst-anywidget")) {
        const sr = host.shadowRoot;
        if (!sr) continue;
        const el = sr.querySelector("terra-date-range-slider");
        if (el) return el;
    }
    // JupyterLab: the element is a regular DOM child.
    return document.querySelector("terra-date-range-slider");
}

async function render({ model, el }) {
    el.style.cssText =
        "font:11px/1.4 ui-monospace,SFMono-Regular,monospace;color:#666;padding:4px 8px;";
    el.textContent = "🔗 slider→filter binder: connecting…";

    const layerId = stripIpy(model.get("layer"));
    const reg = getStaticRegistry();

    // JupyterLab path: resolve the layer once via widget_manager. The
    // kernel keeps a single canonical model per id, so one write is enough.
    let jlabLayer = null;
    if (!reg && model.widget_manager && model.widget_manager.get_model) {
        try {
            jlabLayer = await model.widget_manager.get_model(layerId);
        } catch (err) {
            el.textContent = "⚠️ binder: widget_manager.get_model failed: " + err.message;
            return;
        }
    }

    function getLayerModels() {
        // HAZARD 4: Map's wrapper imports asynchronously, so its layer
        // proxy can register *after* our render returns. Re-resolve every
        // tick rather than capturing a snapshot at startup.
        return reg ? findAllInRegistry(reg, layerId) : (jlabLayer ? [jlabLayer] : []);
    }

    let lastApplied = null;

    function tick() {
        const sliderEl = findSliderElement();
        if (!sliderEl) return;
        const startStr = sliderEl.startDate;
        const endStr = sliderEl.endDate;
        if (!startStr || !endStr) return;
        const key = startStr + "|" + endStr;
        if (key === lastApplied) return;
        lastApplied = key;
        const range = [dateToSeconds(startStr), dateToSeconds(endStr) + ONE_DAY_S];
        const layerModels = getLayerModels();
        for (const lm of layerModels) {
            lm.set("filter_range", range);
            if (typeof lm.save_changes === "function") lm.save_changes();
        }
        el.textContent = `🔗 binder: ${startStr}…${endStr} → filter_range × ${layerModels.length}`;
    }

    // 100ms is well below the slider's drag feedback latency, and a single
    // string equality keeps the cost trivial. Stop after 30 minutes to be
    // a good citizen if the page sits open.
    const stopAt = Date.now() + 30 * 60 * 1000;
    function loop() {
        tick();
        if (Date.now() < stopAt) setTimeout(loop, 100);
    }
    loop();
}

export default { render };
