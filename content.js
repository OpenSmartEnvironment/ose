'use strict';

var O = require('ose').object(module, 'ose/lib/http/content');
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
exports.addHead('lib/browser.js', 1);

exports.addHandler('config.js', require('./lib/plugins').respond);

exports.addModule('depends/stream.js', 'stream');

exports.addModule('node_modules/async/lib/async.js', 'async');
exports.addModule('node_modules/blob-stream/index.js', 'blob-stream');
exports.addModule('node_modules/blob-stream/node_modules/blob/index.js', 'blob');
exports.addModule('node_modules/buffer/index.js', 'buffer');
exports.addModule('node_modules/buffer/node_modules/base64-js/lib/b64.js', 'base64-js');
exports.addModule('node_modules/buffer/node_modules/ieee754/index.js', 'ieee754');
exports.addModule('node_modules/diacritics/index.js', 'diacritics');
exports.addModule('node_modules/events/events.js', 'events');
exports.addModule('node_modules/inherits/inherits_browser.js', 'inherits');
exports.addModule('node_modules/os-browserify/browser.js', 'os');
exports.addModule('node_modules/readable-stream/readable.js', 'readable-stream');
exports.addModule('node_modules/readable-stream/lib/_stream_duplex.js', '_stream_duplex');
exports.addModule('node_modules/readable-stream/lib/_stream_passthrough.js', '_stream_passthrough');
exports.addModule('node_modules/readable-stream/lib/_stream_readable.js', '_stream_readable');
exports.addModule('node_modules/readable-stream/lib/_stream_transform.js', '_stream_transform');
exports.addModule('node_modules/readable-stream/lib/_stream_writable.js', '_stream_writable');
exports.addModule('node_modules/readable-stream/node_modules/isarray/index.js', 'isarray');
exports.addModule('node_modules/readable-stream/node_modules/string_decoder/index.js', 'string_decoder');
exports.addModule('node_modules/path/path.js', 'path');
exports.addModule('node_modules/process/browser.js', 'process');
exports.addModule('node_modules/underscore/underscore-min.js', 'underscore');
exports.addModule('node_modules/underscore.string/lib/underscore.string.js', 'underscore.string');
exports.addModule('node_modules/util/util.js', 'util');
exports.addModule('node_modules/util/support/isBufferBrowser.js', 'util/support/isBuffer');

exports.addModule('lib/deps');
exports.addModule('lib/diff');
exports.addModule('lib/entry/command');
exports.addModule('lib/entry/index');
exports.addModule('lib/entry/master');
//  exports.addModule('lib/entry/readable');
exports.addModule('lib/entry/slave');
exports.addModule('lib/index');
exports.addModule('lib/kind');
exports.addModule('lib/link');
exports.addModule('lib/logger');
exports.addModule('lib/orm/field');
exports.addModule('lib/orm/object');
exports.addModule('lib/orm/list');
exports.addModule('lib/orm/lookup');
exports.addModule('lib/orm/millitime');
exports.addModule('lib/orm/number');
exports.addModule('lib/orm/text');
exports.addModule('lib/orm/wrap');
exports.addModule('lib/peer/here');
exports.addModule('lib/peer/index');
exports.addModule('lib/peer/remote');
exports.addModule('lib/peer/rx');
exports.addModule('lib/plugins');
exports.addModule('lib/scope');
exports.addModule('lib/shard/index');
//  exports.addModule('lib/shard/master');
exports.addModule('lib/schema/cache');
exports.addModule('lib/schema/master');
exports.addModule('lib/shard/slave');
exports.addModule('lib/shard/trans');
exports.addModule('lib/space/index');
//  exports.addModule('lib/space/list');
exports.addModule('lib/space/master');
exports.addModule('lib/space/slave');
exports.addModule('lib/subject');
exports.addModule('lib/wrap');
exports.addModule('lib/ws/browser');
exports.addModule('lib/ws/index');
exports.addModule('lib/ws/read');
exports.addModule('lib/ws/writable');

