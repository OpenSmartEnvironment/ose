'use strict';

var Ose = require('ose');
var M = Ose.module(module);

var WsMaster = M.class('../ws/master');
var WsRelay = M.class('../ws/relay');
var WsSlave = M.class('../ws/slave');
var WsWritable = M.class('../ws/writable');

/** Doc {{{1
 * @module ose
 * @submodule ose.peer
 */

/**
 * @caption Peer RX handlers
 *
 * @readme
 * This module contains handlers for incomming communication of
 * standard peer to peer traffic.
 *
 * @class ose.lib.peer.rx
 * @type module
 */

// Public {{{1
exports.ping = function(ws, req) {  // {{{2
/**
 * Ping handler.
 * TODO: respond pong
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method ping
 */

  ws.lastRx = new Date().getTime();

//  M.log.missing();
};

exports.pong = function(ws, req) {  // {{{2
/**
 * Pong handler.
 * TODO: Calculate timeshift
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method pong
 */

  M.log.missing();
};

exports.shard = function(ws, req) {  // {{{2
/**
 * Establishes a link to the master shard
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method shard
 */

  Ose.spaces.getShard(req.shard, function(err, shard) {
    if (err) {
      ws.txError(req.newLid, err);
    } else {
      shard.linkSlave(new WsMaster(ws, req.newLid, req.handlers));
    }
  });
};

exports.open = function(ws, req) {  // {{{2
/**
 * Open link response handler
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method open
 */

  var socket = getLink(ws, req);
  if (! socket) return;

  if (socket.link === 'relay') {
    new WsRelay(ws, req, socket);
    return;
  }

  if (typeof socket.open !== 'function') {
    error(socket, 'MISSING_HANDLER', 'open');
    return;
  }

  new WsSlave(ws, socket, req.handlers, req.data);

  return;
};

exports.close = function(ws, req) {  // {{{2
/**
 * Close link handler
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method close
 */

  var s = relayClose(ws, req);
  if (s) {
    Ose.link.close(s, req.data);
  }
};

exports.error = function(ws, req) {  // {{{2
/**
 * Error handler
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method error
 */

  var s = relayClose(ws, req);
  if (s) {
    Ose.link.error(s, Ose.error(ws.peer, req.code || 'RX_ERROR', req.message, req.data));
  }
};

exports.readStream = function(ws, req) {  // {{{2
/**
 * Read entry stream handler
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method readStream
 */

  var socket = getLink(ws, req);
  if (! socket) return;

  socket.shard.readStream(req.entry, function(err, stream) {
    if (err) {
      ws.txError(req.newLid, err);
      return;
    }

    new WsWritable(ws, req, stream);
  });
  return;
};

exports.chunk = function(ws, req) {  // {{{2
/**
 * Stream chunk handler
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method chunk
 */

  var socket = getLink(ws, req);
  if (! socket) return;

  socket.push(req.data, 'hex');
  return;
};

exports.command = function(ws, req) {  // {{{2
/**
 * Command handler
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method command
 */

  var master;

  var socket = getLink(ws, req);
  if (! socket) return;

  if (socket.ws) {  // Relay
    if (req.newLid) {
      master = new WsMaster(ws, req.newLid);
      master.link = 'relay';
      socket.ws.addLink(master);
    }
    socket.ws.tx(req);
    return;
  }

  if (Ose.link.forbiddenNames.indexOf(req.name) >= 0) {
    Ose.link.error(socket, Ose.error(ws, 'FORBIDDEN_HANDLER', req.name));
    return;
  };

  if (typeof socket[req.name] !== 'function') {
    Ose.link.error(socket, Ose.error(socket, 'MISSING_HANDLER', req.name));
    return;
  }

  if (req.newLid) {
    master = new WsMaster(ws, req.newLid, req.handlers);
  }

//  console.log('CALLING COMMAND', req.name, req.data, typeof master);

  socket[req.name](req.data, master);
  return;
};

// }}}1
// Private {{{1
function getLink(ws, req) {  // {{{2
  if (! req.lid) {
    M.log.error(Ose.error(ws, 'MISSING_LINK', req));
    return;
  }

  var result = ws.links[req.lid.toString(16)];
  if (result) {
    return result;
  }

  if (req.type === 'error') {
    M.log.error(Ose.error(ws, 'MISSING_LINK', req));
  } else {
    ws.txError(req.lid, Ose.error(ws, 'MISSING_LINK', req));
  }
  return;
};

function error(ws, err, data) {  // {{{2
  err = Ose.error(ws, err, data);

  if (data.lid) {
    ws.txError(data.lid, err);
  }

  M.log.error(err);
};

function relayClose(ws, req) {  // {{{2
/**
 * When relayed or when socket was not found returns `undefined`, otherwise returns socket.
 */

  var s = getLink(ws, req);
  if (! s) return undefined;

  ws.delLid(req.lid);

  if (! s.ws) {
    if (s.link) {
      delete s.link.ws;
      delete s.link.link;
      delete s.link._lid;
      delete s.link;
      delete s._lid;
    }

    return s;
  }

  var ws = s.ws;
  delete s.ws;
  delete s._lid;

  if (s.link !== 'relay') {
    delete s.link.ws;
    delete s.link.link;
    delete s.link._lid;
    ws.delLid(req.lid);
  }

  delete s.link;

  ws.tx(req);

  return undefined;
};

// }}}1
