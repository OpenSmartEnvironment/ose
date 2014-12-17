'use strict';

var Ose = require('ose');
var M = Ose.module();

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */


/**
 * @caption List of spaces
 *
 * @readme
 * Contains a list of all spaces registered by this OSE instance
 *
 * @class ose.lib.space.list
 * @type module
 */

// Public {{{1
exports.add = function(space) {  // {{{2
/**
 * Add a space
 *
 * @param space {Object} Space
 *
 * @method add
 */

  if (space in Spaces) {
    throw Ose.error(space, 'DUPLICIT_SPACE');
  }

  Spaces[space.name] = space;
};

exports.get = function(req, cb) {  // {{{2
/**
 * Attempts to find requested space.
 *
 * @param req {Object} Request
 * @param cb {Function (err, space)} Callback
 *
 * @async
 * @method get
 */

//  console.log('GET SPACE', req);

  if (req in Spaces) {
    cb(null, Spaces[req]);
  } else {
    cb(Ose.error(this, 'SPACE_NOT_FOUND', {space: req}));
  }
};

exports.each = function(cb) {  // {{{2
/**
 * Calls callback for each space matching filtering criteria.
 *
 * @param cb {Function (space)} callback
 *
 * @method each
 */

//  console.log('EACH SPACE');

  for (var key in Spaces) {
    cb(Spaces[key]);
  }
};

exports.link = function(entry, req, socket) {  // {{{2
/**
 * Builds a new `link` to an `entry`.
 *
 * @param entry {Object} Entry identification
 * @param req {Object} Request
 * @param socket {Object} Slave socket instance
 *
 * @method link
 */

//  console.log('SPACES LINK', entry, req);

  this.findShard(entry, function(err, shard) {
    if (err) {
      Ose.link.error(socket, err);
    } else {
      shard.link(entry.entry, req, socket);
    }
  });
};

exports.findShard = function(req, cb) {  // {{{2
/**
 * Attempts to find requested shard.
 *
 * @param req {String} Shard request.
 * @param cb {Function (err, shard)} Callback
 *
 * @async
 * @method findShard
 */

  switch (typeof req) {
  case 'object':
    this.get(req.space, function(err, space) {
      if (err) {
        cb(err);
      } else {
        space.findShard(req.shard, cb);
      }
    });
    return;
  }

  cb(Ose.error(this, 'SHARD_NOT_FOUND', req));
};

exports.getShard = function(req, cb) {  // {{{2
/**
 * Attempts to find requested shard.
 *
 * @param req {String} Shard request.
 * @param cb {Function (err, shard)} Callback
 *
 * @async
 * @method getShard
 */

  switch (typeof req) {
  case 'object':
    this.get(req.space, function(err, space) {
      if (err) {
        cb(err);
      } else {
        space.getShard(req.shard, cb);
      }
    });
    return;
  }

  cb(Ose.error(this, 'SHARD_NOT_FOUND', req));
};

exports.identify = function() {  // {{{2
  return {
    spaceList: module.filename
  };
};

// }}}1
// Private {{{1
var Spaces = {};

// }}}1
