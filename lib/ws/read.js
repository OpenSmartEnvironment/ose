'use strict';

var O = require('ose').class(module, C);

var Readable = require('stream').Readable;

// Public {{{1
function C(cb) {  // {{{2
  if (typeof cb !== 'function') {
    throw O.error(this, 'Callback must be a function', cb);
  }

  this.cb = cb;
};

exports.open = function(req) {  // {{{2
  this.stream = new Readable();
  this.stream._read = O._.noop;
  this.stream.on('error', onError.bind(this));

  this.cb(null, this.stream);
  delete this.cb;
};

exports.close = function(req) {  // {{{2
  if (this.stream) {
    this.stream.push();
    delete this.stream;
  }

  if (this.cb) {
    cb(O.error(this, 'Socket was closed'));
    delete this.cb;
  }
};

exports.error = function(err) {  // {{{2
  if (this.stream) {
    this.stream.emit('error', err);
    delete this.stream;
  }

  if (this.cb) {
    this.cb(err);
    delete this.cb;
  }
};

function onError(err) {  // {{{2
  if (this.stream) {
    delete this.stream;
  }

  if (O.link.canClose(this)) {
    O.link.error(this, err);
  }
};

// }}}1
