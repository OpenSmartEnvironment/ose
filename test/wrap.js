'use strict';

const O = require('ose')(module)
  .singleton('ose-test/lib/suite')
;

exports = O.init('ose/lib/wrap');

var Assert = O.chai.assert
var Equal = Assert.equal;

// Tests {{{1
exports.add('typeof()', function(cb) {  // {{{2
  Equal(O.typeof(undefined), 'undefined', 'undefined');
  Equal(O.typeof(null), 'null', 'null');
  Equal(O.typeof({}), 'object', 'object');
  Equal(O.typeof([]), 'array', 'array');
  Equal(O.typeof(0), 'number', 'number');
  Equal(O.typeof(''), 'string', 'string');
  Equal(O.typeof(false), 'boolean', 'boolean');

  return cb();
});

exports.add('error() 1', function(cb) {  // {{{2
  var err = O.error(exports, 'TEST_ERROR', 'Testing error', {data: 'error data'});
  Equal(err.subject, exports, 'Subject');
  Assert.match(err.subjectDescr, /^Object at .*ose\/test\/wrap.js$/, 'Subject description');
  Equal(err.code, 'TEST_ERROR', 'Code');
  Equal(err.message, 'Testing error', 'Message');
  Equal(err._data.data, 'error data', 'Data');

  return cb();
});

exports.add('error() 2', function(cb) {  // {{{2
  var err = O.error(exports, 'TEST_ERROR', {data: 'error data'});
  Equal(err.subject, exports, 'Subject');
  Assert.match(err.subjectDescr, /^Object at .*ose\/test\/wrap.js$/, 'Subject description');
  Equal(err.code, 'TEST_ERROR', 'Code');
  Equal(err.message, 'TEST_ERROR', 'Message');
  Equal(err._data.data, 'error data', 'Data');

  return cb();
});

exports.add('error() 3', function(cb) {  // {{{2
  var err = O.error('TEST_ERROR', {data: 'error data'});
  Equal(err.subject, undefined, 'Subject');
  Equal(err.subjectDescr, undefined, 'Subject description');
  Equal(err.code, 'TEST_ERROR', 'Code');
  Equal(err.message, 'TEST_ERROR', 'Message');
  Equal(err._data.data, 'error data', 'Data');

  return cb();
});

exports.add('error() 4', function(cb) {  // {{{2
  var err = O.error('Testing error', {data: 'error data'});
  Equal(err.subject, undefined, 'Subject');
  Equal(err.subjectDescr, undefined, 'Subject description');
  Equal(err.code, 'UNEXPECTED', 'Code');
  Equal(err.message, 'Testing error', 'Message');
  Equal(err._data.data, 'error data', 'Data');

  return cb();
});

exports.add('applyError() 1', function(cb) {  // {{{2
  var err = O.applyError(exports, ['TEST_ERROR', 'Testing error', {data: 'error data'}]);
  Equal(err.subject, exports, 'Subject');
  Assert.match(err.subjectDescr, /^Object at .*ose\/test\/wrap.js$/, 'Subject description');
  Equal(err.code, 'TEST_ERROR', 'Code');
  Equal(err.message, 'Testing error', 'Message');
  Equal(err._data.data, 'error data', 'Data');

  return cb();
});

exports.add('applyError() 2', function(cb) {  // {{{2
  var err = O.applyError(exports, ['Testing error', {data: 'error data'}]);
  Equal(err.subject, exports, 'Subject');
  Assert.match(err.subjectDescr, /^Object at .*ose\/test\/wrap.js$/, 'Subject description');
  Equal(err.code, 'UNEXPECTED', 'Code');
  Equal(err.message, 'Testing error', 'Message');
  Equal(err._data.data, 'error data', 'Data');

  return cb();
});

exports.add('applyError() 3', function(cb) {  // {{{2
  var err = O.applyError(exports, ['TEST_ERROR']);
  Equal(err.subject, exports, 'Subject');
  Assert.match(err.subjectDescr, /^Object at .*ose\/test\/wrap.js$/, 'Subject description');
  Equal(err.code, 'TEST_ERROR', 'Code');
  Equal(err.message, 'TEST_ERROR', 'Message');
  Equal(err._data, undefined, 'Data');

  return cb();
});

