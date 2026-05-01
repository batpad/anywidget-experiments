# Lonboard renders as a 234,000-pixel-tall blank canvas in shadow DOM

## TL;DR

`@myst-theme/anywidget` renders each widget into a shadow DOM and appends the
widget's CSS `<link>` *into the user-render-target div `R`*, then calls the
widget's `render({model, el: R})`. Lonboard's render uses React `createRoot(R)`,
which **wipes `R`'s children when mounting**. The CSS link goes with them.
Tailwind utility classes (`.h-full`, `.w-full`, `.flex`) baked into lonboard's
HTML stop applying. Without `.h-full` the deck.gl container can't compute its
height correctly and grows unboundedly to the full document height (~234,000
pixels in our case). The actual map renders, but is so far below the visible
viewport that you see only a gray box.

## Symptom

`/lonboard-static/` page renders. No JavaScript errors. Map data flows all the
way through (verified `layersState` populated, `layer.render()` returns a
`GeoArrowScatterplotLayer` with the correct 5 rows of data). But the visible
output is a grey box — no basemap tiles, no points.

DOM inspection inside `host.shadowRoot`:

```
.lonboard                                clientHeight=400 ✓
  #map-...flex                           clientHeight=400 ✓
    div.bg-transparent.h-full.w-full     clientHeight=234274 ✗
      .maplibregl-map                    clientHeight=234274 ✗
        canvas.maplibregl-canvas         height=234126 ✗
        ...
```

The `.bg-transparent.h-full.w-full` div is the culprit. With `h-full`
properly resolved as `height: 100%` of its 400px-tall flex parent, it should
be 400px. Instead it's 234274px.

## Root cause

```
1. AnyWidgetRenderer attaches a shadow DOM under .myst-anywidget.
2. Inside the shadow root, it creates a div R and appends a <link rel="stylesheet"
   href={node.css}> into R.
3. It calls the user's render({model, el: R}).
4. Lonboard's render does ReactDOM.createRoot(R).render(<App/>).
5. createRoot's reconciliation algorithm wipes R's children when mounting,
   removing the <link>.
6. The CSS stylesheet (which includes Tailwind utilities like .h-full,
   .w-full, .flex, .bg-transparent) is never connected to the document.
7. Lonboard's rendered DOM uses those Tailwind classes. They don't apply.
8. Without explicit height, the .h-full div has no defined height. Its
   children (deck.gl's canvas) compute their own height somehow, and via
   some feedback loop the container grows to absurd dimensions.
```

We confirmed step 6 directly: `host.shadowRoot.querySelectorAll('style, link')`
returned an empty array. Zero stylesheets in the shadow root.

## What confirmed it

```js
// In console:
host = document.querySelector('.myst-anywidget');
host.shadowRoot.querySelectorAll('style, link[rel="stylesheet"]').length;
// 0
target = host.shadowRoot.querySelector('.bg-transparent.h-full.w-full');
getComputedStyle(target).height;
// "234274px"
```

After our fix (inject CSS as `<style>` directly into shadow root):

```js
host.shadowRoot.querySelectorAll('style').length;
// 1 — our injected style with 331 KB of lonboard's CSS
getComputedStyle(target).height;
// "400px" ✓
```

## The relevant upstream code

`@myst-theme/anywidget`, somewhere in the published bundle (we never read the
TypeScript source — the bundle was clear enough). Roughly:

```ts
async function mount(host, node) {
  const shadow = host.shadowRoot ?? host.attachShadow({mode: 'open'});
  const R = document.createElement('div');
  R.className = 'myst-anywidget ' + (node.class ?? '');
  R.style.position = 'relative';
  shadow.replaceChildren(R);

  if (node.css) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = node.css;
    R.appendChild(link);                       // <-- the bug
  }

  const widget = await import(node.esm);
  await widget.initialize?.({model});
  await widget.render?.({model, el: R});       // <-- React.createRoot(R) wipes children
}
```

The bug is putting the link inside `R` (the user's render target). For widgets
that mount into `R` non-destructively (vanilla JS that does `R.appendChild`),
the link survives. For widgets that use `ReactDOM.createRoot(R).render(...)` or
similar destructive mounts, the link is gone before the page paints.

Lonboard happens to use React internally. So do many other anywidgets that
ship a React-based frontend (e.g. anything built with `@anywidget/react`).

## Workaround we shipped

In `plugins/anywidget-static-export.mjs`:

1. Don't set `node.css` (so the renderer's broken injection doesn't run).
2. Inline the CSS *text* into `node.model._myst_css_text` at plugin time.
3. The shim's `render({model, el})` does:

   ```js
   const root = el.getRootNode();           // shadow root, not document
   if (!root.querySelector('style[data-myst-css="<key>"]')) {
     const style = document.createElement('style');
     style.setAttribute('data-myst-css', '<key>');
     style.textContent = cssText;
     root.appendChild(style);                // <-- to shadow root, not el
   }
   ```

The `<style>` element is appended directly to the shadow root, **as a sibling
of `R`**. React's render-into-`R` can't reach it. Stylesheets in shadow DOM
apply to everything inside that shadow root, so lonboard's rendered Tailwind
classes get styled correctly.

Cost: the CSS lands in the page JSON as a string. ~330 KB per lonboard map.
Acceptable for a demo; could grow for many maps per page.

## Upstream fix paths, ranked

### A. Renderer appends CSS to shadow root, not to `R`

Smallest behavioral change. Just one line in the renderer:

```ts
- R.appendChild(link);
+ shadow.appendChild(link);
```

Pros:
- Fixes the issue for all React-based anywidgets.
- No behavior change for non-React widgets.
- One line.

Cons:
- The link being a sibling of `R` rather than a child means CSS scoping
  semantics shift slightly. In practice `<link>` in a shadow root applies to
  all descendants, so visually equivalent.
- Need to be careful about cleanup if the widget unmounts.

This is the right fix. **Recommend opening this PR.**

### B. Renderer uses `adoptedStyleSheets`

```ts
const sheet = new CSSStyleSheet();
const cssText = await fetch(node.css).then(r => r.text());
sheet.replaceSync(cssText);
shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];
```

Pros:
- The cleanest spec-compliant way to attach CSS to a shadow DOM. No
  `<link>` element to be wiped, no fetch race.
- Better for performance if many widgets share the same CSS (one sheet,
  multiple shadow roots).

Cons:
- Requires fetch (or re-encoding into JS) — more complex code.
- Older browsers (deprecated, but still in some users' Chrome) need polyfill.

### C. Expose a `useShadowDom: false` option

Already exists in the bundle (the `if (g) { … }` branch). If it could be
flipped per-node, we could set `useShadowDom: false` for widgets that fight
with shadow DOM. But this gives up CSS isolation entirely, which is
why shadow DOM was used in the first place. Not a great fix.

### D. Make the renderer wait for the user's render to complete, then re-inject CSS

Brittle. Don't.

## Filing

Repository: `jupyter-book/myst-theme`. Look for `packages/anywidget/src/`.
The fix is likely in `renderers.tsx`'s `AnyWidgetRenderer` component.

Issue title: `@myst-theme/anywidget: CSS link is wiped by React-based widgets`
PR title: `anywidget: append CSS link to shadow root, not to render target`

Expected diff: ~5 lines, plus a test. Probably a minor release.

## Cross-reference

- `plugins/README.md` hack #5
- `plugins/anywidget-static-export.mjs` — `__mystEnsureShadowCss` and
  `node.model._myst_css_text` are the implementation
