'use strict';

var O = require('ose').object(module);
exports = O.init();

var Entry = O.class('../entry');

// Public {{{1
exports.init = function(shard, params, cb) {  // {{{2
  cb();
};

exports.cleanup = function(shard) {  // {{{2
};

exports.get = function(shard, eid, cb) {  // {{{2
  var entry;

  return shard.awaitReady(function(err) {  // {{{3
    if (err) return cb(err);

    if (eid in shard.cache) {
      entry = shard.cache[eid];
      return entry.setBusy(function(err) {
        if (err) return cb(err);
        return shard.awaitSteadyMaster(onMaster);
      });
    }

    entry = new Entry(shard, eid);
    return shard.awaitSteadyMaster(onMaster);
  });
//  cb(O.error(shard, 'ENTRY_NOT_FOUND', eid));

  function onMaster(err) {  // {{{3
    if (err) return cb(err);

    if (shard.masterState !== O.masterState.WAITING) {
      return O.link.send(shard.master, 'get', eid, onGet);
    }

    // TODO: Check whether entry is synced

    switch (entry.subjectState) {
    case entry.SUBJECT_STATE.INIT:
      if (! entry.kind) return cb(entry.remove(err));
      entry.setup();
      return cb(null, entry);
    case entry.SUBJECT_STATE.BUSY:
      entry.setReady();
      return cb(null, entry);
    }

    throw O.log.error(shard, 'INVALID_ENTRY_STATE');
  }

  function onGet(err, val) {  // {{{3
    if (err) {
      switch (entry.subjectState) {
      case entry.SUBJECT_STATE.INIT:
        if (! entry.kind || err.code === 'ENTRY_NOT_FOUND') {
          return cb(entry.remove(err));
        }

        entry.setup();
        return cb(null, entry);
      case entry.SUBJECT_STATE.BUSY:
        entry.setReady();
        return cb(null, entry);
      case entry.SUBJECT_STATE.GONE:
        return cb(entry.goneError(err));
      }

      throw O.log.error(shard, 'INVALID_ENTRY_STATE');
    }

    switch (entry.subjectState) {
    case entry.SUBJECT_STATE.INIT:
      if (entry.kind) {
        if (entry.drev !== val.drev) {  // TODO: Save to local db
          entry.drev = val.drev;
          entry.dval = val.dval;
        }
      } else {
        if (! entry.setupKind(val.kind, val.drev, val.dval)) {
          return cb(entry.goneError());
        }
      }

      entry.setup();
      return cb(null, entry);
    case entry.SUBJECT_STATE.BUSY:
      if (entry.drev !== val.drev) {  // TODO: Save to local db
        entry.drev = val.drev;
        entry.dval = val.dval;
      }
      entry.setReady();
      return cb(null, entry);
    case entry.SUBJECT_STATE.GONE:
      return cb(entry.goneError());
    }

    throw O.log.error(shard, 'INVALID_ENTRY_STATE');
  }

  // }}}3
};

exports.read = function(shard, eid, cb) {  // {{{2
  shard.awaitMaster(function(err) {
    if (err) return cb(err);

    return O.link.read(shard.master, 'read', eid, cb);
  });
};

exports.find = function(shard, alias, cb) {  // {{{2
  exports.findAlias(shard, alias, function(err, eid) {
    if (err) return cb(err);
    return exports.get(shard, eid, cb);
  });
};

exports.findAlias = function(shard, alias, cb) {  // {{{2
  return shard.sendMaster('findAlias', alias, function(err, resp) {
    if (err) return cb(err);
    return cb(null, resp);
  });
};

exports.query = function(shard, name, opts, cb) {  // {{{2
  return shard.sendMaster('query', {name: name, opts: opts}, cb);
};

exports.commit = function(trans, cb) {  // {{{2
  cb(O.error(trans, 'Unable to commit transaction in this shard'));
};
