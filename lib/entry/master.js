'use strict';

var Ose = require('ose');
var M = Ose.class(module, C);

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Master entry response socket
 *
 * @readme
 * Reponse socket for slave entry requests. Is registered in `entry.slaves`.
 *
 * @class ose.lib.entry.master
 * @type class
 */

// Public {{{1
function C(entry, req, socket) {  // {{{2
/**
 * Class constructor
 *
 * @param entry {Object} Entry instance
 * @param req {Object} Request object
 * @param req.drev {Object} Current data revision. Specifies whether to request entry data.
 * @param req.dtrack {Boolean} Whether to track data changes
 * @param req.srev {Object} Current state revision. Specifies whether to request entry state.
 * @param req.strack {Boolean} Whether to track state changes
 *
 * @param socket {Object} Slave socket
 *
 * @method constructor
 */

  if (entry.slaves) {
    this.slaveId = ++entry.slaveId;
  } else {
    entry.dtc = 0;
    entry.stc = 0;
    entry.slaves = {};
    this.slaveId = entry.slaveId = 1;
  }

//  console.log('ENTRY MASTER CONSTRUCTOR', entry.id, this.slaveId);

  this.entry = entry;
  entry.slaves[this.slaveId] = this;

  var that = this;

  entry.track(
    (this.dtrack = req.dtrack) ? 1 : 0,
    (this.strack = req.strack) ? 1 : 0,
    function(err) {
//      console.log('ENTRY MASTER AFTER TRACK', entry.id, that.slaveId);

      if (entry.kind) {
        Ose.link.open(that, socket, entry.respond(req));
        return;
      }

      Ose.link.error(
        that,
        err || M.log.todo('Entry has no kind but entry.track (entry.linMaster) returned no error!', entry, arguments)
      );
      that.close();
      return;
    }
  );

  return;
};

exports.close = function() {  // {{{2
/**
 * Close handler
 *
 * @method close
 */

  var e = this.entry;

  if (! e) {  // Socket was already closed.
    return;
  }

//  console.log('ENTRY MASTER CLOSE', e.id, this.slaveId);

  delete this.entry;
  delete e.slaves[this.slaveId];
  delete this.slaveId;

  if (! Ose._.isEmpty(e.slaves)) {  // Entry has some other slaves
    e.track(
      this.dtrack ? -1 : 0,
      this.strack ? -1 : 0,
      function(err) {
        if (err) M.log.error(err);
      }
    );
    return;
  }

  // No `entry.slaves` left, stop all tracking and close the link to the master.
  if (this.dtrack) --e.dtc;
  if (this.strack) --e.stc;

  if (e.dtc || e.stc) {
    throw Ose.error(e, 'INVALID_TRACK_COUNT', {data: e.dtc, state: e.stc});
  }

  delete e.dtc;
  delete e.stc;
  delete e.slaves;

  if (e.master) {
    Ose.link.close(e.master);
  }

  delete this.dtrack;
  delete this.strack;
};

exports.error = function(err) {  // {{{2
/**
 * Error handler
 *
 * @method error
 */

  this.close();
};

exports.track = function(req) {  // {{{2
/**
 * Track handler
 *
 * @param req {Object} Request object
 * @param req.dtrack {Boolean} Whether to track data changes
 * @param req.strack {Boolean} Whether to track state changes
 *
 * @method track
 */

  var e = this.entry;

//  console.log('ENTRY MASTER TRACK', e.id, {drev: e.drev, srev: e.srev}, req);

  var dc = 0;
  var sc = 0;

  if (('dtrack' in req)) {
    if (this.dtrack) {
      if (! req.dtrack) {
        dc = -1;
        this.dtrack = false;
      }
    } else {
      if (req.dtrack) {
        dc = 1;
        this.dtrack = true;
      }
    }
  }

  if (('strack' in req)) {
    if (this.strack) {
      if (! req.strack) {
        sc = -1;
        this.strack = false;
      }
    } else {
      if (req.strack) {
        sc = 1;
        this.strack = true;
      }
    }
  }

  if (! (dc || sc)) return;

  var resp;
  if ((dc > 0) && req.drev !== e.drev) {
    resp = {
      drev: e.drev,
      data: e.data
    };
  }
  if ((sc > 0) && req.srev !== e.srev) {
    if (! resp) resp = {};

    resp.srev = e.srev;
    resp.state = e.state;
  }

  if (resp) {
    this.link.update(resp);
  }

  e.track(dc, sc);

  return;
};

// }}}1
