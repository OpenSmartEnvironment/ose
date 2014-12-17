'use strict';

var Ose = require('ose');
var M = Ose.class(module, C);

/** Doc {{{1
 * @submodule ose.data
 */

/**
 * @caption Entry command client socket
 *
 * @readme
 * Sends some command to the target entry. When the link disconnects,
 * it tries to reopen it as soon as possible.
 *
 * @class ose.lib.entry.link
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
 * @property [data]
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
    connect(this);
    return;
  case 'object':
    var that = this;
    entry.findShard(target, function(err, shard) {
      if (err) {
        that.end && that.end(null, err);
      } else {
        that.shard = shard;
        connect(that);
      }
    });
    return;
  }

  throw Ose.error(entry, 'INVALID_ARGS', arguments);
};

exports.open = function(req) {  // {{{2
/**
 * Open handler.
 *
 * @method open
 */

  this.sync && this.sync(true, req);
};

exports.close = function(resp, err) {  // {{{2
/**
 * Close handler clears this socket.
 *
 * @method close
 */

  this.end && this.end(err, resp);

  delete this.shard;
  delete this.entry;
  delete this.target;
  delete this.command;
  delete this.data;
};

exports.error = function(err) {  // {{{2
/**
 * Error handler tries to reopen the link in case of network problems.
 *
 * @param err {Object} [Error] instance
 *
 * @method error
 */

  switch (err.code) {
  case 'UNREACHABLE':
  case 'DISCONNECTED':
    this.sync && this.sync(false);
    connect(this);
    return;
  case 'ENTRY_NOT_FOUND':
    this.close(null, err);
    return;
  }

  M.log.debug('UNHANDLED entry command error handler: ', err.code, err.message);
  this.close(null, err);
  return;
};

// }}}1
// Private {{{1
function connect(that) {  // {{{2
  that.shard.afterSynced(function(err) {
    if (err) {
      that.error(err);
      return;
    }

    Ose.link.prepare(that);
    that.entry.postTo(
      that.target,
      that.command,
      that.data,
      that
    );
    return;
  });
};

// }}}1
