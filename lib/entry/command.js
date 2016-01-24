'use strict';

const O = require('ose')(module)
  .class(init)
;

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
function init(entry, target, command, data) {  // {{{2
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
  this.target = target;

  this.data = data || {};
  if (! this.data.entry) {
    this.data.entry = entry.getIdent();
  }
  if (! this.data.caption) {
    this.data.caption = entry.getCaption();
  }

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
  if (that.shard) {
    return that.shard.post(that.targetId, that.command, that.data, that);
  }

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

  /*
  if (that.shard.isAtHome()) {
    return that.shard.post(that.targetId, that.command, that.data, that);
  }

  return that.shard.awaitSteadyMaster(function(err) {
    if (err) return;

    switch (that.shard.masterState) {
    case that.shard.MASTER_STATE.HOME:
      return that.shard.post(that.targetId, that.command, that.data, that);
    case that.shard.MASTER_STATE.WAITING:
    case that.shard.MASTER_STATE.MASTER:
      return that.shard.once('masterState', connect.bind(null, that));
    }

    throw O.log.error(that.shard, 'Unhandled master state', that.shard.masterState);
  });
  */
}
