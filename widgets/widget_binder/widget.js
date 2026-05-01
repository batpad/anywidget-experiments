// WidgetBinder: subscribe to a source widget's trait change and write to a
// target widget's trait. Both widgets are looked up via window.__myst_widgets,
// which the static-export shim populates with all root + sub-models on the page.
//
// In a JupyterLab kernel context this widget does nothing useful — Python
// observers are the right tool there. This is for static export, where there's
// no kernel and we need a JS-only binding.

function pollFor(predicate, timeout) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const tick = () => {
            const v = predicate();
            if (v !== undefined && v !== null) return resolve(v);
            if (Date.now() - start > timeout) {
                return reject(new Error("[binder] timeout"));
            }
            setTimeout(tick, 50);
        };
        tick();
    });
}

// Set a value at a dotted path on a target model. For leaf paths we simply
// model.set(key, value). For nested paths (e.g. "view_state.zoom"), we read
// the top-level object, merge the leaf, and set it back so listeners see the
// change as a single update.
function setByPath(model, path, value) {
    const parts = path.split(".");
    if (parts.length === 1) {
        model.set(parts[0], value);
        return;
    }
    const topKey = parts[0];
    const existing = model.get(topKey);
    const next = (existing && typeof existing === "object") ? { ...existing } : {};
    let cursor = next;
    for (let i = 1; i < parts.length - 1; i++) {
        const k = parts[i];
        cursor[k] = (cursor[k] && typeof cursor[k] === "object") ? { ...cursor[k] } : {};
        cursor = cursor[k];
    }
    cursor[parts[parts.length - 1]] = value;
    model.set(topKey, next);
}

function render({ model, el }) {
    const sourceId = model.get("source_widget_id");
    const sourceField = model.get("source_field") || "value";
    const targetId = model.get("target_widget_id");
    const targetField = model.get("target_field");
    const multiplier = model.get("multiplier");
    const offset = model.get("offset");
    const label = model.get("label") || `${sourceId}.${sourceField} → ${targetId}.${targetField}`;

    el.style.fontFamily = "ui-monospace, SFMono-Regular, monospace";
    el.style.fontSize = "12px";
    el.style.padding = "8px 12px";
    el.style.borderRadius = "6px";
    el.style.background = "#f6f8fa";
    el.style.color = "#24292e";
    el.style.border = "1px solid #e1e4e8";
    el.style.maxWidth = "fit-content";

    const status = document.createElement("div");
    el.appendChild(status);
    status.textContent = `🔗 binder: waiting…  (${label})`;

    const reg = window.__myst_widgets;
    if (!reg) {
        status.textContent = "❌ window.__myst_widgets not initialized; binder cannot run";
        return;
    }

    Promise.all([
        pollFor(() => reg.get(sourceId), 5000),
        pollFor(() => reg.get(targetId), 5000),
    ]).then(([source, target]) => {
        const apply = () => {
            const raw = source.get(sourceField);
            const next = (typeof raw === "number") ? raw * multiplier + offset : raw;
            setByPath(target, targetField, next);
        };
        source.on(`change:${sourceField}`, apply);
        apply(); // also fire once at startup so the target reflects current source state
        status.textContent = `✅ ${label}`;
    }).catch(err => {
        status.textContent = `❌ binder failed: ${err.message}`;
        console.error("[binder] failed", err, { sourceId, targetId });
    });
}

export default { render };
