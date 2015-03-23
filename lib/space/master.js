'use strict';

var O = require('ose').class(module, C);

var LHS = O.link.homeState;

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Slave space client socket
 *
 * @readme
 * Socket for communicating from a space to a master in another OSE
 * instance.
 *
 * @class ose.lib.space.master
 * @type class
 * @internal
 */

// Public {{{1
function C(space, ws) {  // {{{2
/**
 * Constructor
 *
 * @param space {Object} Slave space
 * @param [ws] {Object} WebSocket wrapper; when supplied, `ws` must be connected
 *
 * @method constructor
 */

  var that = this;

  if (space.master) {
    throw O.error(space, 'Duplicit `space.master`', {master: space.master._lid, lhs: space.lhs});
  }
  if (space.lhs !== LHS.LINKING) {
    throw O.error(space, 'Invalid `space.lhs` when creating master for the space', space.lhs);
  }

  space.setLhs(LHS.LINKING);

  this.space = space;
  space.master = this;

  if (ws) {
    onWs(null, ws);
    return;
  }

  space.home.getWs(onWs);
  return;
  
  function onWs(err, ws) {  // {{{3
    if (err) {
      delete space.master;
      delete that.space;

      wait(space, err);
      return;
    }

    ws.tx({
      type: 'space',
      newLid: ws.addLink(that),
      space: space.name,
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

  if (this.space.lhs !== LHS.LINKING) {
    throw O.error(space, 'Space is not linking', space.lhs);
  }

  this.home(data.home);
};

exports.close = function() {  // {{{2
  closed(this.space);
};

exports.split = function(err) {  // {{{2
  closed(this.space, err);
};

exports.error = function(err) {  // {{{2
  O.log.error(err);

  closed(this.space, err);
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
    this.space.setLhs(LHS.HOME);
    this.space.notifyHome();
  } else {
    this.space.setLhs(LHS.MASTER);
  }
};

// }}}1
// Private {{{1
function closed(space, err) {  // {{{2
/**
 * Called when the link to the master is closed.
 */

  delete space.master.space;
  delete space.master;

  if (! space.isRemoved()) {
    wait(space, err);
  }
};

function wait(space, err) {  // {{{2
/**
 * Wait for the gateway to space, to become connected. Then create `new Master()`.
 */

  var gw;

  space.setLhs(LHS.WAITING, err);

  setTimeout(function() {
    if (! space.isRemoved()) {
      space.home.getGw(onGw);
    }
  }, 0);

  function onGw(err, resp) {  // {{{3
    if (space.isRemoved()) return;

    if (err) {
      O.log.notice('Unable to connect to the space home');
//      O.log.error(O.error(space, 'Unable to connect to the space home'));
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
    if (space.isRemoved()) return;

    if (is) {
      space.setLhs(LHS.LINKING);
      new C(space, gw.ws);
      return;
    }

    space.home.getGw(onGw);
    return;
  }

  // }}}3
};

// }}}1
