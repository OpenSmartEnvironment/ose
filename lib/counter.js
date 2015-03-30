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
function C(cb) {  // {{{2
/**
 * Class constructor, sets up `cb` and `count = 1`
 *
 * @param cb {Function (err)} Callback
 *
 * @method constructor
 */

  this.cb = cb;

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

  this.dec();
};

exports.inc = function(count) {  // {{{2
/**
 * Increments counter by count.
 *
 * @param [count=1] {Number} Count to increment counter by
 *
 * @return {Object} Counter object
 *
 * @chainable
 * @method inc
 */

  if (this.count > 0) {
    this.count += count === undefined ? 1 : count;
  } else {
    O.log.error(O.error(this, 'invalidCount', this.count));
  }

  return this;
};

exports.dec = function(err, key, resp) {  // {{{2
/**
 * Decrements counter by one.
 *
 * @param [err] {Object} Error object
 * @param [key] {String} Key of a call
 * @param [resp] {*} Response for a `key`
 *
 * @method dec
 */

  if (err) {
    if (this.errors) {
      this.errors.push(err);
    } else {
      this.errors = [err];
    }
  }

  if (key) {
    if (! this.resp) this.resp = {};

    this.resp[key] = resp;
  } else if (resp) {
    if (this.resp) {
      if (this.resp.length) {
        this.resp[this.resp.length++] = resp;
      } else {
        this.resp.length = 1;
        this.resp['0'] = resp;
      }
    } else {
      this.resp = {
        length: 1,
        '0': resp
      };
    }
  }

  if (--this.count === 0) {
    if (this.cb) {
      setTimeout(
        (function() {
          this.cb(this.errors, this.resp);
        }).bind(this),
        this.timeout || 0
      );
    }
  }

  if (this.count < 0) {
    O.log.error(O.error(this, 'invalidCount', this.count));
  }
};

exports.bind = function(key, timeout) {  // {{{2
/**
 * Increments a counter and returns method to be called after task has been done.
 *
 * @param key {String} Key, to identify a task
 * @param [timeout] {Number} Timeout in milliseconds
 *
 * @return
 */

  var that = this;
  var handle;

  this.inc();

  if (timeout) {
    handle = setTimeout(onTime, timeout);
  }

  return function(err, data) {
    if (timeout) {
      if (handle) {
        clearTimeout(handle);
      } else {
        return;
      }
    }

    that.dec(err, key, data);
  };

  function onTime() {
    handle = null;
    that.dec('timeout', key)
  }
};

// }}}1
