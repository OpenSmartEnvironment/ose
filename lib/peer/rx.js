'use strict';

var O = require('ose').module(module);

var L = O.link;
var SS = L.socketState;
var LHS = L.homeState;
var WsWritable = O.class('../ws/writable');
var SpaceSlave = O.class('../space/slave');
var ShardSlave = O.class('../shard/slave');

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

//  O.log.missing();
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

  O.log.missing();
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

  var socket = mock(ws, req);

  O.getSpace(req.space, function(err, space) {
    if (! L.canReplace(socket)) {
      return;
    }

    if (err) {
      L.error(socket, err);
      return;
    }

    if (space.slaves) {
      if (req.newLid in space.slaves) {
        L.error(socket, O.log.todo('Duplicit lid', space, req));
        return;
      }
    } else {
      space.slaves = {};
    }

    var s = new SpaceSlave();
    s.space = space;
    space.slaves[req.newLid] = s;

    L.open(s, socket, {home: space.lhs === LHS.AT_HOME || space.lhs === LHS.HOME});
    return;
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

  var shard;
  var socket = mock(ws, req);

  O.getSpace(req.space, function(err, space) {
    // Check whether the socket is still openable
    if (! L.canReplace(socket)) {
      return;
    }
    if (err) {
      // Space was not found
      L.error(socket, err);
      return;
    }

    if (req.sid in space.shards) {
      shard = space.shards[req.sid];
      check();
      return;
    }

    // TODO: Check whether req.home is not this instance
    shard = new Shard();
    shard.setup(space, req.sid);
    shard.setupConfig(req.home, req.scope, req.alias);
    shard.setupDone();

    check();
    return;
  });

  function check() {
    switch (shard.lhsHome(socket)) {
    case undefined:
      return;
    case LHS.AT_HOME:
    case LHS.WAITING:
    case LHS.HOME:
    case LHS.MASTER:
      new ShardSlave(shard, socket);
      return;
    case LHS.LINKING:
      shard.once('lhs', function() {
        if (L.canReplace(socket)) {
          check();
        }
      });
      return;
    case LHS.CLOSED:
      shard.linkMaster(function() {
        if (L.canReplace(socket)) {
          check();
        }
      });
      return;
    }

    throw O.error(shard, 'Invalid `shard.lhs`', shard.lhs);
  }
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
  if (typeof socket !== 'object') {
    error(ws, socket, req, O.error(socket, 'Socket must be an object'));
    return;
  }

  switch (socket._state) {
  case undefined:
    break;
  case SS.RELAY:
    O.log.todo('relay');
    return;
  default:
    error(ws, socket, req, O.error(socket, 'Trying to open socket that is not waiting for open', socket._state));
    return;
  }

  if (O.isSuper('EventEmitter', socket)) {
    socket._state = SS.OPENED;
    socket.emit('open', req.data);
    return;
  }

  if (typeof socket.open !== 'function') {
    error(ws, socket, req, O.error(socket, 'Missing socket handler', 'open'));
    return;
  }

  socket._state = SS.OPENED;
  socket.open(req.data);

  return;
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
    error(ws, socket, req, O.error(socket, 'Socket must be a function or object'));
    return;
  }

  delete socket._ws;

  switch (socket._state) {
  case undefined:
  case SS.OPENED:
    break;
  case SS.RELAY:
    O.log.todo('relay');
    return;
  case SS.MOCK:
    socket._state = SS.CLOSED;
    return;
  default:
    error(ws, socket, req, O.error(socket, 'Trying to close not opened socket', socket._state));
    return;
  }

  if (O.isSuper('EventEmitter', socket)) {
    socket._state = SS.CLOSED;
    socket.emit('close', req.data);
    return;
  }

  if (typeof socket.close !== 'function') {
    error(ws, socket, req, O.error(socket, 'Missing socket handler', 'close'));
    return;
  }

  socket._state = SS.CLOSED;
  socket.close(req.data);

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

  var err = O.error(req.subject, req.code || 'RX_ERROR', req.message, req.data);

  var socket = getLink(ws, req);
  if (! socket) {
    O.log.error(err);
    return;
  }

  ws.delLid(req.lid);

  switch (typeof socket) {
  case 'object':
    break;
  case 'function':
    socket(null, err);
    return;
  default:
    O.log.error(err);
    error(ws, socket, req, O.error(socket, 'Socket must be a function or object'));
    return;
  }

  delete socket._ws;

  switch (socket._state) {
  case undefined:
  case SS.OPENED:
    break;
  case SS.RELAY:
    O.log.todo('relay');
    return;
  case SS.MOCK:
    socket._state = SS.ERROR;
    socket.error = err;
    return;
  default:
    O.log.error(err);
    error(ws, socket, req, O.error(socket, 'Trying to close not opened socket with error', socket._state));
    return;
  }

  if (O.isSuper('EventEmitter', socket)) {
    socket._state = SS.ERROR;
    socket.emit('error', err);
    return;
  }

  if (typeof socket.error !== 'function') {
    O.log.error(err);
    error(ws, socket, req, O.error(socket, 'Missing socket handler', 'error'));
    return;
  }

  socket._state = SS.ERROR;
  socket.error(err);

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
    error(ws, socket, req, O.error(socket, 'Socket must be an object'));
    return;
  }

  switch (socket._state) {
  case SS.OPENED:
    break;
  case SS.RELAY:
    O.todo('Relay');
    return;
  default:
    error(ws, socket, req, O.error(socket, 'Trying to send data to socket that is not opened', socket._state));
    return;
  }

  var err = L.isForbidden(req.name);
  if (err) {
    error(ws, socket, req, err);
    return;
  }

  var master = mock(ws, req);

  if (O.isSuper('EventEmitter', socket)) {
    socket.emit(req.name, req.data, master);
    return;
  }

  if (typeof socket[req.name] !== 'function') {
    error(ws, socket, req, O.error(socket, 'Missing handler', req.name));
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
 * @method readStream
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

/*




  // TODO custom commands
  socket.shard.readStream(req.data, function(err, stream) {
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
  });
  return;
  */
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

// }}}1
// Private {{{1
function getLink(ws, req) {  // {{{2
  if (! req.lid) {
    O.log.error(O.error(ws, 'Missing link', req));
    return;
  }

  var result = ws.links[req.lid.toString(16)];
  if (result) {
    return result;
  }

  if (req.type === 'error') {
    O.log.error(O.error(ws, 'Missing link', req));
  } else {
    ws.txError(req.lid, O.error(ws, 'Missing link', req));
  }
  return;
};

function error(ws, socket, req, err) {  // {{{2
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

  if (L.error(socket, err, true)) {
    O.log.error(err);
  }

  return;
};

function mock(ws, req) {  // {{{2
  if (! req.newLid) {
    return undefined;
  }

  var res = {
    _state: SS.MOCK,
    _lid: req.newLid,
    _ws: ws,
  };

  ws.addLink(res);  // TODO: check lid duplicity

  return res;
};

// }}}1
