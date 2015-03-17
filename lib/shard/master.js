'use strict';

var O = require('ose').class(module, C);

var LHS = O.link.homeState;

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Slave shard client socket
 *
 * @readme
 * Socket for communicating from a shard to a master in another OSE
 * instance.
 *
 * @class ose.lib.shard.slave
 * @type class
 * @internal
 */

// Public {{{1
function C(shard, ws) {  // {{{2
/**
 * Constructor
 *
 * @param shard {Object} Slave shard
 * @param [ws] {Object} WebSocket wrapper; when supplied, `ws` must be connected
 * @param [cb] {Function} Callback to be called after connection request is successfull or not
 *
 * @method constructor
 */

  if (shard.master) {
    throw O.error(shard, 'Duplicit `shard.master`', {master: shard.master._lid, lhs: shard.lhs});
  }
  if (shard.lhs !== LHS.LINKING) {
    throw O.error(shard, 'Invalid `shard.lhs` when creating master for the shard', shard.lhs);
  }

  var that = this;

  this.shard = shard;
  shard.master = this;

  if (ws) {
    onWs(null, ws);
    return;
  }

  (shard.home || shard.space.home).getWs(onWs);
  return;
  
  function onWs(err, ws) {  // {{{3
    if (err) {
      delete shard.master;
      delete that.shard;

      wait(shard, err);
      return;
    }

    ws.tx({
      type: 'shard',
      newLid: ws.addLink(that),
      space: shard.space.name,
      sid: shard.sid,
      home: (shard.home || shard.space.home).name,
      alias: shard.alias,
      scope: shard.scope.name,
    });
    return;
  }

  // }}}3
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

//  console.log('SHARD SLAVE OPEN', this._lid);

  if (this.shard.lhs !== LHS.LINKING) {
    throw O.error(this.shard, 'Shard is not linking', this.shard.lhs);
  }

  for (var key in this.shard.cache) {
    var entry = this.shard.cache[key];
    if (entry.lhs === LHS.WAITING) {
      entry.linkMaster();
    }
  }

  this.home(data.home);
};

exports.close = function() {  // {{{2
/**
 * Close handler
 *
 * @method close
 */

//  console.log('SHARD MASTER CLOSE', this._lid);

  closed(this.shard);
};

exports.split = function(err) {  // {{{2
  closed(this.shard, err);
};

exports.error = function(err) {  // {{{2
//  console.log('SHARD SLAVE ERROR', this._lid);

  O.log.error(err);

  closed(this.shard, err);
};

exports.home = function(data) {  // {{{2
/**
 * Home handler
 *
 * @param data {Boolean} Whether it is possible to communicate with the `home`.
 *
 * @method home
 */

  if (data) {
    this.shard.setLhs(LHS.HOME);
  } else {
    this.shard.setLhs(LHS.MASTER);
  }
};

// }}}1
// Private {{{
function closed(shard, err) {  // {{{2
/**
 * Called  when the link to the master is closed.
 */

  delete shard.master.shard;
  delete shard.master;

  switch (shard.lhs) {
//  case LHS.DELETED:
//  case LHS.NOT_FOUND:
//  case LHS.ERROR:
  case LHS.REMOVED:  // Closed when exiting the process
    // `shard` was closed by another part of logic
    return;
  case LHS.LINKING:
    // TODO: Check the err.code for DELETED and NOT_FOUND
    wait(shard, err);
    return;
  case LHS.MASTER:
  case LHS.HOME:
    if (connDemand(shard, err)) {
      wait(shard, err);
    }
    return;
  }

  throw O.error(shard, 'Invalid `lhs` after socket was closed', shard.lhs);
}

function wait(shard, err) {  // {{{2
/**
 * Wait for the gateway to shard, to become connected. Then create `new Master()`.
 */

  var gw;

  shard.setLhs(LHS.WAITING, err);
  err = undefined;

  setTimeout(function() {
    if (! shard.isRemoved()) {
      (shard.home || shard.space.home).getGw(onGw);
    }
  }, 0);

  function onGw(err, resp) {  // {{{3
    if (shard.isRemoved()) return;

    if (err) {
      // TODO: Do not remove shard, setup some timeout to getGw
      shard.error(O.error(shard, 'Unable to connect to the shard', shard.name));
      return;
    }

    gw = resp;
    if (gw.isConnected()) {
      onConnected(true);
      return;
    }

    gw.once('connected', onConnected);
    return;
  }

  function onConnected(is) {  // {{{3
    if (shard.isRemoved()) return;

    if (is) {
      shard.setLhs(LHS.LINKING);
      new C(shard, gw.ws);
      return;
    }

    if (! connDemand(shard)) return;

    (shard.home || shard.space.home).getGw(onGw);
    return;
  }

  // }}}3
}

function connDemand(shard, err) {  // {{{2
  if (
    shard.slaves ||
    ! O._.isEmpty(shard.cache)
  ) {
    return true;
  }

  shard.setLhs(LHS.CLOSED, err);
  return false;
}

// }}}1
