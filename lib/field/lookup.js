'use strict';

var O = require('ose').class(module, C, './text');

// Public
function C(name, params) {
  O.super.call(this, name, params);

  this.lookup = {};

  if (! params) return;

  if (params.values) this.lookup.values = params.values;
  if (params.get) this.lookup.get = params.get;
  if (params.view) this.lookup.view = params.view;
  if (params.filter) this.lookup.filter = params.filter;
  if (params.ident) this.lookup.ident = params.ident;

  return;
}

/*
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
*/
