'use strict';

var Ose = require('ose');
var M = Ose.class(module, C);

/** Docs {{{1
 * @module ose
 * @submodule ose.peer
 */

/**
 * @caption Slave WebSocket response socket
 *
 * @readme
 * Created when a peer responds to a link request with `open()`. Acts
 * as a response socket of the link.
 *
 * Together with [ose/lib/ws/master], this makes links
 * network-transparent.
 *
 * @class ose.lib.ws.slave
 * @type class
 */

// Public {{{1
exports.close = Ose.link.wsClose;
exports.error = Ose.link.wsError;

function C(ws, socket, handlers, data) {
  if (handlers) {
    var err = Ose.link.bindHandlers(this, handlers);

    if (err) {
      Ose.link.error(socket, err);
      return;
    }
  };

  this.ws = ws;
  this.lid = socket.lid;

  Ose.link.open(this, socket, data);
};
