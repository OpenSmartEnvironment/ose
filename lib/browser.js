'use strict';

/** Doc {{{1
 * @module ose
 */

/**
 * @caption OSE browser
 *
 * @readme
 * This script contains the OSE framework initialization in the
 * browser. It must be sourced before any other OSE module that is
 * using `window.ose()`.
 *
 * Limited CommonJS require() behaviour is made available. Every module,
 * provided by the backend to the browser, is wrapped to
 * `window.ose()` method call.
 *
 * @class ose.lib.browser
 * @type module
 */

(function() {  // Main {{{1

var O;

const Cache = {};  // {{{2
/**
 * Cached modules, `require()` was already called on them
 *
 * @property Cache
 * @type Object
 */

const Modules = {};  // {{{2
/**
 * Registered, but not yet created modules
 *
 * @property Modules
 * @type Object
 */

window.ose = function(id, filename, init) {  // {{{2
/**
 * `ose` is a global variable.
 * Provides CommonJS Require emulation. Registers module wrapped by `init` function.
 *
 * @param id {String} Module id
 * @param filename {String} Module filename
 * @param init {Function} Module initialization
 *
 * @method window.ose
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
/*!
 * Makes this module available via `require("ose/lib/browser")`
 */

  module.parent = module;

  exports.Modules = Modules;
  exports.Cache = Cache;
  exports.cache = cache;
});

window.ose.run = function() {  // {{{2
/**
 * Setups OSE framework and initializes plugins.
 *
 * @method run
 */

  window.global = window;
  window.process = cache('process').exports;
  window.Buffer = cache('buffer').exports.Buffer;

  cache('ose/lib/wrap').exports.setup('browser');
  O = cache('ose').exports.O;
  window.ose.O = O;

  O.extend('now', now);
  O.extend('exit', exit);

  O.run(O.require('ose/config'));
};

function now() {  // {{{2
  return Date.now() * 1000;
};

function exit() {  // {{{2
  window.close();
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

//  console.log('REQUIRE', id);

  var match = id.match(/(.*)\.js$/);
  if (match) {
    id = match[1];
  }

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
    t = O._.compact(t);
    t.push(O._.compact(u).join('/'));
    id = t.join('/');

    break;
  }

  var match = id.match(/(.*)\/lib$/);
  if (match) {
    id = match[1];
  }

  switch (id) {
  case 'util/':
  case 'core-util-is':
    id = 'util';
    break;
  case 'is-array':
    id = 'isarray';
    break;
  case 'ose/node_modules/readable-stream/lib/_stream_duplex':
    id = '_stream_duplex';
    break;
  case 'ose/node_modules/readable-stream/lib/_stream_passthrough':
    id = '_stream_passthrough';
    break;
  case 'ose/node_modules/readable-stream/lib/_stream_readable':
    id = '_stream_readable';
    break;
  case 'ose/node_modules/readable-stream/lib/_stream_writable':
    id = '_stream_writable';
    break;
  case 'ose/node_modules/readable-stream/lib/_stream_transform':
    id = '_stream_transform';
    break;
  case 'ose/node_modules/util/support/isBuffer':
    id = 'util/support/isBuffer';
    break;
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

//  console.log('CACHE', id);

  var mod = Modules[id];
  if (! mod) {
    throw O.error('MODULE_NOT_FOUND', 'Module was not found: "' + id + '"', id);
  }

  delete Modules[id];

  Cache[id] = mod;

  try {
    mod.init(mod.exports, mod.require.bind(mod), mod, '', '');
  } catch (err) {
    O.log.error(err);
    throw err;
  }

  mod.loaded = true;

  return mod;
};

// }}}2

})();
