'use strict';

const O = require('ose')(module)
  .class('./field')
;

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

// Public {{{1
exports.displayDetail = function(view, wrap) {  // {{{2
  var res = view.li();
  res.h3(this.displayName());

  var p = res.tree('p');

  wrap.onPatch(onPatch);

  return res;

  function onPatch(patch) {
    if (wrap.value) {
      view.entry.shard.find(wrap.value, function(err, entry) {
        if (err) {
          p.text('Error: ' + err.message);
        } else {
          p.text(entry.getCaption());
        }
      });
    } else {
      p.text('');
    }
  }
};

/* OBSOLETE {{{1
function init(name, params) {
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

  O.inherited(this)(name, params);

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
