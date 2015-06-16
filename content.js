'use strict';

var O = require('ose').object(module, Init, 'ose/lib/http/content');
exports = O.init();

/** Docs  {{{1
 * @module ose
 */

/**
 * @caption Framework content
 *
 * @readme
 * Provides files of [ose] package to the browser.
 *
 * @class ose.content
 * @type singleton
 * @extends ose.lib.http.content
 */

// Public {{{1
function Init() {  // {{{2
  O.super.call(this);

  this.addHead('lib/browser.js', 1);

  this.addModule('depends/stream.js', 'stream');

  this.addModule('node_modules/async/lib/async.js', 'async');
  this.addModule('node_modules/blob-stream/index.js', 'blob-stream');
  this.addModule('node_modules/blob-stream/node_modules/blob/index.js', 'blob');
  this.addModule('node_modules/buffer/index.js', 'buffer');
  this.addModule('node_modules/buffer/node_modules/base64-js/lib/b64.js', 'base64-js');
  this.addModule('node_modules/buffer/node_modules/ieee754/index.js', 'ieee754');
  this.addModule('node_modules/diacritics/index.js', 'diacritics');
  this.addModule('node_modules/events/events.js', 'events');
  this.addModule('node_modules/os-browserify/browser.js', 'os');
  this.addModule('node_modules/readable-stream/lib/_stream_duplex.js', '_stream_duplex');
  this.addModule('node_modules/readable-stream/lib/_stream_passthrough.js', '_stream_passthrough');
  this.addModule('node_modules/readable-stream/lib/_stream_readable.js', '_stream_readable');
  this.addModule('node_modules/readable-stream/lib/_stream_transform.js', '_stream_transform');
  this.addModule('node_modules/readable-stream/lib/_stream_writable.js', '_stream_writable');
  this.addModule('node_modules/readable-stream/node_modules/inherits/inherits_browser.js', 'inherits');
  this.addModule('node_modules/readable-stream/node_modules/isarray/index.js', 'isarray');
  this.addModule('node_modules/readable-stream/node_modules/string_decoder/index.js', 'string_decoder');
  this.addModule('node_modules/path/path.js', 'path');
  this.addModule('node_modules/process/browser.js', 'process');
  this.addModule('node_modules/underscore/underscore-min.js', 'underscore');
  this.addModule('node_modules/underscore.string/lib/underscore.string.js', 'underscore.string');
  this.addModule('node_modules/util/util.js', 'util');
  this.addModule('node_modules/util/support/isBufferBrowser.js', 'util/support/isBuffer');

  this.addModule('lib/counter');
  this.addModule('lib/deps');
  this.addModule('lib/entry/command');
//  this.addModule('lib/entry/embryoMaster');
  this.addModule('lib/entry/index');
  this.addModule('lib/entry/master');
//  this.addModule('lib/entry/readable');
  this.addModule('lib/entry/slave');
  this.addModule('lib/field/index');
  this.addModule('lib/field/object');
  this.addModule('lib/field/list');
  this.addModule('lib/field/lookup');
  this.addModule('lib/field/millitime');
  this.addModule('lib/field/number');
  this.addModule('lib/field/text');
  this.addModule('lib/field/wrap');
  this.addModule('lib/index');
  this.addModule('lib/kind');
  this.addModule('lib/link');
  this.addModule('lib/logger');
  this.addModule('lib/peer/here');
  this.addModule('lib/peer/index');
  this.addModule('lib/peer/remote');
  this.addModule('lib/peer/rx');
  this.addModule('lib/plugins');
  this.addModule('lib/scope');
  this.addModule('lib/shard/index');
  this.addModule('lib/shard/master');
  this.addModule('lib/shard/slave');
  this.addModule('lib/space/index');
  this.addModule('lib/space/list');
  this.addModule('lib/space/master');
  this.addModule('lib/space/slave');
  this.addModule('lib/subject');
  this.addModule('lib/wrap.js');
  this.addModule('lib/ws/browser');
  this.addModule('lib/ws/index');
  this.addModule('lib/ws/read');
  this.addModule('lib/ws/writable');

  this.addHandler('config.js', O.respondConfig);
};

// }}}1
