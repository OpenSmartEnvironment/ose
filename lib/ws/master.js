'use strict';

var Ose = require('ose');
var M = Ose.class(module, C);

/** Docs {{{1
 * @module ose
 * @submodule ose.peer
 */

/**
 * @caption Master WebSocket client socket
 *
 * @readme
 * Created when a new link is requested from another peer via a
 * WebSocket. Acts as a client socket of the link.
 *
 * Together with [ose/lib/ws/slave], this makes links
 * network-transparent.
 *
 * @class ose.lib.ws.master
 * @type class
 */

// Public {{{1
exports.close = Ose.link.wsClose;
exports.error = Ose.link.wsError;

function C(ws, lid, handlers) {
  this.ws = ws;
  this.lid = lid;
  this.handlers = handlers;
};

exports.open = function(data) {
  if (! (this.ws && this.ws.isConnected())) {
    Ose.link.error(this, Ose.error(this, 'DISCONNECTED', 'Link is not connected'));
    return;
  }

  if (this.handlers) {
    var err = Ose.link.bindHandlers(this, this.handlers);

    if (err) {
      Ose.link.error(this, err);
      return;
    }

    delete this.handlers;
  }

  this.link.lid = this.lid;

  this.ws.addLink(this.link);

  this.ws.tx({
    type: 'open',
    lid: this.lid,  // Already created lid.
    handlers: this.link.handlers,  // Handlers available on `this` socket.
    data: data,  // Data to be sent to an open command.
  });
};

// }}}1
