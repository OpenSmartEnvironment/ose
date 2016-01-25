'use strict';

const O = require('ose')(module)
  .singleton('ose-test/lib/suite')
;

exports = O.init('ose/lib/wrap');

var Assert = O.chai.assert
var Equal = Assert.equal;

// Tests {{{1
exports.add('module', function(cb) {  // {{{2
  exports.module = require('./module');
  exports.module.test(this, cb);

  return cb();
});

exports.add('class1', function(cb) {  // {{{2
  const class1 = O.getClass('./class1');
  exports.class1 = require('./class1');
  Equal(class1, exports.class1);
  exports.instance1 = new class1('test string 1');
  Assert(exports.instance1 instanceof class1, 'instance of');
  Equal(exports.instance1.O, class1.O, 'class.O');
  exports.instance1.test(this);
  exports.instance1.testClass(this, 'test string 1');
  Assert(exports.instance1.tested, 'tested');

  return cb();
});

exports.add('class2', function(cb) {  // {{{2
  const class2 = O.getClass('./class2');
  exports.instance2 = O.new('./class2')('test string 2');
  Assert(exports.instance2 instanceof exports.class1, 'instance of super');
  Assert(exports.instance2 instanceof class2, 'instance of 2');
  Equal(exports.instance2.class2, class2, 'class.O');
  Equal(class2.O, exports.instance2.O, 'O');
  exports.instance2.test(this);
  exports.instance2.testClass(this, 'test string 2');
  Assert(exports.instance2.tested, 'tested');

  return cb();
});

exports.add('class3', function(cb) {  // {{{2
  exports.instance3 = O.new('./class3')('test string 3');
  Assert(exports.instance3 instanceof exports.class1, 'instance of super');
  Assert(exports.instance3 instanceof exports.class2, 'instance of super 2');
  Equal(exports.instance3.class3.O, exports.instance3.O, 'class.O');
  exports.instance3.test(this);
  exports.instance3.testClass(this, 'test string 3');
  Assert(exports.instance3.tested, 'tested');

  return cb();
});

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

