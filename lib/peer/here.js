'use strict';

var Ose = require('ose');

/** Doc {{{1
 * @module ose
 * @submodule ose.peer
 */

/**
 * @caption Here peer
 *
 * @readme
 * Object representing own OSE instance peer. Each OSE instance
 * registers this object at startup with other peers in `Ose.peers`
 * under its own name, i.e. `Ose.name`.
 *
 * @class ose.lib.peer.here
 * @type module
 */

// Public {{{1
exports.connect = function() {};
exports.disconnect = function() {};

exports.coreShard = function(shard) {  // {{{2
  if (this.core) {
    M.log.unhandled('Core shard is already assigned', {current: this.core, shard: shard});
    return;
  }

  this.core = shard;

  this.entry = shard.entry(this.name, 'peer', {name: this.name});

  return;
};

exports.getWs = function(cb) {  // {{{2
  cb(Ose.error(this, 'INVALID_REQ', 'Can\'t call `getWs()` on here peer!'));
};

// }}}1
