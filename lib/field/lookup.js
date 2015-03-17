'use strict';

var O = require('ose').class(module, C, 'ose/lib/field/common');

// Public
exports.editor = 'lookup';

function C(name, type, scope, kind) {
  O.super.call(this, name, type);

  this.lookup = {
    scope: scope,
    kind: kind
  };
};

exports.afterInit = function() {
  this.lookup = O.getScope(this.lookup.scope).kinds[this.lookup.kind];

  if (! this.lookup) throw new Error('Invalid lookup kind in ' + this.name);
};

exports.format = function(type, data, params) {
  if (! data) return '';

  return this.lookup.scope.getDocCaption(params.space, this.lookup, data);
}

