'use strict';

const O = require('ose')(module)
  .class(init)
  .prepend('./module')
;

function init(val) {
  this.value = val;
}

O.prototype.class2 = require('./class2');
O.prototype.class3 = O.getClass('./class3');

(function testNotLoaded() {
  try {
    O.new('./class2');
  } catch {
    return;
  }

  throw new Error('Error should be thrown');
})();

O.prototype.testClass = function(suite, value) {
  this.tested = true;

  Equal(this.value, value, 'value');
  Equal(O.isClass(), true, 'isClass()');
  Equal(O.isModule(), false, 'isModule()');
  Equal(O.isSingleton(), false, 'isSingleton()');
  Equal(O._init, init, 'O._init');
};

