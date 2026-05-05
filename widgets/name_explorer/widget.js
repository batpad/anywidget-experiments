// NameExplorer — animated 144-year name-trajectory widget.
//
// Design notes:
//   * The widget draws an SVG line chart and animates a sweeping playhead
//     across it. Twins (4 small-multiples) sweep in sync.
//   * Era captions fade in/out as the playhead crosses decade boundaries.
//   * Confetti fires once per name selection when the playhead crosses the
//     peak year. Inline implementation, ~80 LOC of canvas.
//   * Easter egg: typing exactly "claude" (any case) into the typeahead
//     triggers the rocket.

const SVG_NS = "http://www.w3.org/2000/svg";
const VB_W = 1000;
const VB_H = 280;
const M = { l: 42, r: 14, t: 14, b: 24 };
const PLOT_W = VB_W - M.l - M.r;
const PLOT_H = VB_H - M.t - M.b;
const ANIM_MS = 3500;

// Soft per-decade hues for the background tint. Cool → warm-ish → cool.
const DECADE_HUES = {
    1880: "#1f3a5f", 1890: "#243b5b", 1900: "#284064",
    1910: "#2c4570", 1920: "#5b3f6e", 1930: "#7a3a4e",
    1940: "#7e3a3a", 1950: "#7c5a36", 1960: "#7d7434",
    1970: "#5d8048", 1980: "#3f7a6c", 1990: "#367490",
    2000: "#2f5a8c", 2010: "#33437a", 2020: "#3a3a6c",
};

function el(tag, attrs = {}, children = []) {
    const isSvg = ["svg", "g", "path", "line", "rect", "circle", "text", "clipPath", "defs"].includes(tag);
    const node = isSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "class") node.setAttribute("class", v);
        else if (k === "text") node.textContent = v;
        else node.setAttribute(k, v);
    }
    for (const c of children) node.appendChild(c);
    return node;
}

function logScale(v) {
    return Math.log10(Math.max(1, v));
}

function buildPath(values, yearStart, yearEnd, yMax) {
    const n = values.length;
    if (n < 2) return "";
    const xstep = PLOT_W / (n - 1);
    let d = "";
    for (let i = 0; i < n; i++) {
        const x = M.l + i * xstep;
        const y = M.t + PLOT_H * (1 - logScale(values[i]) / logScale(yMax));
        d += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2) + " ";
    }
    return d;
}

function decadeOf(year) {
    return Math.floor(year / 10) * 10;
}

// ---- minimal canvas confetti ------------------------------------------------
function fireConfetti(canvas, originX, originY) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const colors = ["#e8c25a", "#67c1ff", "#ff8aa3", "#9be36a", "#c79bff"];
    const N = 140;
    const particles = [];
    for (let i = 0; i < N; i++) {
        const a = Math.random() * Math.PI - Math.PI; // upper hemisphere
        const sp = 4 + Math.random() * 6;
        particles.push({
            x: originX,
            y: originY,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - 3,
            g: 0.18 + Math.random() * 0.05,
            size: 4 + Math.random() * 4,
            rot: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.3,
            color: colors[(Math.random() * colors.length) | 0],
            life: 0,
        });
    }
    let raf = 0;
    const start = performance.now();
    function frame(t) {
        ctx.clearRect(0, 0, rect.width, rect.height);
        let alive = false;
        for (const p of particles) {
            p.vy += p.g;
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vr;
            p.life = (t - start) / 1000;
            if (p.y > rect.height + 40) continue;
            alive = true;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, 1 - p.life / 3.5);
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.45);
            ctx.restore();
        }
        if (alive && t - start < 4000) {
            raf = requestAnimationFrame(frame);
        } else {
            ctx.clearRect(0, 0, rect.width, rect.height);
        }
    }
    raf = requestAnimationFrame(frame);
}

// ---- main render ------------------------------------------------------------
function render({ model, el: root }) {
    const widgetId = "name_explorer_" + Math.random().toString(36).slice(2, 8);

    const yearStart = model.get("year_start") || 1880;
    const yearEnd = model.get("year_end") || 2023;
    const trajectories = model.get("trajectories") || {};
    const peaks = model.get("peaks") || {};
    const twins = model.get("twins") || {};
    const eraCaptions = model.get("era_captions") || {};
    const nameIndex = model.get("name_index") || [];

    const wrapper = document.createElement("div");
    wrapper.className = "name-explorer";
    wrapper.innerHTML = `
        <div class="ne-tint"></div>
        <div class="ne-header">
            <h2>What happened to your name?</h2>
            <div class="ne-inputs">
                <div class="ne-typeahead">
                    <input type="text" placeholder="type a name…" autocomplete="off" spellcheck="false" />
                    <ul class="ne-suggestions" hidden role="listbox"></ul>
                </div>
                <input type="number" min="${yearStart}" max="${yearEnd}" placeholder="birth year" class="ne-birthyear" />
            </div>
        </div>
        <div class="ne-era-caption" aria-live="polite"></div>
        <div class="ne-chart-wrap">
            <svg class="ne-chart" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="none"></svg>
            <div class="ne-peak-pill" hidden></div>
            <canvas class="ne-confetti"></canvas>
        </div>
        <div class="ne-twins">
            <h4>Names that moved with yours</h4>
            <div class="ne-twins-grid"></div>
        </div>
        <div class="ne-rocket" aria-hidden="true">🚀</div>
    `;
    root.appendChild(wrapper);

    const tint = wrapper.querySelector(".ne-tint");
    const inputName = wrapper.querySelector(".ne-typeahead input");
    const inputYear = wrapper.querySelector(".ne-birthyear");
    const sugList = wrapper.querySelector(".ne-suggestions");
    const eraEl = wrapper.querySelector(".ne-era-caption");
    const svg = wrapper.querySelector("svg.ne-chart");
    const peakPill = wrapper.querySelector(".ne-peak-pill");
    const confetti = wrapper.querySelector("canvas.ne-confetti");
    const rocket = wrapper.querySelector(".ne-rocket");
    const twinsGrid = wrapper.querySelector(".ne-twins-grid");

    // ---- typeahead ----------------------------------------------------------
    let highlightedIdx = -1;
    let suggestions = [];

    function fmt(key) {
        const [n, s] = key.split("|");
        return { name: n, sex: s };
    }
    function refreshSuggestions(query) {
        const q = (query || "").trim().toLowerCase();
        if (!q) {
            sugList.hidden = true;
            sugList.innerHTML = "";
            suggestions = [];
            return;
        }
        suggestions = [];
        for (const k of nameIndex) {
            const n = k.split("|")[0].toLowerCase();
            if (n.startsWith(q)) suggestions.push(k);
            if (suggestions.length >= 12) break;
        }
        sugList.innerHTML = suggestions
            .map((k, i) => {
                const { name, sex } = fmt(k);
                return `<li role="option" data-key="${k}" aria-selected="${i === highlightedIdx}"><span>${name}</span><span class="sex">${sex}</span></li>`;
            })
            .join("");
        sugList.hidden = suggestions.length === 0;
        sugList.querySelectorAll("li").forEach((li, i) => {
            li.addEventListener("mousedown", (e) => {
                e.preventDefault();
                pickName(suggestions[i]);
            });
        });
    }
    function pickName(key) {
        if (!key || !trajectories[key]) return;
        const { name } = fmt(key);
        inputName.value = name;
        sugList.hidden = true;
        suggestions = [];
        highlightedIdx = -1;
        model.set("selected", key);
        try { model.save_changes(); } catch (e) {}
        renderSelection(key);
    }

    inputName.addEventListener("input", (e) => {
        const v = e.target.value;
        // Easter egg
        if (v.trim().toLowerCase() === "claude") fireRocket();
        highlightedIdx = -1;
        refreshSuggestions(v);
    });
    inputName.addEventListener("keydown", (e) => {
        if (sugList.hidden || suggestions.length === 0) {
            if (e.key === "Enter") {
                // Try exact-prefix match against the index
                const v = e.target.value.trim().toLowerCase();
                const found = nameIndex.find(
                    (k) => k.split("|")[0].toLowerCase() === v
                );
                if (found) pickName(found);
            }
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            highlightedIdx = (highlightedIdx + 1) % suggestions.length;
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            highlightedIdx =
                (highlightedIdx - 1 + suggestions.length) % suggestions.length;
        } else if (e.key === "Enter") {
            e.preventDefault();
            const idx = highlightedIdx >= 0 ? highlightedIdx : 0;
            pickName(suggestions[idx]);
            return;
        } else if (e.key === "Escape") {
            sugList.hidden = true;
            return;
        } else {
            return;
        }
        sugList.querySelectorAll("li").forEach((li, i) => {
            li.setAttribute("aria-selected", i === highlightedIdx);
        });
    });
    inputName.addEventListener("blur", () => {
        // Hide on blur but allow click to fire first
        setTimeout(() => (sugList.hidden = true), 150);
    });

    inputYear.addEventListener("change", () => {
        const v = parseInt(inputYear.value, 10);
        const yr = Number.isFinite(v) ? Math.max(yearStart, Math.min(yearEnd, v)) : 0;
        model.set("birth_year", yr);
        try { model.save_changes(); } catch (e) {}
        const sel = model.get("selected");
        if (sel) renderSelection(sel);
    });

    function fireRocket() {
        rocket.classList.remove("fly");
        // force reflow so the animation restarts
        // eslint-disable-next-line no-unused-expressions
        void rocket.offsetWidth;
        rocket.classList.add("fly");
    }

    // ---- chart rendering ----------------------------------------------------
    let activeAnimRaf = 0;

    function renderSelection(key) {
        if (activeAnimRaf) cancelAnimationFrame(activeAnimRaf);
        const series = trajectories[key];
        if (!series) {
            svg.innerHTML = "";
            peakPill.hidden = true;
            twinsGrid.innerHTML = `<div class="ne-empty">no data for that name</div>`;
            return;
        }
        const yMax = Math.max(...series, 10);
        const dPath = buildPath(series, yearStart, yearEnd, yMax);

        // Build SVG
        svg.innerHTML = "";
        const defs = el("defs");
        const clip = el("clipPath", { id: "ne-pclip-" + widgetId });
        const clipRect = el("rect", {
            x: M.l, y: M.t, width: 0, height: PLOT_H,
        });
        clip.appendChild(clipRect);
        defs.appendChild(clip);
        svg.appendChild(defs);

        // Grid: 6 horizontal, decades vertical
        const g = el("g", { class: "grid" });
        for (let i = 0; i <= 4; i++) {
            const y = M.t + (PLOT_H * i) / 4;
            g.appendChild(
                el("line", { x1: M.l, x2: M.l + PLOT_W, y1: y, y2: y })
            );
        }
        for (let yr = yearStart; yr <= yearEnd; yr += 20) {
            const x =
                M.l + (PLOT_W * (yr - yearStart)) / (yearEnd - yearStart);
            g.appendChild(
                el("line", {
                    x1: x, x2: x, y1: M.t, y2: M.t + PLOT_H,
                    "stroke-dasharray": "2 4",
                })
            );
        }
        svg.appendChild(g);

        // X-axis labels every 20 years
        const xax = el("g", { class: "axis" });
        for (let yr = yearStart; yr <= yearEnd; yr += 20) {
            const x =
                M.l + (PLOT_W * (yr - yearStart)) / (yearEnd - yearStart);
            xax.appendChild(
                el("text", {
                    x, y: VB_H - 6,
                    "text-anchor": "middle", text: String(yr),
                })
            );
        }
        svg.appendChild(xax);

        // The shadow + main line, both clipped by clipRect
        const lineGroup = el("g", {
            "clip-path": `url(#ne-pclip-${widgetId})`,
        });
        lineGroup.appendChild(
            el("path", { class: "line shadow", d: dPath })
        );
        lineGroup.appendChild(el("path", { class: "line", d: dPath }));
        svg.appendChild(lineGroup);

        // Birth-year tick (shown if birth_year ∈ range)
        const birthYr = model.get("birth_year");
        let birthLine = null;
        if (birthYr >= yearStart && birthYr <= yearEnd) {
            const bx =
                M.l + (PLOT_W * (birthYr - yearStart)) / (yearEnd - yearStart);
            birthLine = el("line", {
                class: "birth-tick",
                x1: bx, x2: bx, y1: M.t, y2: M.t + PLOT_H,
            });
            svg.appendChild(birthLine);
            const lbl = el("text", {
                x: bx, y: M.t + 12, "text-anchor": "middle",
                fill: "#ff8aa3", "font-size": 11, "font-weight": 600,
                text: `your year`,
            });
            svg.appendChild(lbl);
        }

        // Peak marker (hidden initially, shown when playhead reaches it)
        const peak = peaks[key];
        let peakDot = null;
        if (peak) {
            const px =
                M.l + (PLOT_W * (peak.year - yearStart)) / (yearEnd - yearStart);
            const py =
                M.t +
                PLOT_H *
                    (1 - logScale(peak.count) / logScale(yMax));
            peakDot = el("circle", {
                class: "peak-marker peak-twinkle",
                cx: px, cy: py, r: 6, opacity: 0,
            });
            svg.appendChild(peakDot);
            peakPill.textContent = `peaked in ${peak.year} · #${peak.rank}`;
            peakPill.hidden = false;
        } else {
            peakPill.hidden = true;
        }

        // Playhead vertical line
        const playhead = el("line", {
            class: "playhead",
            x1: M.l, x2: M.l, y1: M.t, y2: M.t + PLOT_H,
        });
        svg.appendChild(playhead);

        // Build twins
        renderTwins(twins[key] || []);

        // Reset confetti canvas
        const ctx = confetti.getContext("2d");
        ctx.clearRect(0, 0, confetti.width, confetti.height);

        // Animate
        const startT = performance.now();
        let lastDecade = null;
        let confettiFired = false;
        function step(t) {
            const f = Math.max(0, Math.min(1, (t - startT) / ANIM_MS));
            const w = PLOT_W * f;
            clipRect.setAttribute("width", w);
            const phx = M.l + w;
            playhead.setAttribute("x1", phx);
            playhead.setAttribute("x2", phx);
            updateTwinPlayheads(f);

            const yrNow = yearStart + (yearEnd - yearStart) * f;
            const dec = decadeOf(yrNow);
            if (dec !== lastDecade) {
                lastDecade = dec;
                const cap = eraCaptions[String(dec)];
                if (cap) {
                    eraEl.style.opacity = 0;
                    setTimeout(() => {
                        eraEl.textContent = cap;
                        eraEl.style.opacity = 1;
                    }, 160);
                }
                tint.style.backgroundColor =
                    DECADE_HUES[dec] || "transparent";
                tint.style.opacity = 0.08;
            }

            // Reveal peak marker once we cross it
            if (peak && peakDot && yrNow >= peak.year && peakDot.getAttribute("opacity") !== "1") {
                peakDot.setAttribute("opacity", "1");
                if (!confettiFired) {
                    confettiFired = true;
                    const px =
                        M.l +
                        (PLOT_W * (peak.year - yearStart)) /
                            (yearEnd - yearStart);
                    const py =
                        M.t +
                        PLOT_H *
                            (1 - logScale(peak.count) / logScale(yMax));
                    // Map SVG coords to canvas coords
                    const wrapRect = svg.getBoundingClientRect();
                    const cx = (px / VB_W) * wrapRect.width;
                    const cy = (py / VB_H) * wrapRect.height;
                    fireConfetti(confetti, cx, cy);
                }
            }

            if (f < 1) {
                activeAnimRaf = requestAnimationFrame(step);
            } else {
                activeAnimRaf = 0;
            }
        }
        activeAnimRaf = requestAnimationFrame(step);
    }

    // ---- twins panel --------------------------------------------------------
    let twinPlayheads = [];

    function renderTwins(keys) {
        twinsGrid.innerHTML = "";
        twinPlayheads = [];
        if (!keys.length) {
            twinsGrid.innerHTML = `<div class="ne-empty">no twins computed for this name</div>`;
            return;
        }
        for (const k of keys) {
            const series = trajectories[k];
            if (!series) continue;
            const { name, sex } = fmt(k);
            const card = document.createElement("div");
            card.className = "ne-twin";
            const yMax = Math.max(...series, 10);
            const path = buildPath(
                series,
                yearStart,
                yearEnd,
                yMax
            ).replace(
                /M([\d.]+),([\d.]+)/,
                (_, x, y) =>
                    "M" +
                    (((+x - M.l) / PLOT_W) * 100).toFixed(2) +
                    "," +
                    (((+y - M.t) / PLOT_H) * 100).toFixed(2)
            );
            // Easier: rebuild path manually with viewBox 0..100, 0..100
            let twinPath = "";
            for (let i = 0; i < series.length; i++) {
                const x = (i / (series.length - 1)) * 100;
                const y = 100 * (1 - logScale(series[i]) / logScale(yMax));
                twinPath += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2) + " ";
            }
            card.innerHTML = `
                <div><span class="name">${name}</span><span class="sex">${sex}</span></div>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                        <clipPath id="ne-tclip-${widgetId}-${twinPlayheads.length}">
                            <rect x="0" y="0" width="0" height="100"></rect>
                        </clipPath>
                    </defs>
                    <g clip-path="url(#ne-tclip-${widgetId}-${twinPlayheads.length})">
                        <path d="${twinPath}"></path>
                    </g>
                    <line class="twin-playhead" x1="0" x2="0" y1="0" y2="100"></line>
                </svg>
            `;
            card.addEventListener("click", () => pickName(k));
            twinsGrid.appendChild(card);
            const cr = card.querySelector("clipPath rect");
            const ph = card.querySelector(".twin-playhead");
            twinPlayheads.push({ rect: cr, line: ph });
        }
    }
    function updateTwinPlayheads(f) {
        const w = 100 * f;
        for (const t of twinPlayheads) {
            t.rect.setAttribute("width", w);
            t.line.setAttribute("x1", w);
            t.line.setAttribute("x2", w);
        }
    }

    // ---- model wiring -------------------------------------------------------
    model.on("change:selected", () => {
        const key = model.get("selected");
        if (key) renderSelection(key);
    });
    model.on("change:birth_year", () => {
        inputYear.value = model.get("birth_year") || "";
        const sel = model.get("selected");
        if (sel) renderSelection(sel);
    });

    // Initial selection: respect existing trait, else first key in index.
    let initial = model.get("selected");
    if (!initial || !trajectories[initial]) {
        initial = nameIndex[0];
    }
    if (initial) {
        inputName.value = fmt(initial).name;
        renderSelection(initial);
    } else {
        twinsGrid.innerHTML = `<div class="ne-empty">no data loaded</div>`;
    }
    if (model.get("birth_year")) inputYear.value = model.get("birth_year");
}

export default { render };
