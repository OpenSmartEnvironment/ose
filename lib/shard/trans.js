'use strict';

const O = require('ose')(module)
  .class(init)
;

var Entry = O.getClass('../entry');

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
function init(shard) {  // {{{2
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
  e._trans = this;
  this.data[e.id] = {
    type: 'add',
    entry: e,
  }

  if (! e.setupKind(kind, this.id, val)) {
    return false;
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
