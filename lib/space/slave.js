'use strict';

var O = require('ose').class(module);

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Slave shard client socket
 *
 * @readme
 * Socket for communicating from a shard to a master in another OSE
 * instance.
 *
 * @class ose.lib.shard.slave
 * @type class
 * @internal
 */

// Public {{{1
exports.close = function() {  // {{{2
  delete this.space.slaves[this._lid];
  if (O._.isEmpty(this.space.slaves)) {
    delete this.space.slaves;
  }

  delete this.space;
};

exports.split = function(err) {  // {{{2
  this.close();
};

exports.error = function(err) {  // {{{2
  O.log.error(err);
  this.close();
};

exports.get = function(req, socket) {  // {{{2
  var that = this;

  this.space.getShard(req, function(err, shard) {
    if (! O.link.canClose(socket)) return;
    if (err) {
      O.link.error(socket, err);
      return;
    }

    O.link.close(socket, {
      sid: shard.sid,
      home: (shard.home || that.space.home).name,
      scope: shard.scope.name,
      alias: shard.alias,
    });
    return;
  });
};

exports.find = function(req, socket) {  // {{{2
  var that = this;

  this.space.findShard(req, function(err, shard) {
    if (! O.link.canClose(socket)) return;
    if (err) {
      O.link.error(socket, err);
      return;
    }

    O.link.close(socket, {
      sid: shard.sid,
      home: (shard.home || that.space.home).name,
      scope: shard.scope.name,
      alias: shard.alias,
    });
    return;
  });
};

exports.findShards = function(req, socket) {  // {{{2
  // TODO: Relay request to the master when not at home

  var resp = [];

  this.space.findShards(req, onShard, onDone);

  function onShard(shard) {  // {{{3
    resp.push(shard.sid);
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

// }}}1