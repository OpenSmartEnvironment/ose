'use strict';

var O = require('ose').class(module, C, './common');

// Public {{{1
function C(name, params) {  // {{{2
  O.super.call(this, name, params);

  if (! params) return;

  if ('min' in params) {
    this.min = params.min;
  }
  if ('max' in params) {
    this.max = params.max;
  }
  if ('decimal' in params) {
    this.decimal = params.min;
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
