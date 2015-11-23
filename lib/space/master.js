'use strict';

var O = require('ose').class(module, C);

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Client socket to master subject
 *
 * @readme
 * Socket for communicating from a subject to a master in another OSE
 * instance.
 *
 * @class ose.lib.subject.master
 * @type class
 * @internal
 */

// Public {{{1
function C(subject) {  // {{{2
/**
 * Constructor
 *
 * @param subject {Object} Slave subject
 *
 * @method constructor
 */

  if (subject.master) {
    throw O.log.error(subject, 'Duplicit `subject.master`', {master: subject.master._lid});
  }

  this.subject = subject;
  subject.master = this;
  this.subject.getGw(onGw.bind(null, subject));
}

exports.open = function(data) {  // {{{2
/**
 * Open handler
 *
 * @param data {Object} Response object
 * @param data.home {Boolean} Whether it is possible to communicate with the `home`
 *
 * @method open
 */

  O.log.liftSuppress(this);

  this.subject.masterOpened(data);
};

exports.close = function() {  // {{{2
  this.subject.setMasterState(this.subject.MASTER_STATE.BUSY);
  reopen(this);
};

exports.error = function(err) {  // {{{2
  O.log.suppressError(err, this, 'Master socket error', 3);

  this.subject.setMasterState(this.subject.MASTER_STATE.WAITING);

  setTimeout(reopen.bind(null, this), 10 * 1000);
};

exports.home = function(data) {  // {{{2
  switch (this.subject.masterState) {
  case this.subject.MASTER_STATE.HOME:
  case this.subject.MASTER_STATE.MASTER:
    this.subject.setMasterState(data ?
      this.subject.MASTER_STATE.HOME :
      this.subject.MASTER_STATE.MASTER
    );
  }
};

// Private {{{1
function reopen(that) {  // {{{2
/**
 * Called when the link to the master is reopen.
 */

  if (! that.subject) return;

  if (that.subject.shallReconnect()) {
    O.link.reuse(that);
    that.subject.getGw(onGw.bind(null, that.subject));
    return;
  }

  delete that.subject.master;
  that.subject.setMasterState(that.subject.MASTER_STATE.GONE);
  delete that.subject;
  return;
}

function onGw(subject, err, gw) {  // {{{2
  if (subject.isGone()) return;

  if (err) {
    if (! err._data) err._data = {subject: subject.toString()};
    O.log.suppressError(err, subject.master, 'Unable to connect to the subject home', 3);

    subject.setMasterState(subject.MASTER_STATE.WAITING);

    return setTimeout(function() {
      subject.getGw(onGw.bind(null, subject));
    }, 10 * 1000);  // TODO: Smart timeouts
  }

  if (gw.isConnected()) {
    onConnected(true);
    return;
  }

  gw.once('connected', onConnected);
  return;

  function onConnected(is) {  // {{{3
    if (subject.isGone()) return;

    if (is) {
      subject.setMasterState(subject.MASTER_STATE.BUSY);
      subject.openMaster(gw.ws);
      return;
    }

    subject.getGw(onGw.bind(null, subject));
    return;
  }

  // }}}3
}
