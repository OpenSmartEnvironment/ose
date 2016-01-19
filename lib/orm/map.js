'use strict';

const O = require('ose')(module)
  .class('./field')
  .prepend('./parent')
;

/** Docs {{{1
 * @module ose
 * @submodule ose.orm
 */

/**
 * @caption Map field containing key: value pairs
 *
 * @class ose.lib.orm.map
 * @extends ose.lib.orm.field
 * @type module
 */

// Public {{{1
exports.addChild = function(child) {  // {{{2
  if (this.child) {
    throw O.log.error(this, 'Duplicit child, map field can have only one child', child.name);
  }

  child.parent = this;

  return this.child = child;
};

exports.displayDetail = function(view, wrap) {  // {{{2
  var ul = view.li('divider')
    .h2(this.displayName() + ':')
    .ul().hook()
  ;

  wrap.onPatch(function(patch) {
    if (! patch) {
      ul.empty();
      return;
    }

    for (var key in patch) {
      var li = ul.find('li[mapkey="' + key + '"]');

      if (wrap.displayMapDetail) {
        wrap.displayMapDetail(wrap, ul, li, key, patch[key]);
        continue;
      }

      if (wrap.field.child) {
        wrap.field.child.displayMapDetail(wrap, ul, li, key, patch[key]);
        continue;
      }

      O.log.error(wrap.field, 'Missing map child');
    }
    return;
  });
};

