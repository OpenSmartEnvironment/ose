'use strict';

var O = require('ose').module(module);

/** Doc {{{1
 * @module ose
 */

/**
 * @class ose.core
 */

/**
 * List of all spaces
 *
 * @property spaces
 * @type Object
 */

// Public {{{1
O.extend('getSpace', function(name, cb) {  // {{{2
/**
 * Attempt to find requested space.
 *
 * @param name {Object} Space name
 * @param cb {Function (err, space)} Response callback
 *
 * @method getSpace
 * @async
 */

//  console.log('OSE GET SPACE', name);

  if (typeof cb !== 'function') {
    throw O.error('`cb` must be a function', cb);
  }

  if (! (name in exports)) {
    cb(O.error('SPACE_NOT_FOUND', 'Space was not found', name));
    return;
  }

  var res = exports[name];
  switch (res.lhsHome(cb)) {
  case undefined:
    return;
  case O.link.homeState.LINKING:
    res.once('lhs', function() {
      O.getSpace(name, cb);
    });
    return;
  }

  cb(null, res);
  return;
});

O.extend('eachSpace', function(cb) {  // {{{2
/**
 * Call callback for each space synchronously.
 *
 * @param cb {Function (space)} callback
 *
 * @method eachSpace
 */

//  console.log('OSE EACH SPACE');

  if (typeof cb !== 'function') {
    throw O.error('`cb` must be a function', cb);
  }

  for (var key in exports) {
    cb(exports[key]);
  }
});

O.extend('findShard', function(ident, cb) {  // {{{2
/**
 * Attempt to find shard. Each shard must be defined by `sid` or by a
 * combination of `alias`, `peer` and `scope` properties.
 *
 * @param ident {Object} Shard identuest
 * @param [ident.space] {String} Space name, default `O.here.space` is optionally used
 * @param [ident.sid] {Number | String} Shard sid
 * @param [ident.alias] {String} Shard's alias
 * @param [ident.peer] {String} Shard's home peer name
 * @param [ident.scope] {String} Scope name, the shard belongs to
 * @param cb {Function (err, shard)} Response callback
 *
 * @method findShard
 * @async
 */

//  console.log('OSE FIND SHARD', ident);

  if (typeof cb !== 'function') {
    throw O.error('`cb` must be a function', cb);
  }

  switch (typeof (ident || undefined)) {
  case 'number':
  case 'string':
    O.here.space.getShard(ident, cb);
    return;
  case 'object':
    if (! ident.space) {
      O.here.space.findShard(ident, cb);
      return;
    }

    O.getSpace(ident.space, function(err, space) {
      if (err) {
        cb(err);
        return;
      }

      space.findShard(ident, cb);
      return;
    });
    return;
  }

  cb(O.error('`ident` is not valid shard identification', ident));
  return;
});

O.extend('findEntry', function(ident, cb) {  // {{{2
/**
 * Attempt to find an [entry].
 *
 * @param ident {Object} Entry identification
 * @param ident.id {Number|String} Entry id
 * @param [ident.sid] {Number|String} Shard id
 * @param [ident.alias] {String} Shard's alias
 * @param [ident.peer] {String} Shard's home peer name
 * @param [ident.scope] {String} Scope name, the shard belongs to
 * @param [ident.space] {String} Space name, default `O.here.space` is optionally used
 * @param req {Object} Request object
 * @param cb {Function (err, entry)} Response callback
 *
 * @method findEntry
 * @async
 */

//  console.log('OSE GET ENTRY', ident);

  if (typeof cb !== 'function') {
    throw O.error('`cb` must be a function', cb);
  }

  O.findShard(ident, function(err, shard) {
    if (err) {
      cb(err);
      return;
    }

    shard.get(ident.id, cb);
    return;
  });
});

O.extend('linkEntry', function(ident, drev, srev, socket) {  // {{{2
/**
 * Establish a new [link] to an [entry].
 *
 * @param ident {Object} Entry identification
 * @param ident.id {Number|String} Entry id
 * @param [ident.sid] {Number|String} Shard id
 * @param [ident.alias] {String} Shard's alias
 * @param [ident.peer] {String} Shard's home peer name
 * @param [ident.scope] {String} Scope name, the shard belongs to
 * @param [ident.space] {String} Space name, default `O.here.space` is optionally used
 * @param drev TODO
 * @param srev TODO
 * @param socket {Object} Client socket to be linked as a slave to an entry
 *
 * @method linkEntry
 * @async
 */

//  console.log('OSE LINK ENTRY', ident, drev, srev);

  // Process arguments
  switch (arguments.length) {
  case 2:
    socket = drev;
    drev = true;
    break;
  case 3:
    socket = srev;
    srev = undefined;
    break;
  case 4:
    break;
  default:
    throw O.error(this, 'Invalid argument count', arguments);
  }
  if (! O.link.canOpen(socket)) {
    throw O.error(this, 'Socket can\'t be opened', socket);
  }

  // Try to find requested entry
  O.findShard(ident, function(err, shard) {
    if (! O.link.canOpen(socket)) return;

    if (err) {
      O.link.error(socket, err);
      return;
    }

    if (ident.id in shard.cache) {
      shard.cache[ident.id]._link(drev, srev, socket);
      return;
    }

    shard._link(ident.id, drev, srev, socket);
    return;
  });
});

O.extend('postEntry', function(ident, name, data, socket) {  // {{{2
/**
 * Post command to an [entry] home.
 *
 * @param ident {Object} Entry identification
 * @param ident.id {Number|String} Entry id
 * @param [ident.sid] {Number|String} Shard id
 * @param [ident.alias] {String} Shard's alias
 * @param [ident.peer] {String} Shard's home peer name
 * @param [ident.scope] {String} Scope name, the shard belongs to
 * @param [ident.space] {String} Space name, default `O.here.space` is optionally used
 * @param name {String} Command name
 * @param data {*} Command data
 * @param [socket] {Function|Object} Client socket instance
 *
 * @method postEntry
 * @async
 */

//  console.log('OSE POST ENTRY', ident, name, data);

  if (! O.link.canClose(socket)) {
    throw O.error(this, 'Socket is invalid', socket);
  }

  O.findShard(ident, function(err, shard) {
    if (! O.link.canClose(socket)) return;

    if (err) {
      O.link.error(socket, err);
      return;
    }

    shard.post(ident.id, name, data, socket);
    return;
  });
});

// }}}1
