'use strict';

var O = require('ose').class(module);

// Public {{{1
exports.iterFields = function(data, profile, cb) {  // {{{2
  cb(this, data, profile);
};

exports.getPatch = function(data, get) {  // {{{2
  return get(this, data);
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



/* OBSOLETE {{{1
exports.mergeData = function(data, cb) {  // {{{2
  return cb(this, data);
};

}}}1 */
