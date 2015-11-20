'use strict';

var O = require('ose').object(module);
exports = O.init();

// Public {{{1
exports.init = function(shard, params, cb) {  // {{{2
  cb();
};

exports.cleanup = function(shard) {  // {{{2
};

exports.get = function(shard, eid, cb) {  // {{{2
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
  for (var key in shard.cache) {
    var entry = shard.cache[key];

    if (entry.dval && entry.dval.alias === alias) {
      return cb(null, entry);
    }
  }

  return cb(O.error(shard, 'ENTRY_NOT_FOUND', alias));
};

exports.findAlias = function(shard, alias, cb) {  // {{{2
  for (var key in shard.cache) {
    var entry = shard.cache[key];

    if (entry.dval && entry.dval.alias === alias) {
      return cb(null, entry.id);
    }
  }

  return cb(O.error(shard, 'ENTRY_NOT_FOUND', alias));
};

exports.query = function(shard, name, opts, cb) {  // {{{2
  var resp;
  for (var key in shard.cache) {
    var entry = shard.cache[key];
    if (isInMap(entry, name, opts)) {
      resp.push(key);
    }
  }
};

exports.commit = function(trans, cb) {  // {{{2
/**
 * Update all entries maps concerned by the transaction
 *
 * @param cb {Function} `function(err)`
 *
 * @method commit
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
function isInMap(entry, name, params) {  // {{{2
  if (! entry.kind) {
    O.log.unhandled('Invalid entry.kind', entry.shard.alias, entry.id);
  }

  if (params.kind && (entry.kind.name !== params.kind)) return false;

  if (params.filter) {  // TODO dval structure is not known at entry place
    if (params.filter.master && entry.dval.master !== params.filter.master) return false;
    if (params.filter.parent && entry.dval.parent !== params.filter.parent) return false;
  }

  if (entry.kind.isInMap) {
    return entry.kind.isInMap(entry, name, params);
  }

  return true;
};

