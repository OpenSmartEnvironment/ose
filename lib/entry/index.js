'use strict';

const O = require('ose')(module)
  .class(init, 'EventEmitter')
  .prepend('../subject')
;

var Consts = O.consts('ose');
var Kind = O.getClass('../kind');
var Slave = O.getClass('./slave');
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
 * An [entry] can contain a data value `dval` object in JSON format
 * (analogous to a database table row).
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
 * @aliases entry entries dval data sval state statesOfEntries entryIdentification
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

/* queuedState {{{2
 * Queued state
 *
 * @property queuedState
 * @type Object
 * @internal
 */

/* queueStateHandle {{{2
 * Timeout handle
 *
 * @property queueStateHandle
 * @type Number
 * @internal
 */

/* queueStateTimeout {{{2
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

// Public {{{1
function init(shard, eid) {  // {{{2
/**
 * Entry constructor
 *
 * @param shard {Object} Entry owner shard instance
 * @param eid {Number|String} Entry id
 *
 * @method constructor
 */

  O.inherited(this)();

  this.setMaxListeners(Consts.coreListeners);

  this.subjectState = this.SUBJECT_STATE.INIT;

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

exports.getIdent = function(sibling) {  // {{{2
/**
 * Return identification object
 *
 * @params [sibling] {Object} When specified, return identification object relative to `sibling` entry. When `sibling === undefined`, return full identification.
 * @return {Object} Identification object
 *
 * @method getIdent
 */

  if (sibling) {
    if (this.shard === sibling.shard) return this.id;
    if (this.shard.space === sibling.shard.space) return [this.id, this.shard.id];
  }

  if (! arguments.length && this.shard.space === O.here.space) return [this.id, this.shard.id];

  return [this.id, this.shard.id, this.shard.space.name];
};

exports.getLookupIdent = function() {  // {{{2
  return {
    eid: this.id,
    eal: this.dval.alias,
    sid: this.shard.id,
    sal: this.shard.alias,
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

  if (! ident) return false;

  switch (O.typeof(ident)) {
  case 'number':
    return this.id === ident;
  case 'string':
    return ident && this.data && this.data.alias === ident;
  case 'object':
    if ('space' in ident && ident.space !== this.shard.space.name) return false;

    if (
      'shard' in ident &&
      ident.shard !== this.shard.id &&
      ident.shard !== this.shard.alias
    ) return false

    return ident.entry && (
      ident.entry === this.id ||
      typeof ident.entry === 'string' && ident.entry === (this.dval && this.dval.alias)
    );
  case 'array':
    switch (ident.length) {
    case 2:
      return this.id === ident[0] && this.shard.id === ident[1];
    case 3:
      return this.id === ident[0] && this.shard.id === ident[1] && this.shard.space.name === ident[2];
    }
    return false;
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

exports.track = function(socket) {  // {{{2
/**
 * Establishes a [link] to the current entry.
 *
 * @param socket {Object} Client socket to be linked to an entry
 *
 * @method track
 * @async
 */

//  console.log('ENTRY LINK SLAVE', this.id, typeof socket);

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

    if (that.masterState === that.MASTER_STATE.HOME) {
      return that.sendMaster('command', {name: name, data: data}, socket);
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

  if (this.subjectState === this.SUBJECT_STATE.INIT) {
    O.diff.cleanPatch(patch, this);
    this.srev = O.nextTime();
    return O.diff.merge(this, patch);
  }

  return this.awaitReady(function(err, that) {
    if (err) return;

    O.diff.cleanPatch(patch, that);
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

// Internal {{{1
exports.Master = O.getClass('./master');  // {{{2

exports.toString = function() {  // {{{2
/**
 * Return short description
 *
 * @return {String} Description
 *
 * @method toString
 */

  return 'Entry: ' + (this.dval && this.dval.alias ? this.dval.alias + ' ' : '') + this.id + ' ' + this.shard.toString();
};

exports.cleanup = function() {  // {{{2
/**
 * Remove entry from shard's cache.
 *
 * @method cleanup
 * @internal
 */

//  console.log('ENTRY CLEANUP', this.toString(), this._err && this._err.code);

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
    this.kind = this.shard.schema.kinds[kind];
    break;
  case 'object':
    this.kind = kind;
    break;
  default:
    this.remove('Invalid kind', {kind: kind});
    return false;
  }

  if (this.kind instanceof Kind) {
    this.drev = rev;
    this.dval = val;
    return true;
  }

  this.remove('Invalid kind', {kind: kind});
  return false;
};

exports.setup = function() {  // {{{2
/**
 * Setup entry and call `homeInit()` of the kind if at home.
 *
 * @method setup
 * @internal
 */

  if (this.subjectState !== this.SUBJECT_STATE.INIT) {
    throw O.log.error(this, 'UNEXPECTED_STATE', 'INIT state expected', this.subjectState);
  }

  if (this.shard.isAtHome()) {
    this.kind.doHomeInit(this);
  }

  this.setReady();
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
    O.log.warning('Socket is invalid or can\'t be closed, exit silently', {entry: this.toString(), command: name, data: data});
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

//  console.log('RESPOND', this.toString(), resp);

  return resp;
};

exports.patchData = function(rev, patch, src, cb) {  // {{{2
/**
 * @method patchData
 * @internal
 */

  if (! this.dval) this.dval = {};

  this.drev = rev;
  O.diff.merge(this, {dval: patch});

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

  O.diff.diff(val, this.dval);
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
  O.diff.merge(this, {sval: patch});
  this.emit('sval', patch, src);

  if (this.slaves) for (var key in this.slaves) {
    var slave = this.slaves[key];
    if (L.canSend(slave)) {
      L.send(slave, 'patch', {srev: rev, spatch: patch, src: src});
    }
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

  O.diff.diff(val, this.sval);
  this.patchState(rev, val, src);
  return;
};

exports.openLink = function(socket) {  // Open slave tracking request, entry must be at home or synchronized with master {{{2
  if (! L.canClose(socket)) return;

  var resp = this;

  if (socket._ws) {
    resp = {
      kind: this.kind.name,
      home: this.shard.isAtHome() || this.masterState === this.MASTER_STATE.HOME,
      brev: this.brev,
      drev: this.drev,
      dval: this.dval,
      srev: this.srev,
      sval: this.sval,
    };
  }

  return L.open(new Slave(this), socket, resp);
};

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
