'use strict';

var O;  // This package wrapper; defined by calling `setupO()` from `Wrap.setup(runtime)`
var Wrap = require('./wrap');

/** Docs {{{1
 * @caption Framework
 *
 * @readme
 * Extensible framework for development and rapid prototyping of
 * applications based on Node.js and HTML5.
 *
 * @features
 * - Robust multi-instance architecture
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
 * - Deeper integration into Firefox OS and other environments
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
 * @scope ose
 * @module ose
 * @main ose
 */

/**
 * @caption OSE core
 *
 * @readme
 * The core object of the "ose" package. It provides methods for
 * [wrapping modules] complying to the CommonJS modules spec. Wrapped modules
 * gives access the functionality of the OSE framework, see [Module
 * wrapping].
 *
 * @class ose.core
 * @type module
 * @main ose.core
 */

// Public {{{1
exports.app = function(mod, name) {  // {{{2
/**
 * Create a module wrap instance for an application
 *
 * @param mod {Object} Module to be wrapped
 * @param name {String} Package and scope name
 *
 * returns {Object} Module wrap
 *
 * @method app
 */

  var res = new Wrap(mod);

  res.package = name;
  res.scope = name;

  return res;
};

exports.module = function(mod) {  // {{{2
/**
 * Create a module wrap instance
 *
 * @param mod {Object} Module to be wrapped
 *
 * returns {Object} Module wrap
 *
 * @method module
 */

  return new Wrap(mod);
};

exports.class = function(mod, ctor, sup) {  // {{{2
/**
 * Create a module wrap instance for a class
 *
 * @param mod {Object} Module to be wrapped
 * @param [ctor] {Function} Optional class constructor
 * @param [sup] {Function|String} Optional superclass
 *
 * returns {Object} Module wrap
 *
 * @method module
 */

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
    throw O.log.error('INVALID_ARGS', arguments);
  }

  var res = new Wrap(mod, 'class');

  switch (typeof (ctor || undefined)) {
  case 'undefined':
  case 'function':
    res.__ctor = ctor;
    break;
  default:
    throw O.log.error(wrap, 'INVALID_ARGS', arguments);
  }

  setSuper(res, sup);

  res.defineO();

  return res;
};

exports.object = function(mod, init, sup) {  // {{{2
/**
 * Create a module wrap instance for an object (singleton)
 *
 * @param mod {Object} Module to be wrapped
 * @param [init] {Function} Object initialization method
 * @param [sup] {Function|String} Optional superclass
 *
 * returns {Object} Module wrap
 *
 * @method object
 */

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
    throw O.log.error('INVALID_ARGS', arguments);
  }

  var res = new Wrap(mod, 'object');

  switch (typeof (init || undefined)) {
  case 'undefined':
    break;
  case 'function':
    res.__init = init;
    break;
  default:
    throw O.log.error(res, 'INVALID_ARGS', arguments);
  }

  if (setSuper(res, sup)) {
    mod.exports = Object.create((res.super || Object).prototype);
  }

  res.defineO();

  return res;
};

// }}}1
// Internal {{{1
exports.setupO = function() {  // {{{2
/**
 * @method setupO
 * @internal
 */

  O = exports.module(module);
};

exports.setup = function() {  // {{{2
/**
 * @method setup
 * @internal
 */

  O.package = 'ose';
  O.scope = 'ose';

  O.consts.coreListeners = 10000;  // Max listeners for subjects

  O.extend('link', require('./link'));
  O.extend('diff', require('./diff'));
};

exports.config = function(name, val, deps) {  // {{{2
/**
 * OSE plugin configuration method.
 *
 * @method config
 * @internal
 */

  if (! val.name) {
    throw O.log.error('INVALID_CONFIG', 'Missing local instance name', val);
  }

  O.extend('here', require('./peer/here'));
  O.here.name = val.name;
  if (val.ssl) {
    O.readSslConfig(val.ssl, deps);
  }

  deps.add('core', function(cb) {
    var space = O.spaces[val.space];
    if (! space) {
      cb(O.error('SPACE_NOT_FOUND'));
      return;
    }

    O.here.space = space;
    space.spid = val.spid;
    space.peers[val.name] = O.here;

    if (val.gw) {
      O.extend('gw', O.here.space.peer(val.gw));

      if (val.gwUrlFromWindowLocation) {
        O.gw.urlFromWindowLocation(val.gwUrl);
      }
    }

    cb();
    return;
  });
};

exports.browserConfig = function(config) {  // {{{2
/**
 * Prepare configuration for the browser.
 *
 * @param config {Object} Configuration object
 *
 * @method browserConfig
 * @internal
 */

  config.name = O.random();
  config.space = O.here.space.name;
  config.gw = O.here.name;
  config.gwUrlFromWindowLocation = true;
};

// }}}1
// Private {{{1
function setSuper(wrap, val) {  // {{{2
  switch (typeof (val || undefined)) {
  case 'undefined':
    return;
  case 'function':
    return wrap.super = val;
  case 'string':
    return wrap.super = wrap.class(val);
  }

  throw O.log.error(wrap, 'INVALID_ARGS', arguments);
}

function run() {  // {{{2
  if (typeof window === 'undefined') {  // Not in the browser environment
    var node = require('./node');

    if (require.main === module) {  // This module was directly called from Node.js
      node.run();
    }
  }
}

// }}}1

run();
