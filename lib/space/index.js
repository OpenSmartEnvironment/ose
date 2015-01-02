'use strict';

var Ose = require('ose');
var M = Ose.class(module, C);

var Shard = M.class('../shard');
//var SlaveShard = M.class('../shard/slave');

/**  Doc {{{1
 * @caption Data model
 *
 * @readme
 * The data model of the framework is designed so that individual
 * instances of OSE hold subsets of the data and together create a
 * single whole.
 *
 * Data partitions are called [shards]. Basic data units contained by
 * [shards] are called [entries].
 *
 * Each [entry] is of a certain [kind]. [Kinds] define the properties
 * and behaviour of [entries]. Kinds are namespaced using [scopes].
 *
 * Each [shard] belongs to a [space] that act as the shard's
 * namespace. Each shard is tied to [scope] and can contain only
 * entries of kinds from that [scope].
 *
 * Kind hierarchy:
 * * scope
 *   * kind
 *
 * Data partitioning hierarchy:
 * * space
 *   * shard
 *     * entry
 *
 * Example:
 *
 * The `reading.light` is an entry of the kind `light`, the `light`
 * kind belongs to the `control` scope, and the `reading.light` entry
 * is saved in the shard `living.room`, which belongs to the space
 * `my.house`.
 *
 * @description
 *
 * ## Commands
 * It is possible to send commands to individual [entries]. Each
 * command is delivered to the [home] of an [entry]. Commands consist
 * of a command name and optional data. A command can be a request for
 * data or to establish a new [link].
 *
 * Command handlers can be registered for a [kind] with an `on()`
 * method call. The [Kind] class is not an [Event Emitter] descendant.
 * In command handler code, the target `entry` can be accessed in
 * `this.entry`.
 *
 * Example:
 *     TODO
 *
 * @planned
 * - Data persistency (LevelDB ?)
 * - Data encryption
 * - Sharing and authorization
 *
 * @aliases
 * command commands entryCommand entryCommands commandHandler commandHandlers
 *
 * @module ose
 * @submodule ose.data
 * @main ose.data
 */

/**
 * @caption Space class
 *
 * @readme
 * A space is a data namespace containing [shards]. It is identified
 * by its unique `name` (eg. a domain name or email address).
 *
 * @aliases space spaces
 *
 * @class ose.lib.space
 * @type class
 */

/**
 * Unique space name
 *
 * @property name
 * @type String
 */

/**
 * Home peer
 *
 * @property home
 * @type Object
 */

/**
 * Object containing shards indexed by `sid`
 *
 * @property shards
 * @type Object
 */

// Public {{{1
function C() {  // {{{2
/**
 * Class constructor
 *
 * @method init
 */

  this.shards = {};
};

exports.config = function(name, data) {  // {{{2
/**
 * Plugin configuration method
 *
 * @param name {String} Configuration name
 * @param data {Object} Plugin configuration
 *
 * @method config
 */

  this.name = data.name;
  if (! data.home) {
    throw Ose.error(this, 'missingHome', data);
  }
  this.home = Ose.peers.peer(data.home);

  Ose.spaces.add(this);
  ++InitSpaces;

  Ose.plugins.addDependency(afterConfig.bind(this, data));
  Ose.plugins.once('initialized', afterInit.bind(this));
};

exports.browserConfig = function(config) {  // {{{2
/**
 * Fills the configuration object for the browser.
 *
 * @param config {Object} Plugin configuration
 *
 * @method browserConfig
 */

  config.name = this.name;
  config.home = this.home.name;

  config.shards = [];

  for (var key in this.shards) {
    var shard = this.shards[key];

    config.shards.push({
      sid: shard.sid,
      scope: shard.scope.name,
      alias: shard.alias,
      home: shard.home && shard.home.name,
    });
  };
};

exports.getShard = function(sid, cb) {  // {{{2
/**
 * Finds a shard by shard id (sid)
 *
 * @param sid {Number|String} Shard id
 * @param cb {Function} Response callback
 *
 * @method getShard
 * @async
 */

  if (sid in this.shards) {
    cb(null, this.shards[sid]);
    return;
  }

  cb(Ose.error(this, 'SHARD_NOT_FOUND'));
  return;
};

exports.getShardAlias = function(alias, cb) {  // {{{2
/**
 * Finds a shard by shard alias
 *
 * @param sid {String} Shard alias
 * @param cb {Function} Response callback
 *
 * @method getShardAlias
 * @async
 */

  for (var key in this.shards) {
    var shard = this.shards[key];

    if (shard.alias === alias) {
      cb(null, shard);
      return;
    }
  }

  cb(Ose.error(this, 'SHARD_NOT_FOUND'));
  return;
};

exports.findShard = function(req, cb) {  // {{{2
/**
 * Finds a shard by id or alias in the current space or by an
 * identification object in another space
 *
 * @param req {Number|String|Object} Requested shard (sid or alias) in the current space or object also specifying another space.
 * @param [req.space] {String} Space name
 * @param [req.shard] {Number|String} Shard id or alias
 *
 * @param cb {Function} Response callback
 *
 * @method findShard
 * @async
 */

//  console.log('SPACE FIND SHARD', this.name, req);

  if (typeof req === 'object') {
    if (req.space && (req.space !== this.name)) {
      Ose.spaces.getShard(req, cb);
      return;
    }

    req = req.shard;
  }

  switch (typeof req) {
  case 'number':
    this.getShard(req, cb);
    return;
  case 'string':
    var sid = parseInt(req);

    if (isNaN(sid)) {
      this.getShardAlias(req, cb);
      return;
    }

    this.getShard(sid, cb);
    return;
  }

  throw Ose.error(this, 'invalidArgs', arguments);
};

exports.eachShard = function(filter, cb) {  // {{{2
/**
 * Calls a callback for each shard matching filtering criteria.
 *
 * @param filter {Object}
 * @param cb {Function (shard)} callback
 *
 * @method eachShard
 * @async
 */


  if (typeof filter === 'function') {
    cb = filter;
    filter = undefined;
  }

  if ('space' in filter) {
    if (filter.space !== this.name) return;
  }

  for (var key in this.shards) {
    var shard = this.shards[key];

    if (filter) {
      if ('scope' in filter) {
        if (filter.scope !== shard.scope.name) continue;
      }
/*
      if (filter.alias) {
        if (shard.alias !== filter.alias) continue;
      }

      if (filter.space) {
        if (('sid' in filter) && ! ((shard.sid === filter.sid) || (shard.alias === filter.sid))) continue;
      }
*/
    }

    cb(shard);
  }
};

exports.link = function(entry, req, socket) {  // {{{2
/**
 * Builds a new `link` to an `entry`.
 *
 * @param entry {Object} Entry identification
 * @param req {Object} Request
 * @param socket {Object} Slave socket instance
 *
 * @method link
 */

//  console.log('OSE ENTRY', entry, req);

  this.findShard(entry, function(err, shard) {
    if (err) {
      Ose.link.error(socket, err);
    } else {
      shard.link(entry.entry, req, socket);
    }
  });
};

// }}}1
// Event Handlers {{{1
function afterConfig(config, cb) {  // {{{2
  // Configure shards.
  for (var i = 0; i < config.shards.length; i++) {
    initShard(this, config.shards[i]);
  }

  if (InitSpaces > 0) {
    --InitSpaces;
  } else {
    M.log.unhandled('InitSpaces, is too small!');
  }

  cb();
};

function afterInit() {  // {{{2
  if (this.master) {
    this.master.connect();
  }

  for (var key in this.shards) {
    this.shards[key].afterInit();
  }
};

// }}}1
// Private {{{1
var InitSpaces = 0;

function spacesInitialized() {  // {{{2
  return InitSpaces === 0;
}

function initShard(that, config) {  // {{{2
  if (! config.sid) {
    throw Ose.error(that, 'invalidSid', config);
  }

  if (config.sid in that.shards) {
    throw Ose.error(that, 'duplicitShard', config);
  }

  var result = new Shard(config.scope, that, config.sid, config.alias, config.home);
  that.shards[result.sid] = result;

  if (config.cached) {
    result.cached = true;
  }

  if (result.atHome()) {
    if (config.homeInit) {
      homeInit(config.homeInit);
    }
  }

  if (config.entries) {
    initEntries(config.entries);
  }

  if (config.dependencies) {
    Ose.plugins.addDependency(spacesInitialized, initDependencies);
  }

  if (config.homeDeps && result.atHome()) {
    Ose.plugins.addDependency(spacesInitialized, initHomeDeps);
  }

  return result;

  function homeInit(data) {  // {{{3
    if (Array.isArray(data)) {
      Ose._.each(data, homeInit);
    } else if (typeof data === 'string') {
      require(data)(result);
    } else {
      data(result);
    }
  };

  function initEntries(entry) {  // {{{3
    switch (typeof entry) {
    case 'array':
      Ose._.each(entry, initEntries);
      break;
    case 'string':
      initEntries(require(entry));
      break;
    case 'function':
      entry(result);
      break;
    case 'object':
      if (Array.isArray(entry)) {
        Ose._.each(entry, initEntries);
        break;
      }
    default:
      throw Ose.error(result, 'invalidConfig', entry);
    }
  };

  function initHomeDeps(cb) {  // {{{3
    var fn = config.homeDeps;
    if (typeof fn === 'string') {
      fn = require(fn);
    }

    fn(result, cb);
  };

  function initDependencies(cb) {  // {{{3
    var fn = config.dependencies;
    if (typeof fn === 'string') {
      fn = require(fn);
    }

    fn(result, cb);
  };

  // }}}3
};

// }}}1
