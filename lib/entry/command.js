'use strict';

var O = require('ose').class(module, C);

/** Doc {{{1
 * @submodule ose.data
 */

/**
 * @caption Entry command client socket
 *
 * @readme
 * Sends a command to the target entry. This class ensures that
 * links are reopened, it tries to reopen it as soon as possible
 * after they disconnect due to network problems, restarts of peers or
 * other reasons.
 *
 * This can be used as an ancestor of client sockets that are to be
 * reopened automatically.
 *
 * @class ose.lib.entry.command
 * @type class
 */

/**
 * Entry sending a command
 *
 * @property entry
 * @type Object
 */

/**
 * Identification of target entry
 *
 * @property target
 * @type Number|String|Object
 */

/**
 * Command name
 *
 * @property command
 * @type String
 */

/**
 * Optional command data
 *
 * @property data
 * @type *
 */

/**
 * Target shard
 *
 * @property shard
 * @type Object
 */


// Public {{{1
function C(entry, target, command, data) {  // {{{2
/**
 * Socket constructor
 *
 * @param entry {Object} Source entry
 * @param target {Number|String|Object} Target entry identification
 * @param command {String} Command name
 * @param [data] {*} Optional data
 *
 * @method constructor
 */

  this.entry = entry;
  this.command = command;
  this.data = data;
  this.target = target;

//  console.log('ENTRY COMMAND', target);

  switch (typeof target) {
  case 'number':
  case 'string':
    this.shard = entry.shard;
    this.targetId = target;
    return connect(this);
  case 'object':
    return connect(this);
  }

  throw O.log.error(entry, 'INVALID_ARGS', arguments);
};

exports.open = function(val) {  // {{{2
  if (! this.entry || this.entry.isGone()) {
    return O.link.close(this);
  }

  this.synced && this.synced(true, val);

  O.log.liftSuppress(this);
};

exports.error = function(err) {  // {{{2
  if (! this.entry || this.entry.isGone()) return;

  if (! err.splitError) {
    O.log.suppressError(err, this, 'Entry socket error', 3);
  }

  this.synced && this.synced(false, err);

  O.link.reuse(this);

  setTimeout(connect.bind(null, this), 10 * 1000);  // TODO: Smart timeouts
};

exports.close = function(val) {  // {{{2
  if (! this.entry || this.entry.isGone()) return;

  this.synced && this.synced(false, val);

  if (this.entry && this.target) {
    O.link.reuse(this);

    O.async.setImmediate(connect.bind(null, this));
  }
};

// Private {{{1
function connect(that) {  // {{{2
  if (! that.shard) {
    return that.entry.shard.findSibling(that.target, function(err, shard) {
      if (err) return O.link.error(that, err);

      that.shard = shard;

      switch (O.typeof(that.target)) {
      case 'number':
      case 'string':
        that.targetId = that.target;
        break;
      case 'array':
        that.targetId = that.target[0];
        break;
      case 'object':
        that.targetId = that.target.entry;
        break;
      default:
        throw O.log.error(that, 'INVALID_IDENT', that.target);
      }

      return connect(that);
    });
  }

  if (that.shard.isAtHome()) {
    return that.shard.post(that.targetId, that.command, that.data, that);
  }

  return that.shard.awaitSteadyMaster(function(err) {
    if (err) return;

    switch (that.shard.masterState) {
    case O.masterState.HOME:
      return that.shard.post(that.targetId, that.command, that.data, that);
    case O.masterState.WAITING:
    case O.masterState.MASTER:
      return that.shard.once('masterState', connect.bind(null, that));
    }

    throw O.log.error(that.shard, 'Unhandled master state', that.shard.masterState);
  });
}
