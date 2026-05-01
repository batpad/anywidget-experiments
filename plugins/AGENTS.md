# Agents working in `plugins/`

Read `plugins/README.md` first. It catalogs every workaround in
`anywidget-static-export.mjs` with a number, rationale, and link to the
upstream doc when one exists. Don't refactor a hack without checking the
table — most of them are load-bearing for a specific upstream quirk.

When a widget doesn't render:

1. Check the browser console first. Errors of the form `MystAnyModel.X not implemented yet` mean a method we haven't no-op'd. Add it to `__mystSetupModel`.
2. If you see *no* `[myst-shim]` logs (when diagnostics are on), the regex in `wrapEsmForStatic` didn't match the user's `_esm`. Add a new pattern.
3. If the widget mounts but appears empty / huge / unstyled, it's probably a shadow-DOM CSS issue. See `docs/lonboard-shadow-dom-height.md`.
4. Use `chrome-devtools` MCP to introspect the shadow DOM and React fiber. Don't assume `document.querySelector` finds rendered widgets — they live in `host.shadowRoot`.

Avoid adding new dependencies to the plugin. It's a single `.mjs` file
referenced from `myst.yml` and we want it to stay that way until we have a
clear reason to grow it.

When you ship a fix that should later be replaced by an upstream change, add
a `// TODO(upstream): …` comment with a one-line description and a doc
reference, e.g. `// TODO(upstream): see docs/upstream-mystmd-comm-capture.md`.
