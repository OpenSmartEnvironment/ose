'use strict';

var Ose = require('ose');
var M = Ose.class(module, C, require('stream').Readable);

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Entry readable stream client socket
 *
 * @readme
 *
 * @class ose.lib.entry.readable
 * @type class
 * @extends stream.Readable
 */

// Public {{{1
function C() {  // {{{2
/**
 * Class constructor.
 *
 * @method constructor
 */

  M.super.call(this);
  Ose.link.prepare(this);
};

exports.handlers = [];

exports.open = function(data) {  // {{{2
};

exports.close = function(resp) {  // {{{2
  this.push(null);
};

exports.error = function(err) {  // {{{2
  this.emit('error', err);
};

exports._read = function() {  // {{{2
};

// }}}1
