'use strict';

var O = require('ose').class(module, C);

var Levelup = require('levelup');
var Memdown = require('memdown');

function C(parent, name, params) {
  O._.extend(this, params);

  if (! this.name) this.name = name;

  if (parent.scope) {
    this.scope = parent.scope;
    this.kind = parent;
  } else {
    this.scope = parent;
  }

  if (this.scope.maps) {
    if (this.name in this.scope.maps) {
      throw O.log.error(parent, 'Duplicit map name', this.name);
    }
  } else {
    this.scope.maps = {};
  }
  this.scope.maps[this.name] = this;
}

exports.init = function(shard, cb) {
  var res = Levelup(shard.space.name + '/' + shard.id + '/' + this.name, {
    db: Memdown,
    keyEncoding: 'json',
    valueEncoding: 'json',
    createIfMissing: true,
    errorIfExists: false,
  });

  shard.maps[this.name] = res;

  O.async.setImmediate(function() {
    cb();
  });
};

