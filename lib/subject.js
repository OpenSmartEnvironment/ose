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
O.extend('subjectState', {  // {{{2
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
});

O.extend('masterState', {  // {{{2
/**
 * List of master relation states entered by subjects
 *
 * @property masterState
 * @type Object
 */

  BUSY:    1,  // Link to master is opening TODO: rename to INIT
  WAITING: 2,  // Waiting for network to connect
  MASTER:  3,  // Connected to master
  HOME:    4,  // Connected to home via master
  GONE:    5,  // Removed
});

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
    this._err = err = O.applyError(this, arguments);
  }

  var orig = this._state;
  this._state = O.subjectState.GONE;

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
    this.masterState = O.masterState.GONE;
    this.emit('masterState');
  }

  this.cleanup();

  switch (orig) {
  case O.subjectState.INIT:
  case O.subjectState.BUSY:
    O.async.setImmediate(function() {
      this.emit('steady');
    }.bind(this));
    break;
  case O.subjectState.READY:
    break;
  case O.subjectState.GONE:
    throw O.log.error(this, 'Can\'t remove already removed entry', arguments);
  default:
    throw O.log.error(this, '`subject._state` was unhandled', this._state);
  }

  this.emit('remove');

  return err;
};

exports.goneError = function(err) {  // {{{2
/**
 * If the subject is GONE, returns `subject._err || err`. When subject is not GONE, call `subject.remove(err)`.
 */

  if (this._err) return this._err;

  if (! err) err = O.error(this, 'REMOVED', 'Subject was removed');

  if (this._state !== O.subjectState.GONE) {
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

  return this._state === O.subjectState.GONE;
};

exports.setBusy = function(cb) {  // {{{2
/**
 * @method setBusy
 * @internal
 */

  switch (this._state) {
  case O.subjectState.INIT:
  case O.subjectState.BUSY:
    this.once('steady', this.setBusy.bind(this, cb));
    return true;
  case O.subjectState.READY:
    this._state = O.subjectState.BUSY;
    return cb(null, this);
  case O.subjectState.GONE:
    return cb(this.goneError());
  }

  throw O.log.error(this, '`subject._state` was unhandled', this._state);
};

exports.setReady = function() {  // {{{2
/**
 * @method setReady
 * @internal
 */

  switch (this._state) {
  case O.subjectState.INIT:
  case O.subjectState.BUSY:
    this._state = O.subjectState.READY;
    this.emit('steady');
    return;
  case O.subjectState.READY:
    return;
  case O.subjectState.GONE:
    throw this.goneError();
  }

  throw O.log.error(this, '`subject._state` was unhandled', this._state);
};

exports.nextReady = function(cb) {  // {{{2
  var that = this;

  switch (this._state) {
  case O.subjectState.INIT:
  case O.subjectState.BUSY:
    return this.once('steady', function() {
      that.awaitReady.bind(that, cb)
    });
  case O.subjectState.READY:
    return O.async.nextTick(function() {
      if (that._state === O.subjectState.READY) {
        return cb(null, that);
      }

      return that.awaitReady(cb);
    });
  case O.subjectState.GONE:
    return O.async.nextTick(function() {
      cb(that.goneError());
    });
  }

  throw O.log.error(this, '`subject._state` was unhandled', this._state);
};

exports.awaitReady = function(cb) {  // {{{2
  switch (this._state) {
  case O.subjectState.INIT:
  case O.subjectState.BUSY:
    this.once('steady', this.awaitReady.bind(this, cb));
    return true;
  case O.subjectState.READY:
    return cb(null, this);
  case O.subjectState.GONE:
    return cb(this.goneError());
  }

  throw O.log.error(this, '`subject._state` was unhandled', this._state);
};

exports.awaitSteadyMaster = function(cb) {  // {{{2
  O.log.debug('Await steady master', {this: this.toString(), state: this._state, masterState: this.masterState});

  switch (this.masterState) {
  case O.masterState.WAITING:
  case O.masterState.MASTER:
  case O.masterState.HOME:
    return cb(null, this);
  case O.masterState.BUSY:
    return this.once('masterState', this.awaitSteadyMaster.bind(this, cb));
  case undefined:
  case O.masterState.GONE:
    if (this.master) {
      throw O.log.error(this, 'DUPLICIT_MASTER');
    }

    if (this._state === O.subjectState.GONE) {
      return cb(this.goneError());
    }

    if (this.isAtHome()) {
      throw O.log.error(this, '`awaitSteadyMaster()` can be called only outside home');
    }

    this.masterState = O.masterState.BUSY;
    this.once('masterState', this.awaitSteadyMaster.bind(this, cb));

    new this.Master(this);
    return;
  }

  throw O.log.error(this, '`subject.masterState` was unhandled', this.masterState);
};

exports.awaitMaster = function(cb) {  // {{{2
  O.log.debug('Await master', {this: this.toString(), state: this._state, masterState: this.masterState});

  switch (this.masterState) {
  case O.masterState.HOME:
  case O.masterState.MASTER:
    return cb(null, this);
  case O.masterState.BUSY:
    return this.once('masterState', this.awaitMaster.bind(this, cb));
  case O.masterState.WAITING:
    return cb(O.error(this, 'MASTER_DISCONNECTED'));
  case undefined:
  case O.masterState.GONE:
    if (this.master) {
      throw O.log.error(this, 'DUPLICIT_MASTER');
    }

    if (this._state === O.subjectState.GONE) {
      return cb(this.goneError());
    }

    if (this.isAtHome()) {
      throw O.log.error(this, '`awaitMaster()` can be called only outside home');
    }

    this.masterState = O.masterState.BUSY;
    this.once('masterState', this.awaitMaster.bind(this, cb));

    new this.Master(this);
    return;
  }

  throw O.log.error(this, '`subject.masterState` was unhandled', this.masterState);
};

exports.setMasterState = function(val) {  // {{{2
  if (this.masterState === val) return;
  if (val === O.masterState.BUSY && this.masterState === O.masterState.WAITING) return;

  var orig = this.masterState;

  O.log.debug('Master state', {this: this.toString(), state: this._state, masterState: val, orig: orig});

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

  return this.isAtHome() || this.masterState === O.subjectState.HOME;
};

// }}}1
// Private {{{1
// }}}1




/* OBSOLETE {{{1
exports.lhsLink = function(cb) {  // {{{2
/**
 * Link to the master, if no link to master is established. Call `cb(null, lhs)` with current `lhs` when link is or was established, or `cb(err)` on error.
 *
 * @method lhsLink
 * @internal
 * /

/*
 * call cb:
 * - `cb(err)`
 * - `cb(undefined, lhs)
 * /

  switch (this.lhs) {
  case LHS.REMOVED:
    cb(O.error(this, 'Removed'));
    return;
  case LHS.ERROR:
  case LHS.NOT_FOUND:
  case LHS.DELETED:
    cb(this._err);
    return;
  case undefined:
  case LHS.INIT_READ:
  case LHS.INIT_LINK:
  case LHS.INIT_GET:
  case LHS.LINKING:
  case LHS.GETTING:
  case LHS.TRACKING:
    this.once('lhs', this.lhsLink.bind(this, cb));
    return;
  case LHS.CLOSED:
    this.linkMaster(this.lhsLink.bind(this, cb));
    return;
  case LHS.AT_HOME:
  case LHS.WAITING:
  case LHS.MASTER:
  case LHS.HOME:
    cb(null, this.lhs);
    return;
  }

  throw O.log.error(this, '`subject.lhs` was unhandled', this.lhs);
};

exports.lhsLink2 = function(socket, cb) {  // {{{2
/**
 * Close socket or call `cb(lhs)`.
 * When subject is in some stable state, call `cb(this.lhs)`
 * When subject is waiting for some operation to be completed, wait too.
 * If socket was closed during wait, do nothing. If `always`, call cb with error
 *
 * @method lhsLink2
 * @internal
 * /

  switch (this.lhs) {
  case LHS.REMOVED:
    O.link.error(socket, O.error(this, 'Removed'), true);
    return;
  case LHS.ERROR:
  case LHS.NOT_FOUND:
  case LHS.DELETED:
    O.link.error(socket, this._err, true);
    return;
  case undefined:
  case LHS.INIT_READ:
  case LHS.INIT_LINK:
  case LHS.INIT_GET:
  case LHS.LINKING:
  case LHS.GETTING:
  case LHS.TRACKING:
    this.once('lhs', (function() {
      if (O.link.canClose(socket)) {
        this.lhsLink2(socket, cb);
      }
    }).bind(this));
    return;
  case LHS.CLOSED:
    this.linkMaster((function() {
      if (O.link.canClose(socket)) {
        this.lhsLink2(socket, cb);
      }
    }).bind(this));
    return;
  case LHS.AT_HOME:
  case LHS.WAITING:
  case LHS.MASTER:
  case LHS.HOME:
    cb(this.lhs);
    return;
  }

  throw O.log.error(this, '`subject.lhs` was unhandled', this.lhs);
};

exports.lhsInited = function(socket) {  // {{{2
/**
 * @method lhsInited
 * @internal
 * /

  switch (this.lhs) {
  case LHS.REMOVED:
    O.link.error(socket, O.error(this, 'Removed'));
    return undefined;
  case LHS.ERROR:
  case LHS.NOT_FOUND:
  case LHS.DELETED:
    O.link.error(socket, this._err);
    return undefined;
  case undefined:
  case LHS.INIT_READ:
  case LHS.INIT_LINK:
  case LHS.INIT_GET:
    return false;
  case LHS.LINKING:
  case LHS.GETTING:
  case LHS.TRACKING:
  case LHS.AT_HOME:
  case LHS.CLOSED:
  case LHS.WAITING:
  case LHS.MASTER:
  case LHS.HOME:
    return true;
  }

  throw O.log.error(this, 'Invalid `lhs`', this.lhs);
};

exports.lhsHome = function(socket) {  // {{{2
/**
 * @method lhsHome
 * @internal
 * /

  switch (this.lhs) {
  case LHS.REMOVED:
    O.link.error(socket, O.error(this, 'Removed'));
    return undefined;
  case LHS.ERROR:
  case LHS.NOT_FOUND:
  case LHS.DELETED:
    O.link.error(socket, this._err);
    return undefined;
  case undefined:
  case LHS.INIT_READ:
  case LHS.INIT_LINK:
  case LHS.INIT_GET:
  case LHS.LINKING:
  case LHS.GETTING:
  case LHS.TRACKING:
    return LHS.LINKING;
  case LHS.AT_HOME:
  case LHS.CLOSED:
  case LHS.WAITING:
  case LHS.MASTER:
  case LHS.HOME:
    return this.lhs;
  }

  throw O.log.error(this, 'Invalid `lhs`', this.lhs);
};

exports.isAtHome = function() {  // {{{2
/**
 * @returns {Boolean} Whether the subject is at home
 *
 * @method isAtHome
 * @internal
 * /

  switch (this.lhs) {
  case LHS.AT_HOME:
    return true;
  }

  return false;
};

exports.spreadHome = function(val) {  // {{{2
/**
 * Inform slaves about the ability to reach subject's home
 *
 * @method spreadHome
 * @internal
 * /

  for (var key in this.slaves) {
    O.link.send(this.slaves[key], 'home', val);
  }
};

exports.awaitReady = function(cb) {  // {{{2
/**
 * Call the callback after the `subject.lhs` changes into some steady state or immediately. Callback will be called very soon.
 *
 * @param cb {Function} Callback
 *
 * @method awaitReady
 * /

  // TODO: rename to `lhsSteady()`
  var that = this;

  switch (this.lhs) {
  case LHS.ERROR:
  case LHS.REMOVED:
  case LHS.NOT_FOUND:
  case LHS.DELETED:
    cb(O.error(this, 'SHARD_NOT_AVAILABLE', 'Shard is not available', this.lhs));
    return;
  case undefined:
  case LHS.INIT_READ:
  case LHS.INIT_LINK:
  case LHS.INIT_GET:
  case LHS.LINKING:
  case LHS.GETTING:
  case LHS.TRACKING:
    this.once('lhs', this.awaitReady.bind(this, cb));
    return;
  case LHS.WAITING:
  case LHS.CLOSED:
  case LHS.AT_HOME:
  case LHS.MASTER:
  case LHS.HOME:
    cb();
    return;
  }

  throw O.log.error(this, '`subject.lhs` was unhandled', this.lhs);
};

exports.waitForHome = function(cb) {  // {{{2
/ **
 * Call the callback after the subject gets synced with its home or
 * immediately if already in sync. It can wait forever.
 *
 * @param cb {Function} Callback
 *
 * @method waitForHome
 * /

//  console.log('SUBJECT WAIT HOME', {subject: this.toString(), synced: this.synced});

  var that = this;

  this.lhsLink(function(err, lhs) {
    if (err) {
      cb(err);
      return;
    }

    switch (lhs) {
    case LHS.AT_HOME:
    case LHS.HOME:
      cb();
      return;
    }

    that.once('lhs', function() {
      that.waitForHome(cb);
    });
    return;
  });
};

}}}1 */
