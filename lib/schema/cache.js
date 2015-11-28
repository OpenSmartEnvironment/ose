'use strict';

var O = require('ose').object(module);
exports = O.init();

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Schema singleton
 *
 * @readme
 *
 * @description
 *
 * @class ose.lib.schema.cache.
 * @type Object
 */

// Public {{{1
exports.init = function(shard, params, cb) {  // {{{2
/**
 * Initialize shard
 *
 * @param shard {Object} Shard to be initialized
 * @param params {*} Shard parameters
 * @param cb {Function} Callback called after shard initializaiton
 *
 * @method init
 */

  cb();
};

exports.cleanup = function(shard) {  // {{{2
/**
 * Clean up shard
 *
 * @param Shard {Object} to be cleaned up
 *
 * @method cleanup
 */
};

exports.get = function(shard, eid, cb) {  // {{{2
/**
 * Get entry from shard based on its id
 *
 * @param shard {Object} Shard containing requested entry
 * @param eid {String|Number} Entry id
 * @param cb {Function} Final callback
 *
 * @method get
 * @async
 */

  return shard.awaitReady(function(err) {
    if (err) return cb(err);

    if (! (eid in shard.cache)) {
      return cb(O.error(shard, 'ENTRY_NOT_FOUND', eid));
    }

    return shard.cache[eid].awaitReady(function(err, entry) {
      if (err) return cb(err);

      return cb(null, entry);
    });
  });
};

exports.find = function(shard, alias, cb) {  // {{{2
/**
 * Find entry in shard based on its alias
 *
 * @param shard {Object} Shard containing entry
 * @param alias {String} Alias of entry
 * @param cb {Function} Final callback
 *
 * @method find
 * @async
 */

  for (var key in shard.cache) {
    var entry = shard.cache[key];

    if (entry.dval && entry.dval.alias === alias) {
      return cb(null, entry);
    }
  }

  return cb(O.error(shard, 'ENTRY_NOT_FOUND', alias));
};

exports.findAlias = function(shard, alias, cb) {  // {{{2
/**
 * Find entry id based on its alias
 *
 * @param shard {Object} Shard containing entry
 * @param alias {String} Alias of entry
 * @param cb {Function} Final callback
 *
 * @method findAlias
 * @async
 */

  for (var key in shard.cache) {
    var entry = shard.cache[key];

    if (entry.dval && entry.dval.alias === alias) {
      return cb(null, entry.id);
    }
  }

  return cb(O.error(shard, 'ENTRY_NOT_FOUND', alias));
};

exports.query = function(shard, name, opts, cb) {  // {{{2
/**
 * Query shard for data
 *
 * @param shard {Object} Shard queried
 * @param name {String} Query name
 * @param opts {Object} Options
 * @param cb {Function} Final callback
 *
 * @method query
 * @async
 */

  var resp;

  for (var key in shard.cache) {
    var entry = shard.cache[key];

    if (matchQuery(entry, name, opts)) {
      resp.push(key);
    }
  }

  return cb(undefined, resp);
};

exports.commit = function(trans, cb) {  // {{{2
/**
 * Update shard data
 *
 * @param trans {Object} Transaction to be commited
 * @param cb {Function} `function(err)`
 *
 * @method commit
 * @async
 */

  var shard = trans.shard;
  var maps = {};

  O.async.series([
    function(cb) {  // Mark shard busy {{{3
      shard.setBusy(cb);
    },
    function(cb) {  // Prepare data, mark entries busy {{{3
      O.async.forEachOf(trans.data, function(item, key, cb) {
        switch (item.type) {
        case 'add':
          return cb();
        case 'del':
          return item.entry.setBusy(cb);
        case 'patch':
          item.dval = O.diff.mergeCopy(item.entry.dval, item.patch);
          return item.entry.setBusy(cb);
        }

        throw O.log.error(trans, 'Invalid type in transaction item', item.type);
      }, cb);
    },
    function(cb) {  // Patch entries {{{3
      O.async.forEachOf(trans.data, function(item, key, cb) {
        item.entry.drev = trans.id;

        if (item.type === 'patch') {
          item.entry.dval = item.dval;
        }

        return cb();
      }, cb);
    },
  ], function(err) {  // Final callback {{{3
    if (err) return undo(err);

    for (var key in trans.data) {
      var item = trans.data[key];
      switch (item.type) {
      case 'add':
        delete item.entry._trans;
        item.entry.setup();
        break;
      case 'del':
        item.entry.remove('ENTRY_DELETED');
        break;
      case 'patch':
        item.entry.setReady();
        for (var key in item.entry.slaves) {
          O.link.send(item.entry.slaves[key], 'patch', {drev: item.entry.drev, dpatch: item.patch});
        }
        break;
      default:
        throw O.log.error(trans, 'Invalid type in transaction item', item.type);
      }
    }

    shard.setReady();

    return cb();
  });

  function undo(err) {
    for (var key in trans.data) {
      var item = trans.data[key];
      switch (item.type) {
      case 'add':
        item.entry.remove(err);
        break;
      case 'del':
      case 'patch':
        item.entry.setReady();
        break;
      default:
        throw O.log.error(trans, 'Invalid type in transaction item', item.type);
      }
    }

    shard.setReady();

    return cb(err);
  }

  // }}}3
};

// Private {{{1
function matchQuery(entry, name, params) {  // {{{2
  if (! entry.kind) {
    O.log.unhandled('Invalid entry.kind', entry.shard.alias, entry.id);
  }

  if (params.kind && (entry.kind.name !== params.kind)) return false;

  if (params.filter) {  // TODO dval structure is not known at entry place
    if (params.filter.master && entry.dval.master !== params.filter.master) return false;
    if (params.filter.parent && entry.dval.parent !== params.filter.parent) return false;
  }

  if (entry.kind.matchQuery) {
    return entry.kind.matchQuery(entry, name, params);
  }

  return true;
};
