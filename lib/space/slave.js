'use strict';

var O = require('ose').class(module, C);

var Shard = O.class('../shard');

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Response socket to slave space
 *
 * @readme
 * Socket created in response to a request from a slave space.
 *
 * @class ose.lib.shard.slave
 * @type class
 * @internal
 */

// Public {{{1
function C(space, socket) {  // {{{2
/**
 * Sends request to the master space to establish a link.
 *
 * @param space {Object} Slave space
 * @param ws {Object} WebSocket
 *
 * @method constructor
 */

  if (space.slaves) {
    if (socket._lid in space.slaves) {
      O.link.error(socket, O.log.todo('Duplicit lid', space, socket._lid));
      return;
    }
  } else {
    space.slaves = {};
  }

  this.space = space;
  space.slaves[socket._lid] = this;

  O.link.open(this, socket, {home: space.isAtHome() || space.masterState === O.masterState.HOME})
  return;
};

exports.close = function() {  // {{{2
  delete this.space.slaves[this._lid];
  if (O._.isEmpty(this.space.slaves)) {
    delete this.space.slaves;
  }

  delete this.space;
};

exports.error = function(err) {  // {{{2
  if (! err.splitError) {
    O.log.error(err);
  }

  this.close();
};

exports.get = function(req, socket) {  // {{{2
/**
 * Get entry
 *
 * @param req {Integer} Entry id
 */

  var that = this;

  this.space.getShard(req, function(err, shard) {
    if (! O.link.canClose(socket)) return;
    if (err) {
      O.link.error(socket, err);
      return;
    }

    O.link.close(socket, {
      sid: shard.id,
      home: (shard.home || that.space.home).name,
      scope: shard.scope.name,
      alias: shard.alias,
    });
    return;
  });
};

exports.findShard = function(req, socket) {  // {{{2
  var that = this;

  this.space.findShard(req, function(err, shard) {
    if (! O.link.canClose(socket)) return;

    if (err) {
      O.link.error(socket, err);
      return;
    }

    O.link.close(socket, {
      sid: shard.id,
      home: (shard.home || that.space.home).name,
      scope: shard.scope.name,
      alias: shard.alias,
    });
    return;
  });
};

exports.findShards = function(req, socket) {  // {{{2
  var resp = [];

  this.space.findShards(req, onShard, onDone);

  function onShard(shard) {  // {{{3
    resp.push(shard.id);
  }

  function onDone(err) {  // {{{3
    if (! O.link.canClose(socket)) return;
    if (err) {
      O.link.error(socket, err);
      return;
    }

    O.link.close(socket, resp);
    return;
  }

  // }}}3
};

exports.notify = function(req, socket) {  // {{{2
  var resp = [];

  if (! this.space.isAtHome()) {
    return O.log.todo('Relay request to the master when not at home');
  }

  for (var i = 0; i < req.shards.length; i++) {
    var s = req.shards[i];
    var shard = this.space.shards[s.sid];

    if (shard) {
      if (
        req.peer === shard.home.name &&
        s.scope === shard.scope.name &&
        s.alias == shard.alias
      ) continue;

      O.log.error(this.space, 'Duplicit shard', {shard: shard.toString(), req: req});
      continue;
    }

    shard = new Shard();
    if (! shard.setup(this.space, s.sid)) {
      O.log.error(shard._err);
      continue;
    }

    shard.setupConfig(req.peer, s, function(err) {
      if (err || ! shard.setupDone()) {
        O.log.error(shard._err);
      }
    });
  }

  O.link.close(socket, {home: this.canReachHome()});
  return;
};

// }}}1
