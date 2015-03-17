'use strict';

var O = require('ose').class(module, C, 'EventEmitter');
O.prepend('../subject');

var Shard = O.class('../shard');
var Master = O.class('./master');
var Peer = O.class('../peer/remote');
var LHS = O.link.homeState;

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
 * command is delivered to the [home] of the given [entry]. Commands
 * consist of a command name and optional data. A command can be a
 * request for data or to establish a new [link].
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

/** name {{{2
 * Unique space name
 *
 * @property name
 * @type String
 */

/** home {{{2
 * Home peer
 *
 * @property home
 * @type Object
 */

/** master {{{2
 * Client socket linked to the master shard
 *
 * @property master
 * @type Object
 */

/** lhs {{{2
 * State of space
 *
 * @property lhs
 * @type Object
 */

/** peers {{{2
 * List of peers belonging to this space
 *
 * @property peers
 * @type Object
 */

/** shards {{{2
 * Object containing shards indexed by `sid`
 *
 * @property shards
 * @type Object
 * @internal
 */

/** lhs {{{2
 * Gets fired after each change of `lhs` property
 *
 * @event lhs
 * @param {Integer} New value
 * @param {Integer} Original value
 */

/** master {{{2
 * Is fired when the link to master or home changes.
 *
 * TODO:
 * It's derived from `setLhs()` and is fired under one of the following conditions:
 * - when an error is sent to `setLhs()` - when link gets disconnected or when linking is not successfull
 * - when `lhs` property is changed from states LHS.LINKING, LHS.MASTER and LHS.HOME
 * - when `lhs` property is changed to states LHS.MASTER and LHS.HOME
 *
 *
 * @event master
 * @param {Object} Optional error that occured during linking
 */

// Public {{{1
function C() {  // {{{2
/**
 * Class constructor
 *
 * @method constructor
 * @internal
 */

  O.super.call(this);
  this.setMaxListeners(O.consts.coreListeners);

  this.peers = {};
  this.shards = {};
};

exports.identify = function() {  // {{{2
/**
 * Returns identification object
 *
 * @return {Object} Identification object
 *
 * @method identify
 */

  return {
    space: this.name,
  };
};

exports.peer = function(name) {  // {{{2
/**
 * Get an existing peer by the `name` or create a new one.
 *
 * @param name {String} Peer name to retrieve or create.
 *
 * @return {Object} Peer instance
 *
 * @method peer
 */

  if (! name || typeof name !== 'string') {
    throw O.error(O, 'Peer name is not string', name);
  }

  if (name in this.peers) {
    return this.peers[name];
  }

  return this.peers[name] = new Peer(this, name);
};

exports.link = function(ident, req, socket) {  // {{{2
/**
 * Builds a new `link` to an entry identified by `ident`.
 *
 * @param ident {Object} Entry identification
 * @param req {Object} Request object
 * @param socket {Object} Client socket instance
 *
 * @method link
 */

//  console.log('SPACE LINK', ident, req);

  this.findShard(ident, function(err, shard) {
    if (err) {
      O.link.error(socket, err);
    } else {
      shard.link(ident.id, req, socket);
    }
  });
};

exports.getShard = function(sid, cb) {  // {{{2
/**
 * Finds a shard by shard identification
 *
 * @param sid {Number|String} Shard id
 * @param cb {Function} Response callback
 *
 * @method getShard
 * @async
 */
  
//  console.log('SPACE GET SHARD', {sid: sid, typeofCb: typeof cb});

  if (typeof cb !== 'function') {
    throw O.error('`cb` must be a function', cb);
  }

  getShard(this, sid, cb);
};

exports.findShard = function(ident, cb) {  // {{{2
/**
 * Finds a shard by shard identification
 *
 * @param ident {Object} Identification object
 * @param [ident.space] {String} Space containing shard
 * @param [ident.sid] {String} Shard id
 * @param [ident.peer] {String} Peer name
 * @param [ident.scope] {String} Scope name
 * @param [ident.alias] {String} Shard alias
 *
 * @param cb {Function} Response callback
 *
 * @method findShard
 * @async
 */

//  console.log('SPACE FIND SHARD', {ident: ident, typeofCb: typeof cb});

  if (typeof cb !== 'function') {
    throw O.error('`cb` must be a function', cb);
  }
  if (typeof ident !== 'object') {
    cb(O.error('`ident` must be an object', ident));
    return;
  }

  if ('sid' in ident) {
    getShard(this, ident.sid, cb);
    return;
  }

  findShard(this, ident, cb);
  return;
};

exports.findShards = function(filter, cb, done) {  // {{{2
/**
 * Finds shards based on `filter`. Calls `cb()` for each shard found and
 * then calls `done()`
 *
 * @param filter {Object} Filter object
 * @param [filter.sid] {String} Shard id
 * @param [filter.peer] {String} Peer name
 * @param [filter.scope] {String} Scope name
 * @param [filter.alias] {String} Shard alias
 *
 * @param cb {Function} Callback called for each shard
 * @param done {Function} Callback called when done
 *
 * @method findShards
 * @async
 */

//  console.log('SPACE FIND SHARDS', this.name, this.lhs, filter);

  // TODO: Optimize to send message to peer instead of space's home in case of filter.peer

  if (typeof cb !== 'function' || typeof done !== 'function') {
    throw O.error('`cb` and `done` must be a function', {filter: filter, cb: cb, done: done});
  }

  findShards(this, filter, cb, done);
};

// }}}1
// Internal {{{1
exports.error = function(err) {  // {{{2
/**
 * Remove shard from space cache with error.
 *
 * @method error
 * @internal
 */

  switch (err.code) {
  case 'SPACE_DELETED':
    this.remove(LHS.DELETED, err);
    return;
  case 'SPACE_NOT_FOUND':
    this.remove(LHS.NOT_FOUND, err);
    return;
  }

  this.remove(LHS.ERROR, err);
  return;
};

exports.cleanup = function() {  // {{{2
  delete O.spaces[this.name];

  for (var key in this.shards) {
    this.shards[key].remove();
  }
  delete this.shards;

  for (var key in this.peers) {
    this.peers[key].remove();
  }
  delete this.peers;
};

exports.setup = function(name) {  // {{{2
/**
 * Sets up a space
 *
 * @param name {String} Space name
 *
 * @method setup
 * @internal
 */

  if (name in O.spaces) {
    throw O.error(this, 'DUPLICIT_SPACE', 'Space name is already registered', name);
  }

  this.name = name;
  O.spaces[name] = this;

  O.log.notice('New space', name);
};

exports.config = function(name, data, deps) {  // {{{2
/**
 * Called by `O.readConfig()`
 *
 * @param name {String} Configuration name
 * @param data {Object} Configuration data
 * @param deps {Object} Dependencies object
 *
 * @method config
 * @internal
 */

  var that = this;

  this.setup(data.name || name);

  deps.add('peers', 'core', function(cb) {  // {{{3
    that.home = that.peer(data.home);

    for (var key in data.peers) {
      that.addPeer(key, data.peers[key]);
    }

    cb('peers');
  });

  deps.add('connect', 'entries', function(cb) {  // {{{3
    that.connectPeers(deps);

    cb('connect');  // TODO call connect after all peers are connected
  });

  // }}}3
  deps.add('lhs', 'connect', function(cb) {  // {{{3
    if (that.lhs) {
      throw O.error(that, 'Can\'t  initialize space with `lhs` property set up', that.lhs);
    }

    if (that.home === O.here) {
      that.setLhs(LHS.AT_HOME);
    } else {
      that.setLhs(LHS.LINKING);
      new Master(that);
    }

    cb('lhs');
  });

  // }}}3
};

exports.addPeer = function(name, url) {  // {{{2
/**
 * Get an existing peer by the `name` or create a new one and configure `peer.url`.
 *
 * @param name {String} Peer name to retrieve or create.
 * @param url {String} 
 *
 * @return {Object} Peer instance
 *
 * @method peer
 * @internal
 */

  var res = this.peer(name);
  peer.url = url;
  return res;
};

exports.disconnectPeers = function() {  // {{{2
/**
 * Disconnect all peers.
 *
 * @method disconnectPeers
 * @internal
 */

  for (var key in this.peers) {
    this.peers[key].disconnect();
  }
};

exports.connectPeers = function(deps) {  // {{{2
/**
 * Connect all peers with url defined.
 *
 * @param [deps] {Object} Dependencies object
 *
 * @method connectPeers
 * @internal
 */

  for (var key in this.peers) {
    var p = this.peers[key];
    if (p.url && ! p.isConnected()) {
      p.connect(false, deps && deps.bind('connect'));
    }
  }
};

exports.browserConfig = function(config) {  // {{{2
/**
 * Fills the configuration object for the browser.
 *
 * @param config {Object} Plugin configuration
 *
 * @method browserConfig
 * @internal
 */

  config.name = this.name;
  config.home = this.home.name;
};

exports.linkMaster = function(cb) {  // {{{2
/**
 * Establish a link to the master space. Calls `cb(err)` after lhs is changed from LINKING
 *
 * @param cb {Function(err)}
 *
 * @method linkMaster
 * @internal
 * @async
 */

  switch (this.lhs) {
  case LHS.CLOSED:
    break;
  default:
    throw O.error(this, 'Invalid `this.lhs` when creating master for the this', this.lhs);
  }

  this.setLhs(LHS.LINKING);

  cb && this.once('lhs', cb);

  new Master(this);
};

// }}}1
// Private {{{1
function cbShard(shard, cb) {  // {{{2
  switch (shard.lhsInited(cb)) {
  case undefined:
    return;
  case false:
    shard.once('lhs', function() {
      cbShard(shard, cb);
    });
    return;
  case true:
    cb(null, shard);
    return;
  }

  throw O.error(that, 'Invalid `shard.lhs`', shard.lhs);
}

function getShard(that, sid, cb) {  // {{{2
  that.lhsLink(function(err, lhs) {  // {{{3
    if (err) {
      cb(err);
      return;
    }

    if (sid in that.shards) {
      cbShard(that.shards[sid], cb);
      return;
    }

    switch (lhs) {
    case LHS.AT_HOME:
      cb(O.error(that, 'SHARD_NOT_FOUND', 'Shard was not found at space\'s home', sid));
      return;
    case LHS.WAITING:
      cb(O.error(that, 'DISCONNECTED', 'Shard can\'t be found, space is not connected to the master', sid));
      return;
    case LHS.MASTER:
    case LHS.HOME:
      get();
      return;
    }

    throw O.error(that, 'Invalid `space.lhs`', that.lhs);
  });

  function get() {  // {{{3
    var shard = new Shard();
    shard.setLhs(LHS.INIT_GET);
    shard.setup(that, sid);
    O.link.send(that.master, 'get', sid, function(err, resp) {
      if (err) {
        shard.error(err);
        cb(err);
        return;
      }

      shard.setupConfig(resp.home, resp.scope, resp.alias);
      shard.setupDone();
      cb(null, shard);
      return;
    });
  }

  // }}}3
}

function findShard(that, ident, cb) {  // {{{2
  var shard;

  if (! (ident.alias || (ident.scope && ident.peer))) {
    cb(O.error(this, 'Invalid shard ident', ident));
    return;
  }

  that.lhsLink(function(err, lhs) {  // {{{3
    if (err) {
      cb(err);
      return;
    }

    if (find()) {
      cbShard(shard, cb);
      return;
    }

    switch (lhs) {
    case LHS.AT_HOME:
      cb(O.error(that, 'SHARD_NOT_FOUND', 'Shard was not found at space\'s home', ident));
      return;
    case LHS.WAITING:
      cb(O.error(that, 'DISCONNECTED', 'Shard can\'t be found, space is not connected to the master', ident));
      return;
    case LHS.MASTER:
    case LHS.HOME:
      O.link.send(that.master, 'find', ident, onFind);
      return;
    }

    throw O.error(that, 'Invalid space lhs', that.lhs);
  });

  function find() {  // {{{3
    for (var key in that.shards) {
      shard = that.shards[key];

      if (ident.alias && ident.alias !== shard.alias) {
        continue;
      }

      if (ident.scope && ident.scope !== shard.scope.name) {
        continue;
      }

      if (ident.peer && ident.peer !== (shard.home || shard.space.home).name) {
        continue;
      }

      return true;
    }

    shard = null;
    return false;
  }

  function onFind(err, data) {  // {{{3
    if (data.sid in that.shards) {
      cbShard(that.shards[data.sid], cb);
      return;
    }

    if (err) {
      cb(err);
      return;
    }

    shard = new Shard();
    shard.setup(that, data.sid);
    shard.setupConfig(data.home, data.scope, data.alias);
    shard.setupDone();
    cb(null, shard);
    return;
  }

  // }}}3
}

function findShards(that, filter, cb, done) {  // {{{2
  // TODO: `findShards()` can return uninitilized shards, check it!

  var counter;

  that.lhsLink(function(err, lhs) {  // {{{3
    switch (lhs) {
    case undefined:
      done(err);
      return;
    case LHS.AT_HOME:
      check();
      done();
      return;
    case LHS.WAITING:
      check();
      done();  // TODO: respond with information about possibly missing shards
      return;
    case LHS.MASTER:
    case LHS.HOME:
      O.link.send(that.master, 'findShards', filter, onGet);
      return;
    }

    throw O.error(that, 'Invalid space lhs', that.lhs);
  });

  function check() {  // {{{3
    for (var key in that.shards) {
      var shard = that.shards[key];

//      console.log('CHECK SHARD', filter, (shard.home || that.home).name, shard.scope.name);

      if (filter.peer && (shard.home || that.home).name !== filter.peer) {
        continue;
      }

      if (filter.scope && shard.scope.name !== filter.scope) {
        continue;
      }

      if (filter.alias && shard.alias !== filter.alias) {
        continue;
      }

      cb(shard);
    }
  }

  function onGet(err, resp) {  // {{{3
    if (err) {
      done(err);
      return;
    }

//    console.log('SPACE FIND SHARDS CLIENT RESPONSE', resp);

    counter = O.counter();
    for (var i = 0; i < resp.length; i++) {
      counter.inc();
      that.getShard(resp[i], onShard);
    }
    counter.done(done);
  }

  function onShard(err, shard) {  // {{{3
    if (err) {
      O.log.todo('SPACE FIND SHARDS SHARD ERROR');
      O.log.error(err);

      counter.dec();
      return;
    }

    cb(shard);

    counter.dec();
    return;
  }

  // }}}3
};

// }}}1
