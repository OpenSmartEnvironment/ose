'use strict';

var Ose = require('ose');
var M = Ose.class(module, C);

/** Docs {{{1
 * @module ose
 * @submodule ose.peer
 */

/**
 * @caption Relaying WebSocket response socket
 *
 * @readme
 * Created when a peer responds to a link request with `open()`. Acts
 * as a response socket of the link.
 *
 * Together with [ose.lib.ws.master], this makes links
 * network-transparent.
 *
 * @class ose.lib.ws.relay
 * @type class
 */

// Public {{{1
exports.close = Ose.link.wsClose;
exports.error = Ose.link.wsError;

function C(ws, req, socket) {
  this.ws = ws;
  this.lid = socket.lid;
  this.handlers = undefined;
  socket.ws.addLink(this);

  socket.link = this;
  this.link = socket;

  delete socket.handlers;

  socket.ws.tx(req);
};
