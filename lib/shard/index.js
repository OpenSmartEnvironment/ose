'use strict';

var Ose = require('ose');
var M = Ose.class(module, C, 'EventEmitter');

var Entry = M.class('../entry');
//var EntryMaster = M.class('../entry/master');
var Scope = M.class('../scope');
var Slave = M.class('./slave');
var Master = M.class('./master');

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Shard class
 *
 * @readme
 * A shard is a set of [entries]. Each shard belongs to a certain
 * [space]. Every shard has a `sid` (shard id) that is unique within
 * its [space]. Each shard is tied to a single [scope] (ie. it cannot
 * contain [entries] of [kinds] belonging to different
 * [scopes]). Every shard either belongs to the same [home] as its
 * space or is assigned to a different one.
 *
 * @aliases shard shards
 *
 * @class ose.lib.shard
 * @type class
 */

/**
 * Scope instance
 *
 * @property scope
 * @type String|Object
 */

/**
 * Space containing shard
 *
 * @property space
 * @type Object
 */

/**
 * Shard id unique within a space
 *
 * @property sid
 * @type Number
 */

/**
 * Shard alias
 *
 * @property alias
 * @type String
 */

/**
 * Home peer
 *
 * @property home
 * @type String|Object
 */

/**
 * Object containing entries
 *
 * @property cache
 * @type Object
 */

/**
 * Socket linked to the master shard
 *
 * @property master
 * @type Object
 */

/**
 * Whether the shard can communicate with its [home]
 * TODO: Consider renaming
 *
 * @property synced
 * @type Boolean
 */

/**
 * Whether the shard has been initialized
 *
 * @property initialized
 * @type Boolean
 */

/**
 * Gets fired after all shards is the current space are initialized
 *
 * @event afterInit
 * @type Function
 */

/**
 * Is fired when the `synced` property changes
 *
 * @event synced
 * @type Boolean
 */

// Public {{{1
// exports.peer = <string> || <peer>: Master peer, when initialized it changes from string to Peer object.
// exports.masterTimeOffset = <integer> Time offset between this peer and shards home in miliseconds.

function C(scope, space, sid, alias, home) {  // {{{2
/**
 * Class constructor
 *
 * @param scope {String|Object} Scope instance
 * @param space {Object} Space
 * @param sid {Number} Shard id
 * @param alias {String} Shard alias
 * @param [home] {String|Object} Home peer
 *
 * @method C
 */

  M.super.call(this);

  this.setMaxListeners && this.setMaxListeners(1000);

  this.synced = null;

  this.masterTimeOffset = 0;

  this.cache = {};

//  this.id = id;  TODO: Remove from shard.

  this.space = space;
  this.sid = sid;
  this.alias = alias;

  switch (typeof scope) {
  case 'string':
    this.scope = Ose.scope(scope);
    break;
  case 'object':
    if (! M.isSuper(Scope, scope)) {
      throw Ose.error(this, 'invalidScope', {scope: scope});
    }

    this.scope = scope;
    break;
  default:
    throw Ose.error(this, 'invalidScope', {scope: scope});
  }

  switch (typeof home) {
  case 'null':
  case 'undefined':
    break;
  case 'string':
    this.home = Ose.peers.peer(home);
    break;
  case 'object':
    if (home) {
      this.home = home;
    }
    break;
  default:
    throw Ose.error(this, 'invalidHome', {home: home});
  }

  if (this.scope.name === 'core') {
    if (this.home) {
      this.home.coreShard(this);
    } else {
      this.space.home.coreShard(this);
    }
  }

  M.log.notice('New Shard', {scope: this.scope.name, space: this.space.name, shard: this.alias || this.sid});
};

exports.afterInit = function() {  // {{{2
/**
 * Gets called after all shards is the current space are initialized
 *
 * @method afterInit
 */

  this.initialized = true;

  if (this.atHome()) {
    this.setSynced(true);
  } else {
    this.setSynced(false);
    if (this.check2Link()) {
      this.linkMaster();
    };
  }

  this.emit('afterInit');
};

exports.check2Link = function() {  // {{{2
/**
 * Check whether this shard needs to be linked to the master.
 *
 * @returns {Boolean}
 *
 * @method check2Link
 */

//  console.log('SHARD CHECK TO LINK', {shard: this.identify(), synced: this.synced});

  // Check whether shard has some slaves
  if (this.slaves) {
    return true;
  }

  // Check whether something listens for "synced" event
  var l = this.listeners ? this.listeners('synced') : this.getListeners('synced');
  if (l && l.length) {
    return true;
  }

  // Check whether some entry needs to be synced.
  for (var key in this.cache) {
    if (this.cache[key].slaves) {
      return true;
    }
  }

  return false;
};

exports.afterHome = function(cb) {  // {{{2
/**
 * Executes callback after the shard has been initialized, but only in
 * the [home OSE instance].
 *
 * @param cb {Function} Method to be called
 *
 * @method afterHome
 * @async
 */

  if (! this.atHome()) return;

  switch (typeof cb) {
  case 'string':
    cb = require(cb);
    break;
  case 'function':
    break;
  default:
    throw Ose.error(this, 'invalidArgs', arguments);
  }

  var that = this;

  var args = arguments.length > 1 ?
    Ose._.rest(arguments) :
    null
  ;

  if (this.initialized) {
    setTimeout(done, 0);
  } else {
    this.once('afterInit', done);
  }

  function done() {
    if (args) {
      cb.apply(that, args);
    } else {
      cb(that);
    }
  }
};

exports.atHome = function() {  // {{{2
/**
 * Returns true if shard is in its home
 *
 * @returns {Boolean}
 *
 * @method atHome
 */

//  console.log('SHARD AT home', this.alias || this.id, ! ('mid' in this));

  return ((this.home || this.space.home).name === Ose.name);
};

exports.entry = function(id, kind, data) {  // {{{2
/**
 * Creates a new entry and adds it to `this.cache`.
 *
 * @param id
 * @param kind
 * @param data
 *
 * @returns {Object} Created entry
 *
 * @method entry
 */

  var result = new Entry(this, id);
  result.data = data;
  result.setup(kind);

  return result;
};

exports.get = function(entry, cb) {  // {{{2
/** Doc {{{3
 * Get entry with data in the current shard.
 *
 * @param entry {String|Number} Entry id.
 * @param cb {Function} Callback with entry as a response
 *
 * @method get
 */

//  console.log('SHARD GET', entry);

  if (! this.initialized) {  // Shard is not yet initialized, defer method call {{{3
    this.once('afterInit', this.get.bind(this, entry, cb));
    return;
  }

  if (this.atHome()) {  // Shard is at home {{{3
    if (entry in this.cache) {
      cb(null, this.cache[entry]);
      return;
    }

    cb(Ose.error(this, 'ENTRY_NOT_FOUND', entry));
    return;
  }

  var e; // Test whether entry is in shards cache {{{3
  if (entry in this.cache) {
    e = this.cache[entry];
    if (e.kind) {
      cb(null, e);
      return;
    }

    cb(M.log.todo('Entry is created and waiting for the kind', this, entry));
    return;
  }

  if (this.cached) {  // Entry is not in cache and shard contain all entries => entry not found {{{3
    cb(Ose.error(this, 'ENTRY_NOT_FOUND', entry));
    return;
  }

  // Create new entry and request data from master {{{3
  e = new Entry(this, entry);
  e.linkMaster(cb);

  // }}}3
};

exports.link = function(entry, req, socket) {  // {{{2
/** Doc {{{3
 * Establish a link to an entry in the current shard.
 *
 * @param entry {String|Number} Entry id.
 *
 * @param req {Object} Request object
 * @param req.drev {Object} Current data revision. Specifies whether to request entry data.
 * @param req.dtrack {Boolean} Whether to track data changes
 * @param req.srev {Object} Current state revision. Specifies whether to request entry state.
 * @param req.strack {Boolean} Whether to track state changes
 *
 * @param socket {Object|Function} Socket to be linked as a slave to an entry | Callback with entry as a response
 *
 * @method link
 */

//  console.log('SHARD LINK', entry, req);

  switch (arguments.length) {  // Process arguments {{{3
  case 3:
    if (typeof socket === 'object') {
      break;
    }
  default:
    throw Ose.error(this, 'invalidArgs', arguments);
  }

  if (! this.initialized) {  // Shard is not yet initialized => defer method call {{{3
    this.once('afterInit', this.link.bind(this, entry, req, socket));
    return;
  }

  if (this.atHome()) {  // Shard is at home {{{3
    if (entry in this.cache) {
//      new EntryMaster(this.cache[entry], req, socket);
      this.cache[entry].linkSlave(req, socket);
      return;
    }

    Ose.link.error(socket, Ose.error(this, 'ENTRY_NOT_FOUND', entry));
    return;
  }

  if (entry in this.cache) {  // Get entry from cache {{{3
    this.cache[entry].linkSlave(req, socket);
    return;
  }

  if (this.cached) {  // Entry is not in cache and shard contain all entries => entry not found {{{3
    Ose.link.error(socket, Ose.error(this, 'ENTRY_NOT_FOUND', entry));
    return;
  }

  // Create new entry {{{3
  new Entry(this, entry).linkSlave(req, socket);
  return;

  // }}}3
};

exports.send = function(target, name, data, socket) {  // {{{2
/**
 * Send a command to shard's home
 *
 * @param entry {String|Number} Entry id.
 * @param name {String} Command name
 * @param [data] {*} Data to be sent
 * @param [socket] {Object} Slave socket
 *
 * @method send
 */

//  console.log('SHARD SEND', target, name, data);

  if (! (target && name)) {
    Ose.link.error(socket, Ose.error(this, 'INVALID_ARGS', {target: target, name: name, data: data}));
    return;
  }

  this.linkMaster(function(err, sm) {
    if (err) {
      Ose.link.error(socket, err);
      return;
    }

    if (sm.link) {
      sm.link.command({target: target, name: name, data: data}, socket);
      return;
    }

    Ose.link.error(socket, M.log.todo('`shard.linkMaster()` should always return linked master or error!', arguments));
    return;
  });
};

exports.findShard = function(req, cb) {  // {{{2
/**
 * Finds a shard by id or alias in the same space as this shard or by
 * an identification object in another space
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

//  console.log('SHARD FIND SHARD', {shard: this.alias || this.sid, req: req, initialized: this.initialized});

  if (! this.initialized) {
    this.once('afterInit', this.findShard.bind(this, req, cb));
    return;
  }

  switch (typeof req) {
  case 'string':
  case 'number':
    this.space.findShard(req, cb);
    return;
  case 'object':
    if (('space' in req) && (req.space !== this.space.name)) {
      Ose.spaces.findShard(req, cb);
      return;
    }

    this.space.findShard(req.shard, cb);
    return;
  }

  throw Ose.error(this, 'invalidArgs', arguments);
};

exports.getView = function(params, socket) {  // {{{2
/**
 * **Views logic will be changed in principle**
 *
 * @param params {Object} Parameters
 * @param socket {Object|Function} Slave socket or callback
 *
 * @method getView
 * @beta
 */

//  console.log('SHARD GET VIEW', this.sid || this.alias, params);

  if (! params) params = {};

/*
  if (('mid' in this) && ! this.cached) {
    params.shard = this.mid;
    this.sendMaster('view', params, cb);
    return;
  }
*/

  if (! (this.cached || this.atHome())) {
    this.linkMaster(function(err, master) {
//      console.log('MASTER CONNECTED', err);
      if (err) {
        Ose.link.error(socket, err);
      } else {
        master.link.view(params, socket);
      }
    });

    return;

//    Ose.link.error(socket, Ose.error(this, 'socketDisconnected'));
//    return;
  }

  if (params.kind) {
    var kind = this.scope.kinds[params.kind];

    if (kind.getView) {
      params.shard = this;
      kind.getView(params, socket);
      return;
    }
  }

  var result = [];
  for (var key in this.cache) {
    var entry = this.cache[key];

    if (entry.inView(params)) {
      result.push(entry.id);
    }
  }

  Ose.link.close(socket, {view: result});
  return;
};

exports.identify = function() {  // {{{2
/**
 * Returns shard identification object. This object consists of `space
 * name` and `shards sid`.
 *
 * @returns {Object} Shard identification object.
 *
 * @method identify
 */

  return {
    space: this.space.name,
    shard: this.sid
  };
};

exports.isIdentified = function(data) {  // {{{2
/**
 * Checks whether this shard is identified by a `data` identification
 * object.
 *
 * @param data {Object} Identification object
 *
 * @returns {Boolean}
 *
 * @method isIdentified
 */

  if (data.space !== undefined) {
    if (this.space.name !== data.space) return false;

    return (this.alias === data.shard) || (this.sid === data.shard);
  } else {
    return this.id === data.shard;
  }
};

exports.setSynced = function(value) {  // {{{2
/**
 * Sets `synced` property. Emits `synced` event if the property is
 * changed.
 *
 * @param value {Boolean} Value to be set
 *
 * @method setSynced
 */

  if (typeof value !== 'boolean') throw Ose.error(this, 'invalidSynced', value);

  if (value === this.synced) return;

  this.synced = value;
  this.emit('synced', value);

  if (this.slaves) {
    for (var key in this.slaves) {
      var s = this.slaves[key];
      if (s.link) {
        s.link.synced(value);
      }
    }
  }

//  console.log('SHARD SYNCED', {shard: this.identify(), value: this.synced});
};

exports.afterSynced = function(cb) {  // {{{2
/**
 * Calls the callback after the shard gets synced with its home or
 * immediately if already in sync. It can wait forever.
 *
 * @param cb {Function} Callback
 *
 * @method afterSynced
 */

//  console.log('SHARD AFTER SYNCED', {shard: this.identify(), synced: this.synced});

  if (this.synced) {
    cb();
    return;
  }

  var that = this;

  if (this.atHome()) {
    if (this.initialized) {
      throw Ose.error(this, 'UNEXPECTED', 'Shard is at home and initialized and has not `synced` property defined as `true`.', this.synced);
    }

    this.once('synced', test);
    return;
  }

  this.linkMaster(test);
  /*
  this.linkMaster(function(err) {
    switch (err && err.code) {
    case null:
    case undefined:
    case 'UNREACHABLE':
    case 'DISCONNECTED':
      test();
      return;
    }

    cb(err);
  });
  */
  return;

  function test() {
    if (that.synced) {
//      console.log('SHARD AFTER SYNCED SUCCESS', {shard: that.identify(), synced: that.synced});
      cb();
    } else {
      that.once('synced', test);
    }
  };
};

exports.linkSlave = function(socket) {  // {{{2
/**
 * Opens a link to the slave shard
 *
 * @param socket {Object} Client socket
 *
 * @method linkSlave
 */

  if (this.slaves) {
    if (socket.lid in this.slaves) {
      Ose.link.error(socket, Ose.error(this, 'DUPLICIT', socket.lid));
      return;
    }
  } else {
    this.slaves = {};
  }

  var m = new Master();

  m.shard = this;
  this.slaves[socket.lid] = m;

  Ose.link.open(m, socket, {
    alias: this.alias,
    synced: this.synced
  });

  if (! this.synced) {
    this.linkMaster();
  }

  return;
};

exports.linkMaster = function(cb) {  // {{{2
/**
 * Establishes a link to the master shard if it doesn't exist and
 * provides a shard/slave socket as a callback response.
 * Should be called only when not at home.
 * `shard.master` is removed only when it is unnecessary - the shard doesn't needs to be synced to its home.
 *
 * @param cb {Function(err, shardMaster)}
 *
 * @method linkMaster
 * @async
 */

  if (! this.initialized) {  // Shard is not yet initialized, defer method call
    this.once('afterInit', this.linkMaster.bind(this, cb));
    return;
  }

//  console.log('SHARD LINK MASTER', {name: this.alias || this.sid, home: this.home && this.home.name, typeofCb: typeof cb});

  var peer = findGw(this.home || this.space.home);
  if (! peer) {
    cb(Ose.error(this, 'NO_ROUTE', 'Route to shard\'s home is not defined.'));
    return;
  }

  if (this.master) {
    if (
      this.master.link &&
      this.master.link.ws &&
      this.master.link.ws.isConnected()
    ) {
      cb && cb(null, this.master);
      return;
    }

    if (this.master._state !== 'WAIT') {
      cb && cb(Ose.error(this, 'DISCONNECTED'));
      return;
    }

    this.master.once('done', cb);
    return;
  }

  new Slave(this, peer, cb);
  return;

  function findGw(peer) {  // {{{3
    if (peer === Ose.peers.here) {
      return null;
    }

    if (peer.isConnected() || peer.url) {
      return peer;
    }

    if (peer.gw) {
      if (peer.gw === Ose.peers.here) {
        return peer;
      }
      return peer.gw;
    }

    if (Ose.peers.gw) {
      if (Ose.peers.gw === Ose.peers.here) {
        return peer;
      }
      return Ose.peers.gw;
    }

    return peer;
  }

  // }}}3
};

// }}}1
// Private {{{1
function addEntry(that, entry) {  // {{{2
  if (! entry.id) {
    if (! that.entryId) {
      M.log.unhandled('Cannot create new entry without id in slave shard.');
      return false;
    }

    entry.id = that.entryId++;
  }

  if (entry.id in that.cache) {
    M.log.unhandled('Entry with same id already exist in that shard.', that.alias || that.id, entry);
    return false;
  }

  entry.shard = that;

  that.cache[entry.id] = entry;

  return true;
};

// }}}1
