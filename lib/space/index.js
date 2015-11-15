'use strict';

var O = require('ose').class(module, C, 'EventEmitter');
O.prepend('../subject');

var Spaces = {};
var Shard = O.class('../shard');
var Peer = O.class('../peer/remote');

// Extend `O` {{{1
O.extend('spaces', Spaces);  // {{{2

O.extend('getSpace', function(name, cb) {  // {{{2
/**
 * Attempt to find requested space.
 *
 * @param name {Object} Space name
 * @param cb {Function (err, space)} Response callback
 *
 * @method getSpace
 * @async
 */

//  console.log('OSE GET SPACE', name);

  if (typeof cb !== 'function') {
    throw O.log.error('`cb` must be a function', cb);
  }

  if (! (name in Spaces)) {
    cb(O.error('SPACE_NOT_FOUND', 'Space was not found', name));
    return;
  }

  Spaces[name].awaitReady(cb);
  return;
});

O.extend('eachSpace', function(cb) {  // {{{2
/**
 * Call callback for each space synchronously.
 *
 * @param cb {Function (space)} callback
 *
 * @method eachSpace
 */

//  console.log('OSE EACH SPACE');

  if (typeof cb !== 'function') {
    throw O.log.error('`cb` must be a function', cb);
  }

  for (var key in Spaces) {
    cb(Spaces[key]);
  }
});

O.extend('trackEntry', function(ident, socket) {  // {{{2
  if (Array.isArray(ident)) {
    switch (ident.length) {
    case 2:
      return O.here.space.getShard(ident[1], function(err, shard) {
        if (! O.link.canClose(socket)) return;
        if (err) return O.link.close(socket, err);

        return shard.track(ident[0], socket);
      });
    case 3:
      return O.getSpace(ident[2], function(err, space) {
        if (space) return space.getShard(ident[1], function(err, shard) {
          if (! O.link.canClose(socket)) return;
          if (err) return O.link.close(socket, err);

          return shard.track(ident[0], socket);
        });

        return O.link.canClose(socket) && O.link.close(socket, err);
      });
    }

    return O.link.error(socket, O.error('INVALID_IDENT'));
  }

  return O.getSpace(ident.space || O.here.space.name, function(err, space) {
    if (space) return space.findShard(ident, function(err, shard) {
      if (! O.link.canClose(socket)) return;
      if (err) return O.link.close(socket, err);

      return shard.track(ident.entry, socket);
    });

    return O.link.canClose && O.link.close(socket, err);
  });
});

// }}}1
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
 * @uses ose.lib.subject
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
 * Client socket linked to the master space
 *
 * @property master
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

  this._state = O.subjectState.INIT;

  this.peers = {};
  this.shards = {};
};

exports.Master = O.class('./master');  // {{{2

exports.toString = function() {  // {{{2
/**
 * Return short space description
 *
 * @return {String} Space description
 *
 * @method toString
 */

  return 'Space: ' + this.name;
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
    throw O.log.error(O, 'Peer name is not string', name);
  }

  if (name in this.peers) {
    return this.peers[name];
  }

  return this.peers[name] = new Peer(this, name);
};

exports.getShard = function(sid, cb) {  // {{{2
/**
 * Find a shard by shard identification
 *
 * @param sid {Number|String} Shard id
 * @param cb {Function} Response callback
 *
 * @method getShard
 * @async
 */

//  console.log('SPACE GET SHARD', {sid: sid, typeofCb: typeof cb});

  if (typeof cb !== 'function') {
    throw O.log.error('`cb` must be a function', cb);
  }

  return getShard(this, sid, cb);
};

exports.findShard = function(ident, cb) {  // {{{2
/**
 * Find a shard by shard identification in the current space
 *
 * @param ident {Number|String} Shard id or shard alias
 *
 * @param cb {Function} Response callback
 *
 * @method findShard
 * @async
 */

//  console.log('SPACE FIND SHARD', {ident: ident, typeofCb: typeof cb});

  if (typeof cb !== 'function') {
    throw O.log.error('INVALID_ARGS', '`cb` must be a function', cb);
  }

  switch (typeof ident) {
  case 'number':
    return getShard(this, ident, cb);
  case 'string':
    return findShardAlias(this, ident, cb);
  case 'object':
    if (Array.isArray(ident)) {
      switch (ident.length) {
      case 2:
        return this.getShard(ident[1], cb);
      case 3:
        if (ident[2] === this.name) {
          return this.getShard(ident[1], cb);
        }

        return O.getSpace(ident[2], function(err, space) {
          if (err) return cb(err);
          return space.getShard(ident[1], cb);
        });
      }

      return cb(O.error(this, 'INVALID_IDENT', ident));
    }

    if (ident.space && ident.space !== this.name) {
      return O.getSpace(ident.space, function(err, space) {
        if (err) return cb(err);
        return space.findShard(ident.shard, cb);
      });
    }

    return this.findShard(ident.shard, cb);
  }

  return cb(O.error(this, 'Invalid shard ident', ident));
};

exports.findShards = function(filter, cb) {  // {{{2
/**
 * Find shards based on `filter`.
 *
 * TODO
 *
 * @param filter {Object} Filter object
 * @param [filter.sid] {String} Shard id
 * @param [filter.peer] {String} Peer name
 * @param [filter.scope] {String} Scope name
 * @param [filter.sal] {String} Shard alias
 *
 * @param cb {Function} Callback
 *
 * @method findShards
 * @async
 */

//  console.log('SPACE FIND SHARDS', this.name, this.lhs, filter);

  if (typeof cb !== 'function') {
    throw O.log.error('`cb` must be a function', cb);
  }

  if (! filter) {
    return cb(null, []);
  }

  var that = this;

  return this.awaitReady(doit);
  
  function doit() {
    switch (typeof filter) {
    case 'number':
      return that.getShard(filter, function(err, shard) {
        if (err) return cb(err);
        return cb(null, [shard.id]);
      });
    case 'string':
      return that.findShard(filter, function(err, shard) {
        if (err) return cb(err);
        return cb(null, [shard.id]);
      });
    case 'object':
      if (filter.shard) {
        filter = filter.shard;
        return doit();
      }
      if (that.isAtHome) return findShards(that, filter, cb);
      return that.sendMaster('findShards', filter, cb);
    }

    throw O.log.error(that, 'Invalid shard `filter`', filter);
  }
};

exports.isAtHome = function() {  // {{{2
/**
 * Check whether we are running in space`s [home].
 *
 * @returns {Boolean}
 *
 * @method isAtHome
 */

  return this.home === O.here;
};

// Internal {{{1
exports.cleanup = function() {  // {{{2
  delete Spaces[this.name];

  for (var key in this.shards) {
    this.shards[key].remove();
  }
  delete this.shards;

  for (var key in this.peers) {
    this.peers[key].remove();
  }
  delete this.peers;
};

exports.config = function(name, val, deps) {  // {{{2
/**
 * TODO
 *
 * @param name {String} Configuration name
 * @param val {Object} Configuration data
 * @param deps {Object} Dependencies object
 *
 * @method config
 * @internal
 */

  var that = this;

  this.setup(val.name || name);

  deps.add('peers', 'core', function(cb) {  // {{{3
    that.home = that.peer(val.home);

    for (var key in val.peers) {
      that.addPeer(key, val.peers[key]);
    }

    cb();
  });

  deps.add('connect', 'entries', function(cb) {  // {{{3
    return that.connectPeers(cb);
  });

  deps.add('lhs', 'connect', function(cb) {  // {{{3
    that.setReady();

    if (that.isAtHome()) return cb();

    return that.awaitSteadyMaster(cb);
  });

  // }}}3
};

exports.setup = function(name) {  // {{{2
/**
 * Set up a space
 *
 * @param name {String} Space name
 *
 * @method setup
 * @internal
 */

  if (name in Spaces) {
    throw O.log.error(this, 'DUPLICIT_SPACE', 'Space name is already registered', name);
  }

  this.name = name;
  Spaces[name] = this;

  O.log.notice('New space', name);
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

  switch (url) {
  case null:
  case undefined:
  case false:
    break;
  case 'CHANGE_ME':
    O.log.warn('Change URL in instance configuration of the following peer: ', name);
    break;
  default:
    res.url = url;
  }

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

exports.connectPeers = function(cb) {  // {{{2
/**
 * Connect all peers with url defined.
 *
 * @param [cb] {Function} Dependencies object
 *
 * @method connectPeers
 * @internal
 */

  O.async.forEachOf(this.peers, function(peer, name, cb) {
    if (peer.url && ! peer.isConnected()) {
      return peer.connect(false, cb);
    }

    return cb();
  }, cb);
  return true;

  /*
  for (var key in this.peers) {
    var p = this.peers[key];
    if (p.url && ! p.isConnected()) {
      p.connect(false, deps && deps.bind('connect'));
    }
  }
  */
};

exports.browserConfig = function(config) {  // {{{2
/**
 * Fill the configuration object for the browser.
 *
 * @param config {Object} Plugin configuration
 *
 * @method browserConfig
 * @internal
 */

  config.name = this.name;
  config.home = this.home.name;
};

exports.getGw = function(cb) {  // {{{2
/**
 *
 * @method getGw
 * @internal
 */

  return this.home.getGw(cb);
};

exports.masterOpened = function(data) {  // {{{2
/**
 *
 * @method masterOpened
 * @internal
 */

  var that = this;

  var shards = [];
  for (var key in this.shards) {
    var shard = this.shards[key];

    if (shard.home === O.here) {
      shards.push({
        sid: shard.id,
        alias: shard.alias,
        scope: shard.scope.name,
      });
    }
  }

  if (! shards.length) {
    return finish(data.home);
  }

  return O.link.send(this.master, 'notify', {
    peer: O.here.name,
    shards: shards,
  }, function(err, resp) {
    if (err) {
      return O.link.canSend(that.master) && O.link.error(that.master, err);
    }

    return finish(resp.home);
  });

  function finish(home) {
    switch (that.masterState) {
    case O.masterState.BUSY:
    case O.masterState.WAITING:
      return that.setMasterState(home ?
        O.masterState.HOME :
        O.masterState.MASTER
      );
    }

    throw O.log.error(that, 'INVALID_MASTER_STATE', 'subject is not linking');
  }
};

exports.openMaster = function(ws) {  // {{{2
  ws.tx({
    type: 'space',
    newLid: ws.addLink(this.master),
    space: this.name,
  });
};

exports.shallReconnect = function() {  // {{{2
  return ! this.isGone();
};

// Private {{{1
function getShard(that, sid, cb) {  // {{{2
  return that.awaitReady(function(err) {
    if (err) return cb(err);

    if (sid in that.shards) {
      return that.shards[sid].awaitReady(cb);
    }

    if (that.isAtHome()) {
      return cb(O.error(that, 'SHARD_NOT_FOUND', 'Shard was not found at space\'s home', sid));
    }

    var shard = new Shard(that);
    shard.baseSetup(sid, that);

    return that.sendMaster('findShard', sid, function(err, resp) {
      if (err) return cb(shard.remove(err));

      return shard.setupConfig(resp, function(err) {
        if (err) return cb(err);

        shard.setupDone();

        return cb(null, shard);
      })
    });
  });
}

function findShards(that, filter, cb) {  // {{{2
  var resp = [];

  for (var key in that.shards) {
    var shard = that.shards[key];

//    console.log('CHECK SHARD', filter, (shard.home || that.home).name, shard.scope.name);

    if (filter.peer && (shard.home || that.home).name !== filter.peer) {
      continue;
    }

    if (filter.scope && shard.scope.name !== filter.scope) {
      continue;
    }

    if (filter.shard && shard.alias !== filter.sal) {
      continue;
    }

    resp.push(shard.id);
  }

  cb(null, resp);
};

function findShardAlias(that, alias, cb) {  // {{{2
  return that.awaitReady(function(err) {
    if (err) return cb(err);

    for (var key in that.shards) {
      var shard = that.shards[key];
      if (shard.alias === alias) {
        return shard.awaitReady(cb);
      }
    }

    if (that.isAtHome()) {
      return cb(O.error(that, 'SHARD_NOT_FOUND'));
    }

    return that.sendMaster('findShard', alias, function(err, resp) {
      if (err) return cb(err);

      if (resp.sid in that.shards) {
        that.shards[resp.sid].awaitReady(cb);
        return;
      }

      shard = new Shard();
      shard.baseSetup(resp.sid, that);
      return shard.setupConfig(resp, function(err) {
        if (err) return cb(err);
        shard.setupDone();
        return cb(null, shard);
      });
    });
  });
}

// }}}1



/* OBSOLETE {{{1
exports.link = function(ident, req, socket) {  // {{{2
/ **
 * Build a new `link` to an entry identified by `ident`.
 *
 * @param ident {Object} Entry identification
 * @param req {Object} Request object
 * @param socket {Object} Client socket instance
 *
 * @method link
 * /

//  console.log('SPACE LINK', ident, req);

  this.findShard(ident, function(err, shard) {
    if (err) {
      O.link.error(socket, err);
    } else {
      shard.link(ident.id, req, socket);
    }
  });
};

exports.linkMaster = function(cb) {  // {{{2
/ **
 * Establish a link to the master space. Calls `cb(err)` after lhs is changed from LINKING
 *
 * @param cb {Function(err)}
 *
 * @method linkMaster
 * @internal
 * @async
 * /

  switch (this.lhs) {
  case LHS.CLOSED:
    break;
  default:
    throw O.log.error(this, 'Invalid `this.lhs` when creating master for the this', this.lhs);
  }

  this.setLhs(LHS.LINKING);

  cb && this.once('lhs', cb);

  new Master(this);
};

exports.error = function(err) {  // {{{2
/ **
 * Remove shard from space cache with error.
 *
 * @method error
 * @internal
 * /

  if (! (err instanceof Error)) {
    err = O.applyError(this, arguments);
  }

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

  throw O.log.error(that, 'Invalid `shard.lhs`', shard.lhs);
}

}}}1 */
