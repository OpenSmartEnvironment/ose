'use strict';

const O = require('ose')(module)
  .class(init, 'EventEmitter')
  .prepend('../subject')
;

var Consts = O.consts('ose');
var Entry = O.getClass('../entry');
var L = O.link;

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Shard class
 *
 * @readme
 * A shard is a container for [entries]. Each shard belongs to a certain
 * [space]. Every shard has an id that is unique within
 * its [space]. Each shard is tied to a single [schema] (ie. it cannot
 * contain [entries] of [kinds] belonging to different
 * [schemas]). Every shard either belongs to the same [home] as its
 * space or is assigned to a different one.
 *
 * @description

 * Each shard has a defined schema, which determines its data are
 * handled, such as:
 * - (cache)[ose/lib/schema/cache],
 * - (filesystem)[ose-fs/lib/index] or
 * - (LevelDB)[ose-level/lib/index].
 *
 * @aliases shard shards
 *
 * @class ose.lib.shard
 * @extends EventEmitter
 * @uses ose.lib.subject
 * @type class
 */

/**
 * Shard id unique within a space
 *
 * @property id
 * @type Number
 */

/**
 * Space containing shard
 *
 * @property space
 * @type Object
 */

/**
 * Reference to shard schema
 *
 * @property schema
 * @type Object
 */

/** schema {{{2
 * schema instance
 *
 * @property schema
 * @type Object
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
 * @type Object
 */

/** master {{{2
 * Client socket linked to the master shard
 *
 * @property master
 * @type Object
 */

// Public {{{1
function init() {  // {{{2
/**
 * Class constructor
 *
 * @method constructor
 */

  O.inherited(this)();

  this.setMaxListeners(Consts.coreListeners);

  this.subjectState = this.SUBJECT_STATE.INIT;

  this.homeTimeOffset = 0;

  this.lastTid = 0;  // {{{3
  /**
   * Autoincemental part of last transaction id created in this shard and peer
   *
   * @property lastTid
   * @type Number
   */

  this.lastEid = 0;  // {{{3
  /**
   * Autoincremental part of last entry id created in this shard and peer
   *
   * @property lastEid
   * @type Number
   */

  this.cache = {};  // {{{3
  /**
   * Object containing entries
   *
   * @property cache
   * @type Object
   */

  // }}}3

  return true;
};

exports.toString = function() {  // {{{2
/**
 * Return short shard description
 *
 * @return {String} Shard description
 *
 * @method toString
 */

  return 'Shard: ' + this.alias + ' ' + (this.space && this.space.name) + '/' + this.id;
};

exports.isIdentified = function(ident) {  // {{{2
/**
 * Checks whether this shard is identified by an `ident` entry
 * identification.
 *
 * @param ident {Object|Array} Entry identification
 *
 * @returns {Boolean}
 *
 * @method isIdentified
 */

  O.log.todo('Check shard.isIdentified()');

  if (! ident) return false;

  if (typeof ident === 'object') {
    if (Array.isArray(ident)) {
      switch (ident.length) {
      case 2:
        return ident[1] === this.id;
      case 3:
        return ident[1] === this.id && ident[2] === this.space.name;
      }
      return false;
    }

    if (ident.space && ident.space !== this.space.name) return false;
    return ident.shard && ident.shard === this.alias;
  }

  return false;
};

exports.isAtHome = function() {  // {{{2
/**
 * Check whether we are running in shard`s [home].
 *
 * @returns {Boolean}
 *
 * @method isAtHome
 */

  return (this.home || this.space.home) === O.here;
};

exports.addCommand = function(name, handler) {  // {{{2
/**
 * Add command handler to the current shard
 *
 * @param name {String} Command name
 * @param handler {String|Function|Object} Command handler
 *
 * @method addCommand
 */

  if (typeof (name || undefined) !== 'string') {
    throw O.log.error(this, 'INVALID_ARGS', name);
  }
  switch (typeof (handler || undefined)) {
  case 'string':
  case 'function':
  case 'object':
    break;
  default:
    throw O.log.error(this, 'INVALID_ARGS', handler);
  }

  if (! this.commands) {
    this.commands = {};
  }

  if (name in this.commands) {
    throw O.log.error(this, 'Duplicit command handler', name, handler);
  }

  this.commands[name] = handler;
};

exports.removeCommand = function(name) {  // {{{2
/**
 * Remove command handler from the current shard
 *
 * @param name {String} Command name
 *
 * @method removeCommand
 */

  if (this.commands) {
    delete this.commands[name];
  }
};

exports.get = function(eid, cb) {  // {{{2
/**
 * Get [entry] with data in the current shard.
 *
 * @param eid {Number|String} Entry id
 * @param cb {Function} Callback with entry as a response, `function(err, entry)`
 *
 * @method get
 */

//  console.log('SHARD GET ENTRY', eid);

  if (typeof cb !== 'function') {
    throw O.log.error(this, '`cb` must be a function', cb);
  }

  return this.schema.get(this, eid, cb);
};

exports.find = function(ident, cb) {  // {{{2
/**
 * Find an [entry] relative to this shard
 *
 * @param ident {Object|String|Number} Entry identification
 * @param cb {Function} Callback with entry as a response, `function(err, entry)`
 *
 * @method find
 * @async
 */

  if (typeof cb !== 'function') {
    throw O.log.error(this, '`cb` must be a function', cb);
  }

  var that = this;

  switch (O.typeof(ident)) {
  case 'number':  // Requested entry is in the same shard and is identified by entry id
    return this.schema.get(this, ident, cb);
  case 'string':  // Requested entry is in the same shard and is identified by entry alias
    return this.schema.find(this, ident, cb);
  case 'array':  // Requested entry is identified by array
    switch (ident.length) {
    case 2:
      return this.space.getShard(ident[1], function(err, shard) {
        if (err) return cb(err);
        return shard.schema.get(shard, ident[0], cb);
      });
    case 3:
      return O.data.getSpace(ident[2], function(err, space) {
        if (err) return cb(err);
        return space.getShard(ident[1], function(err, shard) {
          if (err) return cb(err);
          return shard.schema.get(shard, ident[0], cb);
        });
      });
    }
    break;
  case 'object':  // Requested entry is identified by object
    if (! ident.space) {
      return this.space.findShard(ident.shard, onShard);
    }

    return O.data.getSpace(ident.space, function(err, space) {
      if (err) return cb(err);
      return space.findShard(ident.shard, onShard);
    });
  }

  return cb(O.error(this, 'INVALID_IDENT', ident));

  function onShard(err, shard) {  // {{{3
    if (err) return cb(err);

    return shard.find(ident.entry, cb);
  }

  // }}}3
};

exports.findSibling = function(ident, cb) {  // {{{2
/**
 * Find a [shard] based on entry `ident`
 *
 * @param ident {Object|String|Number} Entry identification
 * @param cb {Function} Callback with entry as a response, `function(err, shard)`
 *
 * @method findSibling
 * @async
 */

  if (typeof cb !== 'function') {
    throw O.log.error(this, '`cb` must be a function', cb);
  }

  var that = this;

  switch (O.typeof(ident)) {
  case 'number':  // Requested entry is in this shard
  case 'string':  // Requested entry is in this shard
    return this.nextReady(cb);
  case 'array':  // Requested entry is identified by array
    switch (ident.length) {
    case 2:
      return this.space.getShard(ident[1], cb);
    case 3:
      return O.data.getSpace(ident[2], function(err, space) {
        if (err) return cb(err);
        return space.getShard(ident[1], cb);
      });
    }
    break;
  case 'object':  // Requested entry is identified by object
    if (! ident.space) {
      return this.space.findShard(ident.shard, cb);
    }

    return O.data.getSpace(ident.space, function(err, space) {
      if (err) return cb(err);
      return space.findShard(ident.shard, cb);
    });
  }

  return cb(O.error(this, 'INVALID_IDENT', ident));
};

exports.track = function(ident, socket) {  // {{{2
/**
 * Establish a [link] to an [entry] identified by `ident`
 *
 * @param ident {Object|Array} Target entry [identification]
 * @param [socket] {Object} Client socket to be connectted to the *
 * target entry. If the socket is not provided, an new EventEmitter is
 * created and returned.
 *
 * @method track
 * @returns EventEmitter client socket
 */

//  console.log('SHARD TRACK ENTRY', this.alias || this.id, ident, typeof socket);

  if (socket === undefined) {
    socket = O.new('EventEmitter')();
  } else {
    if (! L.canOpen(socket)) {
      throw O.log.error(this, 'Socket can\'t be opened', socket);
    }
  }

  var that = this;
  var entry;

  switch (O.typeof(ident)) {
  case 'number':
    return trackEid(ident);
  case 'string':
    this.schema.findAlias(this, ident, function(err, eid) {
      if (err) return error(err);
      if (! L.canClose(socket)) return;
      return trackEid(eid);
    });
    return socket;
  case 'array':
    switch (ident.length) {
    case 2:
      this.space.getShard(ident[1], function(err, shard) {
        if (err) return error(err);

        if (! L.canClose(socket)) return;
        return shard.track(ident[0], socket);
      });
      return socket;
    case 3:
      O.data.getSpace(ident[2], function(err, space) {
        if (err) return error(err);

        return space.getShard(ident[1], function(err, shard) {
          if (err) return error(err);

          if (! L.canClose(socket)) return;
          return shard.track(ident[0], socket);
        });
      });
      return socket;
    }

    break;
  case 'object':
    if (! ident.space) {
      if (! ident.shard) break;

      this.space.findShard(ident.shard, function(err, shard) {
        if (err) return error(err);

        if (! L.canClose(socket)) return;
        return shard.track(ident.entry, socket);
      });
      return socket;
    }

    O.data.getSpace(ident.space, function(err, space) {
      if (err) return error(err);

      space.findShard(ident.shard, function(err, shard) {
        if (err) return error(err);

        if (! L.canClose(socket)) return;
        return shard.track(ident.entry, socket);
      });
    });
    return socket;
  }

  L.error(socket, O.error(this, 'INVALID_IDENT', ident));
  return socket;

  function error(err) {  // {{{3
    if (L.canClose(socket)) {
      return L.error(socket, err);
    }

    return true;
  }

  function trackEid(eid) {  // {{{3
    if (eid in that.cache) {
      return that.cache[eid].track(socket);
    }

    if (that.isAtHome()) {
      return that.schema.get(that, eid, function(err, entry) {
        if (err) return error(err);
        return entry.openLink(socket);
      });
    }

    entry = new Entry(that, eid);
    return entry.awaitSteadyMaster(function(err) {
      if (err) return error(err);
      return entry.openLink(socket);
    });
  }

  // }}}3
};

exports.post = function(ident, name, data, socket) {  // {{{2
/**
 * Send command to target's entry home
 *
 * @param ident {Integer|String|Object} Target entry identification object
 * @param name {String} Command name
 * @param [data] {*} Data to be sent
 * @param [socket] {Object|Function}
 *
 * @method post
 */

//  console.log('SHARD POST', ident, name, data);

  if (! L.canClose(socket)) {
    throw O.log.error(this, 'Socket is invalid', socket);
  }

  switch (typeof ident) {
  case 'number':
  case 'string':
    return this._post(ident, name, data, socket);
  case 'object':
    if (ident instanceof Entry) {
      return ident.post(name, data, socket);
    }

    return this.space.findShard(ident, function(err, shard) {
      if (! L.canClose(socket)) return;
      if (err) return L.error(socket, err, true);

      return shard._post(ident.entry || ident[0], name, data, socket);
    });
  }

  throw O.log.error(this, '`ident` is not entry identification', ident);
};

exports.read = function(eid, cb) {  // {{{2
  this.schema.read(this, eid, cb);
};

exports.query = function(name, req, cb) {  // {{{2
/**
 * Query shard data
 *
 * @param name {String} Query name
 * @param req {Object} Parameters
 * @param cb {Function} `function(err, response)`
 *
 * @method query
 */

  if (arguments.length === 2) {
    cb = req;
    req = {};
  } else {
    if (! req) req = {};
  }

  if (typeof name !== 'string') {
    throw O.log.error(this, 'INVALID_ARGS', 'Query `name` must be a string', name);
  }
  if (typeof req !== 'object') {
    throw O.log.error(this, 'INVALID_ARGS', '`req` name must be an object', req);
  }
  if (typeof cb !== 'function') {
    throw O.log.error(this, 'INVALID_ARGS', '`cb` must be a function', cb);
  }

  return this.schema.query(this, name, req, cb);
};

exports.cacheAll = function(cb) {  // {{{2
/**
 * TODO
 *
 * @method cacheAll
 */

  cb(O.log.todo());
  return;
};

exports.nextTime = function() {  // {{{2
/**
 * @returns {Number} Next time for revisions
 *
 * @method nextTime
 */

  return O.nextTime() - this.created;
};

exports.afterHome = function(cb) {  // {{{2
/**
 * Execute a callback only in the [home OSE instance]. If the shard
 * has been already initialized, defer `cb()` call, otherwise call
 * `cb()` after shard gets initialized.
 *
 * @param cb {Function|String} Method to be called, or unit to be required
 *
 * @method afterHome
 * @async
 */

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
    throw O.log.error(this, 'Callback can be a method or a name of module to require', cb);
  }

  this.awaitReady(function(err) {
    if (args) {
      cb(that, args);
    } else {
      cb(that);
    }
  });
};

exports.transaction = function() {  // {{{2
/**
 * Start new transaction
 *
 * @returns {Object} Transaction instance
 *
 * @method transaction
 */

  return O.new('./trans')(this);
};

exports.entryIdentMatch = function(ident, obj) {  // {{{2
  switch (O.typeof(ident)) {
  case 'number':
    return obj.sid === this.id && ident === obj.eid;
  case 'string':
    return obj.sid === this.id && ident === obj.eal;
  case 'object':
    if (typeof ident.shard === 'string') {
      if (ident.shard !== this.alias && ident.shard !== obj.sal) return false;
    } else {
      if (ident.shard !== this.id && ident.shard !== obj.sid) return false;
    }

    return ident.entry === obj.eid || ident.entry === obj.eal;
  case 'array':
    return ident[0] === obj.eid && ident[1] === obj.sid;
  }

  return false;
};

exports.expandIdent = function(ident) {  // {{{2
/**
 * Add space and shard information to entry identification
 *
 * @param ident {Object|String|Number} Entry identification to be expanded
 *
 * @returns {Object|Array} Entry identification including space and shard information.
 *
 * @method expandIdent
 */

  switch (O.typeof(ident)) {
  case 'number':
    return [ident, this.id, this.space.name];
  case 'string':
    return {
      entry: ident,
      shard: this.id,
      space: space.name,
    }
  case 'array':
    switch (ident.length) {
    case 2:
      return [ident[0], ident[1], this.space.name];
    case 3:
      return ident;
    }

    return O.error(this, 'INVALID_IDENT', ident);
  case 'object':
    return {
      entry: ident.entry,
      shard: ident.shard || this.id,
      space: ident.space || space.name,
    };
  }
};

// Internal {{{1
exports.Master = O.getClass('../space/master');  // {{{2

exports.command = function(name, data, socket) {  // {{{2
/**
 * Execute a command on the current shard
 *
 * @param name {String} Command name
 * @param data {*} Data to be sent
 * @param socket {Object} Client socket
 *
 * @method command
 * @internal
 * @async
 */

//  console.log('SHARD COMMAND', this.id, name, data);

  var that = this;

  if (! L.canClose(socket)) {
    throw O.log.error(this, 'Invalid socket', socket);
  }
  if (! this.isAtHome()) {
    return L.error(socket, O.error(this, 'Not at shard\'s home', {name: name, data: data}));
  }

  return this.nextReady(function(err) {
    if (! L.canClose(socket)) return;
    if (err) return L.close(socket);

    if (that.commands && (name in that.commands)) {
      var handler = that.commands[name];
      switch (typeof (handler || undefined)) {
      case 'function':
        return handler(that, name, data, socket);
      case 'string':
        O.new(handler)(that, name, data, socket);
        return;
      case 'object':
        if (O.isSuper('EventEmitter', handler)) {
          return handler.emit('open', that, name, data, socket);
        }

        if (typeof handler.open === 'function') {
          handler.open(that, name, data, socket);
        }
      }
    }

    return L.error(socket, O.error(that, 'UNKNOWN_COMMAND', 'Shard has no handler for the command', {name: name, data: data}));
  });
};

exports.cleanup = function() {  // {{{2
/**
 * Remove shard from space cache.
 *
 * @method cleanup
 * @internal
 */

  this.schema && this.schema.cleanup(this);

  for (var key in this.cache) {
    this.cache[key].remove();
  }
  delete this.cache;

  if (this.space) {
    delete this.space.shards[this.id];
//    delete this.space;
  }
};

exports.config = function(key, val, deps) {  // {{{2
/**
 * TODO
 *
 * @param key {String} Configuration key
 * @param val {Object} Configuration data
 * @param deps {Object} Dependencies object
 *
 * @method config
 * @internal
 */

  if (val.cached || val.homeInit || val.deps || val.homeDeps || val.entries || val.afterEntries) {
    throw O.log.error(this, 'INVALID_CONFIG', 'Obsolete configuration', val);
  }

  var that = this;

  deps.add('shards', 'peers', function(cb) {  // {{{3
    // This method will be called after all available peers are created and set up

    var space;
    if (val.space) {
      space = O.data.spaces[val.space];  // TODO: Consider use of O.data.getSpace()? Race condition, space can be not yet steady. How to do it right?
      if (! space) {
        return cb(this.remove(O.error(that, 'SPACE_NOT_FOUND')));
      }
    } else {
      space = O.here.space;
    }
    that.baseSetup(val.sid, space);

    return that.setupConfig(val, cb);
  });

  deps.add('entries', 'shards', function(cb) {  // {{{3
    // This method will be called after all shards are set up

    that.setupDone();

    if (val.upgrades) {
      return upgrades(val.upgrades, cb)
    }

    return cb();
  });

    /* TODO second phase of home entries initialization, when shard is at home and peers are connected
  deps.add('finish', 'connect', function(cb) {  // {{{3
    // This method will be called after all peers with `url` are connected

    if (that.isAtHome()) {
      for (var key in that.cache) {
        var e = that.cache[key];
        e.kind.doHomeInit(e);
      }
    }

    return cb();
  });

  deps.add({after: 'finish'}, function(cb) {  // {{{3
    // This method will be called after all shards and spaces has lhs defined

    cb();
  });
    */

  function upgrades(val, cb) {  // {{{3
    var trans = that.transaction();

    iter(val, function(err) {
      if (err) return cb(err);

      return trans.commit(cb);
    });

    function iter(val, cb) {
      switch (typeof (val || undefined)) {
      case 'undefined':
        return cb();
      case 'string':
        return iter(require(val), cb);
      case 'function':
        return val(trans, cb);
      case 'object':
        if (Array.isArray(val)) {
          return O.async.eachSeries(val, iter, cb);
        }
        // NO BREAK
      default:
        return cb(O.error(that, 'INVALID_CONFIG', '"upgrades"', val));
      }
    }
  }

  // }}}3
};

exports.baseSetup = function(sid, space) {  // {{{2
  if (this.id || this.space) {
    this.remove('SHARD_ALREADY_INITIALIZED');
    return false;
  }

  if (sid in space.shards) {
    this.remove('DUPLICIT_SHARD_ID', 'Shard id is already registered', sid);
    return false;
  }

  this.id = sid;
  this.space = space;

  space.shards[sid] = this;
  return true;
};

exports.setupConfig = function(val, cb) {  // {{{2
  var home = val.home ?
    this.space.peer(val.home) :
    O.here
  ;
  if (home !== this.space.home) {
    this.home = home;
  }

  if (val.alias) {
    this.alias = val.alias;
  }

  this.schema = O.data.schemas[val.schema];
  if (! this.schema) {
    return cb(this.remove('Schema not found', val.schema));
  }

  if (! this.isAtHome()) {
    this.schema = this.schema.remote;
  }

  if (this.schema.name !== val.schema) {
    return cb(this.remove('Schema mismatch', val.schema));
  }

  return this.schema.init(this, val, cb);
};

exports.setupDone = function() {  // {{{2
  O.log.notice('New shard', {space: this.space.name, sid: this.id, schema: this.schema.name});

  this.setReady();

  return true;
};

exports._post = function(ident, name, data, socket) {  // {{{2
/**
 * Executes a command on the entry at home.
 *
 * @param ident {Number|String} Entry id or alias
 * @param name {String} Command name
 * @param [data] {*} Data to be sent
 * @param [socket] {Object} Client socket
 *
 * @method _post
 * @internal
 */

//  console.log('SHARD _POST', ident, name, data);

  if (! this.isAtHome()) {
    return this.sendMaster('command', {entry: ident, name: name, data: data}, socket);
  }

  return this.find(ident, function(err, entry) {
    if (! L.canClose(socket)) return;
    if (err) return L.error(socket, err);

    return entry.command(name, data, socket);
  });
};

exports.getGw = function(cb) {  // {{{2
/**
 *
 * @method getGw
 * @internal
 */

  return (this.home || this.space.home).getGw(cb);
};

exports.openMaster = function(ws) {  // {{{2
  ws.tx({
    type: 'shard',
    newLid: ws.addLink(this.master),
    space: this.space.name,
    sid: this.id,
    home: (this.home || this.space.home).name,
    alias: this.alias,
    schema: this.schema.name,
  });
};

exports.masterOpened = function(data) {  // {{{2
/**
 * @method masterOpened
 * @internal
 */

  this.setMasterState(data.home ?
    this.MASTER_STATE.HOME :
    this.MASTER_STATE.MASTER
  );

  this.homeTimeOffset = Date.now() - data.homeTime;

  for (var key in this.cache) {
    var entry = this.cache[key];

    if (entry.masterState === entry.MASTER_STATE.WAITING) {
      new entry.Master(entry);
    }
  }
};

