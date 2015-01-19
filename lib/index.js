'use strict';

// Require is in browser available after calling Ose.setup

var Ose = exports;
var M;  // This package wrapper; defined during `setup()`

/** Docs {{{1
 * @caption Framework
 *
 * @readme
 * Lightweight and extensible framework for development and rapid
 * prototyping of applications based on Node.js and HTML5.
 *
 * The framework was conceived as a base for an OSE application that
 * manages the physical and virtual environment that a user lives
 * in. It brings the ability to easily monitor and control the
 * environment, and to automate tasks.
 *
 * @features
 * - Multi-instance architecture
 * - Transparent network communication via WebSockets
 * - Near real-time synchronization
 * - Code sharing between Node.js and web browsers
 * - Partitioned data model
 * - Extensible via npm packages
 *
 *
 * @planned
 * TODO
 * - User-based authentication
 * - Automate backups and deployment
 * - Deeper integration into Firefox OS and other environments
 * - Socialization
 * - Integration with other Free Software
 * - Integration with on-line services
 *
 *
 * @keywords
 * TODO
 * javascript, nodejs, framework, webapp, distributed
 *
 *
 * @aliases
 * framework oseFramework supportedBrowser supportedBrowsers
 *
 * @module ose
 * @main ose
 */

/**
 * @caption OSE core
 *
 * @readme
 * Most modules use the `OSE core` singleton by calling `var Ose = require('ose')`.
 *
 * @class ose.core
 * @type singleton
 * @main ose.core
 */

// Public {{{1
exports.classes = {};  // {{{2
/**
 * Predefined class names and constructors
 *
 * @property classes
 * @type Object
 */

exports.setup = function(runtime) {  // {{{2
/**
 * Sets up OSE framework
 *
 * @param runtime {String} (`"browser"` | `"node"`) Runtime environment
 *
 * @method setup
 */

  this.lastTime = 0;
  this.runtime = runtime;

  this.addClass('EventEmitter', require('events').EventEmitter);

  this._ = require('underscore');  // TODO document _ and _s properties
  this._s = require('underscore.string');
  this.dia = require('diacritics').remove;  // {{{3
  /**
   * Return new string based on `val` with diacriticts transformed to ascii.
   *
   * @param val {String} Value to transform.
   *
   * @return {String} Transformed string.
   *
   * @method dia
   */
  // }}}3

  var w = require('./wrap');

  this.Class = newWrap('class');
  this.Module = newWrap('module');
  this.Package = newWrap('package');
  this.Singleton = newWrap('singleton');

  M = this.package(module);

  w.setup();

  Counter = M.class('./counter');
  Scope = M.class('./scope');

  this.link = require('./link');
  this.peers = require('./peer/list');
  this.plugins = require('./plugins');
  this.scopes = {};
  this.spaces = require('./space/list');

  M.init();
  M.scope = 'core';
  M.kind('./peer', 'peer');
  M.content();

  function newWrap(name) {  // {{{3
    var result = w[name];

    var def = {};

    exports._.extend(def, w.common, w[name + 'Proto']);

    result.prototype = Object.create(Object.prototype, def);

    return result;
  }

  // }}}3
};

exports.quit = function() {  // {{{2
/**
 * Gracefully close everything and exit process.
 *
 * @method quit
 */

  this.quitting = true;

  this.spaces.terminate();

  this.peers.disconnect();

  this.exit && this.exit();
};

exports.config = function(name, data) {  // {{{2
/**
 * OSE plugin configuration method.
 *
 * @param data {Object} Configuration data
 *
 * @method config
 */

  if (! data.name) {
    throw Ose.error('missingName', data);
  }

  this.name = data.name;
  this.peers.config(data.name, data.peers, data.gw);
};

exports.browserConfig = function(config) {  // {{{2
/**
 * Prepare configuration for the browser.
 *
 * @param config {Object} Configuration object
 *
 * @method browserConfig
 */

  if (! this.clientId) this.clientId = 1;

  config.name = this.clientId++ + '.' + Ose.now() + '.' + this.name;
  config.peer = this.name;
  config.peers = {};
  config.peers[this.name] = 'window.location';
  config.gw = this.name;
};

exports.class = function(m, ctor, sup) {  // {{{2
  switch (arguments.length) {
  case 1:
  case 3:
    break;
  case 2:
    if (typeof ctor === 'string') {
      sup = ctor;
      ctor = undefined;
    }
    break;
  default:
    throw exports.error('invalidArgs', arguments);
  }

  return new (this.Class)(m, ctor, sup);
};

exports.module = function(m) {  // {{{2
  return new (this.Module)(m);
};

exports.package = function(m, init) {  // {{{2
  var result = new (this.Package)(m, init);
  if (this.resolvePackage) {
    this.resolvePackage(result);
  }

  return result;
};

exports.singleton = function(m, init, sup) {  // {{{2
  switch (arguments.length) {
  case 1:
  case 3:
    break;
  case 2:
    if (typeof init === 'string') {
      sup = init;
      init = undefined;
    }
    break;
  default:
    throw exports.error('invalidArgs', arguments);
  }

  return new (this.Singleton)(m, init, sup);
};

exports.error = function(subject, code, message, data) {  // {{{2
/**
 * Creates `Error` instance and appends a subject and data to it.
 *
 * See [logging].
 *
 * @param [subject] {*} Subject of the error
 * @param code {String} Error code
 * @param [message] {String} Error message
 * @param [data] {Object} Optional data describing error
 */

  switch (arguments.length) {
  case 1:
    message = subject;
    subject = undefined;
    break;
  case 2:
    if (typeof subject === 'string') {
      message = code;
      code = subject;
      subject = undefined;
    }

    if (typeof message !== 'string') {
      data = message;
      message = code;
      code = undefined;
    }
    break;
  case 3:
    if (typeof subject === 'string') {
      data = message;
      message = code;
      code = subject;
      subject = undefined;
    } else if (typeof message !== 'string') {
      data = message;
      message = code;
      code = undefined;
    }
    break;
  }

  var result = new Error(message);
  if (code) {
    result.code = code;
  }
  if (subject) {
    result.subject = subject;
  }
  result.data = data;

  return result;
};

exports.identify = function(subject) {  // {{{2
  if (! subject) return undefined;

  if (subject === this) {
    return {
      module: 'ose'
    };
  };

  if (subject.identify) {
    return subject.identify();
  }

  if (subject.M) {
    return {
      module: subject.M.module.filename
    };
  }

  var result = {
    identity: 'unidentifed',
    type: typeof subject,
  };

  if (typeof subject === 'object') {
    if ('name' in subject) {
      result.name = subject.name;
    }

    if ('id' in subject) {
      result.id = subject.id;
    }

    if ('lid' in subject) {
      result.lid = subject.lid;
    }
  }

  result.subject = subject;

  return result;
};

exports.addClass = function(name, ctor) {  // {{{2
/**
 * Add a class constructor `ctor` into predefined `classes`.
 *
 * @param name {String} Class name
 * @param ctor {Function} Class constructor
 *
 * @method addClass
 */

  this.classes[name] = ctor;
};

exports.now = function() {  // {{{2
  return new Date().getTime() * 1000;
};

exports.getLocale = function() {  // TODO: Obtain locale from HTTP header instead. {{{2
  var result;

  if (window.navigator.language) {  // Firefox, Opera and Chromium
    result = window.navigator.language;
  } else if (navigator.browserLanguage) {  // IE
    result = navigator.browserLanguage;
  }

  return result;
};

exports.nextTime = function() {  // {{{2
/**
 * Return current time in unix timestamp format in microseconds
 *
 * @return {Number} Current timestamp in microseconds
 *
 * @method getTime
 */

  var result = this.now();

  if (result > this.lastTime) {
    return this.lastTime = result;
  }

  return ++this.lastTime;
};

exports.parseBool = function(val) {  // {{{2
/**
 * Parses booleans
 *
 * @param val {undefined|null|String|Number|Boolean} Value to parse
 *
 * @return {Boolean}
 *
 * @method parseBool
 */

  switch (typeof val) {
  case 'null':
  case 'undefined':
    return false;
  case 'boolean':
    return val;
  case 'number':
    return Boolean(val);
  case 'string':
    switch (val.toLowerCase()) {
    case '':
    case '0':
    case 'n':
    case 'no':
    case 'off':
    case 'false':
      return false;
    case '1':
    case 'y':
    case 'yes':
    case 'on':
    case 'true':
      return true;
    }
    throw new Error('invalidArgs');
  case 'object':
    if (! val) return false;
    throw new Error('invalidArgs');
  }

  throw new Error('invalidArgs');
};

exports.counter = function(cb) {  // {{{2
/**
 * Creates a new counter. If `cb` is already a counter instance, it only increments it.
 * Counters are used for multiple asynchronous operations with one final callback.
 *
 * @param cb {Function} Final callback
 *
 * @returns {Object} Counter with callback
 *
 * @method counter
 */

  if (M.isSuper(Counter, cb)) {
    cb.inc();
    return cb;
  }

  return new Counter(cb);
};

exports.scope = function(name) {  // {{{2
/**
 * Creates a new scope instance of a given name or returns an existing one.
 *
 * @param name {String} Name of a scope
 *
 * @returns {Object} `Scope` instance
 *
 * @method scope
 */

  if (name in this.scopes) {
    return this.scopes[name]
  }

  return this.scopes[name] = new Scope(name);
};

exports.callChain = function(subject, method/*, args*/) {  // {{{2
/**
 * Call all methods with name `method` in prototype chain of `subject`.
 *
 * `method` is called with `args` specified after argument `method`.
 *
 * @param subject {subject}
 * @param method {Function}
 * @param [arg]* {*} Optional arguments to send to subject's init function.
 *
 * @method callChain
 */

  var args;
  if (arguments.length > 2) {
    args = Ose._.rest(arguments, 2);
  }

//  console.log('CALL PROTO CHAIN', subject.className, method, args);

  var p = subject;
  while (p) {
    if (p.hasOwnProperty(method) && (typeof p[method] === 'function')) {
//      console.log('CALL CHAIN', method, p.M && p.M.module.id);

      p[method].apply(subject, args);
    }
    p = Object.getPrototypeOf(p);
  }
};

exports.dummyFn = function() {};  // {{{2

// }}}1
// Private {{{1
var Counter;
var Scope;

//}}}1

(function() {
  if (typeof window === 'undefined') {  // We are not in the browser.
    var node = require('./node');

    if (require.main === module) {  // This module is directly called from Node.js.
      node.run();
    }
  }
})();

