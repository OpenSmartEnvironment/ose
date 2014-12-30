'use strict';

var Ose = require('ose');
var M = Ose.class(module, C, 'EventEmitter');

var Kind = M.class('../kind');
var Master = M.class('./master');
var Slave = M.class('./slave');

/** Doc {{{1
 * @submodule ose.data
 */

/**
 * @caption Entry class
 *
 * @readme

 * An [Entry] instance is a data structure representing a physical
 * object or logical concept. Each [entry] belongs to a certain
 * [shard]. Within the [shard], it has a unique `id`. Each [entry] is
 * of a certain [kind] that defines its behaviour. An [entry] can
 * contain a `data` object in JSON format (analogous to a database
 * table row). At the moment, `data` are defined at the start-up of an
 * [OSE instance] and are immutable. Data management and persistence
 * are planned features. The `state` JSON object, unlike `data`, can
 * often change and is non-persistent by design because it reflects
 * changing objective reality. Changes of `state` objects are
 * propagated to [peers] tracking changes of certain [entries].
 *
 * @todo
 * [Entries] can receive `action` objects in JSON format.
 *
 * @aliases entry entries data state statesOfEntries
 *
 * @class ose.lib.entry
 * @extends EventEmitter
 * @type class
 */

/** id {{{2
 * ID of entry within shard
 *
 * @property id
 * @type String
 */

/** shard {{{2
 * Reference to containing [shard]
 *
 * @property shard
 * @type Object
 */

/** kind {{{2
 * Reference to [entry kind]
 *
 * @property kind
 * @type Object
 */

/** drev {{{2
 * Timestamp in microseconds of last data update
 *
 * @property drev
 * @type Number
 */

/** data {{{2
 * Persistent data
 *
 * @property data
 * @type Object
 */

/** master {{{2
 * Reference to [slave entry client socket]
 *
 * @property master
 * @type Object
 */

/** srev {{{2
 * Timestamp in microseconds of last state update
 *
 * @property srev
 * @type Number
 */

/** state {{{2
 * Non-persistent data
 *
 * @property state
 * @type Object
 */

/** synced {{{2
 * Indicates whether entry is sync with its home
 *
 * @property synced
 * @type Boolean
 */

/** queuedState {{{2
 * Queued state
 *
 * @property queuedState
 * @type Object
 * @private
 */

/** queueStateHandle {{{2
 * Timeout handle
 *
 * @property queueStateHandle
 * @type Number
 * @private
 */

/** queueStateTimeout {{{2
 * Setup this property to enable set state queue.
 *
 * @property queueStateTimeout
 * @type Integer (milliseconds)
 */

/** removed {{2
 * Set to TRUE when the entry is removed
 *
 * @type Boolean
 */

/** slaveId {{{2
 * Last slave id
 *
 * @property slaveId
 * @type Number
 * @private
 */

/** slaves {{{2
 * Contains all response sockets of slave entries
 *
 * @property slaves
 * @type Object
 * @private
 */

/** dtc {{{2
 * Count of data trackers
 *
 * @property dtc
 * @type Number
 * @private
 */

/** stc {{{2
 * Count of clients state trackers
 *
 * @property stc
 * @type Number
 * @private
 */

// }}}1
// Public {{{1
function C(shard, id) {  // {{{2
/**
 * Entry constructor
 *
 * @param shard {Object} Entry owner shard instance
 * @param id {String|Number} Entry id
 *
 * @method constructor
 */

  if (id in shard.cache) {
    throw Ose.error(shard, 'duplicitEntry', arguments);
  }

  M.super.call(this);

  this.setMaxListeners(1000);

  this.shard = shard;  // Containing shard.
  this.id = id;

  this.drev = 0;
  this.srev = 0;

  shard.cache[id] = this;
};

exports.setup = function(kind) {  // {{{2
/**
 * Sets entry properties
 *
 * @param kind {String|Object} Kind of entry
 *
 * @method setup
 */

  switch (typeof kind) {
  case 'string':
    this.kind = this.shard.scope.kinds[kind];

    if (! this.kind) {
      throw Ose.error(this, 'invalidKind', {kind: kind});
    }
    break;
  case 'object':
    if (! M.isSuper(Kind, kind)) {
      throw Ose.error(this, 'invalidKind', {kind: kind});
    }

    this.kind = kind;
    break;
  default:
    throw Ose.error(this, 'invalidKind', {kind: kind});
  }

  if (! this.drev) {
    this.drev = 0;
  }
  if (! ('data' in this)) {
    this.data = {};
  }

  if (! this.srev) {
    this.srev = 0;
  }
  if (! ('state' in this)) {
    this.state = {};
  }

  this.initEntry && this.initEntry();  // TODO: Check `initEntry` usage.
  this.kind.initEntry && this.kind.initEntry(this);

  if (this.shard.atHome()) {
    setupHome(this);
  }

  this.emit('setup');
};

exports.remove = function() {  // {{{2
/**
 * Removes entry from shard
 *
 * @method remove
 */

//  console.log('ENTRY REMOVE', this.id);

  this.removed = true;

  delete this.shard.cache[this.id];

  if (this.slaves) {
    for (var key in this.slaves) {
      Ose.link.close(this.slaves[key]);
    }
    delete this.slaves;
    delete this.dtc;
    delete this.stc;
  }

  if (this.master) {
    Ose.link.close(this.master);
    delete this.master;
  }

  if (this.queueStateHandle) {
    clearTimeout(this.queueStateHandle);
    delete this.queueStateHandle;
    delete this.queuedState;
  }

  this.emit('remove');
};

exports.getCaption = function() {  // {{{2
/**
 * Returns entry caption
 *
 * @return {String} Entry caption
 *
 * @method getCaption
 */

  return this.kind && this.kind.getCaption(this) || this.id;
};

exports.command = function(name, data, socket) {  // {{{2
/**
 * Executes a command on the current entry
 *
 * @param name {String} Command name
 * @param data {*} Data to be sent
 * @param socket {Object} Client socket
 *
 * @method command
 */

//  console.log('ENTRY COMMAND', this.id, name, data);

  if (this.commands && (name in this.commands)) {
    this.commands[name].call({entry: this}, data, socket);
    return;
  }

  if (this.kind.commands && (name in this.kind.commands)) {
    this.kind.commands[name].call({entry: this}, data, socket);
    return;
  }

  Ose.link.error(socket, Ose.error(this, 'UNKNOWN_COMMAND', {name: name, data: data}));
  return;
};

exports.post = function(name, data, socket) {  // {{{2
/**
 * Executes a command on the entry at home.
 *
 * @param name {String} Command name
 * @param [data] {*} Data to be sent
 * @param [socket] {Object} Client socket
 *
 * @method post
 */

//  console.log('ENTRY POST', this.id, name, data);

  if (this.shard.atHome()) {
    var that = this;

    setTimeout(function() {
      that.command(name, data, socket);
    }, 0);
    return;
  }

  this.shard.send(this.id, name, data, socket);
  return;
}

exports.postTo = function(target, name, data, socket) {  // {{{2
/**
 * Send command to target's home
 *
 * @param target {String|Object} Target id or target identification object
 * @param name {String} Command name
 * @param [data] {*} Data to be sent
 * @param [socket] {Object|Function}
 *
 * @method postTo
 */

//  console.log('ENTRY POST TO', Ose.identify(target), name, data);

  switch (typeof target) {
  case 'number':  // `target` is at same `shard` and is identified by `id`
  case 'string':
    if (target === this.id) {  // `target` === `this`
      this.post(name, data, socket);
      return;
    }

    doIt(this.shard, target);
    return;
  case 'object':  // `target` is some object
    if (typeof target.identify === 'function') {  // `target` is entry instance
      if (target === this) {  // `target` === `this`
        this.post(name, data, socket);
        return;
      }

      target.post(name, data, socket);
      return;
    }

    this.findShard(target, function(err, shard) {
      if (err) {
        Ose.link.error(socket, err);
      } else {
        doIt(shard, target.entry);
      }
    });
    return;
  }

  throw Ose.error(this, 'invalidArgs', arguments);

  function doIt(shard, target) {
    if (! shard.atHome()) {
      shard.send(target, name, data, socket);
      return;
    }

    shard.get(target, function(err, entry) {
      if (err) {
        Ose.link.error(socket, err);
      } else {
        entry.command(name, data, socket);
      }
    });
    return;
  };
};

exports.onStates = function(handlers) {  // {{{2
/**
 * Register state handlers
 *
 * @param handlers {Object} Handlers object
 *
 * @method onStates
 */

  var that = this;

  this.on('state', function(data) {
    for (var key in data) {
      if (key in handlers) {
        handlers[key](that, data[key], data);
      }
    }
  });
};

exports.setState = function(data, src) {  // {{{2
/**
 * Change entry "state". Can be called only in the home. Data are
 * altered (unchanged keys are removed).
 *
 * @param data {Object} Data object
 * @param [src] {Object} Source of a change
 *
 * @method setState
 */

//  console.log('SET STATE', this.identify(), data);

  if (typeof data !== 'object') {
    M.log.error(Ose.error(this, 'invalidState', data));
    return;
  }

  if (! this.shard.atHome()) {
    M.log.error(Ose.error(this, 'notAtHome', data));
    return;
  }

  if (typeof this.queueStateTimeout === 'number') {
    if (this.queueStateHandle) {
      mergeQueue(this.queuedState, data, this.state);
    } else {
      queueState(this, data);
    }
  } else {
    if (updateState(this, data, Ose.nextTime(), src || Ose.name) && this.slaves) {
      this.broadcast({
        srev: this.srev,
        state: data,
      });
    }
  }

  return;
};

exports.inView = function(params) {  // {{{2
/**
 * Tests whether entry belongs to view.
 *
 * TODO: Consider renaming method to isInView.
 *
 * @param params {Object} Object containing parameters
 *
 * @return {Boolean}
 *
 * @method inView
 */

  if (! this.kind) {
    M.log.unhandled('Invalid this.kind', this.shard.alias, this.id);
  }

  if (params.kind && (this.kind.name !== params.kind)) return false;

  if (params.filter) {
    if (params.filter.master && this.data.master !== params.filter.master) return false;
    if (params.filter.parent && this.data.parent !== params.filter.parent) return false;
  }

  if (this.kind.inView) {
    return this.kind.inView(this, params);
  }

  return true;
};

exports.isIdentified = function(data) {  // {{{2
/**
 * Tests whether entry is identified by data.
 *
 * @param data {Object} Entry identification
 *
 * @return {Boolean}
 *
 * @method isIdentified
 */

  if (! this.shard.isIdentified(data)) return false;

  if (this.id !== data.entry) return false;

  return true;
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
    space: this.shard.space.name,
    shard: this.shard.sid,
    entry: this.id
  };
};

exports.isSynced = function(what) {  // {{{2
/**
 * Checks whether data or state are synced
 *
 * @param what {String|Null} What to check ("data"|"state"|Null)
 *
 * @returns {Boolean}
 *
 * @method isSynced
 */

  if (this.shard.atHome()) {
    return true;
  }

  switch (what) {
    case undefined:
    case null:
      return Boolean(this.synced);
    case 'data':
      return Boolean(this.synced && this.dtc);
    case 'state':
      return Boolean(this.synced && this.stc);
    default:
      M.log.unhandled('Invalid sync', what);
      return false;
  }
};

exports.linkTo = function(entry, req, socket) {  // {{{2
/**
 * Establishes a link to a target entry. When `req` contains a track
 * request, the target entry will establish a link to the [home].
 *
 * @param entry {Object|String|Number} Target entry identification
 *
 * @param req {Object|String} Request object
 * @param req.drev {Object} Current data revision. Specifies whether to request entry data.
 * @param req.dtrack {Boolean} Whether to track data changes
 * @param req.srev {Object} Current state revision. Specifies whether to request entry state.
 * @param req.strack {Boolean} Whether to track state changes
 *
 * @param socket {Object|Function(err, entry)} Socket to be linked as a slave to an entry, or a callback with an entry as a response.
 *
 * @async
 * @method linkTo
 */

//  console.log('ENTRY LINK', entry, req, typeof socket);
//  console.trace();

  switch (typeof entry) {
  case 'string':
  case 'number':
    this.shard.link(entry, req, socket);
    return;
  case 'object':
    this.shard.findShard(entry, function(err, shard) {
      if (err) {
        Ose.link.error(socket, err);
        return;
      }

      shard.link(entry.entry, req, socket);
      return;
    });
    return;
  }

  Ose.link.error(socket, Ose.error(this, 'invalidArgs', arguments));
  return;
};

exports.find = function(req, cb) {  // {{{2
/**
 * Finds a sibling entry.
 *
 * @param req {Object|String|Number} Entry identification
 * @param cb {Function (err, shard)} Callback
 *
 * @async
 * @method find
 */

  switch (typeof req) {
  case 'number':  // `req` is at same `shard` and is identified by `id`
  case 'string':  // `req` is at same `shard` and is identified by `id`
    this.shard.get(req, cb);
    return;
  case 'object':  // `req` is some object
    this.findShard(req, function(err, shard) {
      if (err) {
        cb(err);
        return;
      }

      shard.get(req.entry, cb);
    });
    return;
  }

  throw Ose.error(this, 'invalidArgs', arguments);
};

exports.findShard = function(req, cb) {  // {{{2
/**
 * Finds a sibling shard based on an entry's identification.
 *
 * @param req {Object|String|Number} Entry identification
 * @param cb {Function (err, shard)} Callback
 *
 * @async
 * @method findShard
 */

//  console.log('ENTRY FIND SHARD', {req: req});

  switch (typeof req) {
  case 'string':
  case 'number':  // req is not an object and points to the same shard.
    cb(null, this.shard);
    return;
  case 'object':
    if (req) {
      this.shard.findShard(req, cb);
      return;
    }
    cb(Ose.error(this, 'SHARD_NOT_FOUND', req));
    return;
  }

  cb(Ose.error(this, 'invalidArgs', arguments));
};

exports.setSynced = function(val) {  // {{{2
/**
 * Sets `synced` property and emits `"synced"` event.
 *
 * @param val {Boolean} Value to be set
 *
 * @method setSynced
 */

  if (this.synced === val) {
    return;
  }

  this.synced = val;
  this.emit('synced', val);

  return;
};

exports.update = function(req, full) {  // {{{2
/**
 * Updates this entry based on `req`. Called at a slave entry when
 * `update` request from the master is received.
 *
 * @param req {Object} Update object
 * @param req.data {Object} Data update
 * @param req.drev {Object} Data revision
 * @param req.state {Object} State
 * @param req.srev {Object} State revision
 * @param req.synced {Boolean} Whether the entry is synced with home
 *
 * @param full {Boolean} Whether the update contain full data or the difference only
 *
 * @method update
 */

  if ('drev' in req) {
    this.drev = req.drev;
    this.data = req.data;
//    this.updateData(req.data, req.drev);
  }

  if (('srev' in req) && (req.srev !== this.srev)) {
    if (full) {
      diff(req.state, this.state);
    }
    updateState(this, req.state, req.srev);
  }

  if ('synced' in req) {
    this.setSynced(req.synced);
  }
};

exports.broadcast = function(req) {  // {{{2
/**
 * Broadcasts an entry update request to slaves
 *
 * @param req {Object} Request object
 *
 * @method broadcast
 */
//  console.log('ENTRY BROADCAST', JSON.stringify(req));

  for (var key in this.slaves) {
    var s = this.slaves[key];
    if (! s.link) continue;

    var d = {};

    if ('kind' in req) {
      d.kind = req.kind;
    }

    if ('synced' in req) {
      d.synced = req.synced;
    }

    if (s.dtrack && ('drev' in req)) {
      d.drev = req.drev;
      d.data = req.data;
    }

    if (s.strack && ('srev' in req)) {
      d.srev = req.srev;
      d.state = req.state;
    }

    if (! Ose._.isEmpty(d)) {
      s.link.update(req);
    }
  }
};

exports.linkSlave = function(req, socket) {  // {{{2
/**
 * Links a [slave entry client socket]
 *
 * @param req {Object} Request data
 * @param socket {Object} Client socket
 *
 * @method linkSlave
 */

//  console.log('ENTRY LINK SLAVE', this.id, req);

  if (req.dtrack || req.strack) {
    new Master(this, req, socket);
    return;
  }

  // Request is not tracking data or state, respond with `close()`.
  if (! this.kind) {
    Ose.link.error(socket, M.log.todo('Trying to get entry data while entry is not setup yet!', this));
    return;
  }

  // TODO: p1 => p2 => p3;  p1 request entry data and p2 can respond old data when there is no link between p2 entry and p3 entry.
  Ose.link.close(socket, this.respond(req));
  return;
};

exports.linkMaster = function(cb) {  // {{{2
/**
 * Establishes a link to the master entry.
 *
 * Calls `cb(err, entry)` after a entry has a defined kind and data.
 *
 * @param cb {Function} Callback
 *
 * @method linkMaster
 * @async
 */

//  console.log('ENTRY LINK MASTER', {entry: this.id, master: typeof this.master, cb: typeof cb});

  if (this.master) {
    if (! cb) return;

    if (this.master.link && this.kind) {
      cb(null, this);
      return;
    }

    if (this.master._state !== 'WAIT') {
      throw Ose.error(this, 'UNEXPECTED', '`entry.master` socket is not waiting for open and is not opened', this.master._state);
    }

    this.master.once('done', cb);
    return;
  }

  var that = this;
  this.master = new Slave(this);

  this.shard.linkMaster(function(err, sm) {
//    console.log('ENTRY LINK MASTER RESPONSE', err && err.code);

    if (err) {
      Ose.link.error(cb, err);
      Ose.link.error(that.master, err);
      return;
    }

    var req = {
      drev: that.drev
    };

    if (that.dtc) {
      req.dtrack = true;
    }

    if (that.stc) {
      req.strack = true;
      req.srev = that.srev;
    }

    cb && that.master.once('done', cb);

    sm.link.entry(
      {
        entry: that.id,
        what: req
      },
      that.master
    );
    return;
  });
};

exports.respond = function(req) {  // {{{2
/**
 * Creates a response with `entry.data` or `entry.state` depending on
 * `req`
 *
 * @param req {Object} Request object
 *
 * @returns {Object} Response object
 *
 * @method respond
 */
  if (! this.kind) {
    return {
      id: this.id,  // TODO remove `id` from communication, it's unnecessary.
      synced: false,
    };
  }

  var resp = {
    id: this.id,
    synced: this.synced
  };

  if (('drev' in req) && (req.drev !== this.drev)) {
    if (req.drev === 0) {
      resp.kind = this.kind.name;
    }

    resp.drev = this.drev;
    resp.data = this.data;
  }

  if (('srev' in req) && (req.srev !== this.srev)) {
    resp.srev = this.srev;
    resp.state = this.state;
  }

//  console.log('RESPOND', req, resp);

  return resp;
};

exports.track = function(data, state, cb) {  // {{{2
/**
 * Method called when data or state changes should be tracked.
 *
 * @param data {Object}
 * @param state {Object}
 * @param [cb] {Function} Function to be called after setup tracking.
 *
 * @method tracked
 */

  this.dtc += data;
  this.stc += state;

  if (this.dtc < 0) {
    cb && cb(Ose.error(this, 'INVALID_DATA_TRACK_COUNT', {dtc: this.dtc, data: data}));
    return;
  }

  if (this.stc < 0) {
    cb && cb(Ose.error(this, 'INVALID_STATE_TRACK_COUNT', {stc: this.stc, state: state}));
    return;
  }

//  console.log('ENTRY TRACK', this.id, 'sum: ', {data: this.dtc, state: this.stc}, 'change: ', {data: data, state: state});

  if (this.shard.atHome()) {
    cb && cb(null);
    return;
  }

  if (this.master && this.master.link) {  // this has active master, try to send track update.
    var req = {};
    if (this.dtc) {
      if (this.dtc === data) {  // Data tracking changed.
        req.dtrack = true;
        req.drev = this.drev;
      }
    } else {
      req.dtrack = false;
    }

    if (this.stc) {
      if (this.stc === state) {  // State tracking changed.
        req.strack = true;
        req.srev = this.srev;
      }
    } else {
      req.strack = false;
    }

    if (! Ose._.isEmpty(req)) {
      this.master.link.track(req);
    }

    cb && cb(null);
    return;
  }

  this.linkMaster(function(err) {  // Entry has no active link to the master, establish it if possible.
//    console.log('ENTRY TRACK RESPONSE', err && err.code);

    if (err) {
      cb && cb(err);
    } else {
      cb && cb();
    }
  });
  return;
};

// }}}1
// Private {{{1
function setupHome(that) {  // {{{2
  if (! that.drev) {
    that.drev = 1;
  }

  if (! that.srev) {
    that.srev = Ose.nextTime();
  }

  if (that.homeInit) {
    switch (typeof that.homeInit) {
    case 'function':
      break;
    case 'string':
      if (that.homeInit.match(/^\.\//)) {
        that.homeInit = that.M.requireChain(that.homeInit);
      } else {
        that.homeInit = require(that.homeInit);
      }
      break;
    case 'boolean':
      that.homeInit = that.M.requireChain('./home');
      break;
    default:
      throw Ose.error(that, 'invalidHomeInit', that.homeInit);
    }

    if (typeof that.homeInit === 'string') {
      require(that.homeInit)(that);
    } else {
      that.homeInit();
    }
  }

  if (that.kind.homeInit) {
    switch (typeof that.kind.homeInit) {
    case 'function':
      break;
    case 'string':
      if (that.kind.homeInit.match(/^\.\//)) {
        that.kind.homeInit = that.kind.M.requireChain(that.kind.homeInit);
      } else {
        that.kind.homeInit = require(that.kind.homeInit);
      }
      break;
    case 'boolean':
      that.kind.homeInit = that.kind.M.requireChain('./home');
      break;
    default:
      throw Ose.error(that.kind, 'invalidHomeInit', that.kind.homeInit);
    }

    that.kind.homeInit(that);
  }

  that.setSynced(true);

  that.slaves && that.broadcast({
    kind: that.kind.name,
    synced: true,
    drev: that.drev,
    data: that.data,
    srev: that.srev,
    state: that.state,
  });
};

function updateState(that, data, rev, src) {  // Entry state changed. Update "state" and "srev". "data" are altered (unchanged keys are removed). Return false if there is nothing to update. {{{2

//  console.log('ENTRY UPDATE STATE', data, that.state);

  if (typeof data !== 'object') {
    M.log.unhandled('State must be an object.', data)
    return false;
  }

  var orev = that.srev;
  that.srev = rev;

  clean(data, that.state);
  if (Ose._.isEmpty(data)) return false;

  if (! that.state) that.state = {};
  merge(that.state, data);

  M.log.debug('State changed', JSON.stringify({entry: that.id, state: data}));

  that.emit('state', data);

  return true;
};

function queueState(that, data) {  // {{{2
  if (that.queuedState) {
    M.log.unhandled('State is already queued', that.queuedState);
    return;
  }

  that.queuedState = data;

  that.queueStateHandle = setTimeout(function() {
    var state = that.queuedState;

    delete that.queueStateHandle;
    delete that.queuedState;

    if (updateState(that, state, Ose.nextTime(), Ose.name) && that.slaves) {
      that.broadcast({
        srev: that.srev,
        state: state,
      });
    }
  }, that.queueStateTimeout);
};

function clean(data, orig) {  // Alter "data" - remove properties that are same as in "orig". {{{2
//  console.log('CLEAN', orig, data);

  if (! orig) return;
  if (typeof orig !== 'object') return;

  for (var key in data) {
    var value = data[key];

    if (key in orig) {  // Key is found in original data.
      if (value === null) continue;  // Value from orig will be deleted.

      if (value === undefined) {  // Value in orig will be kept.
        delete data[key];
        continue;
      }

      if (Ose._.isEqual(value, orig[key])) {
        delete data[key];  // Values are same, remove the key.
        continue;
      }

      if (Array.isArray(value)) continue;  // Array is different, keep the key.

      if (typeof value === 'object') {
        clean(value, orig[key]);

        for (var kex in value) if (value[kex] !== null) {  // Find if there remain some non null property in cleaned "value".
          value = null;
          break;
        }

        if (value !== null) delete data[key];  // Delete key from cleaned, when there is no non null property.
      }
    } else { // Key is not found in original data.
      switch (value) {
      case undefined:
      case null:
        delete data[key];
      }
    }
  }

  return;
};

function diff(data, orig) {  // Alter "data": set keys not existing in "orig" to null. {{{2
//  console.log('DIFF', data, orig);

  if ((typeof data !== 'object') || (typeof orig !== 'object')) {
    return data === orig;
  }

  for (var key in orig) {
    if (key in data) {
      if (diff(data[key], orig[key])) {
        delete data[key];
      }
    } else {
      data[key] = null;
    }
  }

//  console.log('DIFF RESPONSE', data);

  return false;
};

function merge(data, change) {  // Alter "data" by "change", return data. {{{2
  for (var key in change) {
    var value = change[key];

    if (value === null) {
      delete data[key];
      continue;
    }

    if ((typeof value === 'object') && (key in data)) {
      merge(data[key], value);
      continue;
    }

    data[key] = value;
  }

  return data;
};

function mergeClean(dst, src, orig) {  // {{{2
  for (var key in orig) {
    if (key in src) {
      if (typeof orig[key] === 'object') {
        mergeClean(dst[key] = {}, src[key], orig[key])
      } else {
        dst[key] = src[key];
      }
    } else {
      dst[key] = null;
    }
  }

  for (var key in src) {
    if (! (key in orig)) {
      dst[key] = src[key];
    }
  }
};

function mergeQueue(dst, src, orig) {  // {{{2
  for (var key in src) {
    var value = src[key];

    if (value === null) {
      dst[key] = null;
      continue;
    }

    if ((typeof value === 'object') && (dst[key])) {
      mergeQueue(dst[key], value, orig && orig[key]);
      continue;
    }

    if ((dst[key] === null) && orig && (typeof orig[key] === 'object')) {
      mergeClean(dst[key] = {}, value, orig[key]);
    } else {
      dst[key] = value;
    }
  }
};

// }}}1
