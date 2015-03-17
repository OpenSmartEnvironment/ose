'use strict';

var O = require('ose').class(module, C);

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

  this._state = O.link.socketState.OPENED;
  this._lid = req.newLid;
  this._ws = ws;
  this._ws.links[this._lid.toString(16)] = this;

  ws.tx({
    type: 'open',
    lid: this._lid,
  });

  this.stream = stream;
  stream.setEncoding('hex');
  stream.on('error', onError.bind(this));
  stream.on('data', onData.bind(this));
  stream.on('end', onEnd.bind(this));
};

exports.close = function(resp) {  // {{{2
  close(this);
};

exports.split = function() {  // {{{2
  close(this);
};

exports.error = function(err) {  // {{{2
  O.log.error(err);

  close(this);
};

// }}}1
// Event Handlers {{{1
function onData(chunk) {  // {{{2
  if (this._ws && this._ws.isConnected()) {
    this._ws.tx({
      type: 'chunk',
      lid: this._lid,
      data: chunk,
    });
    return;
  }

  close(this);
  return;
};

function onError(err) {  // {{{2
//  console.log('READ STREAM ERROR', err, this._state, this._ws);

  O.link.error(this, err);
};

function onEnd() {  // {{{2
  if (this._ws && this._ws.isConnected()) {
    O.link.close(this);
  }
};

// }}}1
// Private {{{1
function close(that) {
  if (that.stream) {
    that.stream.removeAllListeners();
    // TODO close `that.stream`
    delete that.stream;
  }
};

// }}}1
