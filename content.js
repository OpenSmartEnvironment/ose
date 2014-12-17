'use strict';

var Ose = require('ose');
var M = Ose.singleton(module, 'ose/lib/http/content');
exports = M.exports;

/** Docs  {{{1
 * @module ose
 */

/**
 * @caption OSE content
 *
 * @readme
 * Provides files of OSE framework package to the browser.
 *
 * @class ose.content
 * @type singleton
 * @extends ose.lib.http.content
 */

// Public {{{1
exports.addFiles = function() {  // {{{2
  this.addHead('lib/browser.js', 1);

  this.addModule('node_modules/underscore/underscore-min.js', 'underscore');
  this.addModule('node_modules/underscore.string/lib/underscore.string.js', 'underscore.string');
  this.addModule('node_modules/diacritics/index.js', 'diacritics');

  this.addJs('node_modules/wolfy87-eventemitter/EventEmitter.min.js');

//  this.addModule('lib/action');
  this.addModule('lib/counter');
  this.addModule('lib/entry/command');
  this.addModule('lib/entry/index');
  this.addModule('lib/entry/master');
  this.addModule('lib/entry/slave');
  this.addModule('lib/field/common');
  this.addModule('lib/field/object');
  this.addModule('lib/field/lookup');
  this.addModule('lib/field/lookups');
  this.addModule('lib/field/text');
  this.addModule('lib/field/timestamp');
  this.addModule('lib/index');
  this.addModule('lib/kind');
  this.addModule('lib/link');
  this.addModule('lib/logger');
  this.addModule('lib/peer/here');
  this.addModule('lib/peer/index');
  this.addModule('lib/peer/list');
  this.addModule('lib/peer/remote');
  this.addModule('lib/peer/rx');
  this.addModule('lib/plugins');
  this.addModule('lib/scope');
  this.addModule('lib/shard/index');
  this.addModule('lib/shard/master');
  this.addModule('lib/shard/slave');
  this.addModule('lib/space/index');
  this.addModule('lib/space/list');
  this.addModule('lib/wrap');
  this.addModule('lib/ws/browser');
  this.addModule('lib/ws/index');
  this.addModule('lib/ws/master');
  this.addModule('lib/ws/relay');
  this.addModule('lib/ws/slave');

  this.addHandler('config.js', Ose.plugins.respondConfig);
};

// }}}1
