'use strict';

var O = require('ose').class(module, './field');

/** Docs {{{1
 * @module ose
 * @submodule ose.orm
 */

/**
 * @caption Lookup field description
 *
 * @readme
 * Makes it possible to select from predefined values or a map
 *
 * @class ose.lib.orm.lookup
 * @extends ose.lib.orm.text
 * @type class
 */

/**
 * Object containing lookup description
 *
 * @property lookup
 * @type Object
 */

/**
 * Array of values
 *
 * @property [lookup.values]
 * @type Array
 */

/**
 * Method obtaining lookup values
 *
 * @property [lookup.get]
 * @type Function
 */

/**
 * Map filtering
 *
 * @property [lookup.filter]
 * @type Object
 */

/**
 * Map identificaation
 *
 * @property [lookup.ident]
 * @type Object
 */

/**
 * View name
 *
 * @property [lookup.view]
 * @type String
 */

/* OBSOLETE {{{1
function C(name, params) {
/ *
 * Lookup field constructor
 *
 * @param name {String} Field name
 * @param [params] {Object} Optional parameters
 * @param [params.values] {Array} Array of values
 * @param [params.get] {Function} Method obtaining lookup values
 * @param [params.filter] {Object} Map filtering
 * @param [params.ident] {Object} Map identificaation
 * @param [params.view] {String} View name
 *
 * @method constructor
 * /

  O.super.call(this, name, params);

  this.lookup = {};

  if (! params) return;

  if (params.values) this.lookup.values = params.values;
  if (params.get) this.lookup.get = params.get;
  if (params.view) this.lookup.view = params.view;
  if (params.filter) this.lookup.filter = params.filter;
  if (params.ident) this.lookup.ident = params.ident;

  return;
}
*/
