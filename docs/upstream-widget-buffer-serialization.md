# Upstream: `WidgetModel.serialize()` silently destroys binary traits

## Why this matters

This is the bug under [`upstream-mystmd-comm-capture.md`](upstream-mystmd-comm-capture.md).
mystmd-comm-capture is the cleanest fix for *our* pipeline. This doc is about
the deeper bug that affects everyone — JupyterLab "Save Widget State", `nbconvert
--to html`, Voilà static export, and any third-party static export — whenever a
widget syncs binary data via traits without a custom JS-side serializer.

Lonboard, ipydatagrid, ipycanvas, ipywebrtc, plotly-with-large-data, and most
"data-shipping" anywidgets all hit this. Fix it once and everyone's static
export gets buffers correctly without per-widget patches.

## The bug

`@jupyter-widgets/base/src/widget.ts:563-585`, `WidgetModel.serialize`:

```ts
serialize(state: Dict<any>): JSONObject {
  const serializers = (this.constructor as typeof WidgetModel).serializers || JSONExt.emptyObject;
  for (const k of Object.keys(state)) {
    try {
      if (serializers[k] && serializers[k].serialize) {
        state[k] = serializers[k].serialize!(state[k], this);
      } else {
        // the default serializer just deep-copies the object
        state[k] = JSON.parse(JSON.stringify(state[k]));
      }
      ...
```

The default branch is `JSON.parse(JSON.stringify(state[k]))`. For any value
that's a `DataView` / `ArrayBuffer` / `ArrayBufferView` (the things widgets use
for binary data), `JSON.stringify` returns `"{}"`. The buffers are gone before
`remove_buffers` (the next stage in the pipeline) can extract them and stash
them in the parallel base64 buffers array.

Result: when JupyterLab's "Save Widget State Automatically" or any code path
that goes through `serialize_state` runs, binary traits become `[{}]` in
saved metadata, with zero `buffers` entries.

## Why this hits anywidget too

Anywidget builds on top of `@jupyter-widgets/base`. Every anywidget instance
inherits `WidgetModel.serialize` unless the widget author explicitly defines a
JS-side serializers map. Lonboard does **not** define one for `table` —
nobody does, because the widget protocol is supposed to handle binary
serialization automatically (it does over the live comm channel; the
`serialize_state` path is what's broken).

## Fix options, ranked

### Option A: Lonboard adds `static serializers` (5-line PR)

Smallest delta. In `lonboard/src/model/layer/base.ts` (the JS frontend):

```ts
class BaseLayerModel extends WidgetModel {
  static serializers = {
    ...WidgetModel.serializers,
    table: { serialize: (v) => v },  // identity — preserves DataView[]
    get_radius: { serialize: (v) => v },
    get_fill_color: { serialize: (v) => v },
    // ... any other binary-bearing traits
  };
}
```

Identity serializer preserves the `DataView[]` so `remove_buffers` (the next
step) can find and extract the binary data into the canonical
`{path, data: <base64>, encoding: 'base64'}` shape.

Pros: targeted, lonboard-controlled, fixes JLab "Save Widget State" output for
lonboard widgets immediately. Doesn't fix anyone else's widget though.

Cons: every widget author has to do this. Nobody does. Most don't realize
they need to.

### Option B: `WidgetModel.serialize` default branch preserves typed arrays

`@jupyter-widgets/base/src/widget.ts:563-585`:

```ts
} else {
  const v = state[k];
  // Preserve binary types so remove_buffers can extract them downstream.
  if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) {
    // pass through unchanged
  } else if (Array.isArray(v) && v.some(x => x instanceof ArrayBuffer || ArrayBuffer.isView(x))) {
    // pass through (or recursively walk if widgets have nested arrays of buffers)
  } else {
    state[k] = JSON.parse(JSON.stringify(v));
  }
}
```

Pros: fixes the bug for everyone. Backward compatible (values that *don't*
contain buffers still get the deep-clone behavior). The size of the change is
proportional to how thoroughly we want to walk nested structures.

Cons: cross-cutting change to a heavily depended-on library. Will need a
coordinated release through `@jupyter-widgets/base` →
`@jupyter-widgets/jupyterlab-manager` → JupyterLab itself before users see it.
Potentially many months. Also: the deep-walk version needs a recursive function
that's careful about cycles.

### Option C: Replace `JSON.parse(JSON.stringify())` with structuredClone

```ts
state[k] = structuredClone(state[k]);
```

`structuredClone` natively handles `ArrayBuffer` / typed arrays / `DataView`
(it copies them, but they end up as `ArrayBuffer`/typed-arrays still — so
`remove_buffers` can find them). Available in all modern browsers since ~2022.

Pros: tiny diff. Same shape as the original code.

Cons: `structuredClone` doesn't transfer functions or class instances; if any
widget today happened to rely on the JSON round-trip stripping them, this
would change behavior. Lower probability but real.

Probably the cleanest one-line fix. Worth proposing.

### Option D: Document around the bug

Tell every widget author "you must define a `serializers` map for binary
traits in your `_view_module`". Already implicit; nobody does it. Not a
real fix.

## Recommended path

Open an issue against `jupyter-widgets/ipywidgets` describing the symptom
and proposing Option C. Reference the existing tracker for "Save Widget
State strips buffers" — there's been on-and-off discussion of this for years
without a clean fix landing. A `structuredClone` PR is the easiest sell.

If that gets traction → great, the upstream fix flows into JupyterLab over
the next release cycle and `metadata.widgets` becomes buffer-correct again
for *all* widgets without per-widget action.

If it stalls → option A for lonboard specifically as a PR to
`developmentseed/lonboard`. Even if the upstream lands eventually, the per-widget
serializers approach gives users earlier relief.

## Test plan

A regression test for the upstream change can be a synthetic widget with one
typed-array trait:

```ts
class TestModel extends WidgetModel {
  defaults() { return { ...super.defaults(), buf: new ArrayBuffer(8) }; }
}
const m = new TestModel({...});
const split = remove_buffers(m.serialize(m.get_state()));
assert(split.buffers.length === 1);  // currently fails — split.buffers is []
assert(split.buffer_paths[0].length === 1 && split.buffer_paths[0][0] === 'buf');
```

For lonboard option A: build a notebook with a Map, save with widget state in
JLab, open the resulting `.ipynb`, assert the layer entry has a non-empty
`buffers` array.

## Why our plugin can ignore this for now

Our pipeline reads from `metadata.widgets` after `nbclient` has run, and
nbclient captures buffers at the wire-protocol level *before*
`WidgetModel.serialize` ever runs. So the bug doesn't bite us as long as we
keep the prebuild step. Once we upstream comm-capture into mystmd
(`upstream-mystmd-comm-capture.md`), we still bypass this bug because we're
reading wire-level state, not serialized state.

The bug only matters if a user opens their notebook in JupyterLab, hits "Save
Widget State Automatically", and expects that saved metadata to be sufficient
for static rendering. Today it's not. Fixing this would mean nbconvert HTML
exports, JLab static notebooks, and Voilà all start working properly without
extra steps — much bigger blast radius than just our pipeline.
