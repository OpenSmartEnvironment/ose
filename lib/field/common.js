'use strict';

var O = require('ose').class(module, C);

// Public {{{1
function C(name, params) {  // {{{2
  this.name = name;

  if (! params) return;

  if ('order' in params) {
    this.order = params.order;
  }
  if ('required' in params) {
    this.required = params.required;
  }

  return;
}

exports.iterPatch = function(patch, orig, cb) {  // {{{2
  cb(this, patch, orig);
};

exports.iterFields = function(val, profile, cb) {  // {{{2
  cb(this, val, profile);
};

exports.getVal = function(get) {  // {{{2
  return get(this);
};

exports.getPatch = function(val, get) {  // {{{2
  return get(this, val);
};

exports.format = function(type, val, params) {  // {{{2
  // @type: ('csv', 'slk', 'sort', 'edit', 'display')
  // @val: raw value to format
  // @params: parameters {space, TODO describe params}
  return '';
};

exports.unformat = function(val, params) {  // {{{2
  // Converts val from edit to native value
  // @val: val from edit
  // @params: parameters, view "format" method above

  return O.error(this, 'Not implemented');
};

exports.getField = function() {  // {{{2
  return this;
};

exports.formatField = function(path, type, val, params) {  // {{{2
  return this.format(type, val, params);
};

exports.doValidate = function(val, path, errors) {  // {{{2
  if (this.required) switch (val) {
    case undefined:
    case null:
    case NaN:  // TODO won't work test isNaN(val)
    case '':
      errors.push({
        error: 'required',
        field: path
      });
      break;
  }
};

exports.setOrder = function(order) {  // {{{2
  if (! this.order) {
    this.order = ++order.value;
  }
};

// }}}1



/* OBSOLETE {{{1
exports.mergeData = function(val, cb) {  // {{{2
  return cb(this, val);
};

}}}1 */
