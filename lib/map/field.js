'use strict';

var O = require('ose').class(module, C, './index');

function C(parent, field, params) {
  O.super.call(this, parent, (parent.scope ? parent.name + '/' : '') + (field || ''), params);

  this.onePerEntry = true;

  if (field) {
    this.field = field;  // TODO check field for "." and expand condition

    if (this.unique) {
      this.map = new Function('entry', 'cb', 'if ("' + field + '" in entry.dval) {cb(entry.dval.' + field + ', entry.id); }');
    } else {
      this.map = new Function('entry', 'cb', 'if ("' + field + '" in entry.dval) {cb([entry.dval.' + field + ', entry.id], entry.id); }');
    }
  } else {
    if (! this.kind) {
      throw O.log.error(this, 'INVALID_ARGS');
    }

    this.unique = true;
    this.map = new Function('entry', 'cb', 'if ("' + field + '" in entry.dval) {cb(entry.id, entry.id); }');
  }
}

