'use strict';

var O = require('ose').class(module, C, 'EventEmitter');
O.prepend('../subject');

var Kind = O.class('../kind');
var Master = O.class('./master');
var Slave = O.class('./slave');
var L = O.link;
var LHS = L.homeState;

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
 * of a certain [kind] that defines its behaviour.
 *
 * An [entry] can contain a `data` object in JSON format (analogous to
 * a database table row). At the moment, `data` are defined at the
 * start-up of an [OSE instance] and are immutable. Data management
 * and persistence are planned features.

 * The `state` JSON object, unlike `data`, can often change and is
 * non-persistent by design because it reflects changing objective
 * reality. Changes of `state` objects are propagated to [peers]
 * tracking changes of certain [entries].
 *
 * In addition, the `blob` object may contain arbitrary binary
 * data. Each `blob` can be read as a stream.
 *
 * @todo
 * [Entries] can receive `action` objects in JSON format.
 *
 * @aliases entry entries data state statesOfEntries
 *
 * @class ose.lib.entry
 * @extends EventEmitter
 * @uses ose.lib.subject
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

/** lhs {{{2
 * State of shard
 *
 * @property lhs
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

/**
 * State of entry
 *
 * @property lhs
 * @type Object
 */

/** master {{{2
 * Reference to [client socket to master entry]
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

/** queuedState {{{2
 * Queued state
 *
 * @property queuedState
 * @type Object
 * @internal
 */

/** queueStateHandle {{{2
 * Timeout handle
 *
 * @property queueStateHandle
 * @type Number
 * @internal
 */

/** queueStateTimeout {{{2
 * Setup this property to enable set state queue.
 *
 * @property queueStateTimeout
 * @type Integer (milliseconds)
 */

/** slaveId {{{2
 * Last slave id
 *
 * @property slaveId
 * @type Number
 * @internal
 */

/** slaves {{{2
 * Contains all response sockets of slave entries
 *
 * @property slaves
 * @type Object
 * @internal
 */

/** dtc {{{2
 * Count of data trackers
 *
 * @property dtc
 * @type Number
 * @internal
 */

/** stc {{{2
 * Count of clients state trackers
 *
 * @property stc
 * @type Number
 * @internal
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
    throw O.error(shard, 'duplicitEntry', arguments);
  }

  O.super.call(this);
  this.setMaxListeners(O.consts.coreListeners);

  this.shard = shard;  // Containing shard.
  this.id = id;

  this.drev = 0;
  this.srev = 0;

  shard.cache[id] = this;
};

exports.identify = function() {  // {{{2
/**
 * Return identification object
 *
 * @return {Object} Identification object
 *
 * @method identify
 */

  return {
    id: this.id,
    sid: this.shard.sid,
    space: this.shard.space.name,
  };
};

exports.isIdentified = function(ident) {  // {{{2
/**
 * Test whether entry is identified by ident.
 *
 * @param ident {Object} Entry identification
 *
 * @return {Boolean}
 *
 * @method isIdentified
 */

  return this.shard.isIdentified(ident) &&
    this.id === ident.id
  ;
};

exports.getCaption = function() {  // {{{2
/**
 * Return entry caption
 *
 * @return {String} Entry caption
 *
 * @method getCaption
 */

  return this.kind && this.kind.getCaption(this) || this.id;
};

exports.post = function(name, data, socket) {  // {{{2
/**
 * Post a command to be executed on the entry at its home.
 *
 * @param name {String} Command name
 * @param [data] {*} Data to be sent
 * @param [socket] {Object} Client socket
 *
 * @method post
 */

//  console.log('ENTRY POST', this.id, name, data);

  if (! L.canClose(socket)) {
    throw O.error(this, 'Socket is invalid', socket);
  }

  var that = this;

  switch (this.lhsHome(socket)) {
  case undefined:
    return;
  case LHS.AT_HOME:
    setTimeout(function() {
      that.command(name, data, socket);
    }, 0);
    return;
  case LHS.CLOSED:
    this.shard.send(this.id, name, data, socket);
    return;
  case LHS.LINKING:
    this.once('lhs', function() {
      if (L.canClose(socket)) {
        that.post(name, data, socket)
      }
    });
    return;
  case LHS.WAITING:
    L.error(socket, O.error(this, 'DISCONNECTED', 'Entry home is not reachable'));
    return;
  case LHS.MASTER:
  case LHS.HOME:
    L.send(this.master, 'command', {name: name, data: data}, socket);
    return;
  }

  throw O.error(this, 'Invalid entry\'s lhs', this.lhs);
};

exports.postTo = function(ident, name, data, socket) {  // {{{2
/**
 * Post a command to a target's entry home
 *
 * @param ident {String|Object} Target entry id identification object
 * @param name {String} Command name
 * @param [data] {*} Data to be sent
 * @param [socket] {Object|Function}
 *
 * @method postTo
 */

//  console.log('ENTRY POST TO', ident, name, data);

  if (! L.canClose(socket)) {
    throw O.error(this, 'Socket is invalid', socket);
  }

  switch (typeof ident) {
  case 'number':
  case 'string':
    // `ident` is at same `shard` and is identified by `id`

    if (ident === this.id) {  // `ident` === `this`
      this.post(name, data, socket);
      return;
    }

    this.shard.post(ident, name, data, socket);
    return;
  case 'object':
    if (ident instanceof C) {
      // `ident` is entry instance
      ident.post(name, data, socket);
      return;
    }

    if (! ident.id) break;

    // `ident` can be in a different shard
    findShard(this.shard, ident, function(err, shard) {
      if (! L.canClose(socket)) return;
      if (err) {
        L.error(socket, err, true);
        return;
      }

      shard.post(ident.id, name, data, socket);
      return;
    });
    return;
  }

  throw O.error(this, '`ident` is not entry identification', ident);
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

exports.setState = function(patch, src) {  // {{{2
/**
 * Change entry "state". Can be called only in the home. `patch` is
 * altered (unchanged keys are removed).
 *
 * @param patch {Object} Data object
 * @param [src] {Object} Source of a change
 *
 * @method setState
 */

//  console.log('SET STATE', this.identify(), this.lhs, patch);
//  console.log(JSON.stringify(patch));

  if (typeof patch !== 'object') {
    throw O.error(this, 'State change must be an object', patch);
  }

  if (this.lhs !== LHS.AT_HOME) {
    switch (this.lhsInited(O._.noop)) {
    case undefined:
      return;
    case false:
      if (this.shard.isAtHome()) {
        this.patchState(O.nextTime(), patch, src || O.here.name);
        return;
      }
      // NO BREAK
    case true:
      throw O.error(this, '`entry.setState()` can be called only at home', patch);
    }
  }

  /*
  if (typeof this.queueStateTimeout === 'number') {
    if (this.queueStateHandle) {
      mergeQueue(this.queuedState, patch, this.state);
      return;
    }

    queueState(this, patch);
    return;
  }
  */

  clean(patch, this.state);
  if (O._.isEmpty(patch)) return

  this.patchState(O.nextTime(), patch, src || O.here.name);

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
    O.log.unhandled('Invalid this.kind', this.shard.alias, this.id);
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

exports.findShard = function(ident, cb) {  // {{{2
/**
 * Find a shard relative to this entry
 *
 * @ident {Object|String|Number} Entry identification
 * @cb {Function(err, shard)} Callback to be executed when shard is found
 *
 * @method findShard
 * @async
 */

  if (typeof cb !== 'function') {
    throw O.error(this, '`cb` must be a function', cb);
  }

  switch (typeof ident) {
  case 'number':
  case 'string':
    // `ident` is at same `shard` and is identified by `id`
    cb(null, this.shard);
    return;
  case 'object':
    findShard(this.shard, ident, cb);
    return;
  }

  cb(O.error(this, '`ident` is not entry identification', ident));
  return;
};

exports.find = function(ident, cb) {  // {{{2
/**
 * Find a sibling entry.
 *
 * @param ident {Object|String|Number} Entry identification
 * @param cb {Function (err, entry)} Callback
 *
 * @method find
 * @async
 */

  if (typeof cb !== 'function') {
    throw O.error(this, '`cb` must be a function', cb);
  }

  switch (typeof ident) {
  case 'number':
  case 'string':
    // `ident` is at same `shard` and is identified by `id`
    this.shard.get(ident, cb);
    return;
  case 'object':
    findShard(this.shard, ident, function(err, shard) {
      if (err) {
        cb(err);
        return;
      }

      shard.get(ident.id, cb);
      return;
    });
    return;
  }

  cb(O.error(this, '`ident` is not entry identification', ident));
  return;
};

exports.link = function(drev, srev, socket) {  // {{{2
/**
 * Establishes a [link] to the current entry.
 *
 * @param [drev] {Number} Known data revision. Whether to track the entry data changes.
 * @param [srev] {Number} Known state revision. Whether to track the entry state changes.
 * @param socket {Object} Client socket to be linked to an entry
 *
 * @method link
 * @async
 */

//  console.log('ENTRY LINK SLAVE', this.id, drev, srev);

  // Process arguments
  switch (arguments.length) {
  case 1:
    socket = drev;
    drev = true;
    break;
  case 2:
    socket = srev;
    srev = undefined;
    break;
  case 3:
    break;
  default:
    throw O.error(this, 'Invalid argument count', arguments);
  }
  if (! L.canOpen(socket)) {
    throw O.error(this, 'Socket can\'t be opened', socket);
  }

  this._link(drev, srev, socket);
  return;
};

exports.linkTo = function(ident, drev, srev, socket) {  // {{{2
/**
 * Establish a new [link] to an [entry] identified by `ident`.
 *
 * @param ident {Object|String|Number} Entry identification
 * @param [drev] {Number} Known data revision. Whether to track the entry data changes.
 * @param [srev] {Number} Known state revision. Whether to track the entry state changes.
 * @param socket {Object} Client socket to be linked to an entry
 *
 * @method linkTo
 * @async
 */

//  console.log('ENTRY LINK TO', ident, drev, srev, typeof socket);
//  console.trace();

  // Process arguments
  switch (arguments.length) {
  case 2:
    socket = drev;
    drev = true;
    break;
  case 3:
    socket = srev;
    srev = undefined;
    break;
  case 4:
    break;
  default:
    throw O.error(this, 'Invalid argument count', arguments);
  }
  if (! L.canOpen(socket)) {
    throw O.error(this, 'Socket can\'t be opened', socket);
  }

  var that = this;

  switch (typeof ident) {
  case 'string':
  case 'number':
    checkShard(this.shard, ident);
    return;
  case 'object':
    if (ident instanceof C) {
      ident._link(drev, srev, socket);
      return;
    }

    if (! ident.id) {
      cb(O.error(this, 'Invalid entry `ident`', ident));
      return;
    }

    findShard(this.shard, ident, function(err, shard) {
      if (! L.canOpen(socket)) return;
      if (err) {
        L.error(socket, err);
        return;
      }

      checkShard(shard, ident.id);
      return;
    });
    return;
  }

  L.error(socket, O.error(this, '`ident` is not entry identification', ident));
  return;

  function checkShard(shard, id) {  // {{{3
    if (id in shard.cache) {
      shard.cache[id]._link(drev, srev, socket);
    } else {
      shard._link(id, drev, srev, socket);
    }
  }

  // }}}3
};

// }}}1
// Internal {{{1
exports.cleanup = function() {  // {{{2
/**
 * Remove entry from shard's cache.
 *
 * @method cleanup
 * @internal
 */

//  console.log('ENTRY CLEANUP', this.id, this._err);

  this.kind && this.kind.cleanup && this.kind.cleanup(this);

  if (this.slaves) {
    for (var key in this.slaves) {
      L.close(this.slaves[key]);
    }
    delete this.slaves;
//    delete this.dtc;
//    delete this.stc;
  }

  if (this.master) {
    L.close(this.master, null);
  }

  if (this.queueStateHandle) {
    clearTimeout(this.queueStateHandle);
    delete this.queueStateHandle;
    delete this.queuedState;
  }

  delete this.data;
  delete this.drev;
  delete this.state;
  delete this.srev;
  delete this.kind;

  delete this.shard.cache[this.id];
  delete this.shard;
};

exports.error = function(err) {  // {{{2
/**
 * Remove entry from shard's cache with error.
 *
 * @param err {Object} Error
 *
 * @return err {Object} Error
 *
 * @method error
 * @internal
 */

  if (! (err instanceof Error)) {
    err = O.error.apply(O, arguments);
  }

  switch (err.code) {
  case 'ENTRY_DELETED':
    this.remove(LHS.DELETED, err);
    return err;
  case 'ENTRY_NOT_FOUND':
    this.remove(LHS.NOT_FOUND, err);
    return err;
  }

  this.remove(LHS.ERROR, err);
  return err;
};

exports.setup = function(kind) {  // {{{2
/**
 * Setup entry kind and call `homeInit()` of the kind if at home.
 *
 * @param kind {String|Object} Kind of entry
 *
 * @method setup
 * @internal
 */

  switch (typeof kind) {
  case 'string':
    kind = this.shard.scope.kinds[kind];
    // NO BREAK
  case 'object':
    if (kind instanceof Kind) {
      this.kind = kind;
      break;
    }
    // NO BREAK
  default:
    this.error(this, 'Invalid kind', {kind: kind});
    return false;
  }

  if (this.shard.isAtHome()) {
    this.kind.doHomeInit(this);

    if (this.data && ! this.drev) this.drev = O.nextTime();
    if (this.state && ! this.srev) this.srev = O.nextTime();
  }

  return true;
};

exports.command = function(name, data, socket) {  // {{{2
/**
 * Execute a command on the current entry
 *
 * @param name {String} Command name
 * @param data {*} Data to be sent
 * @param socket {Object} Client socket
 *
 * @method command
 * @internal
 */

//  console.log('ENTRY COMMAND', this.id, name, data);

  var that = this;

  if (! L.canClose(socket)) {
    // Socket is invalid or can't be closed, exit silently
    return;
  }

  if (this.lhs !== LHS.AT_HOME) {
    L.error(socket, O.error(this, 'Not at entry\'s home', {name: name, data: data}));
    return;
  }

  if (call(this.commands)) return;
  if (call(this.kind.commands)) return;

  L.error(socket, O.error(this, 'UNKNOWN_COMMAND', 'Entry has no handler for the following command', {name: name, data: data}));
  return;

  function call(commands) {
    if (! commands) return false;

    var cmd = commands[name];

    switch (typeof (cmd || undefined)) {
    case 'undefined':
      return false;
    case 'string':
      that.kind.O.new(cmd)(that, data, socket);
      return true;
    case 'function':
      cmd.call({entry: that}, data, socket);
      return true;
    }

    L.error(socket, O.error(that, 'Invalid command', {name: name, data: data}));
    return true;
  }
};

exports.firstSlave = function(drev, srev) {  // {{{2
/**
 * @internal
 * @method firstSlave
 */

  if (this.slaves || this.dtc || this.stc) {
    throw O.error(this, 'Trying to create first slave, but there are tracking requests', {dtc: this.dtc, stc: this.stc});
  }

  this.dtc = drev ? 1 : 0;
  this.stc = srev ? 1 : 0;
  this.slaveId = 1;
  this.slaves = {};
};

exports.checkSlaves = function(drev, srev) {  // {{{2
/**
 * Check, whether there is a demand to track the master or not. If so, do that.
 *
 * @internal
 * @method checkSlaves
 */

  if (O._.isEmpty(this.slaves)) {
    delete this.slaves;
  }

  if (! L.canSend(this.master)) return;

  if (! (this.slaves || this.dtc || this.stc)) {
//    console.log('ENTRY CLOSING MASTER', this.id);
    L.close(this.master);
    return;
  }

  var dc = drev && ! this.dtc ? -1 : 0;
  var sc = srev && ! this.stc ? -1 : 0;

  if (! dc && ! sc) return;

  this.trackMaster(dc, sc, O._.noop);
  return;
};

exports._link = function(drev, srev, socket) {  // {{{2
/**
 * Establish link to already created entry.
 *
 * @method _link
 * @internal
 */

  var that = this;

  switch (this.lhsHome(socket)) {
  case undefined:
    return;
  case LHS.WAITING:
  case LHS.AT_HOME:
    add();
    return;
  case LHS.CLOSED:
    this.setLhs(LHS.LINKING);
    this.firstSlave(drev, srev);
    this.shard.lhsLink(onShard);
    return;
  case LHS.LINKING:
    this.once('lhs', function() {
      if (L.canOpen(socket)) {
        that._link(drev, srev, socket);
      }
    });
    return;
  case LHS.MASTER:
  case LHS.HOME:
    link();
    return;
  }

  throw O.error(this, 'Invalid `lhs`', this.lhs);

  function link() {  // {{{3
    var dc = drev && ! that.dtc ? 1 : 0;  // Whether to newly track data
    var sc = srev && ! that.stc ? 1 : 0;  // Whether to newly track state

    if (! dc && ! sc) {
      add();
      return;
    }

    if (that.slaves) {
      that.track(drev ? 1 : 0, srev ? 1 : 0);
    } else {
      that.firstSlave(drev, srev);
    }

    that.trackMaster(dc, sc, function() {
      if (! check()) {
        new Slave(that, ++that.slaveId, drev, srev, socket);
      }
    });
    return;
  }

  function onShard(err, lhs) {  // {{{3
    if (check()) return;

    switch (lhs) {
    case LHS.MASTER:
    case LHS.HOME:
      that.once('lhs', onMaster);
      new Master(that);
      return;
    case LHS.AT_HOME:
    case LHS.WAITING:
      new Slave(that, ++that.slaveId, drev, srev, socket);
      return;
    }

    throw O.error(that, 'Invalid `entry.lhs`', that.lhs);
  }

  function onMaster(err) {  // {{{3
    if (! check()) {
      new Slave(that, ++that.slaveId, drev, srev, socket);
    }
  }

  function check() {  // {{{3
    if (! L.canOpen(socket)) {
      that.track(drev ? -1 : 0, srev ? -1 : 0);
      that.checkSlaves(drev, srev);
      return true;
    }

    if (that.isRemoved()) {
      that.track(drev ? -1 : 0, srev ? -1 : 0);
      that.checkSlaves(drev, srev);
      L.error(socket, that._err || err || O.error(that, 'Entry was removed'));
      return true;
    }

    return false;
  }

  function add() {  // {{{3
    if (that.slaves) {
      that.track(drev ? 1 : 0, srev ? 1 : 0);
      new Slave(that, ++that.slaveId, drev, srev, socket);
    } else {
      that.firstSlave(drev, srev);
      new Slave(that, 1, drev, srev, socket);
    }
  }

  // }}}3
};

exports.respond = function(drev, srev) {  // {{{2
/**
 * Creates a response with `entry.data` or `entry.state`.
 *
 * @returns {Object} Response object
 *
 * @method respond
 * @internal
 */

  if (! this.kind) {
    return {
      id: this.id,  // TODO remove `id` from communication, it's unnecessary
      home: false,
    };
  }

  var resp = {
    id: this.id,  // TODO remove `id` from communication, it's unnecessary
    home: this.lhs === LHS.AT_HOME || this.lhs === LHS.HOME,
  };

  if (drev === true) {
    resp.kind = this.kind.name;
  }

  if (drev && drev !== this.drev) {
    resp.drev = this.drev;
    resp.data = this.data;
  }

  if (srev && srev !== this.srev) {
    resp.srev = this.srev;
    resp.state = this.state;
  }

//  console.log('RESPOND', this.id, drev, srev, resp);

  return resp;
};

exports.trackMaster = function(dc, sc, cb) {  // {{{2
/**
 * Update entry tracking. Master must be connected. Call `cb()` after
 * successful tracking was setup and entry was updated or on error.
 *
 * @method trackMaster
 * @internal
 */

  if (! this.master) {
    throw O.error(this, '`entry.master` must be defined');
  }

  var that = this;

  var r = {};
  switch (dc) {
  case 0:
    break;
  case -1:
    r.drev = false;
    break;
  case 1:
    r.drev = that.drev || true;
    break;
  default:
    throw O.error(this, 'Invalid dc, can be `-1`, `0` or `1`', dc);
  }
  switch (sc) {
  case 0:
    break;
  case -1:
    r.srev = false;
    break;
  case 1:
    r.srev = that.srev || true;
    break;
  default:
    throw O.error(this, 'Invalid sc, can be `-1`, `0` or `1`', sc);
  }

  this.master.tracking = this.lhs;
  this.setLhs(LHS.TRACKING);

  L.send(this.master, 'track', r, function(err, resp) {
    if (resp) {
      if (resp.drev) {
        that.updateData(resp.drev, resp.data, 'track');
      }
      if (resp.srev) {
        that.updateState(resp.srev, resp.state, 'track');
      }
    }

    if (that.lhs === LHS.TRACKING) {
      if (! that.master || typeof that.master.tracking !== 'number') {
        throw O.error(that, 'Entry state is LHS.TRACKING, but master has no `tracking`');
      }
      var t = that.master.tracking;
      delete that.master.tracking;
      that.setLhs(t);
    }

    cb(err);
  });
};

exports.track = function(data, state, cb) {  // {{{2
/**
 * Method called when data or state changes should be tracked.
 *
 * @param data {Number} Delta of data tracking count
 * @param state {Number} Delta of state tracking count
 * @param cb {Function} Function to be called after setup tracking
 *
 * @method tracked
 * @internal
 */

  this.dtc += data;
  this.stc += state;

  if (this.dtc < 0) {
    throw O.error(this, 'Invalid data track count `dtc`', {dtc: this.dtc, data: data});
  }
  if (this.stc < 0) {
    throw O.error(this, 'Invalid state track count `stc`', {stc: this.stc, state: state});
  }

//  console.log('ENTRY TRACK', this.id, 'sum: ', {data: this.dtc, state: this.stc}, 'change: ', {data: data, state: state});
};

exports.linkMaster = function(cb) {  // {{{2
/**
 * Establish a link to the master entry.
 * Calls `cb(err)` after a entry changes `lhs`.
 *
 * Expects:
 * - typeof `cb` === 'function'
 * - entry has no master and is valid
 *
 * @param [cb] {Function} Callback
 *
 * @method linkMaster
 * @internal
 * @async
 */

//  console.log('ENTRY LINK MASTER', {this: this.id, master: typeof this.master, cb: typeof cb});

  switch (this.lhs) {
  case LHS.WAITING:
  case LHS.CLOSED:
    break;
  default:
    throw O.error(this, 'Invalid `entry.lhs` in `entry.linkMaster()', this.lhs);
  }

  this.setLhs(LHS.LINKING);
  cb && this.once('lhs', cb);
  new Master(this);
};

exports.patchData = function(rev, patch, src) {  // {{{2
/**
 * @method patchData
 * @internal
 */

//  console.log('ENTRY PATCH DATA', patch, this.data);

  this.drev = rev;

  if (! this.data) this.data = {};
  merge(this.data, patch);

  O.log.debug('Data patched', JSON.stringify({entry: this.id, patch: patch}));

  this.emit('data', patch, src);

  if (this.slaves) for (var key in this.slaves) {
    L.send(this.slaves[key], 'patch', {drev: rev, dpatch: patch, src: src}, null, true);
  }
};

exports.updateData = function(rev, val, src) {  // {{{2
/**
 * Update this entry data.
 *
 * @method updateData
 * @internal
 */

  if (this.drev === rev) return;

  diff(val, this.data);
  this.patchData(rev, val, src);
  return;
};

exports.patchState = function(rev, patch, src) {  // {{{2
/**
 * Patch entry state. Update `entry.state` and `entry.srev`.
 *
 * @method patchState
 * @internal
 */

//  console.log('ENTRY PATCH STATE', patch);

  this.srev = rev;

  if (! this.state) this.state = {};
  merge(this.state, patch);

  O.log.debug('State patched', JSON.stringify({entry: this.id, state: patch}));

  this.emit('state', patch, src);

  if (this.slaves) for (var key in this.slaves) {
    L.send(this.slaves[key], 'patch', {srev: rev, spatch: patch, src: src}, null, true);
  }
};

exports.updateState = function(rev, val, src) {  // {{{2
/**
 * Update this entry state.
 *
 * @method updateState
 * @internal
 */

  if (this.srev === rev) return;

  diff(val, this.state);
  this.patchState(rev, val, src);
  return;
};

// }}}1
// Private {{{1
function findShard(shard, ident, cb) {  // {{{2
  if (('space' in ident) && (ident.space !== shard.space.name)) {
    O.findShard(ident, cb);
    return;
  }

  if ('sid' in ident) {
    shard.space.getShard(ident.sid, cb);
    return;
  }

  shard.space.findShard(ident, cb);
  return;
};

function queueState(that, data) {  // {{{2
  if (that.queuedState) {
    O.log.unhandled('State is already queued', that.queuedState);
    return;
  }

  that.queuedState = data;

  that.queueStateHandle = setTimeout(function() {
    var patch = that.queuedState;

    delete that.queueStateHandle;
    delete that.queuedState;

    clean(patch, that.state);
    if (O._.isEmpty(patch)) return

    that.patchState(O.nextTime(), patch, O.here.name);
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

      if (O._.isEqual(value, orig[key])) {
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
  if (typeof data !== 'object' || typeof orig !== 'object') {
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

  return O._.isEmpty(data);
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
    var s = src[key];

    if (s === null) {
      dst[key] = null;
      continue;
    }

    var d = dst[key];

    if (d && typeof d === 'object' && typeof s === 'object') {
      mergeQueue(d, s, orig && orig[key]);
      continue;
    }

    if (d === null && orig && typeof orig[key] === 'object') {
      mergeClean(dst[key] = {}, s, orig[key]);
    } else {
      dst[key] = s;
    }
  }
};

// }}}1
