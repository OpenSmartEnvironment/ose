'use strict';

const Wrap = require('./wrap');
const O = new Wrap(module);

module.exports = function(mod) {
  return new Wrap(mod);
};

if (typeof window === 'undefined') {  // Not in the browser environment
  require('./node');
}

// Initialization
(function() {
  const consts = O.consts('ose');
  consts.coreListeners = 10000;  // Max listeners for subjects
  consts.closeEntrySlaveTimeout = 1000;

  O.addClass('EventEmitter', require('events').EventEmitter);
  O.addClass('Deps', './deps');
  O.addClass('Logger', './logger');

  O.setPackage('ose');

  O.extendO('link', require('./link'));
  O.extendO('diff', require('./diff'));
  O.extendO('data', require('./data'));

  if (require.main === module) {  // This module was directly called from Node.js
    require('./node').run();
  }
})();

/** Doc {{{1
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

// Internal {{{1
O.exports.config = function(name, val, deps) {  // {{{2
/**
 * OSE plugin configuration method.
 *
 * @method config
 * @internal
 */

  if (! val.name) {
    throw O.log.error('INVALID_CONFIG', 'Missing local instance name', val);
  }

  if (val.dataDir) {
    O.extendO('dataDir', val.dataDir, true);
  }

  O.extendO('here', require('./peer/here'));
  O.here.name = val.name;
  if (val.ssl) {
    O.readSslConfig(val.ssl, deps);
  }

  deps.add('core', function(cb) {
    var space = O.data.spaces[val.space];
    if (! space) {
      cb(O.error('SPACE_NOT_FOUND'));
      return;
    }

    O.here.space = space;
    space.spid = val.spid;
    space.peers[val.name] = O.here;

    if (val.gw) {
      O.extendO('gw', O.here.space.peer(val.gw));

      if (val.gwUrlFromWindowLocation) {
        O.gw.urlFromWindowLocation(val.gwUrl);
      }
    }

    cb();
    return;
  });
};

O.exports.browserConfig = function(config) {  // {{{2
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
