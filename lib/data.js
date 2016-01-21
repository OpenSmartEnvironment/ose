'use strict';

const O = require('ose')(module);

/**  Doc {{{1
 * @caption Data model
 *
 * @readme
 * The data model of the framework is designed so that individual
 * instances of OSE hold subsets of the data and together create a
 * single whole.
 *
 * Data partitions are called [shards]. Basic data units
 * (similar to table records) contained by [shards] are called
 * [entries].
 *
 * Each [entry] is of a certain [kind]. [Kinds] define the properties
 * and behaviour of [entries]. Each kind is assigned to some [schema].
 *
 * Each [shard] belongs to a [space] that acts as the shard's
 * namespace. Each shard uses a certain [schema]. This schema defines
 * the entries that can be contained in the shard and how entry data
 * are stored and retrieved. For example, the "control" schema,
 * defined in the [ose-control] package, uses LevelDB as the entry
 * data store. The "fs" schema, defined in the [ose-fs] package, uses
 * the filesystem.
 *
 * Schemas and kinds define data structures with the following
 * hierarchy:
 * * schema
 *   * kind
 *
 * By contrast, spaces, shards and entries contain actual data
 * organized as follows:
 * * space
 *   * shard
 *     * entry
 *
 * Example:
 *
 * The `reading.light` is an entry of the kind `light`, the `light`
 * kind belongs to the `control` schema, and the `reading.light` entry
 * is saved in the shard `living.room`, which belongs to the space
 * `my.house`.
 *
 * To retrieve an entry, call, for example, `shard.get(entryId,
 * callback)`. To get a list of entries, call `shard.query(queryName,
 * request, callback)`. How data are retrieved depends on the
 * particular schema.
 *
 * Changes to shard data are made via [transactions]. Via
 * transactions, it is possible to add, patch and delete entries.
 *
 * Each shard is managed by a certain [peer], which is its [home]. The
 * OSE frameword makes it possible to work with shards and entries
 * scattered across multiple [peers].
 *
 * @description
 *
 * ## Commands
 * It is possible to send commands to individual [entries] using
 * `shard.post(entryIdentification, commandName, commandData,
 * clientSocket)`. Each command is delivered to the [home] of the
 * given [entry]. Commands consist of a command name and optional
 * data. A command can be a request for data or to establish a new
 * [link].
 *
 * Command handlers can be registered for a [kind] with an `on()`
 * method call. The [Kind] class is not an [Event Emitter] descendant.
 * In command handler code, the target `entry` can be accessed in
 * `this.entry`.
 *
 * Example:
 *     TODO
 *
 * @planned
 * - Data encryption
 * - Sharing and authorization
 *
 * @aliases
 * command commands entryCommand entryCommands commandHandler commandHandlers
 *
 * @module ose
 * @submodule ose.data
 * @main ose.data
 */

/**
 * @caption Data model module
 *
 * @class ose.lib.data
 * @type module
 */

/** name {{{2
 * Unique space name
 *
 * @property name
 * @type String
 */

/** home {{{2
 * Home peer
 *
 * @property home
 * @type Object
 */

/** master {{{2
 * Client socket linked to the master space
 *
 * @property master
 * @type Object
 */

/** peers {{{2
 * List of peers belonging to this space
 *
 * @property peers
 * @type Object
 */

/** shards {{{2
 * Object containing shards indexed by `sid`
 *
 * @property shards
 * @type Object
 * @internal
 */

// Public {{{1
exports.schemas = {};  // {{{2
/**
 * Object containing schemas objects indexed by schema name
 *
 * @property schemas
 * @type Object
 */

exports.spaces = {};  // {{{2
/**
 * Object containing space objects indexed by space name
 *
 * @property spaces
 * @type Object
 */

exports.addSchema = function(name, val) {  // {{{2
/**
 * Add new schema
 *
 * @param name {String} Schema name
 * @param val {Object} Schema to be added
 *
 * @method addSchema
 */

  if (name in exports.schemas) {
    throw O.log.error('Duplicit schema', name);
  }

  val.name = val.remote.name = name;
  val.kinds = val.remote.kinds = {};

  exports.schemas[name] = val;

  return val;
};

exports.getSpace = function(name, cb) {  // {{{2
/**
 * Attempt to find requested space.
 *
 * @param name {String} Space name
 * @param cb {Function (err, space)} Response callback
 *
 * @method getSpace
 * @async
 */

//  console.log('OSE GET SPACE', name);

  if (typeof cb !== 'function') {
    throw O.log.error('`cb` must be a function', cb);
  }

  if (! (name in exports.spaces)) {
    cb(O.error('SPACE_NOT_FOUND', 'Space was not found', name));
    return;
  }

  exports.spaces[name].awaitReady(cb);
  return;
};

exports.eachSpace = function(cb) {  // {{{2
/**
 * Call callback for each space synchronously.
 *
 * @param cb {Function (space)} callback
 *
 * @method eachSpace
 */

//  console.log('OSE EACH SPACE');

  if (typeof cb !== 'function') {
    throw O.log.error('`cb` must be a function', cb);
  }

  for (var key in exports.spaces) {
    cb(exports.spaces[key]);
  }
};

exports.findEntry = function(ident, cb) {  // {{{2
/**
 * Find an entry
 *
 * @param ident {Object} Entry identification object
 * @param cb {Function} Callback
 *
 * @method findEntry
 * @async
 */

  if (! ident || typeof ident !== 'object') {
    return cb(O.error('INVALID_IDENT', ident));
  }

  if (Array.isArray(ident)) {
    switch (ident.length) {
    case 2:
      return O.here.space.getShard(ident[1], function(err, shard) {
        if (err) return cb(err);
        return shard.get(ident[0], cb);
      });
    case 3:
      return O.data.getSpace(ident[2], function(err, space) {
        if (err) return cb(err);

        return space.getShard(ident[1], function(err, shard) {
          if (err) return cb(err);
          return shard.get(ident[0], cb);
        });
      });
    }

    return cb(O.error('INVALID_IDENT', ident));
  }

  return O.data.getSpace(ident.space || O.here.space.name, function(err, space) {
    if (err) return cb(err);

    return space.findShard(ident, function(err, shard) {
      if (err) return cb(err);
      return shard.find(ident.entry, cb);
    });
  });
};

exports.trackEntry = function(ident, socket) {  // {{{2
/**
 * Establish a [link] to an entry identified by `ident`
 *
 * @param ident {Object|Array} Target entry [identification]
 * @param [socket] {Object} Client socket to be connectted to the *
 * target entry. If the socket is not provided, an new EventEmitter is
 * created and returned.
 *
 * @returns EventEmitter client socket
 *
 * @method trackEntry
 * @async
 */

  if (! ident || typeof ident !== 'object') {
    return O.link.error(socket, O.error('INVALID_IDENT', ident));
  }

  if (Array.isArray(ident)) {
    switch (ident.length) {
    case 2:
      return O.here.space.getShard(ident[1], function(err, shard) {
        if (! O.link.canClose(socket)) return;
        if (err) return O.link.close(socket, err);

        return shard.track(ident[0], socket);
      });
    case 3:
      return O.data.getSpace(ident[2], function(err, space) {
        if (space) return space.getShard(ident[1], function(err, shard) {
          if (! O.link.canClose(socket)) return;
          if (err) return O.link.close(socket, err);

          return shard.track(ident[0], socket);
        });

        return O.link.canClose(socket) && O.link.close(socket, err);
      });
    }

    return O.link.error(socket, O.error('INVALID_IDENT', ident));
  }

  return O.data.getSpace(ident.space || O.here.space.name, function(err, space) {
    if (space) return space.findShard(ident, function(err, shard) {
      if (! O.link.canClose(socket)) return;
      if (err) return O.link.close(socket, err);

      return shard.track(ident.entry, socket);
    });

    return O.link.canClose && O.link.close(socket, err);
  });
};

