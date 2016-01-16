'use strict';

var O = require('ose').class(module, C, 'EventEmitter');

var Rx = require('./rx');
var Ws = O.class('../ws');

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
 * Peer name unique within a space. It is good
 * practice to use a server domain name.
 *
 * @property name
 * @type String
 */

/**
 * Space to which this peer belongs
 *
 * @property space
 * @type Object
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
 * @internal
 */

// Public {{{1
function C(space, name) {  // {{{2
/**
 * Class constructor.
 *
 * @param space {Object} Space the peer belongs to
 * @param name {String} Peer name
 *
 * @method constructor
 * @internal
 */

  //console.log('CREATING PEER', name, url);

  O.super.call(this);

  this.space = space;
  this.name = name;
}

exports.toString = function() {  // {{{2
/**
 * Return short peer description
 *
 * @return {String} Peer description
 *
 * @method toString
 */

  return 'Peer: ' + this.name + ' ' + (this.space && this.space.name || '') + (this.spid ? '/' + this.spid : '');
};

exports.remove = function() {  // {{{2
/**
 * Removes peer
 *
 * @method remove
 * @internal
 */

  delete this.space.peers[this.name];
  delete this.url;

  this.close();
};

exports.urlFromWindowLocation = function() {  // {{{2
/**
 * Determines peer url from current `window.location`
 *
 * @method urlFromWindowLocation
 * @internal
 */

  if (! (window && window.location && window.location.protocol && window.location.host)) {
    throw O.log.error(this, 'UNEXPECTED', 'window.location object is not in global closure');
  }

  if (window.location.protocol === 'https:') {
    this.url = 'wss';
  } else {
    this.url = 'ws';
  }

  this.url += '://' + window.location.host;
};

exports.connect = function(force, cb) {  // {{{2
/**
 * Call to connect as a client to the server peer defined in
 * `this.url`.
 *
 * @param [force] {Boolean} Force connection even when other WebSocket connection is already active.
 * @param [cb] {Object} Dependencies object
 *
 * @method connect
 */

  if (this.connectTimeout) {
    clearTimeout(this.connectTimeout);
    delete this.connectTimeout;
  }

  if (! this.url) return;

  if (this.isConnected()) {
    if (! force) return;

    this.close();
  }

  if (! O.log.isSuppressed(this, 'CONNECT', 3)) {
    O.log.notice('Connecting to server ...', {peer: this.name, url: this.url});
  }

  this.keep = true;

  if (cb) {
    this.once('connected', function(is) {
      cb(null, is);
    });
  }

  this.ws = new Ws();
  this.ws.peer = this;
  this.ws.rx = rxServer;
  this.ws.open(this.url + '/' + O.random());

  return;
};

exports.isConnected = function() {  // {{{2
/**
 * Check whether the peer is connected
 *
 * @method isConnected
 */

//  console.log('PEER IS CONNECTED', Boolean(this.ws && this.ws.ws && (this.ws.ws.readyState === 1) && (this.ws.rx === rxData)));

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

exports.close = function(flipped, err) {  // {{{2
/**
 * Call to close WebSocket connection to remote peer.
 *
 * @param flipped {Boolean} Whether the underlying WebSocket was closed
 *
 * @method close
 * @internal
 */

//  console.log('PEER CLOSE', this.name, flipped);

  var that = this;

  var ws = this.ws;
  if (ws) {
    flipped = true;
    delete ws.peer;
    delete this.ws;

    ws.close();
  }

  if (this.connectTimeout) {
    clearTimeout(this.connectTimeout);
    delete this.connectTimeout;
  }

  if (this.url && this.keep) {
    this.connectTimeout = setTimeout(function() {
      delete that.connectTimeout;
      that.connect();
    }, 10000);
  }

  if (flipped) {
    if (! O.log.isSuppressed(this, err && err.code, 3)) {
      var d = {peer: this.name};
      if (this.url) d.url = this.url;
      if (err) {
        d.message = err.message;
        d.code = err.code;
      }
      O.log.notice('Peer closed', d);
    }

    this.emit('connected', false);
  }

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
 * @internal
 */

  O.log.notice('Verifying new client connection ...', {peer: this.name});

  if (this.ws) {
    this.close();
  }

  return true;
};

exports.connectClient = function(ws) {  //  {{{2
/**
 * Called after a remote peer WebSocket connects as a client to this HTTP server.
 *
 * @param ws {Object} WebSocket
 *
 * @method verify
 * @internal
 */

  if (this.ws) {
    O.log.error(this, 'UNEXPECTED', 'Duplicit WebSocket');
    ws.close();
    return;
  }

  this.ws = ws;
  ws.peer = this;
  ws.rx = rxData;

  ws.tx({confirmed: true});

  O.log.notice('Connected.', this.toString());

  this.emit('connected', true);
  return;
};

exports.getGw = function(cb) {  // {{{2
/**
 * Finds a peer acting as a gateway
 *
 * @param cb {Function} Callback
 *
 * @method getGw
 */

  if (this.url || this.isConnected()) {
    cb(null, this);
    return;
  }

  if (this.gw) {
    this.gw.getGw(cb);
    return;
  }

  if (O.gw) {
    cb(null, O.gw);
    return;
  }

  cb(O.error(this, 'UNREACHABLE', 'Can\'t find gateway to this peer'));
  return;
};

exports.getWs = function(wait, cb) {  // {{{2
/**
 * Finds a WebSocket for the current peer or a gateway to this
 * peer. Returns connected [WebSocket wrapper].
 *
 * @param cb {Function(err, ws)} Response callback
 *
 * @method getWs
 */

  if (! cb) {
    cb = wait;
    wait = undefined;
  }

  if (this.isConnected()) {
    cb(null, this.ws);
    return;
  }

  if (this.url) {
    if (! wait) {
      cb(O.error(that, 'DISCONNECTED', 'Peer is not connected'));
      return;
    }

    var that = this;
    this.once('connected', function(is) {
      console.log('CONNECTED 3', is);

      if (is) {
        cb(null, that.ws);
        return;
      }

      cb(O.error(that, 'UNREACHABLE', 'Peer is not reachable'));
      return;
    });
    return;
  }

  if (this.gw) {
    this.gw.getWs(wait, cb);
    return;
  }

  if (O.gw && O.gw !== this) {
    O.gw.getWs(wait, cb);
    return;
  }

  cb(O.error(this, 'UNREACHABLE'));
  return;
};

exports.coreShard = function(shard) {  // {{{2
/**
 * Defines the core shard of the OSE instance represented by this peer.
 *
 * @param shard {Object} [Shard] instance that acts as the core shard.
 *
 * @method coreShard
 * @internal
 */

  if (this.core) {
    O.log.error(this, 'Duplicit core shard', {current: this.core, shard: shard});
    return;
  }

  this.core = shard;
  this.entry = shard.entry(this.name, 'peer', {name: this.name});

  return;
};

// WS {{{1
// All methods are bound to "ws"
function rxServer(val) {  // {{{2
/**
 * Called, when received "server" message as a client.
 */

  if (! (
    val.space === this.peer.space.name &&
    val.peer === this.peer.name
  )) {
    O.log.error(this, 'This is not the right peer');
    this.close();
    return;
  }

  this.rx = rxConfirm;

  this.tx({
    space: O.here.space.name,
    peer: O.here.name,
  });
  return;
};

function rxConfirm(val) {  // {{{2
/**
 * Called, when received "confirm" message as a client.
 */

  if (val.confirmed) {
    this.rx = rxData;

    O.log.notice('Connected.', this.peer.name);

    O.log.liftSuppress(this.peer);
    this.peer.emit('connected', true);
  } else {
    this.close();
  }
};

function rxData(val) {  // {{{2
/**
 * Standard peer to peer communication RX handler. This handler is assigned to ws.rx.
 *
 * @param this {Object} WS object
 * @param val {Object} JSON data
 *
 */

  if (val.type !== 'ping') {
    console.log('RX <<<<<<', this.peer.name, JSON.stringify(val));
  }

  this.lastRx = Date.now();

  var handler = Rx[val.type];

  if (typeof handler === 'function') {
    handler(this, val);
  } else {  // Invalid message type, something is really broken.
    O.log.error(this.peer, 'UNKNOWN_HANDLER', val.type);
    this.close();
  }
};

