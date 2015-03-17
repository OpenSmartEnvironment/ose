'use strict';

var O = require('ose').class(module, C, 'EventEmitter');
O.prepend('../subject');

var Entry = O.class('../entry');
var Space = O.class('../space');
var Scope = O.class('../scope');
var Master = O.class('./master');
var EntryMaster = O.class('../entry/master');
var EntrySlave = O.class('../entry/slave');
var L = O.link;
var LHS = L.homeState;

//var EntryReadable = O.class('../entry/readable');


/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Shard class
 *
 * @readme
 * A shard is a set of [entries]. Each shard belongs to a certain
 * [space]. Every shard has a `sid` (shard id) that is unique within
 * its [space]. Each shard is tied to a single [scope] (ie. it cannot
 * contain [entries] of [kinds] belonging to different
 * [scopes]). Every shard either belongs to the same [home] as its
 * space or is assigned to a different one.
 *
 * @aliases shard shards
 *
 * @class ose.lib.shard
 * @extends EventEmitter
 * @type class
 */

/** lhs {{{2
 * State of shard
 *
 * @property lhs
 * @type Object
 */

/** scope {{{2
 * Scope instance
 *
 * @property scope
 * @type String|Object
 */

/** space {{{2
 * Space containing shard
 *
 * @property space
 * @type Object
 */

/** sid {{{2
 * Shard id unique within a space
 *
 * @property sid
 * @type Number
 */

/** alias {{{2
 * Shard alias
 *
 * @property alias
 * @type String
 */

/** home {{{2
 * Home peer
 *
 * @property home
 * @type String|Object
 */

/** cache {{{2
 * Object containing entries
 *
 * @property cache
 * @type Object
 */

/** master {{{2
 * Client socket linked to the master shard
 *
 * @property master
 * @type Object
 */

/** lhs {{{2
 * Gets fired after each change of `lhs` property
 *
 * @event lhs
 * @param {Integer} New value
 * @param {Integer} Original value
 */

/** master {{{2
 * Is fired when the link to master or home changes, so when changing `.lhs` property from or to the following states: LHS.LINKING, LHS.MASTER, LHS.HOME
 * TODO: copy from space
 *
 * @event master
 * @param {Object} Optional error that occured during linking
 */

// Public {{{1
function C() {  // {{{2
/**
 * Class constructor
 *
 * @method constructor
 */

  O.super.call(this);
  this.setMaxListeners(O.consts.coreListeners);

  this.masterTimeOffset = 0;  // TODO change this value on slave shards, detect timeshift
  this.cache = {};
  this.maps = {};
};

exports.identify = function() {  // {{{2
/**
 * Returns shard identification object. This object consists of `space
 * name` and `shards sid`.
 *
 * @returns {Object} Shard identification object.
 *
 * @method identify
 */

  return {
    sid: this.sid,
    space: this.space && this.space.name,
  };
};

exports.atHome = function() {  // {{{2
/**
 * Check whether we are running in shard`s [home].
 *
 * @returns {Boolean}
 *
 * @method atHome
 */

  switch (this.lhs) {
  case undefined:
  case LHS.INIT_READ:
    return (this.home || this.space.home) === O.here;
  case LHS.AT_HOME:
    return true;
  case LHS.DELETED:
  case LHS.NOT_FOUND:
  case LHS.ERROR:
  case LHS.REMOVED:
    throw O.error(this, 'Shard was already removed');
  }

  return false;
};

exports.afterHome = function(cb) {  // {{{2
/**
 * Execute a callback only in the [home OSE instance]. If the shard has been already initialized, defer `cb()` call, otherwise call `cb()` after shard gets `.lhs` property defined.
 *
 * @param cb {Function} Method to be called
 *
 * @method afterHome
 * @async
 */

  switch (this.lhs) {
  case undefined:
    if ((this.home || this.space.home) === O.here) {
      this.once('lhs', done);
    }
    break;
  case LHS.INIT_READ:
    this.once('lhs', done);
    break;
  case LHS.AT_HOME:
    setTimeout(done, 0);
    break;
  default:
    return;
  }

  var that = this;
  var args = arguments.length > 1 ?
    O._.rest(arguments) :
    null
  ;

  switch (typeof cb) {
  case 'string':
    cb = require(cb);
    break;
  case 'function':
    break;
  default:
    throw O.error(this, 'Callback can be a method or a name of module to require', cb);
  }

  function done() {
    if (args) {
      cb.apply(that, args);
    } else {
      cb(that);
    }
  }
};

exports.entry = function(id, kind, data) {  // {{{2
/**
 * Create a new entry and add it to `this.cache`.
 *
 * @param id {String|Number} Entry `id` unique within shard
 * @param kind {Object|String} Entry kind
 * @param [data] {Object} Optional entry data
 *
 * @returns {Object} Created entry
 *
 * @method entry
 */

  var res = new Entry(this, id);
  res.drev = O.nextTime();
  res.data = data;
  res.setup(kind);
  res.setLhs(this.atHome() ? LHS.AT_HOME : LHS.CLOSED);

  return res;
};

exports.get = function(id, cb) {  // {{{2
/**
 * Get entry with data in the current shard.
 *
 * @param id {String|Number} Entry id.
 * @param cb {Function} Callback with entry as a response
 *
 * @method get
 */

//  console.log('SHARD GET', id);

  if (typeof cb !== 'function') {
    throw O.error(this, '`cb` must be a function', cb);
  }

  var e;
  var that = this;

  this.lhsLink(function(err, lhs) {  // {{{3
    if (err) {
      cb(err);
      return;
    }

    if (test()) return;

    switch (lhs) {
    case LHS.AT_HOME:
      if (! that.db) {
        cb(O.error(that, 'ENTRY_NOT_FOUND', 'Entry was not found, database is not set', id));
        return;
      }

      e = new Entry(that, id);
      e.setLhs(LHS.INIT_READ);
      that.db.get(e.id, function(err, kind, drev, data) {
        if (err) {
          cb(e.error(O.error(that, 'ENTRY_NOT_FOUND', 'Entry was not found in database', id)));
          return;
        }

        e.drev = drev;
        e.data = data;
        e.setup(kind);
        e.setLhs(LHS.AT_HOME);

        cb(null, e);
        return;
      });
      return;
    case LHS.WAITING:
      cb(O.error(that, 'DISCONNECTED', 'Entry can\'t be found, shard is not connected to the master', id));
      return;
    case LHS.MASTER:
    case LHS.HOME:
      e = new Entry(that, id);
      e.setLhs(LHS.INIT_GET);
      L.send(that.master, 'get', id, function(err, resp) {
        if (err) {
          e.error(err);
          cb(err);
          return;
        }

        e.drev = resp.drev;
        e.data = resp.data;
        e.setup(resp.kind);
        e.setLhs(LHS.CLOSED);
        cb(null, e);
        return;
      });
      return;
    }

    throw O.error(that, 'Invalid shard\'s lhs', that.lhs);
  });

  function test() {  // {{{3
    // Returns false when entry was not found

    if (! e && ! (e = that.cache[id])) {
      return false;
    }

    switch (e.lhsInited(cb)) {
    case undefined:
      return true;
    case false:
      e.once('lhs', function() {
        if (! test()) {
          cb(e._err || O.error(that, 'Entry was not found'));
        }
      });
      return true;
    }

    cb(null, e);
    return true;
  }

  // }}}3
};

exports.post = function(id, name, data, socket) {  // {{{2
/**
 * Executes a command on the entry at home.
 *
 * @param name {String} Command name
 * @param [data] {*} Data to be sent
 * @param [socket] {Object} Client socket
 *
 * @method post
 */

//  console.log('SHARD POST', this.lhs, id, name, data);

  if (! L.canClose(socket)) {
    throw O.error(this, 'Socket is invalid', socket);
  }

  var that = this;

  this.lhsLink2(socket, function(lhs) {
    switch (lhs) {
    case LHS.AT_HOME:
      that.get(id, function(err, entry) {
        if (! L.canClose(socket)) return;
        if (err) {
          L.error(socket, err);
          return;
        }

        entry.command(name, data, socket);
        return;
      });
      return;
    case LHS.WAITING:
      L.error(socket, O.error(that, 'DISCONNECTED', 'Shard is not connected to the master'));
      return;
    case LHS.HOME:
    case LHS.MASTER:
      that.send(id, name, data, socket);
      return;
    }
    throw O.error(this, 'Invalid entry\'s lhs', this.lhs);
  });
};

exports.link = function(id, drev, srev, socket) {  // {{{2
/**
 * Establish a [link] to an [entry] in the current shard.
 *
 * @param id {String|Number} Entry id
 * TODO
 *
 * @method link
 */

//  console.log('SHARD LINK', id, drev, srev, typeof socket);

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
  if (! L.canOpen(socket)) {
    throw O.error(this, 'Socket can\'t be opened', socket);
  }

  if (id in this.cache) {
    this.cache[id]._link(drev, srev, socket);
  } else {
    this._link(id, drev, srev, socket);
  }
};

exports.readStream = function(id, cb) {  // {{{2
  var that = this;

  if (typeof cb !== 'function') {
    throw O.error(this, '`cb` must be a function', cb);
  }

//  console.log('SHARD READ STREAM', id);

  this.lhsLink2(cb, function(lhs) {
    if (that.db) {
      that.db.readStream(id, cb);
      return;
    }

    switch (lhs) {
    case LHS.AT_HOME:
      cb(Ose.error(that, 'Shard has no db', id));
      return;
    case LHS.WAITING:
      cb(O.error(that, 'DISCONNECTED', 'Shard is not connected to the master', id));
      return;
    case LHS.MASTER:
    case LHS.HOME:
      L.read(that.master, 'readStream', id, cb);
      return;
    }

    throw O.error(that, 'Invalid shard\'s lhs', that.lhs);
  });
};

exports.getView = function(req, socket) {  // {{{2
/**
 * **Views logic will be changed in principle**
 *
 * @param req {Object} Parameters
 * @param socket {Object|Function} Slave socket or callback
 *
 * @method getView
 */

//  console.log('SHARD GET VIEW', this.sid || this.alias, this.lhs, req);

  var that = this;

  if (! req) req = {};

  that.lhsLink2(socket, function(lhs) {
//    console.log('SHARD GET VIEW LHS', that.lhs);

    switch (lhs) {
    case LHS.MASTER:
    case LHS.HOME:
      L.send(that.master, 'view', req, socket);
      return;
    case LHS.WAITING:
    case LHS.AT_HOME:
      if (that.db && that.db.getView) {
        that.db.getView(req, socket);
        return;
      }

      var result = [];
      for (var key in that.cache) {
        var entry = that.cache[key];

        if (entry.inView(req)) {
          result.push(entry.id);
        }
      }

      L.close(socket, {view: result});
      return;
    }

    throw O.error(that, 'Invalid `lhs`', that.lhs);
  });
};

exports.cacheAll = function(cb) {  // {{{2
/**
 * TODO
 *
 * @method cacheAll
 */

  if (! this.db || this.lhs !== LHS.AT_HOME) {
    throw O.error('Can\' read all entries');
  }

  this.db.getAll(this, O.dummyFn, cb);
};

exports.isIdentified = function(data) {  // {{{2
/**
 * Checks whether this shard is identified by a `data` identification
 * object.
 *
 * @param data {Object} Identification object
 *
 * @returns {Boolean}
 *
 * @method isIdentified
 */

  if (data.space !== undefined) {
    if (this.space.name !== data.space) return false;

    return (this.alias === data.shard) || (this.sid === data.shard);
  } else {
    return this.id === data.shard;
  }
};

// }}}1
// Internal {{{1
exports.error = function(err) {  // {{{2
/**
 * Remove shard from space cache with error.
 *
 * @method error
 * @internal
 */

  switch (err.code) {
  case 'SHARD_DELETED':
    this.remove(LHS.DELETED, err);
    return;
  case 'SHARD_NOT_FOUND':
    this.remove(LHS.NOT_FOUND, err);
    return;
  }

  this.remove(LHS.ERROR, err);
  return;
};

exports.cleanup = function() {  // {{{2
/**
 * Remove shard from space cache.
 *
 * @method cleanup
 * @internal
 */

  for (var key in this.cache) {
    this.cache[key].remove();
  }
  delete this.cache;

  delete this.space.shards[this.sid];
  delete this.space;
};

exports.setup = function(space, sid) {  // {{{2
/*
 * @param space {Object} Space
 * @param sid {Number} Shard id
 * @param scope {String|Object} Scope instance
 * @param alias {String} Shard alias
 * @param [home] {String|Object} Home peer
 */

  if (this.lhsInited() !== false) {
    throw O.error(this, 'Trying to set up already initialized shard');
  }

  if (! sid) {
    throw O.error(this, 'Missing sid');
  }

  if (typeof space === 'string') {
    this.space = O.spaces[space];
  } else {
    this.space = space;
  }

  if (! (this.space instanceof Space)) {
    throw O.error(this, 'Invalid space', space);
  }

  if (sid in this.space.shards) {
    throw O.error(this, 'DUPLICIT_SHARD', 'Sid is already registered', sid);
  }

  this.sid = sid;

  this.space.shards[this.sid] = this;
};

exports.setupConfig = function(home, scope, alias) {  // {{{2
  if (this.home || this.scope || this.alias || this.lhsInited() !== false) {
    throw O.error(this, 'Trying to setup already initialized shard');
  }

  switch (typeof (home || undefined)) {
  case 'object':
    break;
  case 'string':
    home = this.space.peer(home);
    break;
  default:
    throw O.error(this, 'Invalid shard\`s home', {home: home});
  }

  if (home !== this.space.home) {
    this.home = home;
  }

  switch (typeof scope) {
  case 'string':
    this.scope = O.getScope(scope);
    break;
  case 'object':
    this.scope = scope;
    if (this.scope instanceof Scope) {
      break;
    }
    // DO NOT BREAK
  default:
    throw O.error(this, 'Invalid scope', {scope: scope});
  }

  if (alias) {
    this.alias = alias;
  }
};

exports.setupDone = function() {  // {{{2
  if (this.lhsInited() !== false) {
    throw O.error(this, 'Trying to setup already initialized shard');
  }

  if (! this.space) {
    throw O.error(this, 'Shard has no space defined');
  }

  if ((this.home || this.space.home) === O.here) {
    this.setLhs(LHS.AT_HOME);
  } else {
    this.setLhs(LHS.CLOSED);
  }

  O.log.notice('New shard', {space: this.space.name, sid: this.sid});
};

exports.config = function(name, data, deps) {  // {{{2
/**
 * Called by `O.readConfig()`
 *
 * @param name {String} Configuration name
 * @param data {Object} Configuration data
 * @param deps {Object} Dependencies object
 *
 * @method config
 * @internal
 */

  var that = this;

  if (data.cached || data.homeInit || data.deps || data.homeDeps) {
    throw O.error(this, 'INVALID_CONFIG', 'Obsolete configuration', data);
  }

  deps.add('shards', 'peers', function(cb) {  // {{{3
    // This method will be called after all peers are created and set up

    that.setup(data.space || O.here.space, data.sid);
    that.setupConfig(data.home || O.here, data.scope, data.alias);

    if (data.db) {
      that.db = new (O.class(data.db.class || data.db))(data.db);
    }

    cb('shards');
  });

  deps.add('entries', 'shards', function(cb) {  // {{{3
    // This method will be called after all shards are set up

    if (data.entries) {
      entries(data.entries);
    }

    cb('entries');
  });

  deps.add('lhs', 'connect', function(cb) {
    // This method will be called after all peers with `url` are connected

    that.setupDone(that);

    cb('lhs');
  });

  deps.add({after: 'lhs'}, function(cb) {  // {{{3
    // This method will be called after all shards and spaces has lhs defined

    if (data.afterEntries) {
      entries(data.afterEntries);
    }

    cb();
  });

  function entries(entry) {  // {{{3
    switch (typeof (entry || undefined)) {
    case 'undefined':
      return;
    case 'string':
      entries(require(entry));
      break;
    case 'function':
      entry(that);
      break;
    case 'object':
      if (Array.isArray(entry)) {
        O._.each(entry, entries);
        break;
      }
    default:
      throw O.error(that, 'INVALID_CONFIG', 'Invalid entry', entry);
    }
  }

  // }}}3
};

exports._link = function(id, drev, srev, socket) {  // {{{2
/**
 * This method tries to link entry to the master. It expects that:
 * - entry doesn't exist in the current shard
 */

//  console.log('SHARD _LINK', id, drev, srev);

  var that = this;
  var e = new Entry(that, id);
  e.firstSlave(drev, srev);

  this.lhsLink(function(err, lhs) {
//    console.log('SHARD _LINK ON LHS', lhs, err);
    if (check(err)) return;

    switch (lhs) {
    case LHS.AT_HOME:
      if (! that.db) {
        check(O.error(that, 'ENTRY_NOT_FOUND', 'Entry was not found in the shard\'s home', id));
        return;
      }

      e.setLhs(LHS.INIT_READ);
      that.db.get(id, onDb);
      return;
    case LHS.WAITING:
      L.error(socket, e.error(O.error(that, 'DISCONNECTED', 'Shard is not connected to the master')));
      return;
    case LHS.MASTER:
    case LHS.HOME:
      e.setLhs(LHS.INIT_LINK);
      e.once('lhs', function(err) {
        if (check(err)) return;
//        if (e.isRemoved()) return;

        new EntrySlave(e, 1, drev, srev, socket);
        return;
      });

      new EntryMaster(e);
      return;
    }

    throw O.error(this, 'Invalid `lhs`', this.lhs);
  });

  function onDb(err, kind, dr, data) {  // {{{3
//    console.log('SHARD _LINK ON DB', err);
    if (err) {
      check(O.error(that, 'ENTRY_NOT_FOUND', 'Entry was not found in database', id));
      return;
    }

    e.drev = dr;
    e.data = data;
    e.setup(kind);

    check();

    e.setLhs(LHS.AT_HOME);

    new EntrySlave(e, 1, drev, srev, socket);
    return;
  }

  function check(err) {  // {{{3
//    console.log('SHARD _LINK CHECK', err);
    if (! L.canClose(socket)) {
      delete e.slaves;
      delete e.dtc;
      delete e.stc;

      if (err && ! e.isRemoved()) e.error(err);
//      console.log('SHARD _LINK CHECK CAN\'T CLOSE', err);
      return true;
    }
    if (err) {
      delete e.slaves;
      delete e.dtc;
      delete e.stc;

      if (! e.isRemoved()) {
        e.error(err);
      }
      L.error(socket, err);
//      console.log('SHARD _LINK CHECK ERROR', err);
      return true;
    }

    return false;
  }

  // }}}3
};

exports.send = function(id, name, data, socket) {  // {{{2
/**
 * Send a entry command to shard's home
 *
 * @param id {String|Number} Entry id.
 * @param name {String} Command name
 * @param [data] {*} Data to be sent
 * @param [socket] {Object} Client socket
 *
 * @method send
 * @internal
 */

//  console.log('ENTRY SEND', id, name, data);

  var that = this;

  this.lhsLink2(socket, function(lhs) {
    switch (lhs) {
    case LHS.AT_HOME:
      that.get(id, onEntry);
      return;
    case LHS.MASTER:
    case LHS.HOME:
      L.send(
        that.master,
        'command',
        {
          id: id,
          name: name,
          data: data,
        },
        socket
      );
      return;
    case LHS.WAITING:
      L.error(socket, O.error(that, 'DISCONNECTED', 'Shard is not connected to the home'));
      return;
    }

    throw O.error(that, 'Invalid `lhs` for send', that.lhs);
  });

  function onEntry(err, entry) {  // {{{3
    if (! L.canClose(socket)) return;
    if (err) {
      L.error(socket, err);
      return;
    }

    entry.command(name, data, socket);
    return;
  }

  // }}}3
};

exports.linkMaster = function(cb) {  // {{{2
/**
 * Establish a link to the master shard. Calls `cb(err)` after lhs is changed from LINKING
 *
 * @param cb {Function(err)}
 *
 * @method linkMaster
 * @internal
 * @async
 */

  switch (this.lhs) {
  case LHS.CLOSED:
  case LHS.WAITING:
    break;
  default:
    throw O.error(this, 'Invalid `this.lhs` when creating master for the this', this.lhs);
  }

  this.setLhs(LHS.LINKING);

  cb && this.once('lhs', cb);

  new Master(this);
};

exports.rebuildMaps = function(cb) {  // {{{2
/**
 * Establish a link to the master shard. Calls `cb(err)` after lhs is changed from LINKING
 *
 * @param cb {Function(err)}
 *
 * @method linkMaster
 * @internal
 * @async
 */

  var that = this;

  if (typeof cb !== 'function') {
    throw O.error(this, '`cb` must be a function', cb);
  }

  if (! this.db) {
    cb(O.error(this, 'Database is not specified'));
    return;
  }

  var c = O.counter();
  for (var key in this.maps) {
    this.db.removeMap(this.maps[key], c.bind());
  }

  c.done(function() {  // {{{3
    var c = O.counter();
    for (var key in that.scope.maps) {
      that.db.createMap(that, key, that.scope.maps[key], c.bind());
    }
    c.done(function(err) {
      that.db.getAll(that, onEntry, cb);
    });
  });

  function onEntry(entry, ecb) {  // {{{3
    for (var key in that.maps) {
      that.db.addEntry2Map(that.maps[key], entry, ecb);
    }
  }

  // }}}3
};

// }}}1
// Private {{{1
function addEntry(that, entry) {  // {{{2
  if (! entry.id) {
    if (! that.entryId) {
      O.log.unhandled('Cannot create new entry without id in slave shard.');
      return false;
    }

    entry.id = that.entryId++;
  }

  if (entry.id in that.cache) {
    O.log.unhandled('Entry with same id already exist in that shard.', that.alias || that.id, entry);
    return false;
  }

  entry.shard = that;

  that.cache[entry.id] = entry;

  return true;
};

// }}}1
