'use strict';

var O = require('ose').class(module, C);

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Scope class
 *
 * @readme
 * Scopes represent logical namespacing of packages and modules, which
 * together form an OSE environment.
 *
 * Each scope contains a set of [Kinds of entries], constants and a
 * [Logger] instance.
 *
 * @aliases scope scopes
 *
 * @class ose.lib.scope
 * @type class
 */

/**
 * Scope name
 *
 * @property name
 * @type String
 */

/**
 * Constants within scope
 *
 * @property consts
 * @type Object
 */


/**
 * Kinds within scope
 *
 * @property kinds
 * @type Object
 */

/**
 * Logger instance
 *
 * @property log
 * @type Object
 */

// Public {{{1
function C(name) {  // {{{2
/**
 * Class constructor
 *
 * @param name {String} Scope name
 *
 * @method constructor
 */

//  console.log('SCOPE INIT', name);

  this.name = name;

  this.consts = {};  // Scope constants TODO: document
  this.kinds = {};  // Entry kinds
  this.maps = {};  // Maps methods

  this.log = new (O.classes.Logger)(name);
};

exports.identify = function() {  // {{{2
/**
 * Returns scope identification. This object consists of `space name`
 * and `shards sid`.
 *
 * @returns {Object} Scope identification object.
 *
 * @method identify
 */

  return {scope: this.name};
};

exports.add = function(kind) {  // {{{2
/**
 * Adds a kind to this scope
 *
 * @param kind {Object} Kind to be added
 *
 * @method add
 */

  if (kind.name in this.kinds) {
    throw O.error(this, 'alreadyExist', kind.name);
  }

  this.kinds[kind.name] = kind;

//  console.log('SCOPE ADD', this.name, kind.name);
};

exports.getMap = function(kind, params, callback) {  // {{{2
/**
 * Respond a map based on params
 *
 * @param [kind] {Object} Kind
 * @param [params] {Object} map parameters
 * @param callback {Function} Callback
 *
 * @method getMap
 */
//  console.log('SCOPE GET MAP', this.name, kind, params);

  var that = this;

  if (! callback) {
    callback = params;
    params = {};
  }

  if (! params) params = {};
  params.kind = kind;

  var result = {};

  var counter = O.counter();

  O.eachSpace(function(s) {
    var space = result[s.name] = {};

    s.eachShard({scope: that.name}, onShard);

    function onShard(shard, count) {
      if (! count) {
//        console.log('SCOPE SHARD GET MAP', counter.count, shard.scope.name, kind, shard.alias);
        counter.inc();
      }

      shard.getMap(params, function(err, data) {
        switch (err && err.message) {
        case null:
        case undefined:
          if (data.map && data.map.length) {
            space[shard.sid] = data.map;
          }
          break;
        case 'socketDisconnected':
          if (count) {
            count++;
          } else {
            count = 1;
          }

          if (count < 50) {  // Wait 5 seconds ...
            setTimeout(onShard.bind(null, shard, count), 100);
            return;
          }
        default:
          console.log('ERROR RETRIEVING MAP', shard.alias, kind, params, data);
          O.log.error(err);
        }

        counter.dec();
//        console.log('SCOPE SHARD GET MAP DONE', counter.count, shard.scope.name, kind, shard.alias);
      });

      return;
    };
  });

  counter.done(function() {
//    console.log('SCOPE GET MAP FINISH', result);
    callback(null, {map: result});
  });
};

exports.getLayout = function(page, layout) {  // {{{2
/**
 * Finds the right module for a given page and layout
 *
 * @param page {String}
 * @param layout {String}
 *
 * @returns {Object} Module
 *
 * @method getLayout
 */

  try {
    if (layout && (layout.indexOf('/') >= 0)) {
      return require(layout);
    } else {
      return this.package.require('./gaia/' + (layout || page));
    }
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      return null;
    }

    throw err;
  }
};

// }}}1
