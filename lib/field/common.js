'use strict';

var Ose = require('ose');
var M = Ose.class(module, C);

// Public {{{1
function C(name, type) {  // {{{2
  this.type = type;
  this.name = name;
  // this.caption = ''; Caption of field
};

exports.iterFields = function(data, profile, cb) {  // {{{2
  cb(this, data, profile);
};

exports.mergeData = function(data, cb) {  // {{{2
  return cb(this, data);
};

exports.format = function(type, data, params) {  // {{{2
  // @type: ('csv', 'slk', 'sort', 'edit', 'display')
  // @data: raw value to format
  // @params: parameters {space, TODO describe params}
  return '';
};

exports.unformat = function(data, params) {  // {{{2
  // Converts data from edit to native value
  // @data: data from edit
  // @params: parameters, view "format" method above

  return {error: 'notImplemented'};
};

exports.getField = function() {  // {{{2
  return this;
};

exports.formatField = function(path, type, data, params) {  // {{{2
  return this.format(type, data, params);
};

exports.doValidate = function(data, path, errors) {  // {{{2
  if (this.required) switch (data) {
    case undefined:
    case null:
    case NaN:
    case '':
      errors.push({
        error: 'required',
        field: path
      });
      break;
  }
};

// }}}1
