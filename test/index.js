'use strict';

var O = require('ose').object(module, 'ose-test/lib/suite');
O.prepend('node');
exports = O.init('ose');

var Test = require('ose-test');
Test.add(require('./wrap'));
Test.add(require('./diff'));

return;

var Assert = O.chai.assert
var Equal = Assert.equal;

// Tests {{{1
exports.add('Wrap error 1', function(cb) {  // {{{2
  var err = O.error(exports, 'TEST_ERROR', 'Testing error', {data: 'error data'});
  Equal(err.subject, exports, 'Subject');
  Assert.match(err.subjectDescr, /^Object at .*ose\/test\/index.js/, 'Subject description');
  Equal(err.code, 'TEST_ERROR', 'Code');
  Equal(err.message, 'Testing error', 'Message');
  Equal(err._data.data, 'error data', 'Data');

  return cb();
});

exports.add('Wrap error 2', function(cb) {  // {{{2
  var err = O.error(exports, 'TEST_ERROR', {data: 'error data'});
  Equal(err.subject, exports, 'Subject');
  Assert.match(err.subjectDescr, /^Object at .*ose\/test\/index.js/, 'Subject description');
  Equal(err.code, 'TEST_ERROR', 'Code');
  Equal(err.message, 'TEST_ERROR', 'Message');
  Equal(err._data.data, 'error data', 'Data');

  return cb();
});

exports.add('Wrap error 3', function(cb) {  // {{{2
  var err = O.error('TEST_ERROR', {data: 'error data'});
  Equal(err.subject, undefined, 'Subject');
  Equal(err.subjectDescr, undefined, 'Subject description');
  Equal(err.code, 'TEST_ERROR', 'Code');
  Equal(err.message, 'TEST_ERROR', 'Message');
  Equal(err._data.data, 'error data', 'Data');

  return cb();
});

exports.add('Wrap error 4', function(cb) {  // {{{2
  var err = O.error('Testing error', {data: 'error data'});
  Equal(err.subject, undefined, 'Subject');
  Equal(err.subjectDescr, undefined, 'Subject description');
  Equal(err.code, 'UNEXPECTED', 'Code');
  Equal(err.message, 'Testing error', 'Message');
  Equal(err._data.data, 'error data', 'Data');

  return cb();
});

exports.add('Wrap error 5', function(cb) {  // {{{2
  var err = O.error(exports, ['TEST_ERROR', 'Testing error', {data: 'error data'}]);
  Equal(err.subject, exports, 'Subject');
  Assert.match(err.subjectDescr, /^Object at .*ose\/test\/index.js/, 'Subject description');
  Equal(err.code, 'TEST_ERROR', 'Code');
  Equal(err.message, 'Testing error', 'Message');
  Equal(err._data.data, 'error data', 'Data');

  return cb();
});

exports.add('Wrap error 6', function(cb) {  // {{{2
  var err = O.error(exports, ['Testing error', {data: 'error data'}]);
  Equal(err.subject, exports, 'Subject');
  Assert.match(err.subjectDescr, /^Object at .*ose\/test\/index.js/, 'Subject description');
  Equal(err.code, 'UNEXPECTED', 'Code');
  Equal(err.message, 'Testing error', 'Message');
  Equal(err._data.data, 'error data', 'Data');

  return cb();
});

