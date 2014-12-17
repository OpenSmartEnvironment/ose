'use strict';

var Ose = require('ose');
var M = Ose.class(module, C, 'ose/lib/field/common');

// Public
exports.editor = 'lookup';

function C(name, type, scope, kind) {
  M.super.call(this, name, type);

  this.lookup = {
    scope: scope,
    kind: kind
  };
};

exports.afterInit = function() {
  this.lookup = Ose.scope(this.lookup.scope).kinds[this.lookup.kind];

  if (! this.lookup) throw new Error('Invalid lookup kind in ' + this.name);
};

exports.format = function(type, data, params) {
  if (! data) return '';

  return this.lookup.scope.getDocCaption(params.space, this.lookup, data);
}

