'use strict';

var O = require('ose').class(module).append('runtime');

var SS = O.link.socketState;

/** Docs {{{1
 * @submodule ose.peer
 */

/**
 * @caption WebSocket wrapper class
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

exports.close = function(err) {  // {{{2
/**
 * Close WebSocket object, send a `disconnect` error to all peers, clean
 * handlers, deregister from peer.
 *
 * @method close
 */

//  console.log('WS CLOSE', this.peer && this.peer.name, err);

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
    peer.close(true, err);
  }

  if (! links) return;

  var e = O.error(this, 'DISCONNECTED', 'Closing WebSocket');

  for (var key in links) {
    var socket = links[key];
    delete links[key];

    if (typeof socket !== 'object') continue;

    switch (socket._state) {
    case SS.RELAY:
      var w2 = socket._ws
      var r = socket._relay;

      delete socket._ws;
      delete socket._relay;
      socket._state = SS.SPLIT;

      delete r._ws;
      delete r._relay;
      r._state = SS.SPLIT;

      w2.delLid(req.lid);
      w2.txError(socket._lid, e);
      break;
    case SS.MOCK:
      var w2 = socket._ws
      delete socket._ws;
      socket._state = SS.SPLIT;

      w2.txError(socket._lid, e);
      break;
    case undefined:
    case SS.OPENED:
      delete socket._ws;
      socket._state = SS.SPLIT;

      if (O.isSuper('EventEmitter', socket)) {
        if (socket.listeners('split').count) {
          socket.emit('split', e);
          continue;
        }

        socket.emit('error', e);
        continue;
      }

      if (typeof socket.split === 'function') {
        socket.split(e);
        continue;
      }

      if (typeof socket.error === 'function') {
        socket.error(e);
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
 * @internal
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
 * @internal
 */

//  console.log('WS OPEN');

//  this.rx();
};

exports.wsClose = function() {  // {{{2
/**
 * WebSocket object close handler, called after a WebSocket is closed.
 *
 * @method wsClose
 * @internal
 */

//  console.log('WS CLOSE', {readyState: this.ws && this.ws.readyState}, arguments);

  this.close();
};

exports.wsError = function(err) {  // {{{2
/**
 * WebSocket object error handler, called on WebSocket error.
 *
 * @param err {Object} Error instance
 *
 * @method wsError
 * @internal
 */

//  console.log('WS ERROR', {readyState: this.ws && this.ws.readyState}, arguments);

  if (! err.code) {
    err.code = 'WS_ERROR';
  }

  err.subject = this;
  err._data = {
    readyState: this.ws && this.ws.readyState,
  }

  if (err.code !== 'ECONNREFUSED') {
    O.log.error(err);
  }

  this.close(err);
};

exports.replaceLink = function(socket) {  // {{{2
  if (! this.links) {
    throw O.error(this, 'Adding link to invalid WS');
  }

  var s = this.links[socket._lid.toString(16)];

  if (! s || s._state !== SS.MOCK) {
    throw O.error(this, 'Replacing invalid socket', s && s._state);
  }

  this.links[socket._lid.toString(16)] = socket;
};

exports.addLink = function(socket) {  // {{{2
/**
 * Register a new [link]
 *
 * @param socket {Object} `Socket` instance - one end of the `link`.
 *
 * @method addLink
 */

  // TODO: check lid duplicity

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

exports.addLid = function(lid, socket) {  // {{{2
/**
 * Register a new [link]
 *
 * @param socket {Object} `Socket` instance - one end of the `link`.
 *
 * @method addLid
 * @internal
 */


  var result;

  if (! this.links) {
    throw O.error(this, 'Adding link to invalid WS');
  }

  var lid = lid.toString(16);
  if (lid in this.links) {
    throw O.error(this, 'DUPLICIT_LID', result);
  // TODO: check and handle lid duplicity
  }

  this.links[lid] = socket;

//  console.log('WS LINK ADDED', this.peer.name, result);

  return lid;
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


  try {
    /*
    if (! (this.ws && this.ws.readyState === 1)) {
      throw O.error(this, 'UNEXPECTED', 'Trying to send data to closed WebSocket!', data);
    }
    */

    if (data.type !== 'ping') {
      console.log('TX >>>>>>', this.peer && this.peer.name, JSON.stringify(data));
    }

    this.ws.send(JSON.stringify(data));
  } catch (err) {
    err.subject = this;
    err._data = data;

    this.close(err);
    return;
  }

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
    data: err._data,
  });
};

exports.isConnected = function() {  // {{{2
/**
 * Check whether the WebSocket object is connected
 *
 * returns {Boolean} Whether the WebSocket object is connected
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
    this.close(O.error(this, 'TIMEOUT', 'Communication timeout', this.lastRx));
  }
};

// }}}1
