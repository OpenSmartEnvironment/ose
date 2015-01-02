'use strict';

var Ose = require('ose');
var M = Ose.class(module, C, 'EventEmitter');

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Slave entry client socket
 *
 * @readme
 * Socket to build a link to the master entry.
 *
 * @class ose.lib.entry.slave
 * @type class
 * @extends EventEmitter
 */

/**
 * Fired when an entry is acquired
 *
 * @event done
 */

/**
 * Slave entry
 *
 * @property entry
 * @type Object
 */

// Public {{{1
function C(entry) {  // {{{2
/**
 * Class constructor.
 *
 * @param entry {Object} Entry
 *
 * @method constructor
 */

  M.super.call(this);

  this.entry = entry;

  Ose.link.prepare(this);
};

exports.open = function(resp) {  // {{{2
/**
 * Open handler
 *
 * @param resp {Object} Response object
 * @param resp {Object} Update object
 * @param resp.data {Object} Data update
 * @param resp.drev {Object} Data revision
 * @param resp.state {Object} State
 * @param resp.srev {Object} State revision
 * @param resp.synced {Boolean} Whether the chain of links to the `home` is created
 *
 * @method open
 */

//  console.log('ENTRY SLAVE OPEN', resp.id, e.id);

  var e = this.entry;

  if (resp.id !== e.id) {
    throw Ose.error(this, 'invalidEntry', resp);
  }

  delete resp.id;

  if (resp) {
    update(this, resp, true);
  }

  this.emit('done', undefined, e);
};

exports.close = function(resp) {  // {{{2
/**
 * Close handler
 *
 * Called when there are no more response sockets in `entry.slaves`.
 *
 * @method close
 */

//  console.log('ENTRY SLAVE CLOSE', this.lid);

  if (resp) {
    update(this, resp, true);
  }

  var e = this.entry;

  close(this);

  this.emit('done', null, e);
};

exports.error = function(err) {  // {{{2
/**
 * Error handler
 *
 * Error keeps socket as `entry.master`
 *
 * @param err {Object} Error object
 *
 * @method error
 */

//  console.log('ENTRY SLAVE ERROR', this.lid);

  close(this);

  this.emit('done', err);
};

exports.update = function(req) {  // {{{2
/**
 * Update handler. Updates `this.entry` based on `req`. Broadcast `req` to `this.entry.slaves`.
 *
 * @param req {Object} Update object
 * @param req.kind {String} Setup the entry kind
 * @param req.data {Object} Data update
 * @param req.drev {Object} Data revision
 * @param req.state {Object} State
 * @param req.srev {Object} State revision
 * @param req.synced {Boolean} Whether the entry is synced with the home
 *
 * @method update
 */

  update(this, req);
};

// }}}1
// Private {{{1
function update(that, req, full) {  // {{{2
  var e = that.entry;

//  console.log('ENTRY SLAVE UPDATE', e.id);

  if ('kind' in req) {
    if (e.kind) {
      if (req.kind !== e.kind.name) {
        Ose.link.error(that, Ose.error(e, 'DIFFERENT_KIND', req.kind));
        return;
      }
    } else {
      e.setup(req.kind);
    }
  }

  e.update(req, full);

  if (e.slaves) {
    e.broadcast(req);
  }

  return;
};

function close(that) {  // {{{2
  var e = that.entry;

  delete that.entry;
  delete e.master;

  if (! e.kind) {
    e.remove();
    return;
  }

  e.setSynced(false);
  if (e.slaves) {
    e.broadcast({
      synced: false,
    });
  }
  return;
};

// }}}1
