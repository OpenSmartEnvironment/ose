'use strict';

const O = require('ose')(module)
  .class(C)
;

var Readable = require('stream').Readable;

// Public {{{1
function C(cb) {  // {{{2
  if (typeof cb !== 'function') {
    throw O.log.error(this, 'Callback must be a function', cb);
  }

  this.stream = new Readable();
  this.stream._read = O._.noop;
  this.stream.on('error', onError.bind(this));

  cb(null, this.stream);
};

exports.open = function(req) {  // {{{2
};

exports.close = function(req) {  // {{{2
  if (this.stream) {
    this.stream.push();
    delete this.stream;
  }
};

exports.error = function(err) {  // {{{2
  if (this.stream) {
    this.stream.emit('error', err);
    delete this.stream;
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
