'use strict';

var O = require('ose').class(module, C);
var Entry = O.class('../entry');

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Transaction class
 *
 * @readme
 * Changes to shards are made via transactions.
 *
 * To add an entry to a shard, for example, create a new
 * transaction, add the entry and commit the transaction.
 *
 * Example:
 *
 *     var trans = shard.transaction();
 *
 *     var light = trans.add('light', {
 *       alias: 'reading.light',
 *       parent: 'living.room'
 *     });
 *
 *     trans.commit(O.log.bindError());
 *
 * @class ose.lib.shard.trans
 * @type class
 */

// Public {{{1
function C(shard) {  // {{{2
/**
 * Class constructor
 *
 * @param shard {Object} Shard to be changed
 *
 * @method constructor
 */

  if (! shard.space.spid) {
    throw O.log.error(shard, 'Can\'t create transaction in this shard, there is no spid assigned to this peer in the shard.space!');
  }
  /*
  if (! shard.maps.all) {
    throw O.log.error(shard, 'Can\'t create transaction in this shard, missing database!');
  }
  */

  this.shard = shard;

  this.data = {};

  this.id = shard.space.spid * 256 * 256 * 256 * 256 + ++this.shard.lastTid;
}

exports.commit = function(cb) {  // {{{2
/**
 * Update all entries maps concerned by the current transaction
 *
 * @param cb {Function} `function(err)`
 *
 * @method commit
 */

  this.shard.schema.commit(this, cb);

  return;



  var that = this;
  var shard = this.shard;
  var maps = {};

  O.async.series([
    function(cb) {  // Mark shard busy {{{3
      shard.setBusy(cb);
    },
    function(cb) {  // Prepare data, mark entries busy {{{3
      O.async.forEachOf(that.data, function(item, key, cb) {
        switch (item.type) {
        case 'add':
          prepAdd(item.entry);
          return cb();
        case 'del':
          prepDel(item.entry);
          return item.entry.setBusy(cb);
        case 'patch':
          item.dval = O.diff.mergeCopy(item.entry.dval, item.patch);
          prepPatch(item.entry, item.patch, item.dval);
          return item.entry.setBusy(cb);
        }

        throw O.log.error(that, 'Invalid type in transaction item', item.type);
      }, cb);
    },
    // TODO: Save undo {{{3

    function(cb) {  // Patch entries {{{3
      O.async.forEachOf(that.data, function(item, key, cb) {
        item.entry.drev = that.id;

        if (item.type === 'patch') {
          item.entry.dval = item.dval;
        }

        return cb();
      }, cb);
    },
    function(cb) {  // Update maps {{{3
//      maps.all.push({type: 'put', key: 'drev', value: that.id});

      O.async.forEachOf(maps, function(vals, name, cb) {
//        console.log('UPDATE MAP', name, vals);

        shard.maps[name].batch(vals, cb);
      }, cb);
    },
  ], function(err) {  // Final callback {{{3
    if (err) return undo(cb);

    for (var key in that.data) {
      var item = that.data[key];
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
        throw O.log.error(that, 'Invalid type in transaction item', item.type);
      }
    }

    shard.setReady();

    return cb();
  });

  function undo() {  // {{{3
    O.log.todo();
  }

  function add(name, val) {  // {{{3
    if (name in maps) {
      maps[name].push(val);
    } else {
      maps[name] = [val];
    }
  }

  function prepAdd(entry) {  // {{{3
    add('all', {type: 'put', key: entry.id, value: [entry.kind.name, that.id, entry.dval]});

    for (var name in shard.schema.maps) {
      var map = shard.schema.maps[name];

      if (! map.map) continue;
      if (map.kind && map.kind !== entry.kind) continue;

      map.map(entry, function(key, val) {
        add(name, {type: 'put', key: key, value: val});
      });
    }
  }

  // }}}3
  function prepDel(entry) {  // {{{3
    add('all', {type: 'del', key: entry.id});

    for (var name in shard.schema.maps) {
      var map = shard.schema.maps[name];
      if (map.kind && map.kind !== entry.kind) continue;

      map.map(entry, function(key, val) {
        add(name, {type: 'del', key: key});
      });
    }
  }

  // }}}3
  function prepPatch(entry, patch, dval) {  // {{{3
    add('all', {type: 'put', key: entry.id, value: [entry.kind.name, that.id, dval]});

    var e2 = {  // New entry mock
      id: entry.id,
      kind: entry.kind,
      shard: entry.shard,
      drev: that.id,
      dval: dval
    };

    for (var name in shard.schema.maps) {
      var map = shard.schema.maps[name];
      if (map.kind && map.kind !== entry.kind) continue;

      if (map.onePerEntry) {
        prepPatchOne(map, entry, e2);
      } else {
        prepPatchMulti(map, entry, e2);
      }
    }
  }

  function prepPatchOne(map, entry, e2) {  // {{{3
    var key, val;

    map.map(entry, function(k, v) {
      key = k;
      val = v;
    });

    map.map(e2, function(k, v) {
      if (! k) return;

      if (k === key) {
        key = undefined;
        if (v === val) return;
      }

      add(map.name, {type: 'put', key: k, value: v});
    });

    if (key) {
      add(map.name, {type: 'del', key: key});
    }
  }

  function prepPatchMulti(map, entry, e2) {  // {{{3
    var oldMap = [];
    map.map(entry, function(key, val) {  // Build old map
      if (! key) return;  // Key must be defined

      for (var i = 0; i < oldMap.length; i++) {
        if (O._.isEqual(key, oldMap[i])) {
          oldMap[i][1] = val;  // Later emit with same key overwrites older one
          return;
        }
      }

      oldMap.push([key, val]);
      return;
    });

    var newMap = [];
    map.map(e2, function(key, val) {
      if (! key) return;  // Key must be defined

      for (var i = 0; i < oldMap.length; i++) {
        var m = oldMap[i];
        if (! m) continue;

        if (O._.isEqual(m[0], key)) {  // Key found in original map, remove from old map
          if (O._.isEqual(m[1], val)) {  // Value is same too
            oldMap[i] = null;
            return;
          }
          oldMap[i] = null;
        }
      }

      for (var i = 0; i < newMap.length; i++) {
        if (O._.isEqual(key, newMap[i])) {
          newMap[i][1] = val;  // Later emit with same key overwrites newer one
          return;
        }
      }

      newMap.push([key, val]);
      return;
    });

    for (var i = 0; i < oldMap.length; i++) {
      if (oldMap[i]) {
        add(name, {type: 'del', key: oldMap[i][0]});
      }
    }

    for (var i = 0; i < newMap.length; i++) {
      add(name, {type: 'put', key: newMap[i][0], value: newMap[i][1]});
    }
  }

  // }}}3
};

exports.patch = function(entry, val) {  // {{{2
/**
 * Add entry patch to the current transaction.
 *
 * @param entry {Object} Entry to be patched
 * @param val {Object} Patch
 *
 * @method patch
 */

  if (entry.id in this.data) {
    var item = this.data[entry.id];

    switch (item.type) {
    case 'del':
      O.log.todo('Patching entry marked as deleted', entry);
      return;
    case 'patch':
      O.log.todo('Merge patches', entry);
      return;
    case 'add':
      O.log.todo('Merge to entry', entry);
      return;
    }

    throw O.log.error(this, 'Invalid type in transaction item', item.type);
  }

  this.data[entry.id] = {
    type: 'patch',
    entry: entry,
    patch: val,
  };
  return;
};

exports.del = function(entry) {  // {{{2
/**
 * Delete entry from the current shard
 *
 * @param entry {Object} Entry to be deleted
 *
 * @method del
 */

  if (entry.id in this.data) {
    this.data[entry.id].type = 'del';
  } else {
    this.data[entry.id] = {
      type: 'del',
      entry: entry,
    };
  }
};

exports.add = function(kind, val, id) {  // {{{2
/**
 * Add new entry to the current shard.
 *
 * @param kind {Object|String} Entry kind
 * @param [val] {Object} Optional `entry.dval`
 * @param [id] {Number|String} Optional `entry.id`
 *
 * @return {Object|False} Return new entry or `false` when the entry cannot be created
 *
 * @method add
 */

  if (! id) {
    id = this.shard.space.spid * 256 * 256 * 256 * 256 + ++this.shard.lastEid;
  }

  var e = new Entry(this.shard, id);
  if (! e.setupKind(kind, this.id, val)) {
    return false;
  }

  e._trans = this;
  this.data[e.id] = {
    type: 'add',
    entry: e,
  }

  return e;
};

exports.find = function(ident, cb) {  // {{{2
/**
 * Find entry in a shard as if the transaction were already  commmitted
 *
 * @param ident {Number|String} Entry identification
 * @param cb {Function} Callback `function(err, entry)`
 *
 * @method find
 */

  var that = this;

  switch (typeof ident) {
  case 'number':
    return this.shard.get(ident, cb);
  case 'string':
    for (var key in this.data) {
      var item = this.data;
      switch (item.type) {
      case 'add':
        if (item.entry.dval.alias === ident) {
          return cb(null, item.entry);
        }
        break;
      case 'patch':
        if (alias in item.patch && item.patch.alias === ident) {
          return cb(null, item.entry);
        }
        break;
      }
    }

    return this.shard.find(ident, function(err, entry) {
      if (err) return cb(err);

      if (entry.id in that.data) {
        return cb(O.error(that.shard, 'ENTRY_NOT_FOUND'));
      }

      return cb(null, entry);
    });
  }

  return cb(this.shard, O.error('INVALID_ARGS'));
};
