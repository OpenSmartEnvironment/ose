'use strict';

var Ose = require('ose');
var M = Ose.class(module);

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Master shard response socket
 *
 * @readme
 * Socket created in response to a request from a slave shard.
 *
 * @class ose.lib.shard.master
 * @type class
 */

// Public {{{1
exports.close = function() {  // {{{2
/**
 * Close handler
 *
 * @method close
 */

  var slaves = this.shard.slaves;

  if (slaves && (this.lid in slaves)) {
    delete slaves[this.lid];
//    console.log('REMOVED SHARD SLAVE', this.shard.identify(), this.lid);
  } else {
    M.log.error(Ose.error(this.shard, 'slaveNotRegistered', this.lid));
  }

  if (Ose._.isEmpty(slaves)) {
    delete this.shard.slaves;
  }

  delete this.shard;
  delete this.link;
};

exports.error = function(err) {  // {{{2
/**
 * Error handler
 *
 * @param err {Object} Error object
 *
 * @method error
 */

  switch (err.message) {
  case 'DISCONNECTED':
  case 'UNREACHABLE':
    break;
  default:
    M.log.error(err);
  }

  this.close();
};

exports.command = function(req, socket) {  // {{{2
/**
 * Command handler executing a command on a target entry
 *
 * @param req {Object} Request object
 * @param req.target {String} Target entry id
 * @param req.name {String} Command name
 * @param [req.data] {*} Optional data
 *
 * @param [socket] {Object} Client socket
 *
 * @method command
 */

  if (! this.shard.atHome()) {
    relay(this.shard, 'command', req, socket); // TODO
    return;
  }

  this.shard.get(req.target, function(err, entry) {
    if (err) {
      Ose.link.error(socket, err);
    } else {
      entry.command(req.name, req.data, socket);
    }
  });
  return;
};

exports.entry = function(req, socket) {  // {{{2
/**
 * Handler called when a slave shard attempts to create a link to an entry
 *
 * @param req {Object}
 * @param req.entry {String} Requested entry id
 * @param req.what {Object} Request to be sent to `shard.link()`
 *
 * @param [socket] {Object} Slave entry socket
 *
 * @method entry
 */

  this.shard.link(req.entry, req.what, socket);
};

exports.view = function(req, socket) {  // {{{2
/**
 * Handler called a slave shard requests a view
 *
 * @param req {Object} Request to be sent to `shard.getView()`
 * @param socket {Object} Slave entry socket
 */

  this.shard.getView(req, socket);
};

// }}}1
// Private {{{1
function relay(shard, name, req, socket) {  // {{{2
  shard.linkMaster(function(err, master) {
    if (err) {
      Ose.link.error(socket, err);
      return;
    }

    if (master.link.ws) {
      Ose.link.relay(
        master.link.ws,
        name,
        {
          type: 'command',
          lid: shard.master.lid,
          newLid: socket && socket.lid,
          handlers: socket && socket.handlers,
          name: name,
          data: req,
        },
        socket
      );

      return;
    }

    Ose.link.error(socket, Ose.error(shard, 'UNREACHABLE', req));
    return;
  });
};

// }}}1
