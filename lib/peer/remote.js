'use strict';

var Ose = require('ose');
var M = Ose.class(module, C, 'EventEmitter');

var Rx = require('./rx');
var Ws = M.class('../ws');


/** Doc {{{1
 * @module ose
 * @submodule ose.peer
 */

/**
 * @caption Remote peer
 *
 * @readme
 * Each instance of this class represents another OSE instance and
 * encapsulates communication with it.  It creates and manages the
 * [WebSocket wrapper] class instance, which handles communication
 * through WebSockets.  Can act as a server or a client.
 *
 * Keeps the connection opened by reconnecting.
 *
 * @aliases peer
 * @class ose.lib.peer.remote
 * @type class
 */

/**
 * Peer name unique within a group of communicating peers. It is good
 * practice to use a server domain name.
 *
 * @property name
 * @type String
 */

/**
 * WebSockets URL. When defined, the peer can connect as a client to a
 * near OSE instance.
 *
 * @property url
 * @type String
 */

/**
 * Current [WebSocket wrapper] instance connected to an OSE instance
 * represented by this peer.
 *
 * @property ws
 * @type Object
 */

// Public {{{1
function C(name, url) {  // {{{2
/**
 * Class constructor.
 *
 * @param name {String} Peer name
 * @param url {String} WebSockets URL
 *
 * @method constructor
 */

//  console.log('CREATING PEER', name, url);

  M.super.call(this);

  this.name = name;

  switch (url) {
    case null:
    case undefined:
      break;
    case 'window.location':  // Determine url from "window.location" object.
      if (window.location.protocol === 'https:') {
        this.url = 'wss';
      } else {
        this.url = 'ws';
      }

      this.url += '://' + window.location.host + '/' + Ose.name;

      break;
    default:
      this.url = url + '/' + Ose.name;
  }

  M.log.notice('Peer initialized', this.name);
};

exports.connect = function(force) {  // {{{2
/**
 * Call to connect as a client to the server peer defined in
 * `this.url`.
 *
 * @param force {Boolean} Force connection even when other WebSocket connection is already active.
 *
 * @method connect
 */

  delete this.connectTimeout;

  if (! this.url) return;

  this.keep = true;

  if (this.ws) {
    if (force || ! this.isConnected()) {
      this.close();
    }
  }

  M.log.notice('Connecting to server ...', {peer: this.name, url: this.url});

  newSocket(this, rxServerConfirm).open(this.url);

  return;
};

exports.isConnected = function() {  // {{{2
/**
 * Check whether the peer is connected
 *
 * @method isConnected
 */

  return Boolean(this.ws && this.ws.ws && (this.ws.ws.readyState === 1) && (this.ws.rx === rxData));
};

exports.disconnect = function() {  // {{{2
/**
 * Call to close the WebSocket connection to a remote peer and not attempt to reconnect
 *
 * @method disconnect
 */

  this.keep = false;

  this.close();
};

exports.close = function() {  // {{{2
/**
 * Call to close WebSocket connection to remote peer.
 *
 * @method disconnect
 */

  if (this.ws) {
    var ws = this.ws;

    delete this.ws.peer;
    delete this.ws;

    ws.close();
  }

  if (this.connectTimeout) {
    clearTimeout(this.connectTimeout);
  }

  if (this.url && this.keep) {
    this.connectTimeout = setTimeout(this.connect.bind(this), 10000);
  }

  M.log.notice('Peer closed', {peer: this.name, url: this.url});
//  console.trace();

  this.emit('connected', false);

  return;
};

exports.verify = function(req) {  // {{{2
/**
 * Called before a remote peer WebSocket connects as a client to this
 * HTTP server.
 *
 * @param req {Object} Verification request data.
 *
 * @method verify
 * @private
 */

  M.log.notice('Verifying new client connection ...', {peer: this.name});

  if (this.ws) {
    this.close();
  }

  return true;
};

exports.serverConnect = function(ws) {  //  {{{2
/**
 * Called after a remote peer WebSocket connects as a client to this HTTP server.
 *
 * @param req {Object} Verification request data.
 *
 * @method verify
 * @private
 */

  M.log.notice('Client socket connected, authenticating ...', this.name);

  if (this.ws) {
    M.log.error(Ose.error(this, 'duplicitWs'));
  } else {
    newSocket(this, rxClientConfirm).setWs(ws);
  }
};

exports.getWs = function(cb) {  // {{{2
/**
 * Finds a WebSocket for the current peer or a gateway to this
 * peer. Returns connected [WebSocket wrapper].
 *
 * @param cb {Function(err, ws)} Response callback
 *
 * @method getWs
 */

  if (this.isConnected()) {
    cb(null, this.ws);
    return;
  }

  if (this.url) {
    var that = this;
    this.once('connected', function(is) {
      if (is) {
        cb(null, that.ws);
      } else {
        cb(Ose.error(that, 'UNREACHABLE'));
      }
    });
    return;
  }

  if (this.gw) {
    this.gw.getWs(cb);
    return;
  }

  if (Ose.peers.gw) {
    Ose.peers.gw.getWs(cb);
    return;
  }

  cb(Ose.error(this, 'UNREACHABLE'));
  return;
};

exports.coreShard = function(shard) {  // {{{2
/**
 * Defines the core shard of the OSE instance represented by this peer.
 *
 * @param shard {Object} [Shard] instance that acts as the core shard.
 *
 * @method coreShard
 * @private
 */

  if (this.core) {
    M.log.error(Ose.error(this, 'duplicitCoreShard', {current: this.core, shard: shard}));
    return;
  }

  this.core = shard;
  this.entry = shard.entry(this.name, 'peer', {name: this.name});

  return;
};

// }}}1
// WS {{{1
// All methods are bound to "ws"
function rxClientConfirm(data) {  // {{{2
/**
 * Called, when received "confirm" message as a client.
 */

  if (data.confirmed) {
    this.rx = rxData;

    M.log.notice('Connected.', this.peer.name);

    this.peer.emit('connected', true);
  } else {
    this.close();
  }
};

function rxServerConfirm() {  // {{{2
/**
 * Called, when received "confirm" message as a server.
 */

  this.rx = rxData;
  this.tx({confirmed: true});

  M.log.notice('Connected.', this.peer.name);

  this.peer.emit('connected', true);
};

function rxData(data) {  // {{{2
/**
 * Standard peer to peer communication RX handler. This handler is assigned to ws.rx.
 *
 * @param this {Object} WS object
 * @param data {Object} JSON data
 *
 */

//  console.log('RX <<<<<<', this.peer.name, JSON.stringify(data));

  this.lastRx = new Date().getTime();

  var handler = Rx[data.type];

  if (typeof handler === 'function') {
    handler(this, data);
  } else {  // Invalid message type, something is really broken.
    M.log.error(Ose.error(this.peer, 'UNKNOWN_HANDLER', data.type));
    this.close();
  }
};

// }}}1
// Private {{{1
function newSocket(that, rx) {  // {{{2
  if (that.ws) {
    throw Ose.error(this, 'DUPLICIT_SOCKET');
  }

  var result = new Ws();
  result.peer = that;
  result.rx = rx;

  that.ws = result;

  return result;
};

// }}}1
