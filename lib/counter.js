'use strict';

var O = require('ose').class(module, C);

/** Docs {{{1
 * @module ose
 */

/**
 * @caption Counter
 *
 * @readme
 * Counters are used for multiple asynchronous operations with one
 * final callback.
 *
 * @class ose.lib.counter
 * @type class
*/

/**
 * Final callback
 *
 * @property cb
 * @type Function(err)
 */

/**
 * Timeout in milliseconds
 *
 * @property timeout
 * @type Number
 */

// Public {{{1
function C(timeout, cb) {  // {{{2
/**
 * Class constructor, sets up `cb` and `count = 1`
 *
 * @param cb {Function (err)} Callback
 *
 * @method constructor
 */

  if (cb) {
    this.timeout = timeout;
    this.cb = cb;
  } else {
    if (typeof timeout === 'number') {
      this.timeout = timeout;
    } else {
      this.cb = timeout;
    }
  }

  this.count = 1;
};

exports.done = function(timeout, cb) {  // {{{2
/**
 * Sets up `timeout` and `cb` properties and decrements a counter.
 *
 * @param [timeout] {Number} Timeout in milliseconds
 * @param cb {Function(err)} Callback
 *
 * @method done
 */

  if (cb) {
    this.cb = cb;
    this.timeout = timeout;
  } else {
    this.cb = timeout;
  }

  if (this.count === 'removed') {
    call(this.timeout, this.cb, this.error);
    delete this.cb;
  } else {
    this.dec();
  }
};

exports.remove = function(err) {  // {{{2
  if (this.count === 'removed') return;

  this.count = 'removed';
  this.error = err;

  if (! this.cb) return;

  call(this.timeout, this.cb, err);
  delete this.cb;

  return;
};

exports.inc = function() {  // {{{2
/**
 * Increments counter by count.
 *
 * @return {Object} Counter object
 *
 * @chainable
 * @method inc
 */

  switch (this.count) {
  case 0:
    throw O.log.error(this, 'Invalid count', this.count);
  case 'removed':
    return false;
  }

  this.count++;
  return true;
};

exports.dec = function(err) {  // {{{2
/**
 * Decrements counter by one.
 *
 * @param [err] {Object} Error object
 *
 * @method dec
 */

  switch (this.count) {
  case 0:
    throw O.log.error(this, 'Invalid count', this.count);
  case 'removed':
    return false;
  }

  if (err) {
    if (this.errors) {
      this.errors.push(err);
    } else {
      this.errors = [err];
    }
  }

  if (--this.count === 0) {
    var err;
    if (this.errors) {
      err = new Error('Multiple errors occured');
      err.code = 'MULTIPLE';
      err.errors = this.errors;
    }
    call(this.timeout, this.cb, err);
    delete this.cb;
  }
};

exports.bind = function() {  // {{{2
/**
 * Increments a counter and returns method to be called after task has been done.
 *
 * @return
 */

  this.inc();

  return this.dec.bind(this);
};

// }}}1
// Private {{{1
function call(timeout, cb, err) {  // {{{2
  if (! cb) return;

  setTimeout(function() {
    if (err) {
      cb(err);
      return;
    }

    cb();
    return;
  }, timeout || 0);
}

// }}}1
