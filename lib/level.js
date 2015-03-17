'use strict';

var O = require('ose').class(module, C);

function C(shard, path) {
  this.shard = shard;
  this.level = require('level')(path, [valueEncoding: 'json']);
};

exports.get = function(entry, cb) {
  this.level.get(entry.id, function(err, data) {
    console.log('LEVEL GET', err, data);

    if (err) {
      cb(err);
    } else {
      var result = new (O.class('ose/lib/entry'))({
        id: entry.id,
        kind: data.kind,
        data: data.data
      });

      this.shard.cache[result.id] = result;

      cb(null, result);
    }
  });
};

exports.put = function(entry, cb) {
  this.level.put(entry.id, {kind: entry.kind, data: entry.data}, function(err) {
    cb(err);
  });
};

