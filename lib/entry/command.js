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
 * Sends some command to the target entry. This class ensures that
 * links are reopenned , it tries to reopen it as soon as possible
 * after they disconnect due to network problems, restarts of peers or
 * other reasons.
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
    var that = this;
    entry.findShard(target, function(err, shard) {
      if (err) {
        Ose.link.error(this, err);
        return;
      }

      that.shard = shard;
      connect(that);
      return;
    });
    return;
  }

  Ose.link.error(this, Ose.error(entry, 'INVALID_ARGS', arguments));
};

exports.open = function(req) {  // {{{2
  this.sync && this.sync(true, req);
};

exports.split = function() {  // {{{2
  this.sync && this.sync(false);

  Ose.link.reuse(this);
  connect(this);
};

// }}}1
// Private {{{1
function connect(that) {  // {{{2
  that.shard.afterSynced(function(err) {
    if (err) {
      that.error(err);
      return;
    }

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
