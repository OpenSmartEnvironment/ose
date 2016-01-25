'use strict';

const O = require('ose')(module)
  .class('./field')
;

// Public {{{1
exports.displayMapDetail = function(wrap, ul, li, key, patch) {  // {{{2
  if (patch === null) {
    if (li) li.remove();
    return;
  }

  if (li) {
    if (wrap.lookupView) {
      wrap.lookupView.parent().removeClass('divider');
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
    .on('tap', function(ev) {
      if (wrap.lookupView) {
        var parent = wrap.lookupView.parent();
        wrap.lookupView.remove();
        delete wrap.lookupView;
        parent.removeClass('divider');

        if (parent === li) return false;
      }

      li.addClass('divider');
      var demand = JSON.parse(JSON.stringify(wrap.value[key]));
      if (! demand.view) demand.view = 'list';

      wrap.lookupView = li.view2(demand);
      li.append2(wrap.lookupView);

      if (wrap.field.extendView) {
        wrap.field.extendView(wrap, wrap.lookupView);
      }
      if (wrap.field.child.extendView) {
        wrap.field.child.extendView(wrap, wrap.lookupView);
      }

      wrap.lookupView.loadData();

      return false;
    })
  ;
  return;
};

