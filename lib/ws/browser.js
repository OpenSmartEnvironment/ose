'use strict';

var O = require('ose').module(module);

/** Docs {{{1
 * @module ose
 * @submodule ose.peer
 */

/**
 * @caption Browser WebSocket wrapper
 *
 * @readme
 * Extension of `WebSocket wrapper` for browsers
 *
 * @class ose.lib.ws.browser
 * @type module
 */

// Public {{{1
exports.open = function(url) {  // {{{2
/**
 * Create native WebSocket object
 *
 * @param url {String} URL to connect to
 *
 * @method open
 */

  this.url = url;

  try {
    this.worker = new Worker('ose/lib/ws/worker.js?' + Math.random());
  } catch (err) {
    O.log.error(err);
    this.close();
    return;
  }

  this.worker.onmessage = onWorker.bind(this);
  this.worker.onerror = onError.bind(this);
  this.worker.postMessage('open');
};

exports.closeExt = function() {  // {{{2
/**
 * @method closeExt
 * @internal
 */

  if (this.ws) {
    this.ws.onopen = null;
    this.ws.onclose = null;
    this.ws.onmessage = null;
    this.ws.onerror = null;

    delete this.ws.onopen;
    delete this.ws.onclose;
    delete this.ws.onmessage;
    delete this.ws.onerror;

    if (this.ws.readyState === 1) {
      this.ws.close();
    }

    delete this.ws;
  }

  if (this.worker) {
    this.worker.terminate();
    delete this.worker;
  }
};

exports.bindWsHandlers = function() {  // {{{2
/**
 * @method bindWsHandlers
 * @internal
 */

  this.ws.onerror = this.wsError.bind(this);
  this.ws.onopen = this.wsOpen.bind(this);
  this.ws.onclose = this.wsClose.bind(this);
  this.ws.onmessage = onMessage.bind(this);
};

// }}}1
// Event Handlers {{{1
function onError(ev) {  // {{{2
//  console.log('WORKER ERROR', ev);

  this.close();
};

function onWorker(ev) {  // {{{2
//  console.log('ON WORKER', ev);

  switch (ev.data) {
    case 'open':
      this.setWs(new WebSocket(this.url));

      break;
    case 'time':
      this.onTime();

      break;
    default:
      O.log.unhandled('Invalid worker message', ev);
  }
};

function onMessage(ev) {  // {{{2
//  console.log('WS ON MESSAGE', ev.data);

  try {
    var val = JSON.parse(ev.data);
  } catch (err) {
    O.log.caught(err);
    this.close();
    return;
  }

  this.rx(val);
};

// }}}1
