'use strict';

const O = require('ose')(module);

var L = O.link;
var SS = L.socketState;
var Shard = O.getClass('../shard');
var ShardSlave = O.getClass('../shard/slave');
var SpaceSlave = O.getClass('../space/slave');
var WsWritable = O.getClass('../ws/writable');

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

  ws.lastRx = Date.now();
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

  O.log.todo();
};

exports.space = function(ws, req) {  // {{{2
/**
 * Establishes a link to the master space
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method space
 */

  var socket = L.mock(ws, req);

  O.data.getSpace(req.space, function(err, space) {
    if (! L.canOpenMock(socket)) return true;
    if (err) return L.error(socket, err);

    new SpaceSlave(space, socket);
    return false;
  });
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

  var socket = L.mock(ws, req);

  O.data.getSpace(req.space, function(err, space) {
    if (! L.canOpenMock(socket)) return false;
    if (err) return L.error(socket, err);

    return space.getShard(req.sid, function(err, shard) {
      if (! L.canOpenMock(socket)) return false;
      if (err) return L.error(socket, err);

      if (shard.isAtHome()) {
        new ShardSlave(shard, socket);
        return false;
      }

      return shard.awaitSteadyMaster(function(err) {
        if (! L.canOpenMock(socket)) return false;
        if (err) return L.error(socket, err);

        new ShardSlave(shard, socket);
        return false;
      });
    });
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

  switch (typeof socket) {
  case 'object':
    if (socket._state) break;

    if (typeof socket.open !== 'function') {
      error(ws, socket, req, 'Missing socket handler', 'open');
      return;
    }

    socket._state = SS.OPENED;
    socket.open(req.data);

    return;
  case 'function':
    if (socket._state !== SS.MOCK) break;

    var r = {
      _state: SS.RELAY,
      _ws: ws,
      _lid: socket._lid,
      _relay: socket,
    };

    socket._state = SS.RELAY;
    socket._relay = r;
    socket._ws.addLid(r._lid, r);

    socket._ws.tx(req);
    return;
  }

  return error(ws, socket, req, 'Trying to open socket that is not waiting for open', socket._state);
};

exports.close = function(ws, req) {  // {{{2
/**
 * Close link
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method close
 */

  var socket = getLink(ws, req);
  if (! socket) return;

  ws.delLid(req.lid);

  switch (typeof socket) {
  case 'object':
    break;
  case 'function':
    socket(null, req.data);
    return;
  default:
    error(ws, socket, req, 'Socket must be a function or object');
    return;
  }

  switch (socket._state) {
  case undefined:
  case SS.OPENED:
    delete socket._ws;
    if (O.isSuper('EventEmitter', socket)) {
      socket._state = SS.CLOSED;
      socket.emit('close', req.data);
      return;
    }

    if (typeof socket.close !== 'function') {
      error(ws, socket, req, 'Missing socket handler', 'close');
      return;
    }

    socket._state = SS.CLOSED;
    socket.close(req.data);
    return;
  case SS.RELAY:
    var r = socket._relay;
    delete socket._relay;
    delete r._ws;
    delete r._relay;
    r._state = SS.CLOSED;
    // NO BREAK
  case SS.MOCK:
    var w2 = socket._ws;
    delete socket._ws;
    socket._state = SS.CLOSED;

    w2.delLid(req.lid);
    w2.tx(req);
    return;
  }

  error(ws, socket, req, 'Trying to close not opened socket', socket._state);
  return;
};

exports.error = function(ws, req) {  // {{{2
/**
 * Close link with error
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method error
 */

  var err = new Error(req.message);
  err.ident = req.subject;
  err.code = req.code || 'RX_ERROR';
  err._data = req.data;

  var socket = getLink(ws, req);
  if (! socket) {
//    O.log.error(err);
    return;
  }

  ws.delLid(req.lid);

  switch (typeof socket) {
  case 'object':
    break;
  case 'function':
    socket(err);
    return;
  default:
    O.log.error(err);
    error(ws, socket, req, 'Socket must be a function or object');
    return;
  }

  switch (socket._state) {
  case undefined:
  case SS.OPENED:
    delete socket._ws;
    if (O.isSuper('EventEmitter', socket)) {
      socket._state = SS.ERROR;
      socket.emit('error', err);
      return;
    }

    if (typeof socket.error !== 'function') {
      O.log.error(err);
      error(ws, socket, req, 'Missing socket handler', 'error');
      return;
    }

    socket._state = SS.ERROR;
    socket.error(err);
    return;
  case SS.RELAY:
    var r = socket._relay;
    delete socket._relay;
    delete r._ws;
    delete r._relay;
    r._state = SS.ERROR;
    // NO BREAK
  case SS.MOCK:
    var w2 = socket._ws;
    delete socket._ws;
    socket._state = SS.ERROR;

    w2.delLid(req.lid);
    w2.tx(req);
    return;
  }

  O.log.error(err);
  error(ws, socket, req, 'Trying to close not opened socket with error', socket._state);
  return;
};

exports.send = function(ws, req) {  // {{{2
/**
 * Command handler
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method send
 */

  var socket = getLink(ws, req);
  if (! socket) return;
  if (typeof socket !== 'object') {
    error(ws, socket, req, 'Socket must be an object');
    return;
  }

  switch (socket._state) {
  case SS.OPENED:
    break;
  case SS.RELAY:
    if (req.newLid) {
      socket._ws.addLid(req.newLid, L.mock(ws, req));
    }
    socket._ws.tx(req);
    return;
  default:
    error(ws, socket, req, 'Trying to send data to socket that is not opened', socket._state);
    return;
  }

  var err = L.isForbidden(req.name);
  if (err) {
    error(ws, socket, req, err);
    return;
  }

  var master = L.mock(ws, req);

  if (O.isSuper('EventEmitter', socket)) {
    socket.emit(req.name, req.data, master);
    return;
  }

  if (typeof socket[req.name] !== 'function') {
    error(ws, socket, req, 'Missing handler', req.name);
    return;
  }

  socket[req.name](req.data, master);
  return;
};

exports.read = function(ws, req) {  // {{{2
/**
 * Read entry stream handler
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method read
 */

  var socket = getLink(ws, req);
  if (! socket) return;

  if (! req.newLid) {
    O.link.error(socket, O.error(socket, 'Read request must have `newLid` specified', req));
    return;
  }

  // TODO: relay

  if (O.isSuper('EventEmitter', socket)) {
    socket.emit(req.name, req.data, done);
    return;
  }

  if (typeof socket[req.name] === 'function') {
    socket[req.name](req.data, done);
    return;
  }

  ws.txError(req.newLid, O.error(socket, 'Missing handler', req.name));
  return;

  function done(err, stream) {
    if (! ws.isConnected()) {
      // TODO: close `stream`

      return;
    }

    if (err) {
      ws.txError(req.newLid, err);
      return;
    }

    new WsWritable(ws, req, stream);
    return;
  }
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

  socket.stream.push(req.data, 'hex');
  return;
};

// Private {{{1
function getLink(ws, req) {  // {{{2
  if (! req.lid) {
    O.log.error(ws, 'Missing link', req);
    return;
  }

  var result = ws.links[req.lid.toString(16)];
  if (result) {
    return result;
  }

  if (req.type === 'error') {
    O.log.error(ws, 'Missing link', req);
  } else {
    ws.txError(req.lid, O.error(ws, 'Missing link', req));
  }
  return;
};

function error(ws, socket, req, message, data) {  // {{{2
  var err = message instanceof Error ? message :
    O.applyError(ws, Array.prototype.slice.call(arguments, 3))
  ;

  if (L.canClose(socket)) {
    L.error(socket, err);
  }

  if (ws.isConnected()) {
    if (req.newLid) {
      ws.txError(req.newLid, err);
      return;
    }

    if (req.lid) {
      delete socket._ws;
      ws.txError(req.lid, err);
      return;
    }
  }

  O.log.error(err);
  return;
};

