'use strict';

var O = require('ose').class(module, C, 'EventEmitter');

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
function C() {  // {{{2
/**
 * Class constructor
 *
 * @method constructor
 */

  O.super.call(this);
  this.setMaxListeners(O.consts.coreListeners);

  this.count = 0;
  this.deps = {};
  this.groups = {};
}

exports.exec = function() {  // {{{2
/**
 * Execute processing dependencies
 *
 * @method exec
 */

  if (O._.isEmpty(this.deps)) {
    this.emit('done');
    return;
  }

  var that = this;

  for (var key in this.deps) {
    var dep = this.deps[key];

    if (dep && test(dep.after)) {
      call(key, dep);
    }
  }

  function call(key, dep) {  // {{{3
    that.deps[key] = null;

    dep.cb(function(name) {
      delete that.deps[key];

      if (name) {
        that.dec(name);
        return;
      }

      that.exec();
      return;
    });
  }

  function test(after) {  // {{{3
    if (! after) return true;

    switch (typeof after) {
    case 'string':
      return ! that.groups[after];
    case 'function':
      return ! after();
    case 'object':
      if (Array.isArray(after)) {
        for (var i = 0; i < after.length; i++) {
          if (! test(after[i])) {
            return false;
          }
        }
        return true;
      }
    }

    delete that.deps[key];
    that.emit(O.error(that, 'Depenedency `after` can be a "string", "function" or "array"', {key: key, after: after}));

    if (O._.isEmpty(that.deps)) {
      that.emit('done');
    }

    return;
  }

  // }}}3
};

exports.add = function(name, after, cb) {  // {{{2
/**
 * Add a new dependency
 *
 * @param name {String} Group name
 * @param after {String} Name of group on which this dependency depends
 * @param cb {Function} Dependency code
 *
 * @method add
 */

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
      throw O.error(this, 'Invalid depenedency', dep);
    }

    if (after) {
      dep.cb = after;
    }
    break;
  default:
    throw O.error(this, 'This method accepts 1, 2 or 3 arguments', arguments);
  }

  if (typeof dep.cb !== 'function') {
    throw O.error(this, 'Dependency callback must be a function', arguments);
  }

  if (dep.name) {
    this.inc(dep.name);
  }

//  console.log('ADDING DEPENDENCY', dep);

  this.deps[++this.count] = dep;
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

  throw O.error(this, 'UNEXPECTED', 'Trying to decrement non existent or 0 dependencies', name);
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

  this.inc(name);

  if (timeout) {
    handle = setTimeout(onTime, timeout);
  }

  return function() {
    if (timeout) {
      if (handle) {
        clearTimeout(handle);
      } else {
        return;
      }
    }

    that.dec(name);
  };

  function onTime() {
    handle = null;
    that.dec(name)
  }
};

// }}}1
