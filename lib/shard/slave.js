'use strict';

var O = require('ose').class(module, C);

var L = O.link;

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
 * @class ose.lib.shard.slave
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
      L.error(socket, O.log.todo('Duplicit lid', shard, socket._lid));
      return;
    }
  } else {
    shard.slaves = {};
  }

  this.shard = shard;
  shard.slaves[socket._lid] = this;

  L.open(this, socket, {home: shard.isAtHome() || shard.masterState === O.masterState.HOME})
  return;
};

exports.close = function() {  // {{{2
  delete this.shard.slaves[this._lid];
  if (O._.isEmpty(this.shard.slaves)) {
    delete this.shard.slaves;
  }
  
  delete this.shard;
};

exports.error = function(err) {  // {{{2
  if (! err.splitError) {
    O.log.error(err);
  }

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
 * @handler
 */

  var shard = this.shard;

  return shard.awaitReady(function(err) {
    if (! L.canClose(socket)) return;
    if (err) return L.error(socket, err);

    if (shard.isAtHome()) {
      if (req.entry) {
        return shard.post(req.entry, req.name, req.data, socket);
      }

      return shard.command(req.name, req.data, socket);
    }

    return shard.awaitMaster(function(err) {
      if (! L.canClose(socket)) return;
      if (err) return L.error(socket, err);

      return L.relay(s.master._ws, {
        type: 'send',
        lid: s.master._lid,
        name: 'command',
        newLid: socket && socket._lid || undefined,
        data: req
      }, socket);
    });
  });
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
 * @handler
 */

  var shard = this.shard;

  return shard.get(req, function(err, entry) {
    if (! L.canClose(socket)) return true;
    if (err) return L.error(socket, err);

    return L.close(socket, {
      eid: entry.id,
      home: shard.isAtHome() || entry.masterState === O.masterState.HOME,
      kind: entry.kind.name,
      drev: entry.drev,
      dval: entry.dval,
    });
  });
};

exports.findAlias = function(req, socket) {  // {{{2
/**
 * Handler called when a slave shard attempts to find entry alias
 *
 * @param req {String} Requested entry alias
 * @param [socket] {Object} Slave entry socket
 *
 * @method findAlias
 * @handler
 */

  return this.shard.schema.findAlias(this.shard, req, function(err, alias) {
    if (! L.canClose(socket)) return true;
    if (err) return L.error(socket, err);

    return L.close(socket, alias);
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
 * @handler
 */

  this.shard.readStream(req, cb);
};

exports.track = function(req, socket) {  // {{{2
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
 * @handler
 */

  if (! L.canOpen(socket)) {
    if (L.canClose(socket)) {
      return L.error(socket, O.error(this.shard, 'INVALID_SOCKET'));
    }

    return;
  }

  this.shard.track(req.eid, socket);
};

exports.query = function(req, socket) {  // {{{2
/**
 * Handler called when a slave shard requests a map.
 *
 * @param req {Object} Request to be sent to `shard.query()`
 * @param socket {Object} Slave entry socket
 *
 * @method query
 * @handler
 */

  this.shard.query(req.name, req.opts, function(err, data) {
    if (! L.canClose(socket)) return;
    if (err) return L.error(socket, err);

    return L.close(socket, data);
  });
};

// }}}1


/* OBSOLETE {{{1
exports.new = function(req, socket) {  // {{{2
/ **
 * Handler called when a slave shard attempts to add new entry
 *
 * @param req {Object}
 * @param req.id {String} New entry id
 * @param req.kind {String} New entry kind name
 * @param req.val {Object} New entry data
 *
 * @param [socket] {Object} Client socket
 *
 * @method new
 * @handler
 * /

  var s = this.shard;

  throw O.log.todo();

  / *


  s.lhsLink2(socket, function(lhs) {
    switch (lhs) {
    case LHS.WAITING:
      L.error(socket, O.error(s, 'DISCONNECTED', 'Shard is not connected to it\'s master'));
      return;
    case LHS.AT_HOME:
      s.newEntry(req.id, req.kind, req.val, function(err, entry) {
        if (! L.canClose(socket)) return;
        if (err) {
          L.error(socket, err);
          return;
        }

        L.close(socket, {rev: entry.drev});
        return;
      });
      return;
    case LHS.MASTER:
    case LHS.HOME:
      L.relay(s.master._ws, {
        type: 'send',
        lid: s.master._lid,
        newLid: socket && socket._lid || undefined,
        name: 'new',
        data: req,
      }, socket);
      return;
    }
  });

  /*
  this.shard.get(req, function(err, entry) {
    if (! L.canClose(socket)) return;
    if (err) {
      L.error(socket, err);
      return;
    }

    L.close(socket, {
      eid: entry.id,  // TODO remove `id` from communication, it's not nnecessary
      home: entry.lhs === LHS.AT_HOME || entry.lhs === LHS.HOME,
      kind: entry.kind.name,
      drev: entry.drev,
      dval: entry.dval,
    });

    return;
  });
  * /
};

}}}1 */
