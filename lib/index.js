'use strict';

var O;  // This package wrapper; defined during `setup()`
var Wrap = require('./wrap');

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
 * The core object of the "ose" package. It provides methods for
 * wrapping modules complying to the Common.js spec. Wrapped modules
 * gives access the functionality of the OSE framework, see [Module
 * wrapping].
 *
 * @class ose.core
 * @type singleton
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
    throw O.error('Invalid arguments', arguments);
  }

  var res = new Wrap(mod, 'class');

  switch (typeof (ctor || undefined)) {
  case 'undefined':
  case 'function':
    res.__ctor = ctor;
    break;
  default:
    throw O.error(wrap, 'Invalid arguments', arguments);
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
    throw O.error('Invalid arguments', arguments);
  }

  var res = new Wrap(mod, 'object');

  switch (typeof (init || undefined)) {
  case 'undefined':
    break;
  case 'function':
    res.__init = init;
    break;
  default:
    throw O.error(res, 'Invalid arguments', arguments);
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

  O.consts.coreListeners = 10000;  // Max listeners for space, shard and entry classes

  O.extend('link', require('./link'));
  O.extend('spaces', require('./space/list'));
  O.extend('plugins', require('./plugins'));

  O.content('../content');
};

exports.config = function(name, data, deps) {  // {{{2
/**
 * OSE plugin configuration method.
 *
 * @method config
 * @internal
 */

  if (! data.name) {
    throw O.error(this, 'INVALID_CONFIG', 'Missing local instance name', data);
  }

  O.extend('here', require('./peer/here'));
  O.here.name = data.name;

  deps.add('core', function(cb) {
    if (! (data.space in O.spaces)) {
      throw O.error('INVALID_CONFIG', 'Space was not found', data.space);
    }

    O.here.space = O.spaces[data.space];
    O.here.space.peers[data.name] = O.here;

    if (data.gw) {
      O.extend('gw', O.here.space.peer(data.gw));

      if (data.gwUrlFromWindowLocation) {
        O.gw.urlFromWindowLocation(data.gwUrl);
      }
    }

    cb('core');
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

  throw O.error(wrap, 'Invalid arguments', arguments);
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
