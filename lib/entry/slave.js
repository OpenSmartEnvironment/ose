'use strict';

var O = require('ose').class(module, C);

var L = O.link;
var SS = L.socketState;
var LHS = L.homeState;

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Response socket to slave entry
 *
 * @readme
 * Reponse socket for link entry requests. Is registered in `entry.slaves`.
 *
 * @class ose.lib.entry.slave
 * @type class
 * @internal
 */

// Public {{{1
function C(entry, slaveId, drev, srev, socket) {  // {{{2
/**
 * Class constructor
 *
 * @param entry {Object} Entry instance
 * @param slaveId {String} Slave id
 * @param drev {Boolean|Number} Whether to check slave data revision or number known revision
 * @param srev {Boolean|Number} Whether to check state revision or number known revision
 * @param socket {Object} Client socket
 *
 * @method constructor
 */

//  console.log('ENTRY SLAVE CONSTRUCTOR', entry.id, this.slaveId);

  this.dtc = drev ? 1 : 0;
  this.stc = srev ? 1 : 0;
  this.entry = entry;
  this.slaveId = slaveId;
  entry.slaves[slaveId] = this;

  L.open(this, socket, entry.respond(drev, srev));
};

exports.close = function() {  // {{{2
  var e = this.entry;

//  console.log('ENTRY SLAVE CLOSE', e.id, this.slaveId);

  delete this.entry;
  delete e.slaves[this.slaveId];

  e.track(-this.dtc, -this.stc);
  e.checkSlaves(this.dtc, this.stc);

  return;
};

exports.error = function(err) {  // {{{2
//  console.log('ENTRY SLAVE ERROR', this.entry && this.entry.id, err);

  this.close();
};

exports.command = function(req, socket) {  // {{{2
/**
 * Handle entry command sent from a slave
 *
 * @param req {Object} Request
 * @param req.name {String} Command name
 * @param [req.data] {*} Command data
 * @param [socket] {Object} Client socket
 *
 * @method command
 * @handler
 */

  var e = this.entry;

  e.lhsLink2(socket, function(lhs) {
    switch (lhs) {
    case LHS.AT_HOME:
      e.command(req.name, req.data, socket);
      return;
    case LHS.HOME:
    case LHS.MASTER:
      L.relay(e.master._ws, {
        type: 'send',
        lid: e.master._lid,
        name: 'command',
        newLid: socket && socket._lid || undefined,
        data: req
      }, socket);
      return;
    case LHS.WAITING:
      O.link.error(socket, O.error(s, 'DISCONNECTED', 'Shard is not connected to it\'s home'));
      return;
    }

    throw O.error(e, 'Unhandled lhs', lhs);
  });
};

exports.track = function(req, socket) {  // {{{2
/**
 * Track request handler
 *
 * @param req {Object} Request object
 * @param req.drev {Boolean|Number} Whether to track data changes
 * @param req.srev {Boolean|Number} Whether to track state changes
 * @param socket {Object} Client socket
 *
 * @method track
 * @handler
 */

  var that = this;
  var e = this.entry;

  if (this.tracking) {
    L.error(socket, O.error(this, 'PENDING_TRACKING', 'There is a pending "track" request from the same slave.', this.tracking));
    return;
  }

  var t = {
    dc: 0,  // Whether the tracking of `entry.data` by the slave is changed by this command and send data to the slave
    sc: 0,  // Whether the tracking of `entry.state` by the slave is changed by this command and send data to the slave
    dr: 0,  // Whether the tracking of `entry.data` is changed by this command and request it from the master
    sr: 0,  // Whether the tracking of `entry.state is changed by this command and request it from the master
  };

//  console.log('ENTRY SLAVE TRACK', e.id, {drev: e.drev, srev: e.srev}, req);

  if ('drev' in req) {
    if (req.drev) {
      if (this.dtc) {
        if (req.drev !== e.drev) {
          L.error(socket, O.error(this, 'Slave is already tracking data but data track request with different drev was received', req));
          return;
        }
      } else {
        t.dc = 1;
        if (! e.dtc) t.dr = 1;
      }
    } else {
      if (this.dtc) {
        t.dc = -1;
        if (e.dtc === 1) t.dr = -1;
      }
    }
  }

  if ('srev' in req) {
    if (req.srev) {
      if (this.stc) {
        if (req.srev !== e.srev) {
          L.error(socket, O.error(this, 'Slave is already tracking state but state track request with different srev was received', req));
          return;
        }
      } else {
        t.sc = 1;
        if (! e.stc) t.sr = 1;
      }
    } else {
      if (this.stc) {
        t.sc = -1;
        if (e.stc === 1) t.sr = -1;
      }
    }
  }

  if (! t.dc && ! t.sc) {
    L.close(socket, {});
    return;
  }

  e.track(t.dc, t.sc);

  if (! t.dr && ! t.sr) {
    respond();
    return;
  }

  this.tracking = t;

  e.lhsLink(onLhs);
  return;

  function onLhs(err, lhs) {  // {{{3
    switch (lhs) {
    case undefined:  // "track" request was responded with error or `socket` was closed
    case LHS.AT_HOME:
    case LHS.WAITING:
      respond();
      return;
    case LHS.MASTER:
    case LHS.HOME:
      if (! e.dtc) t.dr = 0;
      if (! e.stc) t.sr = 0;

      if (! t.dr && ! t.sr) {
        respond();
        return;
      }

      e.trackMaster(t.dr, t.sr, respond);
      return;
    }

    throw O.error(e, 'Invalid `entry.lhs`', e.lhs);
  }

  function respond() {  // {{{3
    delete that.tracking;
    if (that._state === L.socketState.OPENED) {
      that.dtc += t.dc;
      that.stc += t.sc;
    }

    if (! L.canClose(socket)) return;

    var r = {};
    if (t.dc === 1 && req.drev !== e.drev) {
      r.drev = e.drev;
      r.data = e.data;
    }
    if (t.sc === 1 && req.srev !== e.srev) {
      r.srev = e.srev;
      r.state = e.state;
    }

    L.close(socket, r, true);
    return;
  }

  // }}}3
};

exports.put = function(req, socket) {  // {{{2
/**
 * Save data patch handler
 *
 * @param req {Object} Request object
 * @param req.rev {Number} Original data revision
 * @param req.patch {Object} Patch data
 * @param req.source {String} Source of the patch
 * @param socket {Object} Client socket
 *
 * @method put
 * @handler
 */

  var e = this.entry;
  if (e.drev !== req.rev) {
    L.error(socket, O.error(e, 'Obsolete revision', req.rev));
    return;
  }

  e.lhsLink2(socket, function(lhs) {
    switch (lhs) {
    case LHS.AT_HOME:
      e.patchData(e.shard.nextTime(), req.patch, req.src, L.bind(socket));
      return;
    case LHS.WAITING:
      L.error(socket, O.error(that, 'DISCONNECTED', 'Shard is not connected to the master'));
      return;
    case LHS.HOME:
    case LHS.MASTER:
      if (typeof socket === 'function') {
        L.send(e.master, 'put', req, socket);
        return;
      }

      L.relay(e.master._ws, {
        type: 'send',
        lid: e.master._lid,
        name: 'put',
        newLid: socket && socket._lid || undefined,
        data: req
      }, socket);
      return;
    }
    throw O.error(this, 'Invalid entry\'s lhs', this.lhs);
  });
  return;
};

// }}}1
