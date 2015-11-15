'use strict';

var O = require('ose').class(module, C);

var Levelup = require('levelup');
var Memdown = require('memdown');

function C(shard, options, cb) {
  this.shard = shard;
  shard.schema = this;

  shard.maps.all = Levelup(shard.space.name + '/' + shard.id + '/all', {
    db: Memdown,
    keyEncoding: 'utf8',
    valueEncoding: 'json',
    createIfMissing: true,
    errorIfExists: false,
  });

  return O.async.nextTick(cb, 0);
}

