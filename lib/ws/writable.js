'use strict';

var Ose = require('ose');
var M = Ose.class(module, C);

/** Doc {{{1
 * @module ose
 * @submodule ose.peer
 */

/**
 * @caption WebSocket write stream socket
 *
 * @readme
 * Relays readable stream to a peer.
 *
 * @class ose.lib.ws.writable
 * @type class
 */

// Public {{{1
function C(ws, req, stream) {  // {{{2
/**
 * Class constructor.
 *
 * @param entry {Object} Entry
 *
 * @method constructor
 */

  Ose.link.prepare(this);

  this.ws = ws;
  this.lid = req.newLid;
  ws.addLink(this);
  this.stream = stream;

  ws.tx({
    type: 'open',
    lid: this.lid,
  });

  stream.setEncoding('hex');
  stream.on('error', onError.bind(this));
  stream.on('data', onData.bind(this));
  stream.on('end', onEnd.bind(this));
};

exports.close = function(resp) {  // {{{2
  close(this);
};

exports.error = function(err) {  // {{{2
  if (err.code !== 'DISCONNECTED') {
    M.log.error(err);
  }

  close(this);
};

// }}}1
// Event Handlers {{{1
function onData(chunk) {  // {{{2
  if (! this.ws.isConnected()) {
    Ose.link.error(this, Ose.error(this.ws, 'DISCONNECTED'));
    return;
  }

  this.ws.tx({
    type: 'chunk',
    lid: this.lid,
    data: chunk,
  });
  return;
};

function onError(err) {  // {{{2
  Ose.link.error(this, err);
};

function onEnd() {  // {{{2
  if (this.ws && this.ws.isConnected()) {
    this.ws.tx({
      type: 'close',
      lid: this.lid,
    });
  }

  Ose.link.close(this);
};

// }}}1
// Private {{{1
function close(that) {
  if (that.stream) {
    that.stream.removeAllListeners();
    delete that.stream;
  }
  delete that.ws;
};

// }}}1
