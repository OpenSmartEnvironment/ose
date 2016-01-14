'use strict';

var O = require('ose').class(module, C);

/** Docs {{{1
 * @module ose
 */

/**
 * @caption Dependencies
 *
 * @readme
 * Dependencies make it possible to carry out asynchronous operations
 * in a specific order.
 *
 * @class ose.lib.deps
 * @type class
 * @extends EventEmitter
*/

// Public {{{1
function C(names) {  // {{{2
/**
 * Class constructor
 *
 * @method constructor
 */

  this.count = 0;
  this.deps = {};
  this.groups = {};
  this.cb = null;

  if (! names) return;

  this.add(names[0], function(cb) { cb() });
  for (var i = 1; i < names.length; i++) {
    this.add(names[i], names[i-1], function(cb) { cb() });
  }

  return;
}

exports.exec = function(cb) {  // {{{2
  if (typeof cb !== 'function') {
    throw O.log.error(this, 'Callback must be a function', cb);
  }

  if (this.cb !== null) {
    throw O.log.error(this, 'Trying to execute already processed dependencies');
  }

  this.cb = cb;

  return execAll(this);
};

exports.add = function(name, after, cb) {  // {{{2
/**
 * Add a new dependency
 *
 * @param [name] {String} Group name
 * @param [after] {String} Name of group on which this dependency depends
 * @param cb {Function} Dependency code
 *
 * @method add
 */

  if (! ('cb' in this)) {
    return 0;
  }

  var dep;

  switch (arguments.length) {
  case 1:
    dep = {cb: name};
    break;
  case 3:
    dep = {
      name: name,
      after: after,
      cb: cb,
    };
    break;
  case 2:
    switch (typeof (name || undefined)) {
    case 'undefined':
      dep = {};
      break;
    case 'object':
      dep = name;
      break;
    case 'string':
      dep = {name: name};
      break;
    case 'function':
      dep = {after: name};
      break;
    default:
      throw O.log.error(this, 'Invalid depenedency', dep);
    }

    if (after) {
      dep.cb = after;
    }
    break;
  default:
    throw O.log.error(this, 'INVALID_ARGS', arguments);
  }

  if (typeof dep.cb !== 'function') {
    throw O.log.error(this, 'INVALID_ARGS', arguments);
  }

  if (dep.name) {
    if (dep.name in this.groups) {
      ++this.groups[dep.name];
    } else {
      this.groups[dep.name] = 1;
    }
  }

  this.deps[++this.count] = dep;

  if (this.cb && test(this, dep.after)) {
    exec(this, this.count, dep);
  }

  return this.count;
};

exports.bind = function(name, timeout) {  // {{{2
/**
 * Increment a counter and return a method to be called after a task has been done.
 *
 * @param name {String} Key, to identify a task
 * @param [timeout] Timeout in milliseconds
 *
 * @return
 */

  var that = this;
  var handle;

};

exports.inc = function(name) {  // {{{2
/**
 * Increment dependency group counter
 *
 * @param name {String} Group name
 *
 * @method inc
 */

//  console.log('DEPS INC', name);

  if (name in this.groups) {
    return ++this.groups[name];
  }

  return this.groups[name] = 1;
};

exports.dec = function(name) {  // {{{2
/**
 * Decrement dependency group counter
 *
 * @param name {String} Group name
 *
 * @method dec
 */

//  console.log('DEPS DEC', name);

  if (this.groups[name] > 0) {
    --this.groups[name];

    if (! this.groups[name]) {
      this.exec();
    }

    return;
  }

  throw O.log.error(this, 'UNEXPECTED', 'Trying to decrement non existent or 0 dependencies', name);
};

// Private {{{1
function test(that, after) {  // {{{2
  if (! after) return true;

  switch (O.typeof(after)) {
  case 'string':
    return ! that.groups[after];
  case 'function':
    return ! after();
  case 'array':
    for (var i = 0; i < after.length; i++) {
      if (! test(that, after[i])) {
        return false;
      }
    }
    return true;
  }

  finish(that, O.error(that, 'Dependency `after` can be a "string", "function" or "array"', {key: key, after: after}));
  return;
}

function execAll(that) {  // {{{2
  if (O._.isEmpty(that.deps)) {
    return finish(that);
  }

  var count = 0;

  for (var key in that.deps) {
    var dep = that.deps[key];
    if (dep && test(that, dep.after)) {
      exec(that, key, dep);
      count++;
    }

    if (! that.cb) return;
  }

  return;
}

function exec(that, key, dep) {  // {{{2
  that.deps[key] = null;

  O.async.setImmediate(function() {
    if (! ('cb' in that)) return;

    dep.timeout = setTimeout(function() {
      dep.timeout = true;

      if (! ('cb' in that)) return;

      finish(that, O.error(dep, 'Dependency timeout', dep.cb));
    }, that.defaultTimeout || 10 * 1000);

    dep.cb(function(err) {
      if (dep.timeout === true) return;

      if (dep.timeout) {
        clearTimeout(dep.timeout);
        delete dep.timeout;
      }

      if (! ('cb' in that)) return;

      if (err) return finish(that, err);

      delete that.deps[key];

      if (dep.name) {
        if (that.groups[dep.name] > 0) {
          --that.groups[dep.name];
        } else {
          throw O.log.error(that, 'UNEXPECTED', 'Trying to decrement non existent or 0 dependencies', dep.name);
        }
      }

      return execAll(that);
    });
  });
}

function finish(that, err) {  // {{{2
  var cb = that.cb;
  delete that.cb;
  cb(err);
}

