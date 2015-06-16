'use strict';

var O = require('ose').class(module, C, './index');

/** Docs {{{1
 * @module ose
 * @submodule ose.orm
 */

/**
 * @caption Number field description
 *
 * @readme
 * Description of fields containing a number
 *
 * @class ose.lib.field.number
 * @type class
 */

/**
 * Minimum value
 *
 * @property [params.min]
 * @type  Number
 */

/**
 * Maximum value
 *
 * @property [params.max]
 * @type Number
 */

/**
 * Number of decimal places
 *
 * @property [params.decimal]
 * @type  Number
 */

/**
 * Formatting radix
 *
 * @property [params.radix]
 * @type  Number
 */

/**
 * Unit
 *
 * @property [params.unit]
 * @type String
 */

// Public {{{1
function C(name, params) {  // {{{2
/**
 * Number field constructor
 *
 * @param name {String} Field name
 * @param [params] {Object} Optional parameters
 * @param [params.min] {Number} Minimum value
 * @param [params.max] {Number} Maximum value
 * @param [params.decimal] {Number} Number of decimal places
 * @param [params.radix] {Number} Formatting radix
 * @param [params.unit] {String} Unit
 *
 * @method constructor
 */

  O.super.call(this, name, params);

  if (! params) return;

  if ('min' in params) {
    this.min = params.min;
  }
  if ('max' in params) {
    this.max = params.max;
  }
  if ('decimal' in params) {
    this.decimal = params.decimal;
  }
  if ('radix' in params) {
    this.radix = params.radix;
  }
  if ('unit' in params) {
    this.unit = params.unit;
  }

  return;
}

exports.format = function(type, val) {  // {{{2
  switch (val) {
  case undefined:
  case null:
    val = '';
  }

  if (isNaN(val)) {
    val = 'NaN';
  }

  switch (typeof val) {
  case 'string':
    break;
  case 'boolean':
    val = val.toString();
    break;
  case 'number':
    if ('decimal' in this) {
      val = val.toFixed(this.decimal);
    } else if (this.radix) {
      val = val.toString(this.radix);
    }
    break;
  default:
    return O.error(this, 'INVALID_VALUE', 'Value must be a number', val);
  }

  switch (type) {
  case 'edit':
    return val;
  };

  throw O.error(this, 'Invalid format type', type);
};

exports.unformat = function(val) {  // {{{2
  switch (val) {
  case null:
  case undefined:
    return undefined;
  }

  var res = NaN;

  switch (typeof val) {
  case 'number':
    res = val;
    break;
  case 'string':
    val = val.replace('\u200b', '').trim();
    if (! val) return undefined;

    res = parseFloat(val);
    break;
  }

  if ('decimal' in this) {
    res = Math.round(res, this.decimal);
  }

  if (isNaN(res)) {
    return O.error(this, 'INVALID_VALUE', 'Value must be a number', val);
  }

  return res;
};

// }}}1
