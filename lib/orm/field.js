'use strict';

var O = require('ose').class(module, C);

/** Docs {{{1
 * @caption Object-relational mapping
 *
 * @readme
 * This component allows to describe JSON data structures. Data descriptions contian no particular data.
 *
 * @TODOfeatures
 * - JSON data editing
 * - lookups
 *
 * @module ose
 * @submodule ose.orm
 * @main ose.orm
 */

/**
 * @caption Common field description
 *
 * @readme
 * Ancestor for field descriptions
 *
 * @class ose.lib.orm.field
 * @type module
 */

/**
 * Field name
 *
 * @property name
 * @type String
 */

/**
 * Field order
 *
 * @property order
 * @type Number
 */

/**
 * Whether field is required
 *
 * @property required
 * @type Boolean
 */

// Public {{{1
function C(name, params) {  // {{{2
/**
 * Field constructor
 *
 * @param name {String} Field name
 * @param [params] {Object} Optional parameters
 * @param [params.order] {Number} Order of field
 * @param [params.required] {Boolean} Whether field is required
 *
 * @method constructor
 */

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
/**
 * @method iterPatch
 * @internal
 */

  cb(this, patch, orig);
};

exports.iterFields = function(val, profile, cb) {  // {{{2
/**
 * @method
 * @internal
 */

  cb(this, val, profile);
};

exports.getVal = function(get) {  // {{{2
/**
 * @method getVal
 * @internal
 */

  return get(this);
};

exports.getPatch = function(val, get) {  // {{{2
/**
 * @method getPatch
 * @internal
 */

  return get(this, val);
};

exports.format = function(type, val, params) {  // {{{2
/**
 * Format field value
 *
 * @param type {String} Field type ('csv', 'slk', 'sort', 'edit', 'display')
 * @param val {*} Raw value to format
 * @param [params] {Object} Optional formatting parameters
 *
 * @returns {String} Formatted value
 *
 * @method format
 */

  return '';
};

exports.unformat = function(val, params) {  // {{{2
/**
 * Unformat field and return raw value
 *
 * @param val {*} Edited field value
 * @param params {Object} Optional unformatting parameters
 *
 * @returns {*} Raw field value
 *
 * @method unformat
 */

  return O.error(this, 'Not implemented');
};

exports.getField = function() {  // {{{2
/**
 * @method getField
 * @internal
 */

  return this;
};

exports.formatField = function(path, type, val, params) {  // {{{2
/**
 * @method formatField
 * @internal
 */

  return this.format(type, val, params);
};

exports.doValidate = function(val, path, errors) {  // {{{2
/**
 * TODO
 * @method doValidate
 * @internal
 */

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
/**
 * Automatic field ordering
 *
 * @param order {Object} Object defining the order of fields
 * @param order.value {Number} Numeric order of field
 *
 * @method setOrder
 * @internal
 */

  if (! this.order) {
    this.order = ++order.value;
  }
};

// }}}1
