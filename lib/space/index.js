'use strict';

const O = require('ose')(module)
  .class(C, 'EventEmitter')
  .prepend('../subject')
;

var Consts = O.consts('ose');
var Shard = O.getClass('../shard');
var Peer = O.getClass('../peer/remote');

/**  Doc {{{1
 * @module ose
 * @submodule ose.data
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

// Public {{{1
function C() {  // {{{2
/**
 * Class constructor
 *
 * @method constructor
 * @internal
 */

  O.super.call(this);
  this.setMaxListeners(Consts.coreListeners);

  this.subjectState = this.SUBJECT_STATE.INIT;

  this.peers = {};
  this.shards = {};
};

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
 * Find a shard by shard id in the current space
 *
 * @param sid {Number} Shard id
 * @param cb {Function} Response callback `function(err, shard)`
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
 * @param cb {Function} Response callback `function(err, shard)`
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

        return O.data.getSpace(ident[2], function(err, space) {
          if (err) return cb(err);
          return space.getShard(ident[1], cb);
        });
      }

      return cb(O.error(this, 'INVALID_IDENT', ident));
    }

    if (ident.space && ident.space !== this.name) {
      return O.data.getSpace(ident.space, function(err, space) {
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
 * @param [filter.schema] {String} schema name
 * @param [filter.alias] {String} Shard alias
 *
 * @param cb {Function} Callback that returns an array if IDs or an error.
 *
 * @method findShards
 * @async
 */

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
      if (that.isAtHome()) return findShards(that, filter, cb);
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
exports.Master = O.getClass('./master');  // {{{2

exports.cleanup = function() {  // {{{2
  delete O.data.spaces[this.name];

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

  deps.add('finish', 'connect', function(cb) {  // {{{3
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

  if (name in O.data.spaces) {
    throw O.log.error(this, 'DUPLICIT_SPACE', 'Space name is already registered', name);
  }

  this.name = name;
  O.data.spaces[name] = this;

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
        schema: shard.schema.name,
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
    case that.MASTER_STATE.BUSY:
    case that.MASTER_STATE.WAITING:
      return that.setMasterState(home ?
        that.MASTER_STATE.HOME :
        that.MASTER_STATE.MASTER
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

//    console.log('CHECK SHARD', filter, (shard.home || that.home).name, shard.schema.name);

    if (filter.peer && (shard.home || that.home).name !== filter.peer) {
      continue;
    }

    if (filter.schema && shard.schema.name !== filter.schema) {
      continue;
    }

    if (filter.shard && shard.alias !== filter.alias) {
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

