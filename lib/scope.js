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

  this.name = name;

  this.consts = {};  // Scope constants
  this.kinds = {};  // Entry kinds

  this.log = O.new('Logger')(name);
  this.schema = {};
};

exports.toString = function() {  // {{{2
/**
 * Return short description
 *
 * @return {String} Description
 *
 * @method toString
 */

  return 'Scope: ' + this.name;
};

exports.initShard = function(shard, config, cb) {  // {{{2
/**
 * @method initShard
 */

  if (! this.schema.home) this.schema.home = require('./schema/cache');
  if (! this.schema.remote) this.schema.remote = require('./schema/master');

  switch (O.typeof(config && config.schema)) {
  case 'null':
  case 'undefined':
    shard.schema = shard.isAtHome() ? this.schema.home : this.schema.remote;
    break;
  case 'string':
    shard.schema = this.schema[config.schema];
    break;
  case 'object':
    if (typeof config.schema.name === 'string') {
      shard.schema = this.schema[config.schema];
      break;
    }
    shard.schema = shard.isAtHome() ? this.schema.home : this.schema.remote;
    break;
  }

  if (! shard.schema) {
    throw O.log.error(shard, 'INVALID_CONFIG', 'Schema was not found', config);
  }

  shard.schema.init(shard, config && config.schema, cb);
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
