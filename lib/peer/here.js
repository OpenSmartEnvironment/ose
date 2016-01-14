'use strict';

var O = require('ose').module(module);

/** Doc {{{1
 * @module ose
 * @submodule ose.peer
 */

/**
 * @caption Here peer
 *
 * @readme
 * Object representing own OSE instance peer. Each OSE instance
 * registers this object at startup with other peers in `O.here`
 * under its own name, i.e. `O.here.name`.
 *
 * @class ose.lib.peer.here
 * @type module
 */

// Public {{{1
exports.toString = function() {  // {{{2
/**
 * Return short peer description
 *
 * @return {String} Peer description
 *
 * @method toString
 */

  return 'Peer (here): ' + this.name + ' ' + (this.space && this.space.name || '') + '/' + this.spid;
};

exports.remove = function() {  // {{{2
  delete this.space.peers[this.name];
};

exports.connect = function(force, cb) {  // {{{2
  cb && cb();
};

exports.disconnect = function() {  // {{{2
};

exports.isConnected = function() {  // {{{2
/**
 * Check whether the peer is connected
 *
 * @method isConnected
 */

  return true;
};

exports.coreShard = function(shard) {  // {{{2
  if (this.core) {
    O.log.unhandled('Core shard is already assigned', {current: this.core, shard: shard});
    return;
  }

  this.core = shard;

  this.entry = shard.entry(this.name, 'peer', {name: this.name});

  return;
};

exports.getWs = function(wait, cb) {  // {{{2
  if (! cb) {
    cb = wait;
    wait = undefined;
  }

  cb(O.error(this, 'Can\'t call `getWs()` on "here" peer!'));
};

// }}}1
