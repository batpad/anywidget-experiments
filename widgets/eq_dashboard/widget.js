// EqDashboard — depth-band legend filter + aggregate stats panel.
//
// Renders below the map. Owns two coordinated jobs:
//   1. The legend's checkboxes write `filter_categories` to the layer (one
//      uint8 entry per allowed depth band, 0..3).
//   2. The stats panel walks the per-row arrays in JS and recomputes
//      visible-count, magnitude/depth means, and tsunami count whenever
//      either the slider's filter_range or our filter_categories changes.
//
// Static export and JupyterLab differ in how the layer model is exposed
// (one canonical model in JLab vs. multiple proxies behind the per-page
// host registry in static). We mirror DateRangeFilterBinder's resolution
// strategy: enumerate every proxy with the layer's model_id from
// `window.__myst_anywidget_hosts.<page>` in static, fall back to
// `widget_manager.get_model` in JLab. Writes hit every proxy.
//
// Polling cadence: 100ms. We don't subscribe to model events because in
// static export the wrapper-managed model isn't the same instance as any
// proxy in the registry, so `change:filter_range` etc. don't fire on the
// proxies we've actually got. Reading the value off each tick is cheap.

const POLL_MS = 100;
const MAX_RUN_MS = 30 * 60 * 1000;

function rgbaCss(rgba) {
    if (!rgba || rgba.length < 3) return "rgba(200,200,200,0.8)";
    const a = (rgba[3] != null ? rgba[3] : 255) / 255;
    return `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${a.toFixed(3)})`;
}

function fmtKmRange(minKm, maxKm) {
    if (minKm <= 0 && maxKm < 800) return `0–${Math.round(maxKm)} km`;
    if (maxKm >= 800 || maxKm == null) return `${Math.round(minKm)}+ km`;
    return `${Math.round(minKm)}–${Math.round(maxKm)} km`;
}

function fmtNumber(n) {
    if (n == null || !Number.isFinite(n)) return "—";
    return n.toLocaleString("en-US");
}

function fmtFixed(n, decimals) {
    if (n == null || !Number.isFinite(n)) return "—";
    return n.toFixed(decimals);
}

function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
            if (k === "class") node.className = v;
            else if (k === "style") node.setAttribute("style", v);
            else if (k === "checked") { if (v) node.checked = true; }
            else if (v != null) node.setAttribute(k, v);
        }
    }
    if (children) {
        for (const c of children) {
            if (c == null) continue;
            node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
        }
    }
    return node;
}

function stripIpy(id) {
    return id ? String(id).replace(/^IPY_MODEL_/, "") : id;
}

// Walk every shared-host registry on the page, return all proxies whose
// model_id matches the supplied id. Mirrors DateRangeFilterBinder.
function getStaticRegistry() {
    const hosts = window.__myst_anywidget_hosts;
    if (!hosts || typeof hosts.get !== "function") return null;
    for (const v of hosts.values()) return v;
    return null;
}

function findAllInRegistry(reg, id) {
    if (!reg) return [];
    if (typeof reg.filter === "function") return reg.filter((w) => w && w.model_id === id);
    if (typeof reg.all === "function") return reg.all().filter((w) => w && w.model_id === id);
    return [];
}

// `model.get('mag')` returns a DataView in both JLab (anywidget buffer
// protocol) and static export (runtime hydrates _myst_buffers into a
// DataView). Build a typed-array view that shares the underlying buffer
// without copying.
function asTyped(view, Ctor) {
    if (!view) return new Ctor(0);
    if (view instanceof Ctor) return view;
    // DataView and ArrayBuffer both expose .buffer/.byteOffset/.byteLength.
    const buf = view.buffer || view;
    const offset = view.byteOffset || 0;
    const length = (view.byteLength || buf.byteLength) / Ctor.BYTES_PER_ELEMENT;
    return new Ctor(buf, offset, length);
}

function arraysEqual(a, b) {
    if (!a || !b) return a === b;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

async function render({ model, el: root }) {
    const bands = model.get("bands") || [];
    const nTotal = model.get("n_total") || 0;

    // Per-row arrays. The bytes traits arrive as DataViews; reinterpret as
    // typed arrays. These are shared with the underlying buffer, so no
    // copy is involved.
    const mag = asTyped(model.get("mag"), Float32Array);
    const depthKm = asTyped(model.get("depth_km"), Float32Array);
    const depthBand = asTyped(model.get("depth_band"), Uint8Array);
    const tsunami = asTyped(model.get("tsunami"), Uint8Array);
    const filterValue = asTyped(model.get("filter_value"), Float64Array);
    const nRows = mag.length;

    // ── Build the DOM and capture refs we'll update later ───────────────
    const container = el("div", { class: "eq-dashboard" });

    const legend = el("section", { class: "eq-dashboard__legend" }, [
        el("h3", null, ["Depth bands"]),
    ]);
    const list = el("ul");
    const bandRowEls = new Map();   // index -> { row, count, checkbox }
    const enabled = new Set();      // current filter set
    for (const b of bands) {
        enabled.add(b.index);
        const checkbox = el("input", {
            type: "checkbox",
            checked: true,
            "data-band-index": b.index,
        });
        const swatch = el("span", {
            class: "eq-dashboard__swatch",
            style: `background: ${rgbaCss(b.color)};`,
        });
        const label = el("span", { class: "eq-dashboard__label" }, [
            `${b.label} (${fmtKmRange(b.min_km, b.max_km)})`,
        ]);
        const count = el("span", { class: "eq-dashboard__count" }, ["—"]);
        const row = el("li", { class: "eq-dashboard__band" }, [
            checkbox, swatch, label, count,
        ]);
        // Make the whole row clickable (toggle the checkbox), but ignore
        // clicks on the checkbox itself to avoid double-toggling.
        row.addEventListener("click", (ev) => {
            if (ev.target === checkbox) return;
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event("change", { bubbles: true }));
        });
        list.appendChild(row);
        bandRowEls.set(b.index, { row, count, checkbox });
    }
    legend.appendChild(list);

    const refs = {};
    const stats = el("section", { class: "eq-dashboard__stats" }, [
        el("h3", null, ["Currently displayed"]),
        (refs.countBig = el("div", { class: "eq-dashboard__count-big" }, ["—"])),
        el("div", { class: "eq-dashboard__count-sub" }, [
            `of ${fmtNumber(nTotal)} total events`,
        ]),
        el("dl", null, [
            el("dt", null, ["Magnitude"]),
            (refs.magText = el("dd", null, ["mean — / max — / min —"])),
            el("dt", null, ["Depth"]),
            (refs.depthText = el("dd", null, ["mean — km / max — km"])),
            el("dt", null, ["Tsunami"]),
            (refs.tsunamiText = el("dd", null, ["—"])),
        ]),
    ]);

    container.appendChild(legend);
    container.appendChild(stats);
    root.appendChild(container);

    // ── Layer resolution ────────────────────────────────────────────────
    const layerId = stripIpy(model.get("layer"));
    const reg = getStaticRegistry();

    // JupyterLab path: one canonical layer model per id; resolve once.
    let jlabLayer = null;
    if (!reg && model.widget_manager && model.widget_manager.get_model) {
        try {
            jlabLayer = await model.widget_manager.get_model(layerId);
        } catch (err) {
            console.warn("[eq-dashboard] widget_manager.get_model failed:", err);
        }
    }

    function getLayerModels() {
        // HAZARD: in static export the Map's wrapper imports asynchronously,
        // so its layer proxy can register *after* render returns. Re-resolve
        // every tick to catch late-arriving proxies.
        return reg ? findAllInRegistry(reg, layerId) : (jlabLayer ? [jlabLayer] : []);
    }

    // ── Filter writes (checkbox change) ─────────────────────────────────
    function writeFilterCategories() {
        const cats = Array.from(enabled).sort((a, b) => a - b);
        for (const lm of getLayerModels()) {
            // Per lonboard layer_extension docs: with category_size=1,
            // filter_categories is a flat list of allowed values.
            lm.set("filter_categories", cats);
            if (typeof lm.save_changes === "function") lm.save_changes();
        }
    }

    for (const [idx, refs] of bandRowEls.entries()) {
        refs.checkbox.addEventListener("change", () => {
            if (refs.checkbox.checked) enabled.add(idx);
            else enabled.delete(idx);
            refs.row.classList.toggle("eq-dashboard--off", !refs.checkbox.checked);
            refs.row.classList.toggle("eq-dashboard__band--off", !refs.checkbox.checked);
            writeFilterCategories();
            recomputeAndRender();
        });
    }

    // ── Stats compute ───────────────────────────────────────────────────
    let lastFilterRange = null;
    let lastFilterCategoriesIn = null;  // last value pulled from layer

    // Buffer for per-band counts (avoid re-allocating every tick).
    const perBand = new Array(bands.length).fill(0);

    function recomputeAndRender() {
        if (!lastFilterRange) return;
        const tMin = lastFilterRange[0];
        const tMax = lastFilterRange[1];

        let count = 0;
        let sumMag = 0;
        let maxMag = -Infinity;
        let minMag = Infinity;
        let sumDepth = 0;
        let maxDepth = -Infinity;
        let tsunamiN = 0;
        for (let i = 0; i < perBand.length; i++) perBand[i] = 0;

        // The hot loop. ~17k iterations; ~1ms in V8 is fine for 100ms cadence.
        for (let i = 0; i < nRows; i++) {
            const t = filterValue[i];
            if (t < tMin || t > tMax) continue;
            const b = depthBand[i];
            // perBand counts the per-band totals *within the current time
            // window*, regardless of whether the band is currently enabled —
            // this is what makes the legend a meaningful filter readout.
            if (b < perBand.length) perBand[b] += 1;
            if (!enabled.has(b)) continue;
            count += 1;
            const m = mag[i];
            sumMag += m;
            if (m > maxMag) maxMag = m;
            if (m < minMag) minMag = m;
            const d = depthKm[i];
            sumDepth += d;
            if (d > maxDepth) maxDepth = d;
            if (tsunami[i]) tsunamiN += 1;
        }

        const magMean = count > 0 ? sumMag / count : null;
        const depthMean = count > 0 ? sumDepth / count : null;
        const tsunamiPct = count > 0 ? (tsunamiN / count) * 100 : null;

        refs.countBig.textContent = fmtNumber(count);
        refs.magText.textContent =
            count > 0
                ? `mean ${fmtFixed(magMean, 2)} / max ${fmtFixed(maxMag, 1)} / min ${fmtFixed(minMag, 1)}`
                : "mean — / max — / min —";
        refs.depthText.textContent =
            count > 0
                ? `mean ${fmtFixed(depthMean, 0)} km / max ${fmtFixed(maxDepth, 0)} km`
                : "mean — km / max — km";
        refs.tsunamiText.textContent =
            count > 0
                ? `${fmtNumber(tsunamiN)}${tsunamiPct != null ? `  (${fmtFixed(tsunamiPct, 2)}%)` : ""}`
                : "—";

        for (const b of bands) {
            const r = bandRowEls.get(b.index);
            if (!r) continue;
            r.count.textContent = fmtNumber(perBand[b.index] || 0);
        }
    }

    // ── Polling loop ────────────────────────────────────────────────────
    const stopAt = Date.now() + MAX_RUN_MS;
    function tick() {
        const layers = getLayerModels();
        if (layers.length === 0) return;
        // Use the first proxy as the source of truth — they're all in sync
        // post-DateRangeFilterBinder write.
        const lm = layers[0];
        const fr = lm.get("filter_range");
        const fc = lm.get("filter_categories");

        let changed = false;
        if (fr && (!lastFilterRange || fr[0] !== lastFilterRange[0] || fr[1] !== lastFilterRange[1])) {
            lastFilterRange = [fr[0], fr[1]];
            changed = true;
        }
        // If another widget pushes a filter_categories that differs from
        // ours, sync our checkboxes. (We don't expect this in practice
        // since we own the trait, but it keeps the UI honest if a stray
        // write happens.)
        if (Array.isArray(fc) && !arraysEqual(fc, lastFilterCategoriesIn)) {
            lastFilterCategoriesIn = fc.slice();
            const incoming = new Set(fc);
            // Only update local state if it actually differs from ours,
            // to avoid clobbering an in-flight checkbox toggle.
            const ours = Array.from(enabled).sort((a, b) => a - b);
            const incomingSorted = fc.slice().sort((a, b) => a - b);
            if (!arraysEqual(ours, incomingSorted)) {
                enabled.clear();
                for (const v of incoming) enabled.add(v);
                for (const [idx, r] of bandRowEls.entries()) {
                    r.checkbox.checked = enabled.has(idx);
                    r.row.classList.toggle("eq-dashboard__band--off", !r.checkbox.checked);
                }
                changed = true;
            }
        }

        if (changed) recomputeAndRender();
    }

    function loop() {
        try { tick(); } catch (err) { console.warn("[eq-dashboard] tick error:", err); }
        if (Date.now() < stopAt) setTimeout(loop, POLL_MS);
    }
    loop();
}

export default { render };
