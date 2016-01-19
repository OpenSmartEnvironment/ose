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
 * @caption Field containing list of values
 *
 * @class ose.lib.orm.list
 * @extends ose.lib.orm.field
 * @type module
 */

// Public {{{1
exports.addChild = function(child) {  // {{{2
  if (this.child) {
    throw O.log.error(this, 'Duplicit child, list field can have only one child', child.name);
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

    for (var i = 0; i < patch.length; i++) {
      var li = ul.find('li[listindex="' + i + '"]');

      if (wrap.displayListDetail) {
        wrap.displayListDetail(wrap, ul, li, i, patch[i]);
        continue;
      }

      wrap.field.child.displayListDetail(wrap, ul, li, i, patch[i]);
    }
    return;
  });
};


/* OBSOLETE {{{1
exports.format = function(type, val) {  // {{{2
  if (! val) return '';

  var res = '';
  for (i = 0; i < val.length; i++) {
    res += this.child.format(type, val[i]) + '; ';
  }
};

}}}1 */
