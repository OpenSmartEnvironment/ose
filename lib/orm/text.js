'use strict';

var O = require('ose').class(module, './field');

/** Docs {{{1
 * @module ose
 * @submodule ose.orm
 */

/**
 * @caption Text field description
 *
 * @readme
 * Description of fields containing text
 *
 * @class ose.lib.orm.text
 * @extends ose.lib.orm.field
 * @type class
 */

/* OBSOLETE {{{1
exports.format = function(type, val) {  // {{{2
  if (! val) val = '';

  switch (typeof val) {
  case 'string':
    break;
  case 'number':
  case 'boolean':
    val = val.toString();
    break;
  default:
    return O.error(this, 'INVALID_VALUE', 'Value must be a string', val);
  }

  switch (type) {
  case 'edit':
    return val;
  };

  throw O.log.error(this, 'Invalid format type', type);
};

exports.unformat = function(val) {  // {{{2
  switch (val) {
  case null:
  case undefined:
    return null;
  }

  if (typeof val !== 'string') {
    return O.error(this, 'INVALID_VALUE', 'Value must be a string', val);
  }

  val = val.replace('\u200b', '').trim();

  return val || undefined;
};

// }}}1 */
