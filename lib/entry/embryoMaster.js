'use strict';

var O = require('ose').class(module, C);

var LHS = O.link.homeState;

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Client socket to master entry
 *
 * @readme
 * Socket assigned to `entry.master` of slave entry.
 *
 * @description
 * ## Description
 * This object can be created only when `entry.lhs === LHS.LINKING`
 * and `entry.shard.master` is connected. When created it sends "link"
 * request to then given shard's master.
 *
 * @class ose.lib.entry.master
 * @type class
 * @internal
 */

/**
 * Slave entry
 *
 * @property entry
 * @type Object
 */

// Public {{{1
function C(shard, cb) {  // {{{2
/**
 * @method constructor
 */

  O.link.send(shard.master, 'embryo', {
    id: id,
    kind: kind,
    dval: dval,
  }, this);

  return;
}

exports.open = function(resp) {  // {{{2
/**
 * Open handler
 *
 * @param resp {Object} Update object
 * @param [resp.drev] {Object} Data revision
 * @param [resp.data] {Object} Data update
 * @param [resp.srev] {Object} State revision
 * @param [resp.state] {Object} State
 * @param resp.home {Boolean} Whether the chain of links to the `home` is created
 *
 * @method open
 */

  var e = this.entry;

  switch (e.lhs) {
  case LHS.INIT_LINK:
    if (resp.drev) {
      e.drev = resp.drev;
      e.data = resp.data;
    }
    if (resp.srev) {
      e.srev = resp.srev;
      e.state = resp.state;
    }

    if (! e.setup(resp.kind)) return;

    e.setLhs(resp.home ? LHS.HOME : LHS.MASTER);
    return;
  case LHS.LINKING:
    if (resp.drev) {
      e.updateData(resp.drev, resp.data, resp.src || 'link');
    }
    if (resp.srev) {
      e.updateState(resp.srev, resp.state, resp.src || 'link');
    }

    e.setLhs(resp.home ? LHS.HOME : LHS.MASTER);
    return;
  }

  throw O.error(this, 'Invalid entry\'s lhs when openning link to the master', this.lhs);
};

exports.close = function() {  // {{{2
  closed(this, this.entry);
};

exports.split = function(err) {  // {{{2
  closed(this, this.entry, err);
};

exports.error = function(err) {  // {{{2
  closed(this, this.entry, err);
};

exports.patch = function(req) {  // {{{2
/**
 * Entry data or state patch handler
 *
 * @param req {Object}
 * @param req.drev {Number}
 * @param req.dpatch {Object}
 * @param req.srev {Number}
 * @param req.spatch {Object}
 * @param req.src {String}
 *
 * @method patch
 */

  if (typeof req !== 'object') {
    O.link.error(this, O.error(this, '`req` must be an object', req));
    return;
  }

  if (req.drev) {
    if (typeof req.drev !== 'number' || typeof req.dpatch !== 'object') {
      O.link.error(this, O.error(this, 'Invalid data req', req));
      return;
    }

    this.entry.patchData(req.drev, req.dpatch, req.src);
  }

  if (req.srev) {
    if (typeof req.srev !== 'number' || typeof req.spatch !== 'object') {
      O.link.error(this, O.error(this, 'Invalid state req', req));
      return;
    }

    this.entry.patchState(req.srev, req.spatch, req.src);
  }

  return;
};

exports.home = function(val) {  // {{{2
/**
 * Can reach home handler
 *
 * @param val {Boolean} Whether it is possible to communicate with the `home`.
 *
 * @method home
 * @handler
 */

  if (this.tracking) {
    this.tracking = val ? LHS.HOME : LHS.MASTER;
  } else {
    this.entry.setLhs(val ? LHS.HOME : LHS.MASTER);
  }
};

// }}}1
// Private {{{1
function closed(that, entry, err) {  // {{{2
/**
 * Called  when the link to the the master is closed.
 */

  delete that.entry;
  delete entry.master;

  switch (entry.lhs) {
  case LHS.DELTED:
  case LHS.NOT_FOUND:
  case LHS.ERROR:
  case LHS.REMOVED:
    return;
  case LHS.INIT_LINK:
    entry.error(err);
    return;
  case LHS.LINKING:
    wait();
    return;
  case LHS.TRACKING:
  case LHS.MASTER:
  case LHS.HOME:
    if (entry.slaves || entry.dtc || entry.stc) {
      wait();
      return;
    }

    // TODO: check err.code for ENTRY_NOT_FOUND, DELETED, etc
    entry.setLhs(LHS.CLOSED, err);
    return;
  }

  throw O.error(entry, 'Invalid `lhs` after socket was closed', entry.lhs);

  function wait() {  // {{{3
    entry.setLhs(LHS.WAITING, err);
    err = undefined;

    switch (entry.shard.lhs) {
    case LHS.MASTER:
    case LHS.HOME:
      entry.linkMaster();
    }
  }

  // }}}3
}

// }}}1
