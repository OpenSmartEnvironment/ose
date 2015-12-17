'use strict';

var O = require('ose').class(module, C);

var SpaceMaster = require('../space/master');

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
function C(entry) {  // {{{2
/**
 * @method constructor
 */

  if (entry.master) {
    throw O.log.error(entry, 'Duplicit `entry.master`', {master: entry.master._lid});
  }

  this.subject = entry;
  entry.master = this;

  var that = this;

  if (entry.subjectState === entry.SUBJECT_STATE.READY) {
    entry.subjectState = entry.SUBJECT_STATE.BUSY;
  }

  entry.shard.awaitSteadyMaster(function(err) {
    if (entry.master !== that) return;

    if (err) {
      if (entry.subjectState !== entry.SUBJECT_STATE.GONE) {
        throw O.log.error(entry, 'INVALID_STATE');
      }
      return;
    }

    if (entry.shard.masterState === entry.MASTER_STATE.WAITING) {
      return entry.setMasterState(entry.MASTER_STATE.WAITING);  // TODO: Shard must notify entries with `.master` about reconnect
    }

    var req = {
      eid: entry.id
    };
    req.drev = entry.drev || true;
    req.srev = entry.srev || true;

    return O.link.send(entry.shard.master, 'track', req, that);
  });
}

exports.open = function(resp) {  // {{{2
/**
 * Open handler
 *
 * @param resp {Object} Update object
 * @param [resp.drev] {Object} Data revision
 * @param [resp.dval] {Object} Data value
 * @param [resp.srev] {Object} State revision
 * @param [resp.sval] {Object} State value
 * @param resp.home {Boolean} Whether the chain of links to the `home` is created
 *
 * @method open
 */

  var entry = this.subject;
  if (entry.master !== this) return;

  switch (entry.subjectState) {
  case entry.SUBJECT_STATE.GONE:
    return;
  case entry.SUBJECT_STATE.INIT:
    if (entry.kind) {
      if (entry.kind.name !== resp.kind) {
        return O.link.error(this, O.error(entry, 'Kind mismatch', resp));
      }
    } else {
      if (! entry.setupKind(resp.kind, resp.drev, resp.dval)) {
        if (O.link.canClose(this)) {
          O.link.error(this, entry._err);
        }
        return;
      }
    }

    if (resp.brev) entry.brev = resp.brev;

    if (resp.srev) {
      entry.srev = resp.srev;
      entry.sval = resp.sval;
    }

    this.home(resp.home);
    return entry.setup();
  case entry.SUBJECT_STATE.BUSY:
    if (resp.drev) {
      entry.updateData(resp.drev, resp.dval, resp.src || 'link');
    }
    if (resp.srev) {
      entry.updateState(resp.srev, resp.sval, resp.src || 'link');
    }

    this.home(resp.home);
    return entry.setReady();
  }

  throw O.log.error(this, '`subject.subjectState` was unhandled', this.subjectState);
};

exports.close = function() {  // {{{2
  closed(this);
};

exports.error = function(err) {  // {{{2
  /*
  if (! err.splitError) {
    O.log.error(err);
  }
  */

  closed(this, err);
};

exports.home = function(data) {  // {{{2
  this.subject.setMasterState(data ?
    this.subject.MASTER_STATE.HOME :
    this.subject.MASTER_STATE.MASTER
  );
};

exports.patch = function(req) {  // {{{2
/**
 * Entry data or state patch handler
 *
 * @param req {Object}
 * @param req.brev {Number}
 * @param req.drev {Number}
 * @param req.dpatch {Object}
 * @param req.srev {Number}
 * @param req.spatch {Object}
 * @param req.src {String}
 *
 * @method patch
 */

  if (typeof req !== 'object') {
    O.link.error(entry, O.error(entry, '`req` must be an object', req));
    return;
  }

  return this.subject.awaitReady(function(err, entry) {
    if (err) return;

    if (req.drev) {
      if (typeof req.drev !== 'number' || typeof req.dpatch !== 'object') {
        O.link.error(entry.master, O.error(entry, 'Invalid data patch request.', req));
        return;
      }

      entry.patchData(req.drev, req.dpatch, req.src);
    }

    if (req.srev) {
      if (typeof req.srev !== 'number' || typeof req.spatch !== 'object') {
        O.link.error(entry.master, O.error(entry, 'Invalid state patch request.', req));
        return;
      }

      entry.patchState(req.srev, req.spatch, req.src);
    }

    return;
  });
};

// Private {{{1
function closed(that, err) {  // {{{2
/*
 * Called  when the link to the the master is closed.
 */

  var entry = that.subject;
  if (! entry || entry.master !== that) return;

  if (err && err.code === 'ENTRY_DELETED') {
    return entry.remove(err);
  }

  delete entry.master;

  if (entry.subjectState === entry.SUBJECT_STATE.INIT) {
    if (entry.kind) {
      entry.setMasterState(entry.MASTER_STATE.GONE);
      return entry.setup();
    }

    return entry.remove(err);
  }

  return entry.setMasterState(entry.MASTER_STATE.GONE);
}

