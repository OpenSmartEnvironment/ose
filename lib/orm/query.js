'use strict';

var O = require('ose').class(module, './field');

// Public {{{1
exports.displayMapDetail = function(wrap, ul, li, key, patch) {  // {{{2
  if (patch === null) {
    if (li) li.remove();
    return;
  }

  if (li) {
    if (wrap.lookupView) {
      wrap.lookupView.remove();
      delete wrap.lookupView;
    }
    return;
  }

  li = ul.li({
    mapkey: key,
    focusable: undefined,
  })
    .hook()
    .h3(O.translate(key))
    .on('click', function(ev) {
      li.stop(ev);

      if (wrap.lookupView) {
        var parent = wrap.lookupView.parent();
        wrap.lookupView.remove();
        delete wrap.lookupView;

        if (parent === li) return;
      }

      var so = JSON.parse(JSON.stringify(wrap.value[key]));
      if (! so.view) so.view = 'list';

      wrap.lookupView = li.view2(so);
      li.append2(wrap.lookupView);

      if (wrap.field.extendView) {
        wrap.field.extendView(wrap, wrap.lookupView);
      }
      if (wrap.field.child.extendView) {
        wrap.field.child.extendView(wrap, wrap.lookupView);
      }

      wrap.lookupView.loadData();
    })
  ;
  return;
};

