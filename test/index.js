'use strict';

const O = require('ose')(module)
  .singleton('ose-test/lib/suite')
  .prepend('node')
;

exports = O.init('ose');

var Test = require('ose-test');
Test.add(require('./wrap'));
Test.add(require('./diff'));
