---
title: Anywidget Experiments
---

# Anywidget Experiments

Custom [anywidget](https://anywidget.dev/) widgets that interoperate, render statically without a kernel, and play nicely with [lonboard](https://developmentseed.org/lonboard/).

**Live demo:** [https://batpad.github.io/anywidget-experiments/](https://batpad.github.io/anywidget-experiments/)

The pages on the live site are static HTML — no kernel running, no server, just a `mystmd` build. Click the buttons, scrub the counters, watch lonboard's points resize. All of it is JS-only at runtime.

## Walkthrough

1. **[An anywidget, statically](notebooks/01_anywidget_counter.ipynb)** — a single `CounterWidget`. Click `+`/`-`/Reset; the count updates locally with no kernel.
2. **[Anywidgets talking to each other](notebooks/02_linked_counters.ipynb)** — two widgets on the same page, wired through a shared in-page registry.
3. **[Lonboard, statically](notebooks/03_lonboard_static.ipynb)** — a minimal `lonboard.Map` rendered with binary Parquet buffers preserved through MyST's build pipeline.
4. **[Lonboard ↔ anywidget interop](notebooks/04_lonboard_interop.ipynb)** — a counter drives a lonboard layer's point radius via a generic binder widget.

### Showcase notebooks

These two stretch the toolchain into something more polished — real data, custom UI, and the kind of "wow, that's a notebook?" reaction we wanted to demonstrate. Both ship as static pages, no kernel.

5. **[What happened to your name?](notebooks/05_names.ipynb)** — type your name. A 144-year SSA-baby-names trajectory animates across a sweeping playhead, your birth year is marked, four "trajectory twins" appear below, and a small surprise fires when the playhead hits your name's peak year. The custom `NameExplorer` widget is one ~500-line vanilla-JS file with an inlined confetti routine and an Easter egg.
6. **[Hurricane Helene, 48 hours later](notebooks/06_helene.ipynb)** — Asheville disaster-response demo. A lonboard map with MODIS basemap, hand-authored Sentinel-1-style flood polygon, OSM building footprints (~41K), and hospitals. The `HurricaneDashboard` widget toggles layers and drives a flood-depth threshold slider that filters which buildings are shown — counters tween live as you drag.

These two notebooks pull external data (SSA names ZIP via Wayback, OSM via Overpass, MODIS via NASA GIBS, NOAA HURDAT2). The fetched files are `.gitignore`d. To regenerate them locally before re-executing the notebooks, run `bash data/names/fetch.sh` and `python data/helene/fetch.py`. CI does **not** re-execute these — their widget state is committed in the `.ipynb` outputs, so a normal `myst build` is enough on push.

## How it works

A small `mystmd` plugin at [`plugins/anywidget-static-export.mjs`](plugins/README.md) rewrites notebook widget outputs into AST nodes the `@myst-theme/anywidget` renderer can mount, with a runtime shim that no-ops the kernel-sync calls and hydrates binary buffers (Apache Parquet for lonboard) at page load. The plugin's README has the full catalogue of workarounds — they touch mystmd, myst-theme, `@jupyter-widgets/base`, and lonboard itself — and the [`docs/`](docs/) folder has a write-up per upstream fix.

## Local development

```bash
git clone https://github.com/batpad/anywidget-experiments.git
cd anywidget-experiments

python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

npm install
npm run build      # runs prebuild (executes lonboard notebooks via nbclient) then myst build
npm run serve      # python -m http.server on _build/html
```

For a development loop on a single notebook:

```bash
jupyter lab notebooks/04_lonboard_interop.ipynb
# edit, "Restart Kernel and Run All", save with widget state, then `npm run build`
```

## Repo structure

```
notebooks/   Walkthrough (01–04) + showcase (05–06) notebooks.
widgets/     CounterWidget, LinkedCounterWidget, WidgetBinder, NameExplorer, HurricaneDashboard.
plugins/     The static-export mystmd plugin + README explaining each hack.
data/        Datasets fetched at prebuild for the showcase notebooks (mostly .gitignored — see data/*/fetch.py / fetch.sh).
docs/        Per-upstream-fix write-ups + parking-lot example-ideas-*.md for sister notebooks.
.github/     GitHub Actions workflow that builds + deploys the site to Pages on every push to main.
```

## Acknowledgments

- [anywidget](https://anywidget.dev) by [@manzt](https://github.com/manzt)
- [lonboard](https://developmentseed.org/lonboard/) by Development Seed
- [mystmd](https://mystmd.org/) and [myst-theme](https://github.com/jupyter-book/myst-theme) by Jupyter Book

## License

MIT
