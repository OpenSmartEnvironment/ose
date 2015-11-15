'use strict';

var O = require('ose').object(module, 'ose-test/lib/suite');
O.prepend('node');
exports = O.init('ose/lib/diff');

var Assert = O.chai.assert

var Diff = require('ose/lib/diff');

// Tests {{{1
exports.add('cleanPatch()', function(cb) {  // {{{2
  var val = {
    a: 1,
    b: 2,
    c: 3,
  };

  var patch = {
    a: 3,
    b: 2,
  };

  Diff.cleanPatch(patch, val);

  Assert(O._.isEqual({a: 3}, patch), 'Patch');

  return cb();
});

