'use strict';

var M = require('ose').module(module);
var Ws = require('ws');

/** Docs {{{1
 * @module ose
 * @submodule ose.peer
 */

/**
 * @caption Node WebSocket wrapper
 *
 * @readme
 * Extension of `WebSocket wrapper` for Node.js
 *
 * @class ose.lib.ws.node
 * @type module
 */

// Public {{{1
exports.open = function(url) {  // {{{2
  this.setWs(new Ws(url));
};

exports.closeExt = function() {  // {{{2
  if (this.ws) {
    this.ws.removeAllListeners();
    this.ws.on('error', M.log.bind('error', 'Orphaned WS error.'));

    this.ws.close();

    delete this.ws;
  }

  if (this.timer) {
    clearInterval(this.timer);
    delete this.timer;
  }
};

exports.bindWsHandlers = function() {  // {{{2
  this.timer = setInterval(this.onTime.bind(this), 10000);

  this.ws.on('error', this.wsError.bind(this));
  this.ws.on('open', this.wsOpen.bind(this));
  this.ws.on('close', this.wsClose.bind(this));
  this.ws.on('message', onMessage.bind(this));
};

// }}}1
// Event Handlers {{{1
function onMessage(data) {  // {{{2
//  console.log('WS ON MESSAGE', data);

  try {
    var data = JSON.parse(data);
  } catch (err) {
    M.log.caught(err);
    this.close();
    return;
  }

  this.rx(data);
}

// }}}1
