'use strict';

var O = require('ose').class(module, C, './number');

// Public {{{1
function C(name, params) {  // {{{2
  this.min = 0;
  this.decimal = 0;
  this.unit = 'millisecond';

  O.super.call(this, name, params);
}

// }}}1
