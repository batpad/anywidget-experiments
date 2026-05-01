# Upstream: capture widget comm messages in `mystmd`'s executor

## Why this matters

Today, getting widget state into a static MyST build requires a separate
preprocess step (`jupyter nbconvert --to notebook --execute --inplace …`)
because mystmd's own kernel executor explicitly drops comm messages. With
this fix, users could turn on `project.execute: true` in `myst.yml` and have
buffer-correct widget state captured automatically. We could delete the
`prebuild` script in this repo's `package.json`.

## What's broken upstream

`jupyter-book/mystmd` → `packages/myst-execute/src/kernel.ts`. The kernel
message handler routes `iopub` messages by `msg_type` (`stream`, `display_data`,
`execute_result`, `error`, …) and has a `default:` branch that's effectively:

```ts
default: {
  // msg.header.msg_type.startsWith('comm')
  break;
}
```

That comment is the giveaway: the original author saw comm messages, decided
to skip them for now, and never came back. Comm messages are how widgets sync
state from the kernel to the frontend, including the `comm_open` (initial
state) and `comm_msg` (state updates) that carry both JSON state and raw
binary buffers in `msg.buffers`. By dropping them, mystmd never builds up the
notebook's `metadata.widgets["application/vnd.jupyter.widget-state+json"]`,
so the AST passed to plugins (and into `_build/html/<slug>.json` as
`page.widgets`) is empty.

## Reference implementation: `nbclient`

`nbclient` already does this correctly (Python side). See
`venv/lib/python3.14/site-packages/nbclient/client.py:1210-1266` —
`handle_comm_msg`. The logic is straightforward:

```python
def handle_comm_msg(self, outs, msg, cell_index):
    content = msg["content"]
    data = content["data"]
    if self.store_widget_state and "state" in data:
        self.widget_state.setdefault(content["comm_id"], {}).update(data["state"])
        if data.get("buffer_paths"):
            comm_id = content["comm_id"]
            new_buffers = {tuple(k["path"]): k for k in self._get_buffer_data(msg)}
            self.widget_buffers.setdefault(comm_id, {}).update(new_buffers)
```

`_get_buffer_data` base64-encodes `msg.buffers[i]` paired with
`data.buffer_paths[i]`. Then at the end of the run, `set_widgets_metadata`
(client.py:718-737) writes the canonical schema into
`nb.metadata.widgets["application/vnd.jupyter.widget-state+json"]`:

```json
{
  "version_major": 2, "version_minor": 0,
  "state": {
    "<model_id>": {
      "model_name": "...", "model_module": "...", "model_module_version": "...",
      "state": {... "table": [null, null]},
      "buffers": [{"path": ["table", 0], "data": "<base64>", "encoding": "base64"}, ...]
    }
  }
}
```

This is exactly the shape `plugins/anywidget-static-export.mjs` already
consumes from `metadata.widgets`. Mirror this in TypeScript and we're done.

## Implementation sketch (TS, mystmd)

In `packages/myst-execute/src/kernel.ts`:

1. Add a per-cell collector for `commId → {state, buffers}`. Hold it in
   the executor session, not per-cell, because comms persist across cell
   boundaries.
2. Replace the `default: break;` branch with explicit handlers:

   ```ts
   case 'comm_open': {
     // Record the model class info if present in data
     const { comm_id, target_name, data } = msg.content;
     if (target_name === 'jupyter.widget') {
       widgetState.set(comm_id, {
         model_name: data.state?._model_name,
         model_module: data.state?._model_module,
         model_module_version: data.state?._model_module_version,
         state: { ...data.state },
         buffers: encodeBuffers(data.buffer_paths, msg.buffers),
       });
     }
     break;
   }
   case 'comm_msg': {
     const { comm_id, data } = msg.content;
     const entry = widgetState.get(comm_id);
     if (!entry) break;
     if (data.method === 'update') {
       Object.assign(entry.state, data.state ?? {});
       const newBufs = encodeBuffers(data.buffer_paths ?? [], msg.buffers ?? []);
       entry.buffers = mergeBuffersByPath(entry.buffers, newBufs);
     }
     break;
   }
   case 'comm_close': {
     // Drop or keep — depends on whether the widget should persist.
     break;
   }
   ```

3. After all cells in a notebook execute, write the collected state into
   the notebook's `metadata.widgets[application/vnd.jupyter.widget-state+json]`
   following the v2 schema.

`encodeBuffers` is base64 encoding plus zipping with `buffer_paths` — there's
a one-to-one correspondence between the two arrays per Jupyter messaging spec
v5.

## Edge cases worth handling

- **Late-arriving messages**: nbclient waits for kernel idle before sealing
  state. mystmd should too. There's already a kernel-idle await somewhere in
  the executor session — hook into it.
- **Commless widgets**: only widgets that actually opened a comm get state.
  In practice this means widgets that were displayed at least once. Same
  semantics as nbclient — fine for our use case.
- **Multiple comms per model_id**: shouldn't happen in well-behaved widgets
  but the code should be defensive (last-write-wins per `path` is OK).
- **Cell-error containment**: if a cell errors mid-execution, partial widget
  state should still be persisted — not all-or-nothing.

## Test scenario

A regression test built from this repo's `notebooks/06_lonboard_static.ipynb`
is a great fit. It exercises the full path: anywidget Map + plain WidgetModel
layer with binary Parquet buffers + IPY_MODEL_ references. After the upstream
fix lands, run `myst build --execute` (no nbclient pre-step) and assert that
`_build/html/lonboard-static.json`'s `widgets` slot:

- has at least 7 entries (Map + layer + basemap + 3 controls + layout)
- the layer entry has a `buffers` array with `path: ['table', 0]`
- the buffers' `data` string is non-empty base64

A flush via `await session.kernelIdle()` before reading state, and you're
done.

## Once shipped

Delete `prebuild` from this repo's `package.json` and update
`plugins/README.md` hack table (#9). Maybe also remove the manual
`metadata.widgets` reading from
`plugins/anywidget-static-export.mjs:transformPlugin` and instead read from
the AST `widgets` field that mystmd populates. (See also: the agent research
note that mystmd already plumbs `metadata.widgets` into `page.widgets` —
once the executor populates it, we can stop reading the source `.ipynb`
directly.)

## Filing the issue / PR

Link to the existing ticket: https://github.com/jupyter-book/mystmd/issues/449
("Render frontend of widgets") — opened July 2023, still open at the time of
writing. The fix here is half the puzzle (capture state in the executor); the
other half (a kernelless renderer in myst-theme) is what
`plugins/anywidget-static-export.mjs` currently substitutes for.

A clean PR title: `myst-execute: capture widget comm messages into notebook
metadata`. Probably ~80–120 lines added. Worth opening an issue first to
align on the schema shape since it crosses package boundaries.
