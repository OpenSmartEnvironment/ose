'use strict';

var O = require('ose').class(module, './field');

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
 * @class ose.lib.orm.number
 * @extends ose.lib.orm.field
 * @type class
 */

/**
 * Minimum value
 *
 * @property min
 * @type  Number
 */

/**
 * Maximum value
 *
 * @property max
 * @type Number
 */

/**
 * Number of decimal places
 *
 * @property decimal
 * @type  Number
 */

/**
 * Formatting radix
 *
 * @property radix
 * @type  Number
 */

/**
 * Unit
 *
 * @property unit
 * @type String
 */

/*
 * @param [params.min] {Number} Minimum value
 * @param [params.max] {Number} Maximum value
 * @param [params.decimal] {Number} Number of decimal places
 * @param [params.radix] {Number} Formatting radix
 * @param [params.unit] {String} Unit
 */

// Public {{{1
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

exports.displayDetail = function(view, wrap) {  // {{{2
  var res = view.li();

  if (this.min || this.max) {
    var params = {field: wrap};

    if (this.min) params.min = this.min;
    if (this.max) params.max = this.max;
    if (this.post) params.post = this.post;
    if (wrap.layout.post) params.post = wrap.layout.post;

    res.section('row')
      .h3(this.displayName(), 'stretch')
      .span(undefined, wrap)
    ;
    res.slider(params);
  } else {
    res.h3(this.displayName(), 'stretch')
    res.p(undefined, wrap)
  }

  return res;
};

exports.asText =  // {{{2

exports.asEditText = function(val) {  // {{{2
  switch (val) {
  case null:
  case undefined:
    val = '';
    break;
  default:
    val = this.asNumber(val);

    if (this.unit === '%') {
      val = val * 100;
    }

    if ('decimal' in this) {
      val = val.toFixed(this.decimal);
    } else if (this.radix) {
      val = val.toString(this.radix);
    } else {
      val = val.toString();
    }
    break;
  }

  if (this.unit) return val + ' ' + this.unit;
  return val;
};

exports.asNumber = function(val) {  // {{{2
  if (isNaN(val)) {
    return NaN;
  }

  switch (val) {
  case undefined:
  case null:
    return NaN;
  }

  switch (typeof val) {
  case 'string':
    return parseFloat(val);
  case 'boolean':
    if (val) return 1;
    return 0;
  case 'number':
    return val;
  }

  return NaN;
};

