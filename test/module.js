'use strict';

const O = require('ose')(module);

exports.test = function(suite) {
  Equal(module, O.module, 'O.module');
  Equal(exports, module.exports, 'module.exports');
  Equal(exports, O.exports, 'O.exports');

  Equal(O.isClass(), false, 'isClass()');
  Equal(O.isModule(), true, 'isModule()');
  Equal(O.isSingleton(), false, 'isSingleton()');
};

