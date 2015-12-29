'use strict';

var O = require('ose').class(module, C, './number');

/** Docs {{{1
 * @module ose
 * @submodule ose.orm
 */

/**
 * @caption Millitime field description
 *
 * @readme
 * Description of fields containing time in milliseconds
 *
 * @class ose.lib.orm.millitime
 * @extends ose.lib.orm.number
 * @type class
 */

// Public {{{1
function C(parent, name) {  // {{{2
/**
 * Millitime field constructor
 *
 * @method constructor
 */

  this.min = 0;
  this.decimal = 0;
  this.unit = 'millisecond';

  O.super.call(this, parent, name);
}

