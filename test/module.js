'use strict';

const O = require('ose')(module);

var Assert = O.chai.assert;
var Equal = Assert.equal;

exports.test = function(suite) {
  Equal(module, O.module, 'O.module');
  Equal(exports, module.exports, 'module.exports');
  Equal(exports, O.exports, 'O.exports');

  Equal(O.isClass(), false, 'isClass()');
  Equal(O.isSingleton(), false, 'isSingleton()');
  Equal(O.isModule(), true, 'isModule()');
};

