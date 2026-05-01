# Lonboard's `view_state` is uncontrolled — external updates don't repaint

## What we hit

In the interop demo (`notebooks/07_lonboard_interop.ipynb`), the first design
was a counter widget driving the map's zoom via
`target_field="view_state.zoom"`. The model layer worked perfectly:

```js
// after clicking "Reset" on the counter:
window.__myst_widgets.get('zoom_ctrl').get('value')  // 0
window.__myst_widgets.get('lonboard._map.Map').get('view_state')?.zoom  // 0
```

But the rendered map didn't change. Inspecting the live deck instance:

```js
window.__deck.props.initialViewState
// {bearing: 0, latitude: 37.7749, longitude: -122.4194,
//  maxPitch: 60, maxZoom: 20, minPitch: 0, minZoom: 0, pitch: 0,
//  zoom: 12}              <-- still the original
window.__deck.props.viewState
// null                    <-- not controlled
```

## Root cause

Lonboard renders deck.gl with `initialViewState` (read once at mount) instead
of `viewState` (controlled, re-applied on every prop change). From the
bundled lonboard `_esm` (decompiled):

```js
let [je, st] = ZJ("view_state");          // model traitlet hook
// ...
zr = {
  // ...
  initialViewState: je,                    // <-- consumed once by deck
  onViewStateChange: ur => {
    st(X1e(rt, ur.viewState))              // <-- user pan/zoom flows back to model
  },
  // viewState: undefined                  // <-- not set, uncontrolled
}
```

Deck.gl's contract is: pass `initialViewState` for one-time setup, or pass
`viewState` for full external control. Lonboard chose the former — likely
because it's the natural fit when the kernel is the source of truth and the
user interacts via the map, not the other way around. External JS-only
binders (our case) can't drive the viewport without a remount or a fly-to.

## Workarounds we have today

1. **Bind to layer-level props instead.** Layer-level traits (`get_radius`,
   `get_fill_color`, `opacity`, `pickable`, etc.) DO repaint when changed —
   layer model's `change:*` events flow into `BaseModel.updateStateCallback`,
   the React layer hook re-reads, and deck gets fresh `Layer` instances. This
   is what the interop demo does today (counter → `get_radius`).

2. **`Map.fly_to(...)` via custom message.** Lonboard's Map listens for a
   custom `msg:custom` of type `fly-to`:

   ```js
   U.on("msg:custom", ur => {
     switch (ur.type) {
       case "fly-to": Z1e(ur, st); break;
     }
   });
   ```

   In a kernel context, `m.fly_to(longitude, latitude, zoom, ...)` from
   Python sends this. In static, our shim's `model.send` is currently a no-op.
   We could route `model.send({type: 'fly-to', ...})` through
   `model._fire('msg:custom', {...})` so the registered listener picks it up.
   That would give us animated viewport control externally.

3. **Force a remount.** Wrap deck in a key that includes view_state, so any
   external view_state change triggers a full remount with the new initial
   state. Heavy-handed; not great UX (loses GPU state, picks up new view).
   Lonboard would have to do this — we can't from outside.

## What an upstream fix could look like

Two reasonable options on the lonboard side:

### A. Switch to controlled `viewState`

```js
zr = {
  // ...
- initialViewState: je,
+ viewState: je,
  onViewStateChange: ur => st(X1e(rt, ur.viewState)),
}
```

Trade-off: the `onViewStateChange` callback now has to fire on every animated
frame (deck's controller produces continuous updates during pan/zoom). With
controlled mode, every frame round-trips through React state — possibly
expensive at high frame rates. Lonboard would need to test the ergonomics.

### B. Hybrid: use `initialViewState` but `key={JSON.stringify(je)}`

```js
<DeckGL key={je && JSON.stringify(je)} initialViewState={je} ... />
```

Forces remount on external view_state changes but doesn't intercept user
interaction frames. Cheap. Loses any in-flight animation state.

### C. Expose a JS-callable `setView` method on the Map model

Lonboard could register a custom message handler that mirrors `fly_to` for
"jump_to" (no animation), and document it as the way to drive viewport from
outside. Today, the only way is to send a custom comm message via Python.

## Talking points for Kyle

- The author of this repo has access to the lonboard maintainer (Kyle Barron).
  Worth bringing up: "what's the supported way to drive `view_state`
  externally from JS?" — there may be a canonical answer we're missing.
- If they're open to (A) or (B), it'd unblock generic external viewport
  control for any anywidget that wants to compose with lonboard.
- The fly-to message route (workaround #2) is probably the path of least
  resistance from our side — small shim change, no lonboard change required.

## What we shipped

The interop demo binds to `get_radius` instead of `view_state`. The README
in `notebooks/07_lonboard_interop.ipynb` calls out the limitation.

## Cross-references

- `notebooks/07_lonboard_interop.ipynb` — uses `get_radius`, comments on the
  view_state choice.
- `widgets/widget_binder/widget.js` — supports dotted `target_field`, would
  handle `view_state.zoom` correctly if deck were controlled.
- `plugins/anywidget-static-export.mjs` — `model.send` is currently a no-op;
  enabling the fly-to workaround would mean routing it through `model._fire`.
