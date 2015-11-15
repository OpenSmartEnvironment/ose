'use strict';

var O = require('ose').class(module, C);

var L = O.link;

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Response socket to slave entry
 *
 * @readme
 * Reponse socket for link entry requests. Is registered in `entry.slaves`.
 *
 * @class ose.lib.entry.slave
 * @type class
 * @internal
 */

// Public {{{1
function C(entry) {  // {{{2
/**
 * Class constructor
 *
 * @param entry {Object} Entry instance
 *
 * @method constructor
 */

//  console.log('ENTRY SLAVE CONSTRUCTOR', entry.id);

  this.entry = entry;

  if (entry.slaves) {
    this.slaveId = ++entry.slaveId;
  } else {
    entry.slaves = {};
    this.slaveId = entry.slaveId = 1;
  }

  entry.slaves[this.slaveId] = this;
};

exports.close = function() {  // {{{2
  var entry = this.entry;

  if (! entry) return;

//  console.log('ENTRY SLAVE CLOSE', entry.id, this.slaveId);

  delete this.entry;

  if (! entry.slaves) return;

  delete entry.slaves[this.slaveId];

  if (O._.isEmpty(entry.slaves)) {  // There are no more slaves in the entry
    delete entry.slaves;
    delete entry.slaveId;

    if (entry.master) {
      L.canClose(entry.master) && L.close(entry.master);  // TODO: setup some timeout
    }
  }

  return;
};

exports.error = function(err) {  // {{{2
//  console.log('ENTRY SLAVE ERROR', this.entry && this.entry.id, err);

  this.close();
};

// }}}1
