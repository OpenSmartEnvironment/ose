'use strict';

var O = require('ose').class(module, C);

var Consts = O.consts('ose');
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

  return setTimeout(function() {
    if (! entry.slaves) return;
    if (! O._.isEmpty(entry.slaves)) return;

    // There are no more slaves in the entry
    delete entry.slaves;
    delete entry.slaveId;

    if (entry.master && L.canClose(entry.master)) {
      L.close(entry.master);
      return;
    }

    delete entry.masterState;
    return;
  }, Consts.closeEntrySlaveTimeout);
};

exports.error = function(err) {  // {{{2
//  console.log('ENTRY SLAVE ERROR', this.entry && this.entry.id, err);

  this.close();
};

exports.command = function(req, socket) {  // {{{2
/**
 * Command handler executing a command on a target entry
 *
 * @param req {Object} Request object
 * @param req.name {String} Command name
 * @param [req.data] {*} Optional data
 *
 * @param [socket] {Object} Client socket
 *
 * @method command
 * @handler
 */

  var entry = this.entry;

  return entry.awaitReady(function(err) {
    if (! L.canClose(socket)) return;
    if (err) return L.error(socket, err);

    if (entry.isAtHome()) {
      return entry.command(req.name, req.data, socket);
    }

    return entry.awaitMaster(function(err) {
      if (! L.canClose(socket)) return;
      if (err) return L.error(socket, err);

      return L.relay(entry.master._ws, {
        type: 'send',
        lid: entry.master._lid,
        name: 'command',
        newLid: socket && socket._lid || undefined,
        data: req
      }, socket);
    });
  });
};

// }}}1
