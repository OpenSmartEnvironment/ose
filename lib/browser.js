'use strict';

/** Doc {{{1
 * @module ose
 */

/**
 * @caption OSE browser
 *
 * @readme
 * This script contains the OSE framework initialization in the browser. It must be sourced before any other OSE module that is using `window.ose()`.
 *
 * The following steps are taken in this script:
 * - The limited CommonJS require() behaviour is prepared. Every module, provided by the backend to the browser, is wrapped to `window.ose()` method call.
 * - The `run` method on `document.onload` event is registered.
 * - After the document is ready, `ose.setup()` is called to prepare OSE framework.
 * - Finally [plugins] are configured with configuration from module `ose/config`.
 *
 * @class ose.lib.browser
 * @type module
 */

// }}}1
// Main {{{1
(function() {

var Ose;
var M;

var Cache = {};  // {{{2
/**
 * Cached modules, `require()` was already called on them
 *
 * @property Cache
 * @type Object
 */

var Modules = {};  // {{{2
/**
 * Registered, but not yet created modules
 *
 * @property Modules
 * @type Object
 */

window.ose = function(id, filename, init) {  // {{{2
/**
 * CommonJS Require emulation. Register module wrapped by function `init`.
 *
 * @param id {String} Module id
 * @param filename {String} Module filename
 * @param init {Function} Module initialization
 *
 * @function window.ose
 */


/* TODO move to the server side

  var match = name.match(/(.*)\.js$/);
  if (match) {
    name = name[1];
  }

  var match = name.match(/(.*)\/index$/);
  if (match) {
    name = match[1];
  }

  var match = name.match(/(.*)\/lib$/);
*/


  var result = {
    id: id,
    filename: filename,
    init: init,
    children: [],
    exports: {},
    require: require,
  };

  return Modules[id] = result;
};

window.ose('ose/lib/browser', 'ose/lib/browser.js', function(exports, require, module, __filename, __dirname) {  // {{{2
/**
 * Make this module available via `require("ose/lib/browser")`
 */

  module.parent = module;

  exports.Modules = Modules;
  exports.Cache = Cache;
  exports.require = require;
  exports.cache = cache;
  exports.run = run;
});

window.ose.run = function() {  // {{{2
/**
 * Setup OSE framework and intialize plugins.
 *
 * @method run
 */

  var m = cache('ose');
  m.parent = m;

  Ose = m.exports;
  Ose.resolvePackage = resolvePackage;
  Ose.addClass('EventEmitter', window.EventEmitter);
  Ose.setup('browser');

  M = Ose.module(m);

//  window.onerror = onError;

  m.require('./plugins').config(m.require('ose/config'));
};

function onError(err) {  // Global error handler. {{{2
  M.log.error(err);
};

function resolvePackage(m) {  // {{{2
  m.name = m.module.id;
};

function require(id) {  // {{{2
/**
 * Emulate CommonJS "require".
 * `this` is bound to the calling module.
 *
 * @param id {String} Module to be required
 *
 * @method require
 */

  var match = id.match(/(.*)\/index$/);
  if (match) {
    id = match[1];
  }

  var u = id.split('/');
  switch (u[0]) {
  case '.':
    id = this.filename.substring(0, this.filename.lastIndexOf('/')) + id.substring(1);
    break;
  case '..':
    var i = 0;
    var t = this.filename.split('/');
    t[t.length - 1] = null;

    while (u[i] === '..') {
      u[i] = null;
      t[t.length - i - 2] = null;
      i++
    }
    t = Ose._.compact(t);
    t.push(Ose._.compact(u).join('/'));
    id = t.join('/');

    break;
  }

  var match = id.match(/(.*)\/lib$/);
  if (match) {
    id = match[1];
  }

  var result = Cache[id];

  if (! result) {
    result = cache(id);

    result.parent = this;
    this.children.push(result);
  }

  return result.exports;
};

function cache(id) {  // {{{2
/**
 * Initialize and move module from `Modules` to `Cache`.
 *
 * @param id {String} Module to be cached
 *
 * @method cache
 */

  var m = Modules[id];
  if (! m) {
//    console.log('MODULE NOT FOUND', id);
//    console.trace();

    var err = new Error('Module "' + id + '" not found!');
    err.code = 'MODULE_NOT_FOUND';
    err.data = id;
    throw err;
  }

  delete Modules[id];

  Cache[id] = m;

  m.init(m.exports, m.require.bind(m), m, '', '');

  m.loaded = true;

  return m;
};

// }}}2

})();

// }}}1
