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
    connect(this);
    return;
  case 'object':
    connect(this);
    return;
  }

  throw O.error(entry, 'Invalid arguments', arguments);
};

exports.open = function(val) {  // {{{2
  this.synced && this.synced(true, val);
};

exports.split =  // {{{2

exports.error = function(err) {  // {{{2
//  O.log.error(err);

  this.synced && this.synced(false, err);

  O.link.reuse(this);

  setTimeout(connect.bind(null, this), 10000);
};

exports.close = function(val) {  // {{{2
  this.synced && this.synced(false, val);

  if (this.entry && this.target) {
    O.link.reuse(this);

    setTimeout(connect.bind(null, this), 0);
  }
};

// }}}1
// Private {{{1
function connect(that) {  // {{{2
  if (! that.entry || ! that.target) {
    return;
  }

  if (that.shard) {
    that.shard.waitForHome(function(err) {
      if (err) {
        setTimeout(function() {
          connect(that);
        }, 10000);
        return;
      }

      if (that.entry && that.target) {
        that.entry.postTo(that.target, that.command, that.data, that);
      }
      return;
    });
    return;
  }

  that.entry.findShard(that.target, function(err, shard) {
    if (err) {
      O.link.error(that, err);
      return;
    }

    that.shard = shard;
    connect(that);
    return;
  });
  return;
};

// }}}1
