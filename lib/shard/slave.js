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
      return L.error(socket, O.log.todo('Duplicit lid', shard, socket._lid));
    }
  } else {
    shard.slaves = {};
  }

  this.shard = shard;
  shard.slaves[socket._lid] = this;

  return L.open(this, socket, {
    home: shard.isAtHome() || shard.masterState === shard.MASTER_STATE.HOME,
    homeTime: Date.now() + shard.homeTimeOffset,
  });
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

      return L.relay(shard.master._ws, {
        type: 'send',
        lid: shard.master._lid,
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
      home: shard.isAtHome() || entry.masterState === entry.MASTER_STATE.HOME,
      kind: entry.kind.name,
      brev: entry.brev,
      drev: entry.drev,
      dval: entry.dval,
      srev: entry.srev,
      sval: entry.sval,
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

exports.read = function(req, cb) {  // {{{2
/**
 * Handler called when a slave shard attempts to get an entry
 *
 * @param req {String | Number} Requested entry id
 * @param cb {Function} Callback to be called with stream
 *
 * @method read
 * @handler
 */

  this.shard.read(req, cb);
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

  if (! req.name || typeof req.name !== 'string') {
    return O.link.error(socket, 'INVALID_ARGS', 'query', req.name);
  }

  this.shard.query(req.name, req.opts, function(err, data) {
    if (! L.canClose(socket)) return;
    if (err) return L.error(socket, err);

    return L.close(socket, data);
  });
};

