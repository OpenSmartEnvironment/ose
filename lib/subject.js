'use strict';

var O = require('ose').module(module);

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Subject
 *
 * @readme
 * Set of methods used in entries, shards and spaces
 *
 * @class ose.lib.subject
 * @type module
 */

// Public {{{1
exports.SUBJECT_STATE = {  // {{{2
/**
 * List of states entered by subjects
 *
 * @property subjectState
 * @type Object
 */

  INIT:  1,  // Not yet initialized (getting from db or from master
  BUSY:  2,  // Reading or writing to db
  READY: 3,  // Ready to work with
  GONE:  4,  // Removed
};

exports.MASTER_STATE = {  // {{{2
/**
 * List of master relation states entered by subjects
 *
 * @property masterState
 * @type Object
 */

  BUSY:    1,  // Link to master is opening
  WAITING: 2,  // Waiting for network to connect
  MASTER:  3,  // Connected to master
  HOME:    4,  // Connected to home via master
  GONE:    5,  // Removed
};

exports.remove = function(err) {  // {{{2
/**
 * Mark subject as removed and call `cleanup()`.
 *
 * @method remove
 * @internal
 */

  if (err instanceof Error) {
    this._err = err;
  } else if (err) {
    if (arguments.length) {
      this._err = err = O.applyError(this, arguments);
    }
  }

  var orig = this.subjectState;
  this.subjectState = this.SUBJECT_STATE.GONE;

  if ('slaves' in this) {
    var slaves = this.slaves;
    delete this.slaves;
    for (var key in slaves) {
      if (! O.link.canClose(slaves[key])) continue;

      if (err) {
        O.link.error(slaves[key], err);
      } else {
        O.link.close(slaves[key], 'remove');
      }
    }
  }

  if ('master' in this) {
    delete this.master.subject;
    O.link.close(this.master, null, true);
    delete this.master;
    this.masterState = this.MASTER_STATE.GONE;
    this.emit('masterState');
  }

  this.cleanup();

  switch (orig) {
  case this.SUBJECT_STATE.INIT:
  case this.SUBJECT_STATE.BUSY:
    O.async.setImmediate(function() {
      this.emit('steady');
    }.bind(this));
    break;
  case this.SUBJECT_STATE.READY:
    break;
  case this.SUBJECT_STATE.GONE:
    throw O.log.error(this, 'Can\'t remove already removed entry', arguments);
  default:
    throw O.log.error(this, '`subject.subjectState` was unhandled', this.subjectState);
  }

  this.emit('remove', this._err);

  return this._err;
};

exports.goneError = function(err) {  // {{{2
/**
 * If the subject is GONE, returns `subject._err || err`. When subject is not GONE, call `subject.remove(err)`.
 */

  if (this._err) return this._err;

  if (! err) err = O.error(this, 'REMOVED', 'Subject was removed');

  if (this.subjectState !== this.SUBJECT_STATE.GONE) {
    return this.remove(err);
  }

  return this._err = err;
};

exports.isGone = function() {  // {{{2
/**
 * Check whether subject has been removed
 *
 * @returns {Boolean} Whether subject has been removed
 *
 * @method isGone
 * @internal
 */

  return this.subjectState === this.SUBJECT_STATE.GONE;
};

exports.setBusy = function(cb) {  // {{{2
/**
 * @method setBusy
 * @internal
 */

  switch (this.subjectState) {
  case this.SUBJECT_STATE.INIT:
  case this.SUBJECT_STATE.BUSY:
    this.once('steady', this.setBusy.bind(this, cb));
    return true;
  case this.SUBJECT_STATE.READY:
    this.subjectState = this.SUBJECT_STATE.BUSY;
    return cb(null, this);
  case this.SUBJECT_STATE.GONE:
    return cb(this.goneError());
  }

  throw O.log.error(this, '`subject.subjectState` was unhandled', this.subjectState);
};

exports.setReady = function() {  // {{{2
/**
 * @method setReady
 * @internal
 */

  switch (this.subjectState) {
  case this.SUBJECT_STATE.INIT:
  case this.SUBJECT_STATE.BUSY:
    this.subjectState = this.SUBJECT_STATE.READY;
    this.emit('steady');
    return;
  case this.SUBJECT_STATE.READY:
    return;
  case this.SUBJECT_STATE.GONE:
    throw this.goneError();
  }

  throw O.log.error(this, '`subject.subjectState` was unhandled', this.subjectState);
};

exports.nextReady = function(cb) {  // {{{2
  var that = this;

  switch (this.subjectState) {
  case this.SUBJECT_STATE.INIT:
  case this.SUBJECT_STATE.BUSY:
    return this.once('steady', function() {
      that.awaitReady.bind(that, cb)
    });
  case this.SUBJECT_STATE.READY:
    return O.async.nextTick(function() {
      if (that.subjectState === that.SUBJECT_STATE.READY) {
        return cb(null, that);
      }

      return that.awaitReady(cb);
    });
  case this.SUBJECT_STATE.GONE:
    return O.async.nextTick(function() {
      cb(that.goneError());
    });
  }

  throw O.log.error(this, '`subject.subjectState` was unhandled', this.subjectState);
};

exports.awaitReady = function(cb) {  // {{{2
  switch (this.subjectState) {
  case this.SUBJECT_STATE.INIT:
  case this.SUBJECT_STATE.BUSY:
    this.once('steady', this.awaitReady.bind(this, cb));
    return true;
  case this.SUBJECT_STATE.READY:
    return cb(null, this);
  case this.SUBJECT_STATE.GONE:
    return cb(this.goneError());
  }

  throw O.log.error(this, '`subject.subjectState` was unhandled', this.subjectState);
};

exports.awaitSteadyMaster = function(cb) {  // {{{2
//  O.log.debug('Await steady master', {this: this.toString(), state: this.subjectState, masterState: this.masterState});

  switch (this.masterState) {
  case this.MASTER_STATE.WAITING:
  case this.MASTER_STATE.MASTER:
  case this.MASTER_STATE.HOME:
    return cb(null, this);
  case this.MASTER_STATE.BUSY:
    return this.once('masterState', this.awaitSteadyMaster.bind(this, cb));
  case undefined:
  case this.MASTER_STATE.GONE:
    if (this.master) {
      throw O.log.error(this, 'DUPLICIT_MASTER');
    }

    if (this.subjectState === this.SUBJECT_STATE.GONE) {
      return cb(this.goneError());
    }

    if (this.isAtHome()) {
      throw O.log.error(this, '`awaitSteadyMaster()` can be called only outside home');
    }

    this.masterState = this.MASTER_STATE.BUSY;
    this.once('masterState', this.awaitSteadyMaster.bind(this, cb));

    new this.Master(this);
    return;
  }

  throw O.log.error(this, '`subject.masterState` was unhandled', this.masterState);
};

exports.awaitMaster = function(cb) {  // {{{2
//  O.log.debug('Await master', {this: this.toString(), state: this.subjectState, masterState: this.masterState});

  switch (this.masterState) {
  case this.MASTER_STATE.HOME:
  case this.MASTER_STATE.MASTER:
    return cb(null, this);
  case this.MASTER_STATE.BUSY:
    return this.once('masterState', this.awaitMaster.bind(this, cb));
  case this.MASTER_STATE.WAITING:
    return cb(O.error(this, 'MASTER_DISCONNECTED'));
  case undefined:
  case this.MASTER_STATE.GONE:
    if (this.master) {
      throw O.log.error(this, 'DUPLICIT_MASTER');
    }

    if (this.subjectState === this.SUBJECT_STATE.GONE) {
      return cb(this.goneError());
    }

    if (this.isAtHome()) {
      throw O.log.error(this, '`awaitMaster()` can be called only outside home');
    }

    this.masterState = this.MASTER_STATE.BUSY;
    this.once('masterState', this.awaitMaster.bind(this, cb));

    new this.Master(this);
    return;
  }

  throw O.log.error(this, '`subject.masterState` was unhandled', this.masterState);
};

exports.setMasterState = function(val) {  // {{{2
  if (this.masterState === val) return;
  if (val === this.MASTER_STATE.BUSY && this.masterState === this.MASTER_STATE.WAITING) return;

  var orig = this.masterState;

  O.log.debug('Master state', {this: this.toString(), state: this.subjectState, masterState: val, orig: orig});

  this.masterState = val;

  return this.emit('masterState', orig);
};

exports.sendMaster = function(cmd, data, socket) {  // {{{2
/**
 *
 * @method sendMaster
 * @internal
 */

  var that = this;

  return this.awaitMaster(function(err) {
    if (! O.link.canClose(socket)) return;
    if (err) return O.link.error(socket, err);

    return O.link.send(that.master, cmd, data, socket);
  });
};

exports.canReachHome = function() {  // {{{2
/**
 * Check whether the subject is at home or linked to home.
 *
 * @returns {Boolean} whether the subject is at home or linked to home.
 *
 * @method canReachHome
 * @internal
 */

  return this.isAtHome() || this.masterState === this.MASTER_STATE.HOME;
};





