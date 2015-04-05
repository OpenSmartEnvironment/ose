'use strict';

var O = require('ose').module(module);

var LHS = O.link.homeState;

/** Doc {{{1
 * @module subject
 * @submodule ose.data
 */

/**
 * Set of methods used in entries, shards and spaces
 *
 * @class ose.lib.subject
 * @type class
 */

// Internal {{{1
exports.remove = function(lhs, err) {  // {{{2
/**
 * Mark subject as removed and call `cleanup()`.
 *
 * @method remove
 * @internal
 */

  var lhs;

  if (arguments.length === 1 && typeof lhs !== number) {
    err = lhs;
    lhs = LHS.ERROR;
  }

  if (err) this._err = err;

  this.setLhs(lhs || LHS.REMOVED, err);

  if ('slaves' in this) {
    for (var key in this.slaves) {
      O.link.close(this.slaves[key], 'remove', true);
    }
    delete this.slaves;
  }

  if ('master' in this) {
    O.link.close(this.master, null, true);
  }

  this.cleanup();
};

exports.setLhs = function(val, err) {  // {{{2
/**
 * Sets "link to home" state. Emits "lhs" event on `.lhs` property change and "master" on master change.
 *
 * @param val {Number} New "link to home" state value
 *
 * @method setLhs
 * @internal
 */

  if (typeof val !== 'number') {
    throw O.error(this, '`val` must be a number', val);
  }

  // Compare with current `.lhs`
  var old = this.lhs;
  switch (old) {
  case LHS.REMOVED:
  case LHS.DELETED:
  case LHS.NOT_FOUND:
  case LHS.ERROR:
    if (err) {
      O.log.error(err);
    }
    throw new O.error(this, 'Subject is not initialized or was removed', this.lhs);
  case val:
    if (err) {
      O.log.error(err);
      throw O.error('`.lhs` didn\'t change but `err` was supplied');
    }
    return;
  }

  // Do change and emit "lhs" event
  this.lhs = val;

//  console.log('SET LHS', JSON.stringify(this.identify()), old, '>', val);

  this.emit('lhs', err);

  // Check whether spread home change to slaves
  if (! this.slaves) return;

  if (val === LHS.HOME) {
    switch (old) {
    case LHS.TRACKING:
      return;
    }

    this.spreadHome(true);
    return;
  }

  if (old === LHS.HOME) {
    switch (val) {
    case LHS.REMOVED:
    case LHS.DELETED:
    case LHS.NOT_FOUND:
    case LHS.ERROR:
    case LHS.TRACKING:
      return;
    }

    this.spreadHome(false);
  }
  return;
};

exports.lhsLink = function(cb) {  // {{{2
/**
 * Link to the master, if no link to master is established. Call `cb(null, lhs)` with current `lhs` when link is or was established, or `cb(err)` on error.
 *
 * @method lhsLink
 * @internal
 */

/*
 * call cb:
 * - `cb(err)`
 * - `cb(undefined, lhs)
 */

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

  throw O.error(this, '`subject.lhs` was unhandled', this.lhs);
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
 */

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

  throw O.error(this, '`subject.lhs` was unhandled', this.lhs);
};

exports.lhsInited = function(socket) {  // {{{2
/**
 * @method lhsInited
 * @internal
 */

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

  throw O.error(this, 'Invalid `lhs`', this.lhs);
};

exports.lhsHome = function(socket) {  // {{{2
/**
 * @method lhsHome
 * @internal
 */

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

  throw O.error(this, 'Invalid `lhs`', this.lhs);
};

exports.isAtHome = function() {  // {{{2
/**
 * @returns {Boolean} Whether the subject is at home
 *
 * @method isAtHome
 * @internal
 */

  switch (this.lhs) {
  case LHS.AT_HOME:
    return true;
  }

  return false;
};

exports.canReachHome = function() {  // {{{2
/**
 * Check whether the entry is at home or linked to home.
 *
 * @returns {Boolean} whether the entry is at home or linked to home.
 *
 * @method canReachHome
 * @internal
 */

  switch (this.lhs) {
  case LHS.AT_HOME:
  case LHS.HOME:
    return true;
  case LHS.TRACKING:
    switch (this.master.tracking) {
    case LHS.AT_HOME:
    case LHS.HOME:
      return true;
    }
  }

  return false;
};

exports.isRemoved = function() {  // {{{2
/**
 * Check whether subject has been removed
 *
 * @returns {Boolean} Whether subject has been removed
 *
 * @method isRemoved
 * @internal
 */

  switch (this.lhs) {
  case LHS.REMOVED:
  case LHS.ERROR:
  case LHS.NOT_FOUND:
  case LHS.DELETED:
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
 */

  for (var key in this.slaves) {
    O.link.send(this.slaves[key], 'home', val);
  }
};

exports.waitForHome = function(cb) {  // {{{2
/**
 * Call the callback after the subject gets synced with its home or
 * immediately if already in sync. It can wait forever.
 *
 * @param cb {Function} Callback
 *
 * @method waitForHome
 */

//  console.log('SUBJECT WAIT HOME', {subject: this.identify(), synced: this.synced});

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

// }}}1
