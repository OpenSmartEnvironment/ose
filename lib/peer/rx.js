'use strict';

var O = require('ose').module(module);

var L = O.link;
var SS = L.socketState;
var LHS = L.homeState;
var Shard = O.class('../shard');
var ShardSlave = O.class('../shard/slave');
var SpaceSlave = O.class('../space/slave');
var WsWritable = O.class('../ws/writable');

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

  var socket = L.mock(ws, req);

  O.getSpace(req.space, function(err, space) {
    // Check whether the socket is still openable
    if (! L.canReplace(socket)) return;
    if (err) {
      // Space was not found
      L.error(socket, err);
      return;
    }

    if (req.sid in space.shards) {
      check(space.shards[req.sid]);
      return;
    }

    space.getShard(req.sid, onShard);
    return;
  });

  /*

    // TODO: Check whether req.home is not this instance
    // TODO: setup new shard after successfull link to the home or another peer that links to the shard
    shard = new Shard();
    if (
      shard.setup(space, req.sid) &&
      shard.setupConfig(req.home, req.scope, req.alias) &&
      shard.setupDone()
    ) {
      check();
      return;
    }

    L.error(socket, shard._err);
    return;
  });
*/

  function onShard(err, shard) {  // {{{3
    if (err) {
      O.link.error(socket, err);
      return;
    }

    check(shard);
    return;
  }

  function check(shard) {  // {{{3
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
          check(shard);
        }
      });
      return;
    case LHS.CLOSED:
      shard.linkMaster(function() {
        if (L.canReplace(socket)) {
          check(shard);
        }
      });
      return;
    }

    throw O.error(shard, 'Invalid `shard.lhs`', shard.lhs);
  }

  // }}}3
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
  case SS.MOCK:
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
      error(ws, socket, req, O.error(socket, 'Missing socket handler', 'close'));
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

  error(ws, socket, req, O.error(socket, 'Trying to close not opened socket', socket._state));
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
    O.log.error(err);
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
    error(ws, socket, req, O.error(socket, 'Socket must be a function or object'));
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
      error(ws, socket, req, O.error(socket, 'Missing socket handler', 'error'));
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
  error(ws, socket, req, O.error(socket, 'Trying to close not opened socket with error', socket._state));
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
    if (req.newLid) {
      socket._ws.addLid(req.newLid, L.mock(ws, req));
    }
    socket._ws.tx(req);
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

  var master = L.mock(ws, req);

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

// }}}1
