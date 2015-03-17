'use strict';

var O = require('ose').class(module).append('runtime');

var SS = O.link.socketState;

/** Docs {{{1
 * @submodule ose.peer
 */

/**
 * @caption WebSocket wrapper class
 *
 *
 * @readme

 * Communication between two near OSE instances is carried out via the
 * WebSocket protocol. The native WebSocket object, provided by the
 * runtime environment, is wrapped by an instance of the WebSocket
 * wrapper class. This instance is created and controlled by a [Peer]
 * instance and hides differences between the Node.js and browser
 * environments.
 *
 * Each WebSocket wrapper instance handles incoming packets via its
 * `rx()` method. WebSocket communication behaviour can be controlled
 * by assigning some method to the `rx` property.
 *
 * @TODO
 * - check handler duplicity
 *
 * @aliases websocketWrapper websocket
 * @class ose.lib.ws
 * @type class
 */

// Public {{{1
exports.identify = function() {  // {{{2
/**
 * Returns identification object
 *
 * @return {Object} Identification object
 *
 * @method identify
 */

  return {
    ws: this.ws && this.ws.updateReq ? this.ws.upgradeReq.url : true,
    peer: this.peer ? this.peer.identify() : 'NOT_CONNECTED',
  };
};

exports.close = function() {  // {{{2
/**
 * Close WebSocket object, send a `disconnect` error to all peers, clean
 * handlers, deregister from peer.
 *
 * @method close
 */

  console.log('WS CLOSE', this.peer && this.peer.name);

  var peer = this.peer;
  if (peer) {
    delete peer.ws;
    delete this.peer;
  }

  delete this.rx;

  var links = this.links;
  delete this.links;

  this.closeExt();

  if (peer) {
    peer.close(true);
  }

  if (! links) return;

  var err = O.error(this, 'DISCONNECTED', 'Closing WebSocket');

  for (var key in links) {
    var socket = links[key];
    delete links[key];

    if (typeof socket !== 'object') continue;

    delete socket._ws;

    switch (socket._state) {
    case SS.RELAY:
      O.log.todo('RELAY');
      break;
    case SS.MOCK:
      socket._state = SS.SPLIT;
      break;
    case undefined:
    case SS.OPENED:
      socket._state = SS.SPLIT;

      if (O.isSuper('EventEmitter', socket)) {
        if (socket.listeners('split').count) {
          socket.emit('split', err);
          continue;
        }

        socket.emit('error', err);
        continue;
      }

      if (typeof socket.split === 'function') {
        socket.split(err);
        continue;
      }

      if (typeof socket.error === 'function') {
        socket.error(err);
        continue;
      }

      O.log.error(O.error(socket, 'Missing socket split or error handler'));
      break;
    default:
      O.log.error(O.error(socket, 'Invalid socket state', socket._state));
    }
  }

  return;
};

exports.setWs = function(ws) {  // {{{2
/**
 * Assign a WebSocket object to this wrapper.
 *
 * @param ws {Object} WebSocket object
 *
 * @method setWs
 */

  this.links = {};

  this.ws = ws;
  this.bindWsHandlers();
};

exports.wsOpen = function() {  // {{{2
/**
 * WebSocket object open handler, called after a WebSocket is opened.
 *
 * @method wsOpen
 */

//  console.log('WS OPEN');

//  this.rx();
};

exports.wsClose = function() {  // {{{2
/**
 * WebSocket object close handler, called after a WebSocket is closed.
 *
 * @method wsOpen
 */

  console.log('WS CLOSE', {readyState: this.ws && this.ws.readyState}, arguments);

  this.close();
};

exports.wsError = function(err) {  // {{{2
/**
 * WebSocket object error handler, called on WebSocket error.
 *
 * @param err {Object} Error instance
 * @method wsError
 */

  console.log('WS ERROR', {readyState: this.ws && this.ws.readyState}, arguments);

  if (! err.code) {
    err.code = 'WS_ERROR';
  }

  err.subject = this;
  err.data = {
    readyState: this.ws && this.ws.readyState,
  }

  O.log.error(err);

  this.close();
};

exports.addLink = function(socket) {  // {{{2
/**
 * Register a new [link]
 *
 * @param socket {Object} `Socket` instance - one end of the `link`.
 *
 * @method addLink
 */

  var result;

  if (! this.links) {
    throw O.error(this, 'Adding link to invalid WS');
  }

  switch (typeof socket) {
  case 'object':
    if (socket._lid) {
      result = socket._lid;
    } else {
      result = socket._lid = Math.round(Math.random() * 0xF0000000) + 0x10000000;  // Number between 0x10,00,00,00 - 0xFF,FF,FF,FF
    }
    socket._ws = this;

    break;
  case 'function':
    result = Math.round(Math.random() * 0xF0000000) + 0x10000000;  // Number between 0x10,00,00,00 - 0xFF,FF,FF,FF
    break;
  default:
    throw O.error(this, 'Invalid socket', socket);
  }

  var lid = result.toString(16);
  if (lid in this.links) {
    throw O.error(this, 'DUPLICIT_LID', result);
  }

  this.links[lid] = socket;

//  console.log('WS LINK ADDED', this.peer.name, result);

  return result;
};

exports.delLid = function(lid) {  // {{{2
/**
 * Deregister the `link` identified by `lid`
 *
 * @param lid {Number} O.link id of the `link` to deregister.
 *
 * @method delLid
 */

//  console.log('WS DEL LID', this.peer && this.peer.name, lid);

  if (! lid) {
    console.log('MISSING LID !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.trace();
  }

  if (! this.links) {
    console.log('MISSING LINKS !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.trace();
  }

  delete this.links[lid.toString(16)];

//  console.log('WS LINK REMOVED', lid);
};

exports.tx = function(data, dontVerifyPeer) {  // {{{2
/**
 * Transmit data to peer via WebSocket object.
 *
 * @param data {Object} Data to be sent
 *
 * @method tx
 */

  if (! data) {
    throw O.error(this, 'Invalid request', data);
  }

  if (! dontVerifyPeer && ! this.peer) {
    throw O.error(this, 'UNEXPECTED', 'Trying to send data to WebSocket wrapper without peer!', data);
  }

  if (! (this.ws && this.ws.readyState === 1)) {
    throw O.error(this, 'UNEXPECTED', 'Trying to send data to closed WebSocket!', data);
  }

  console.log('TX >>>>>>', this.peer && this.peer.name, JSON.stringify(data));

  try {
    var data = JSON.stringify(data);
  } catch (err) {
    err.subject = this;
    err.data = data;

    O.log.error(err);

    this.close();
    return;
  }

  this.ws.send(data);
  this.lastTx = new Date().getTime();
  return;
};

exports.txError = function(lid, err) {  // {{{2
/**
 * Send error message to peer via the WebSocket object.
 *
 * @param lid {Number} O.link id
 * @param err {Object} `Error` instance
 *
 * @method txError
 */

//  console.log('TX ERROR >>>>>>>>>>>>>>>>>>>>>>>>>>>>> ');
//  O.log.error(err);

  this.tx({
    type: 'error',
    lid: lid,
    subject: O.identify(err.subject),
    code: err.code,
    message: err.message,
    data: err.data,
  });
};

exports.isConnected = function() {  // {{{2
/**
 * Check whether the WebSocket object is connected
 *
 * @method isConnected
 */

  return Boolean(this.ws && (this.ws.readyState === 1));
};

exports.onTime = function() {  // {{{2
/**
 * Regularly check the socket state and take according actions. Timer
 * is defined by parts of this class dependent on the runtime environment.
 *
 * @method onTime
 */

//  console.log('WS ON TIME', {readyState: this.ws && this.ws.readyState});

  var now = new Date().getTime();
  var lastTx = now - this.lastTx;

  if (lastTx > 20000) {
    if (this.isConnected()) {
      this.tx({type: 'ping'});
    }
  }

  if ((now - this.lastRx) > 50000) {
//    console.log('RX TIMEOUT', this.lastRx);

    this.close();
  }
};

// }}}1
