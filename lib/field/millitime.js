'use strict';

const O = require('ose')(module)
  .class(init, './number')
;

/** Docs {{{1
 * @module ose
 * @submodule ose.field
 */

/**
 * @caption Millitime field description
 *
 * @readme
 * Description of fields containing time in milliseconds
 *
 * @class ose.lib.field.millitime
 * @extends ose.lib.field.number
 * @type class
 */

// Public {{{1
function init(parent, name) {  // {{{2
/**
 * Millitime field constructor
 *
 * @method constructor
 */

  this.min = 0;
  this.decimal = 0;
  this.unit = 'millisecond';

  O.inherited(this)(parent, name);
}

exports.asText =  // {{{2

exports.asEditText = function(val) {  // {{{2
  switch (val) {
  case null:
  case undefined:
    return '';
  }

  return new Date(this.asNumber(val)).toLocaleString(O.ui.language);
};

