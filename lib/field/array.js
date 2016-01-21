'use strict';

const O = require('ose')(module)
  .class('./field')
  .prepend('./parent')
;

/** Docs {{{1
 * @module ose
 * @submodule ose.field
 */

/**
 * @caption Array field containing list of values
 *
 * @class ose.lib.field.array
 * @extends ose.lib.field.field
 * @type module
 */

// Public {{{1
// TODO: copy `iter*()` from "object.js"
exports.addChild = function(child) {  // {{{2
  if (this.child) {
    throw O.log.error(this, 'Duplicit child, array field can have only one child', child.name);
  }

  child.parent = this;

  return this.child = child;
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
