'use strict';

var O = require('ose').class(module, C, 'EventEmitter');
O.prepend('../subject');

var Diff = require('../diff');
var Kind = O.class('../kind');
var Slave = O.class('./slave');
var L = O.link;

/** Doc {{{1
 * @submodule ose.data
 */

/**
 * @caption Entry class
 *
 * @readme
 *
 * An [Entry] instance is a data structure representing a physical
 * object or logical concept. Each [entry] belongs to a certain
 * [shard]. Within the [shard], it has a unique `id`. Each [entry] is
 * of a certain [kind] that defines its behaviour.
 *
 * An [entry] can contain a data value `dval` object in JSON format (analogous to
 * a database table row). At the moment, `dval` is defined at the
 * start-up of an [OSE instance] and are immutable. Data management
 * and persistence are planned features.
 *
 * The `sval` JSON object, unlike `dval`, can
 * often change and is non-persistent by design because it reflects
 * changing objective reality. Changes of `sval` objects are
 * propagated to [peers] tracking changes of certain [entries].
 *
 * The `dval` and `sval` objects can contain any valid JSON excluding
 * `null`, which is used for deleting keys during patching.
 *
 * In addition, the `blob` object may contain arbitrary binary
 * data. Each `blob` can be read as a stream.
 *
 * @todo
 * [Entries] can receive `action` objects in JSON format.
 *
 * @aliases entry entries dval data sval state statesOfEntries
 *
 * @class ose.lib.entry
 * @extends EventEmitter
 * @uses ose.lib.subject
 * @type class
 */

/** kind {{{2
 * Reference to [entry kind]
 *
 * @property kind
 * @type Object
 */

/** drev {{{2
 * Id of transaction last updating `dval`
 *
 * @property drev
 * @type Number
 */

/** dval {{{2
 * Persistent data value
 *
 * @property dval
 * @type Object
 */

/** master {{{2
 * Reference to [client socket to master entry]
 *
 * @property master
 * @type Object
 */

/** srev {{{2
 * Timestamp in microseconds of last sval update
 *
 * @property srev
 * @type Number
 */

/** sval {{{2
 * Non-persistent data
 *
 * @property sval
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
 * Count of dval trackers
 *
 * @property dtc
 * @type Number
 * @internal
 */

/** stc {{{2
 * Count of sval clients trackers
 *
 * @property stc
 * @type Number
 * @internal
 */

// }}}1
// Public {{{1
function C(shard, eid) {  // {{{2
/**
 * Entry constructor
 *
 * @param shard {Object} Entry owner shard instance
 * @param eid {Number} Entry id
 *
 * @method constructor
 */

  O.super.call(this);

  this.setMaxListeners(O.consts.coreListeners);

  this._state = O.subjectState.INIT;

  this.shard = shard;  // {{{3
  /**
   * Reference to containing [shard]
   *
   * @property shard
   * @type Object
   */

  this.id = eid;  // {{{3
  /**
   * Unique id of entry within containing [shard]
   *
   * @property id
   * @type Integer
   */

  // }}}3

  if (eid in shard.cache) {
    throw O.log.error(this, 'Duplicit eid', eid);
  }

  shard.cache[eid] = this;
};

exports.Master = O.class('./master');  // {{{2

exports.toString = function() {  // {{{2
/**
 * Return short description
 *
 * @return {String} Description
 *
 * @method toString
 */

  return 'Entry: ' + (this.data && this.data.alias ? this.data.alias + ' ' : '') + this.id + ' ' + this.shard.toString();
};

exports.identify = function(sibling) {  // {{{2
/**
 * Return identification object
 *
 * @return {Object} Identification object
 *
 * @method identify
 */

  if (sibling) {
    if (this.shard === sibling.shard) return this.id;
    if (this.shard.space === sibling.shard.space) return [this.id, this.shard.id];
  }

  if (this.shard.space === O.here.space) return [this.id, this.shard.id];

  return [this.id, this.shard.id, this.shard.space.name];
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

  if (! ident) return false;

  switch (typeof ident) {
  case 'number':
    return this.id === ident;
  case 'string':
    return ident && this.data && this.data.alias === ident;
  case 'object':
    if (Array.isArray(ident)) {
      switch (ident.length) {
      case 2:
        return this.id === ident[0] && this.shard.id === ident[1];
      case 3:
        return this.id === ident[0] && this.shard.id === ident[1] && this.shard.space.name === ident[2];
      }
      return false;
    }

    if (ident.space && ident.space !== this.shard.space.name) return false;

    return ident.shard && ident.shard !== this.shard.alias && ident.entry && this.data && this.data.alias === ident.entry;
  }

  return false;
};

exports.getCaption = function() {  // {{{2
/**
 * Return entry caption
 *
 * @return {String} Entry caption
 *
 * @method getCaption
 */

  var res = this.kind && this.kind.getCaption(this);
  if (res) return res;

  if (this._trans) {
    return 'new ' + this.kind.name;
  }

  return this.id;
};

exports.isAtHome = function() {  // {{{2
/**
 * Check whether we are running in entry`s [home].
 *
 * @returns {Boolean}
 *
 * @method isAtHome
 */

  return this.shard.isAtHome();
};

exports.track = function(socket) {  // {{{2
/**
 * Establishes a [link] to the current entry.
 *
 * @param socket {Object} Client socket to be linked to an entry
 *
 * @method track
 * @async
 */

//  console.log('ENTRY LINK SLAVE', this.id, drev, srev);

  if (socket === undefined) {
    socket = O.new('EventEmitter')();
  } else {
    if (! L.canOpen(socket)) {
      throw O.log.error(this, 'Socket can\'t be opened', socket);
    }
  }

  if (this.shard.isAtHome()) {
    this.openLink(socket);
    return socket;
  }

  var that = this;

  this.awaitSteadyMaster(function(err) {
    if (! L.canClose(socket)) return;
    if (err) return L.error(socket, err);

    return that.openLink(socket);
  });

  return socket;
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
    throw O.log.error(this, 'Socket is invalid', socket);
  }

  var that = this;

  var async = this.awaitReady(function(err) {
    if (err) return L.error(socket, err);

    if (that.shard.isAtHome()) {
      if (async) {
        return that.command(name, data, socket);
      }

      O.async.setImmediate(function() {
        that.command(name, data, socket);
      });
      return true;
    }

    return that.shard.sendMaster('command', {entry: that.id, name: name, data: data}, socket);
  });
  return async;
};

exports.setState = function(patch, src) {  // {{{2
/**
 * Change entry `sval`. Can be called only in the home. `patch` is
 * altered (unchanged keys are removed).
 *
 * @param patch {*} State patch
 * @param [src] {TODO} Source of a change
 *
 * @method setState
 */

  if (! this.shard.isAtHome()) {
    throw O.log.error(this, '`entry.setState()` can be called only at home', patch);
  }

  var patch = {sval: patch};

  if (this._state === O.subjectState.INIT) {
    Diff.cleanPatch(patch, this);
    this.srev = O.nextTime();
    return Diff.merge(this, patch);
  }

  return this.awaitReady(function(err, that) {
    if (err) return;

    Diff.cleanPatch(patch, that);
    if ('sval' in patch) {
      that.patchState(O.nextTime(), patch.sval, src || O.here.name);
    }

    return;
  });

  /*
  if (typeof this.queueStateTimeout === 'number') {
    if (this.queueStateHandle) {
      mergeQueue(this.queuedState, patch, this.sval);
      return;
    }

    queueState(this, patch);
    return;
  }
  */

  /*
  clean(patch, this.sval);

  if (O._.isEmpty(patch)) return

  this.patchState(O.nextTime(), patch, src || O.here.name);

  return;
  */
};

exports.onStates = function(handlers) {  // {{{2
/**
 * Register sval change handlers
 *
 * @param handlers {Object} Handlers object
 *
 * @method onStates
 */

  var that = this;

  this.on('sval', function(val) {
    for (var key in val) {
      if (key in handlers) {
        handlers[key](that, val[key], val);
      }
    }
  });
};

// }}}1
// Internal {{{1
exports.inMap = function(params) {  // {{{2
/**
 * Tests whether entry belongs to map.
 *
 * TODO: Consider renaming method to isInMap.
 *
 * @param params {Object} Object containing parameters
 *
 * @return {Boolean}
 *
 * @method inMap
 */

  if (! this.kind) {
    O.log.unhandled('Invalid this.kind', this.shard.alias, this.id);
  }

  if (params.kind && (this.kind.name !== params.kind)) return false;

  if (params.filter) {  // TODO dval structure is not known at this place
    if (params.filter.master && this.dval.master !== params.filter.master) return false;
    if (params.filter.parent && this.dval.parent !== params.filter.parent) return false;
  }

  if (this.kind.inMap) {
    return this.kind.inMap(this, params);
  }

  return true;
};

exports.cleanup = function() {  // {{{2
/**
 * Remove entry from shard's cache.
 *
 * @method cleanup
 * @internal
 */

//  console.log('ENTRY CLEANUP', this.id, this._err);

  this.kind && this.kind.cleanup && this.kind.cleanup(this);

  if (this.shard.cache && this.shard.cache[this.id] === this) {
    delete this.shard.cache[this.id];
  }

  /*
  if (this.queueStateHandle) {
    clearTimeout(this.queueStateHandle);
    delete this.queueStateHandle;
    delete this.queuedState;
  }

  delete this.dval;
  delete this.drev;
  delete this.sval;
  delete this.srev;
  delete this.kind;

  delete this.shard;
  */
};

exports.setupKind = function(kind, rev, val) {  // {{{2
/**
 * Setup entry kind.
 *
 * @param kind {String|Object} Kind of entry
 *
 * TODO: params
 *
 * @result {Boolean} Whether setup was successful or not
 *
 * @method setupKind
 * @internal
 */

  switch (typeof kind) {
  case 'string':
    kind = this.shard.scope.kinds[kind];
    // NO BREAK
  case 'object':
    if (kind instanceof Kind) {
      this.kind = kind;
      this.drev = rev;
      this.dval = val;

      return true;
    }
    // NO BREAK
  default:
    this.remove(this, 'Invalid kind', {kind: kind});
    return false;
  }
};

exports.setup = function() {  // {{{2
/**
 * Setup entry and call `homeInit()` of the kind if at home.
 *
 * @method setup
 * @internal
 */

  if (this._state !== O.subjectState.INIT) {
    throw O.log.error(this, 'UNEXPECTED_STATE', 'INIT state expected');
  }

  if (this.shard.isAtHome()) {
    this.kind.doHomeInit(this);
  }

  this.setReady();
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

  if (! this.shard.isAtHome()) {
    return L.error(socket, O.error(this, 'Not at entry\'s home', {name: name, data: data}));
  }

  return this.awaitReady(function(err) {
    if (socket && ! L.canClose(socket)) return;
    if (call(that.commands)) return;
    if (call(that.kind.commands)) return;

    L.error(socket, O.error(that, 'UNKNOWN_COMMAND', 'Entry has no handler for the command', {name: name, data: data}));
    return;
  });

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

exports.respond = function(drev, srev) {  // {{{2
/**
 * Creates a response with `entry.dval` or `entry.sval`.
 *
 * @returns {Object} Response object
 *
 * @method respond
 * @internal
 */

  if (! this.kind) {
    throw O.log.error(this, 'Respond can be called only on already set up entries');
  }

  var resp = {
    eid: this.id,
    kind: this.kind.name,
    home: this.shard.isAtHome(),
  };

  if (drev && drev !== this.drev) {
    resp.drev = this.drev;
    resp.dval = this.dval;
  }

  if (srev && srev !== this.srev) {
    resp.srev = this.srev;
    resp.sval = this.sval;
  }

  console.log('RESPOND', this.toString(), resp);

  return resp;
};

exports.patchData = function(rev, patch, src, cb) {  // {{{2
/**
 * @method patchData
 * @internal
 */

  if (! this.dval) this.dval = {};

  this.drev = rev;
  Diff.merge(this, {dval: patch});

  O.log.debug('Data patched', JSON.stringify({entry: this.id, patch: patch}));

  cb && cb();

  this.emit('dpatch', patch, src);

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

  Diff.diff(val, this.dval);
  this.patchData(rev, val, src);
  return;
};

exports.patchState = function(rev, patch, src) {  // {{{2
/**
 * Patch entry.sval. Update `entry.sval` and `entry.srev`.
 *
 * @method patchState
 * @internal
 */

  O.log.debug('Patching state', JSON.stringify({entry: this.dval && this.dval.alias || this.id, state: patch}));

  this.srev = rev;
  Diff.merge(this, {sval: patch});
  this.emit('sval', patch, src);

  if (this.slaves) for (var key in this.slaves) {
    L.send(this.slaves[key], 'patch', {srev: rev, spatch: patch, src: src}, null, true);
  }
};

exports.updateState = function(rev, val, src) {  // {{{2
/**
 * Update this entry.sval.
 *
 * @method updateState
 * @internal
 */

  if (this.srev === rev) return;

  Diff.diff(val, this.sval);
  this.patchState(rev, val, src);
  return;
};

exports.openLink = function(socket) {  // Open slave tracking request, entry must be at home or synchronized with master {{{2
  if (! L.canClose(socket)) return;

  var resp = this;

  if (socket._ws) {
    resp = {
      kind: this.kind.name,
      home: this.shard.isAtHome() || this.masterState === O.masterState.HOME,
      brev: this.brev,
      drev: this.drev,
      dval: this.dval,
      srev: this.srev,
      sval: this.sval,
    };
  }

  return L.open(new Slave(this), socket, resp);
};

// }}}1
// Private {{{1
function queueState(that, val) {  // {{{2
  throw O.log.todo();
  /*
  if (that.queuedState) {
    O.log.unhandled('State is already queued', that.queuedState);
    return;
  }

  that.queuedState = val;

  that.queueStateHandle = setTimeout(function() {
    var patch = that.queuedState;

    delete that.queueStateHandle;
    delete that.queuedState;

    clean(patch, that.sval);
    if (O._.isEmpty(patch)) return

    that.patchState(O.nextTime(), patch, O.here.name);
  }, that.queueStateTimeout);
  */
};

// }}}1



/* OBSOLETE {{{1
exports._link = function(drev, srev, socket) {  // {{{2
/ **
 * Establish link to already created entry. Entry is in `"BUSY"` state.
 *
 * @method linkBusy
 * @internal
 * /

  var that = this;
  var slave = new Slave(this, drev, srev);

  return this.awaitMaster(function(err) {
    if (! L.canClose(socket)) socket = null;

    switch (that.state) {
    case O.subjectState.GONE:
      return L.error(socket, that.goneError());
    case O.subjectState.BUSY:
      that.setReady();
      return L.open(slave, socket, that.respond(drev, srev));
    case O.subjectState.INIT:
      if (err)
      that.setup();
      return L.open(slave, socket, that.respond(drev, srev));
    }

    throw O.log.error(this, '`subject._state` was unhandled', this._state);
  });
};

exports.findShard = function(ident, cb) {  // {{{2
/ **
 * Find a shard relative to this entry
 *
 * @ident {Object|String|Number} Entry identification
 * @cb {Function(err, shard)} Callback to be executed when shard is found
 *
 * @method findShard
 * @async
 * /

//  console.log('ENTRY FIND SHARD', ident);

  if (typeof cb !== 'function') {
    throw O.log.error(this, '`cb` must be a function', cb);
  }

  switch (typeof ident) {
  case 'number':
  case 'string':
    // Requested shard is the entry owning shard
    cb(null, this.shard);
    return;
  case 'object':
    findShard(this.shard, ident, cb);
    return;
  }

  cb(O.error(this, '`ident` is not entry identification', ident));
  return;
};

exports.postTo = function(ident, name, data, socket) {  // {{{2
/ **
 * Post a command to a target's entry home
 *
 * @param ident {String|Object} Target entry id identification object
 * @param name {String} Command name
 * @param [data] {*} Data to be sent
 * @param [socket] {Object|Function}
 *
 * @method postTo
 * /

//  console.log('ENTRY POST TO', ident, name, data);

  if (! L.canClose(socket)) {
    throw O.log.error(this, 'Socket is invalid', socket);
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

  O.link.error(socket, O.error(this, '`ident` is not entry identification', ident));
};

exports.find = function(ident, cb) {  // {{{2
/ **
 * Find an entry relative to this entry
 *
 * @param ident {Object|String|Number} Entry identification
 * @param cb {Function (err, entry)} Callback
 *
 * @method find
 * @async
 * /

  if (typeof cb !== 'function') {
    throw O.log.error(this, '`cb` must be a function', cb);
  }

  switch (typeof ident) {
  case 'number':  // requested entry is in the same shard and is identified by entry id
    this.shard.get(ident, cb);
    return;
  case 'string':  // requested entry is in the same shard and is identified by entry alias
    this.shard.findEntryAlias(ident, cb);
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

exports.linkTo = function(ident, drev, srev, socket) {  // {{{2
/ **
 * Establish a new [link] to an [entry] identified by `ident`.
 *
 * @param ident {Object|String|Number} Entry identification
 * @param [drev] {Number} Known dval revision. Whether to track the entry dval changes.
 * @param [srev] {Number} Known sval revision. Whether to track the entry.sval changes.
 * @param socket {Object} Client socket to be linked to an entry
 *
 * @method linkTo
 * @async
 * /

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
    throw O.log.error(this, 'INVALID_ARGS', arguments);
  }
  if (! L.canOpen(socket)) {
    throw O.log.error(this, 'Socket can\'t be opened', socket);
  }

  var that = this;

  switch (typeof ident) {
  case 'number':
    return this.shard.link(ident, drev, srev, socket);
  case 'string':
    return this.shard.findAlias(ident.eal, onEntry);
  case 'object':
    if (ident instanceof C) {
      return ident.link(drev, srev, socket);
    }

    if (! ident.id) {
      return cb(O.error(this, 'Invalid entry `ident`', ident));
    }

    return findShard(this.shard, ident, function(err, shard) {
      if (! L.canOpen(socket)) return;
      if (err) return L.error(socket, err);

      if (ident.eid) {
        return shard._link(ident.eid, drev, srev, socket);
      }

<<<<<<< 00cd178b4deca87509f8c014f0dad8395eb3223c
  var resp = {
    id: this.id,  // TODO remove `id` from communication, it's unnecessary
    home: this.lhs === LHS.AT_HOME || this.lhs === LHS.HOME,
    kind: this.kind.name,
  };

  if (drev && drev !== this.drev) {
    resp.drev = this.drev;
    resp.dval = this.dval;
  }
=======
      if (ident.eal) {
        return shard.findAlias(ident.eal, onEntry);
      }

      return L.error(socket, O.error(this, 'INVALID_IDENT', '`ident` is not entry identification', ident));
    });
  }

  return L.error(socket, O.error(this, 'INVALID_IDENT', '`ident` is not entry identification', ident));
>>>>>>> WIP: Database support

  function onEntry(err, entry) {
    if (! L.canOpen(socket)) return;
    if (err) return L.error(socket, err);

    if (that.shard.isAtHome) {
      return entry.openLink(drev, srev, socket);
    }

    return entry.linkRemote(drev, srev, socket);
  }
};

exports.trackMaster = function(dc, sc, cb) {  // {{{2
/ **
 * Update entry tracking. Master must be connected. Call `cb()` after
 * successful tracking was setup and entry was updated or on error.
 *
 * @method trackMaster
 * @internal
 * /

  if (! this.master) {
    throw O.log.error(this, '`entry.master` must be defined');
  }

  var r = {};
  var that = this;

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
    throw O.log.error(this, 'Invalid dc, can be `-1`, `0` or `1`', dc);
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
    throw O.log.error(this, 'Invalid sc, can be `-1`, `0` or `1`', sc);
  }

  return this.sendMaster('track', r, function(err, resp) {
    // TODO: lock entry and check drev and srev against `r.drev`, `r.srev`

    if (resp) {
      if (resp.drev) {
        that.updateData(resp.drev, resp.dval, 'track');
      }
      if (resp.srev) {
        that.updateState(resp.srev, resp.sval, 'track');
      }
    }

    return cb(err);
  });
};

exports.firstSlave = function(drev, srev) {  // {{{2
/ **
 * @internal
 * @method firstSlave
 * /

  if (this.slaves || this.dtc || this.stc) {
    throw O.log.error(this, 'Trying to create first slave, but there are tracking requests', {dtc: this.dtc, stc: this.stc});
  }

  this.dtc = drev ? 1 : 0;
  this.stc = srev ? 1 : 0;
  this.slaveId = 1;
  this.slaves = {};
};

exports.linkMaster = function(cb) {  // {{{2
/ **
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
 * /

//  console.log('ENTRY LINK MASTER', {this: this.id, master: typeof this.master, cb: typeof cb});

  switch (this.lhs) {
  case LHS.WAITING:
  case LHS.CLOSED:
    break;
  default:
    throw O.log.error(this, 'Invalid `entry.lhs` in `entry.linkMaster()', this.lhs);
  }

  this.setLhs(LHS.LINKING);
  cb && this.once('lhs', cb);
  new Master(this);
};

exports.checkSlaves = function(drev, srev) {  // {{{2
/ **
 * Check, whether there is a demand to track the master or not. If so, do that.
 *
 * @internal
 * @method checkSlaves
 * /

  if (O._.isEmpty(this.slaves)) {
    delete this.slaves;
  }

  if (! L.canSend(this.master)) return;

  if (! (this.slaves || this.dtc || this.stc)) {
//    console.log('ENTRY CLOSING MASTER', this.id);
    delete this.master.subject;
    L.close(this.master);
    return;
  }

  var dc = drev && ! this.dtc ? -1 : 0;
  var sc = srev && ! this.stc ? -1 : 0;

  if (dc || sc) {
    this.trackMaster(dc, sc, O._.noop);
  }

  return;
};

exports.track = function(dd, sd) {  // {{{2
/ **
 * Method called when data or state changes should be tracked.
 *
 * @param dd {Number} Delta of dval tracking count
 * @param sd {Number} Delta of sval tracking count
 *
 * @method tracked
 * @internal
 * /

  this.dtc += dd;
  this.stc += sd;

  if (this.dtc < 0) {
    throw O.log.error(this, 'Invalid data track count `dtc`', {dtc: this.dtc, data: dd});
  }
  if (this.stc < 0) {
    throw O.log.error(this, 'Invalid state track count `stc`', {stc: this.stc, state: sd});
  }

//  console.log('ENTRY TRACK', this.id, 'sum: ', {data: this.dtc, state: this.stc}, 'change: ', {data: dd, state: sd});
};

}}}1 */
