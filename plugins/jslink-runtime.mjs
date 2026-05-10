// Browser runtime that resolves jslink/jsdlink bindings collected from the
// notebook's widget-state.
//
// This file is read as a string by plugins/anywidget-static-export.mjs and
// emitted verbatim into notebooks/_widget_assets/ at build time. It is NOT
// imported as a module anywhere — the separation into its own .mjs file is
// purely for readability.

function setupLink(source, target, link) {
  let _updating = false;
  const fwd = function () {
    if (_updating) return;
    _updating = true;
    try { target.set(link.targetAttr, source.get(link.sourceAttr)); }
    finally { _updating = false; }
  };
  source.on('change:' + link.sourceAttr, fwd);
  // Initial sync mirrors upstream LinkModel.updateBindings(): push current source to target.
  fwd();
  if (link.bidirectional) {
    const rev = function () {
      if (_updating) return;
      _updating = true;
      try { source.set(link.sourceAttr, target.get(link.targetAttr)); }
      finally { _updating = false; }
    };
    target.on('change:' + link.targetAttr, rev);
  }
}

export default {
  render: function (args) {
    const model = args.model;
    const el = args.el;
    const host = args.host;
    if (el && el.style) el.style.display = 'none';
    const links = (model && model.get && model.get('links')) || [];
    for (const link of links) {
      Promise.all([
        host.waitForModel(link.sourceId, { timeout: 10000 }),
        host.waitForModel(link.targetId, { timeout: 10000 }),
      ]).then(function (pair) {
        setupLink(pair[0], pair[1], link);
      }).catch(function (err) {
        console.warn('[jslink-runtime] failed to bind', link, err);
      });
    }
  },
};
