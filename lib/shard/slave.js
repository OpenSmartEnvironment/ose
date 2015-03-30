'use strict';

var O = require('ose').class(module, C);

var LHS = O.link.homeState;

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Response socket to slave shard
 *
 * @readme
 * Socket created in response to a request from a slave shard.
 *
 * @class ose.lib.shard.master
 * @type class
 * @internal
 */

// Public {{{1
function C(shard, socket) {  // {{{2
/**
 * Sends request to the master shard to establish a link.
 *
 * @param shard {Object} Slave shard
 * @param ws {Object} WebSocket
 *
 * @method constructor
 */

  if (shard.slaves) {
    if (socket._lid in shard.slaves) {
      O.link.error(socket, O.log.todo('Duplicit lid', shard, socket._lid));
      return;
    }
  } else {
    shard.slaves = {};
  }

  this.shard = shard;
  shard.slaves[socket._lid] = this;

  O.link.open(this, socket, {home: shard.lhs === LHS.AT_HOME || shard.lhs === LHS.HOME});
  return;
};

exports.close = function() {  // {{{2
  delete this.shard.slaves[this._lid];
  if (O._.isEmpty(this.shard.slaves)) {
    delete this.shard.slaves;
  }
  
  delete this.shard;
};

exports.split = function(err) {  // {{{2
  this.close();
};

exports.error = function(err) {  // {{{2
  O.log.error(err);
  this.close();
};

exports.command = function(req, socket) {  // {{{2
/**
 * Command handler executing a command on a target entry
 *
 * @param req {Object} Request object
 * @param req.id {String} Target entry id
 * @param req.name {String} Command name
 * @param [req.data] {*} Optional data
 *
 * @param [socket] {Object} Client socket
 *
 * @method command
 */

  var s = this.shard;

  s.lhsLink2(socket, function(lhs) {
    switch (lhs) {
    case LHS.HOME:
    case LHS.MASTER:
      relay(s.master._ws, req, socket);
      return;
    case LHS.WAITING:
      O.link.error(socket, O.error(s, 'DISCONNECTED', 'Shard is not connected to it\'s home'));
      return;
    case LHS.AT_HOME:
      s.get(req.id, function(err, entry) {
        if (! O.link.canClose(socket)) return;
        if (err) {
          O.link.error(socket, err);
          return;
        }

        entry.command(req.name, req.data, socket);
        return;
      });
      return;
    }

    throw O.error(s, 'Invalid `shard.lhs`', s.lhs);
  });

  return;
};

exports.get = function(req, socket) {  // {{{2
/**
 * Handler called when a slave shard attempts to get an entry
 *
 * @param req {Object}
 * @param req.entry {String} Requested entry id
 * @param req.what {Object} Request to be sent to `shard.link()`
 *
 * @param [socket] {Object} Slave entry socket
 *
 * @method get
 */

  this.shard.get(req, function(err, entry) {
    if (! O.link.canClose(socket)) return;
    if (err) {
      O.link.error(socket, err);
      return;
    }

    O.link.close(socket, {
      id: entry.id,  // TODO remove `id` from communication, it's not nnecessary
      home: entry.lhs === LHS.AT_HOME || entry.lhs === LHS.HOME,
      kind: entry.kind.name,
      drev: entry.drev,
      data: entry.data,
    });

    return;
  });
};

exports.readStream = function(req, cb) {  // {{{2
/**
 * Handler called when a slave shard attempts to get an entry
 *
 * @param req {String | Number} Requested entry id
 * @param cb {Function} Callback to be called with stream
 *
 * @method readStream
 */

  this.shard.readStream(req, cb);
};

exports.link = function(req, socket) {  // {{{2
/**
 * Handler called when a slave shard attempts to create a link to an entry
 *
 * @param req {Object}
 * @param req.id {String} Requested entry id
 * @param req.what {Object} Request to be sent to `shard.link()`
 *
 * @param [socket] {Object} Slave entry socket
 *
 * @method link
 */

  if (req.id in this.shard.cache) {
    this.shard.cache[req.id]._link(req.drev, req.srev, socket);
  } else {
    this.shard._link(req.id, req.drev, req.srev, socket);
  }
};

exports.view = function(req, socket) {  // {{{2
/**
 * Handler called a slave shard requests a view
 *
 * @param req {Object} Request to be sent to `shard.getView()`
 * @param socket {Object} Slave entry socket
 */

  this.shard.getView(req, socket);
};

// }}}1
// Private {{{1
function relay(ws, req, socket) {  // {{{2
  O.todo('check shard.lhs instead of calling linkMaster, change MOCK to RELAY');

  shard.linkMaster(function(err, master) {
    if (err) {
      O.link.error(socket, err);
      return;
    }

    if (master.link.ws) {
      O.link.relay(
        master.link.ws,
        name,
        {
          type: 'command',
          lid: shard.master._lid,
          newLid: socket && socket._lid,
//          handlers: socket && socket.handlers,
          name: name,
          data: req,
        },
        socket
      );

      return;
    }

    O.link.error(socket, O.error(shard, 'UNREACHABLE', 'Shard is not reachable', req));
    return;
  });
};

// }}}1
