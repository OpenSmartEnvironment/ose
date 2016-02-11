'use strict';

const O = require('ose')(module)
  .class(init, './class1')
;

function init(val) {
  O.inherited(this)(val);
}

O.prototype.testClass = function(suite, value) {
  O.inherited(this, 'testClass')(suite, value);
};

