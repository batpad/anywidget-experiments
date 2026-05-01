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
notebooks/   The four walkthrough notebooks.
widgets/     CounterWidget, LinkedCounterWidget, WidgetBinder — the anywidgets used in the walkthrough.
plugins/     The static-export mystmd plugin + README explaining each hack.
docs/        Per-upstream-fix write-ups (mystmd comm capture, ipywidgets buffer serialization, myst-theme shadow-DOM CSS, lonboard view_state).
.github/     GitHub Actions workflow that builds + deploys the site to Pages on every push to main.
```

## Acknowledgments

- [anywidget](https://anywidget.dev) by [@manzt](https://github.com/manzt)
- [lonboard](https://developmentseed.org/lonboard/) by Development Seed
- [mystmd](https://mystmd.org/) and [myst-theme](https://github.com/jupyter-book/myst-theme) by Jupyter Book

## License

MIT
