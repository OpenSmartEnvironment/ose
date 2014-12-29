'use strict';

var Ose = require('ose');
var M = Ose.singleton(module);
exports = M.init();

var Remote = M.class('./remote');

/** Doc {{{1
 * @module ose
 * @submodule ose.peer
 */

/**
 * @caption Peer list
 *
 * @readme
 * Singleton containing all registered peers. The singleton can be
 * accessed through `Ose.peers`. A single peer can be accessed through
 * `Ose.peers.get(peer name)`.
 *
 * @class ose.lib.peer.list
 * @type singleton
 */

/**
 * Near peer instance that act as a default gateway to far peers
 *
 * @property gw
 * @type Object
 */

/**
 * Own OSE instance peer, reference to [ose/lib/peer/here] singleton.
 *
 * @property here
 * @type Object
 */

// Public {{{1
exports.here = require('./here');

exports.config = function(name, peers, gw) {  // {{{2
/**
 * Singleton initialization method.
 *
 * @param name {String} Peer name
 * @param peers {Object} Contains name: uri pairs for individual remote peers.
 * @param gw {String} Peer name that act as a default gateway to far peers.
 *
 * @method config
 */

//  console.log('INIT PEERS', peers);

  Peers[name] = this.here;
  this.here.name = name;

  for (var key in peers) {
    this.peer(key, peers[key]);
  }

  if (gw) {
    this.gw = this.peer(gw);
  }

  Ose.plugins.once('initialized', this.connect);
};

exports.peer = function(name, url) {  // {{{2
/**
 * Get an existing peer by the `name` or create a new one.
 *
 * @param name {String} Peer name to retrieve or create.
 * @param url {String} Peer WebSockets URL.
 *
 * @return {Object} Peer instance
 *
 * @method peer
 */

  if (typeof name !== 'string') {
    throw Ose.error(this, 'invalidArguments', {name: name});
  }

  if (name in Peers) {
    // TODO: Set up URL
    return Peers[name];
  }

  return Peers[name] = new Remote(name, url);
};

exports.get = function(name, cb) {  // {{{2
/**
 * Get a peer by its `name`.
 *
 * @param name {String} Peer name to retrieve.
 * @param cb {Callback} Response callback.
 *
 * @method get
 * @async
 */

  if (name in Peers) {
    cb(null, Peers[name]);
  } else {
    cb(Ose.error(this, 'peerNotFound', name));
  }
};

exports.remove = function(peer) {  // {{{2
/**
 * Disconnect and remove `peer`.
 *
 * @param peer {Object} Peer to be removed.
 *
 * @method get
 */

  if (peer.ws) {
    peer.clearWs();
  }

//  console.log('PEERS REMOVE', peer.name, peer.id);

  delete Peers[peer.name];

  peer.removed();
};

exports.connect = function() {  // {{{2
/**
 * Connect all peers with url defined.
 *
 * @method connect
 */

  for (var key in Peers) {
    var p = Peers[key];
    if (! p.ws) {
      p.connect();
    }
  }
};

exports.disconnect = function() {  // {{{2
/**
 * Disconnect all peers.
 *
 * @method disconnect
 */

  for (var key in Peers) Peers[key].disconnect();
};

// }}}1
// Event Handlers {{{1
exports.onVerify = function(data) {  // {{{2
/**
 * Verify event handler. Called before a remote peer WebSocket
 * connects as a client to this HTTP server.
 *
 * @param data {Object} Verification request data.
 *
 * @method onVerify
 * @private
 */

  var name = data.req.url.substr(1);

  var peer = Peers[name];

//  console.log('PEERS VERIFY', name, peer && peer.name, peer && peer.id);

  if (! peer) {
    peer = new Remote(name);
    peer.dynamic = true;
  }

  if (! peer.verify(data.req)) return false;

  Peers[name] = peer;

  return true;
}

exports.onConnect = function(ws) {  // {{{2
/**
 * Connect event handler. Called after remote peer WebSocket connects
 * as a client to this HTTP server.
 *
 * @method onConnect
 * @private
 */

  var peer = Peers[ws.upgradeReq.url.substr(1)];

  if (peer) {
//    console.log('PEERS CONNECT', ws.upgradeReq.url, peer.name, peer.id);

    peer.serverConnect(ws);
  } else {
    M.log.error(Ose.error(this, 'peerNotFound', {url: ws.upgradeReq.url}));
    ws.close();
  }
}

// }}}1
// Private {{{1
var Peers = {};

// }}}1
