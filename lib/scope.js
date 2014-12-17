'use strict';

var Ose = require('ose');
var M = Ose.class(module, C, 'EventEmitter');

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Scope class
 *
 * @readme
 * A scope is a set of [kinds] of [entries].
 *
 * @aliases scope scopes
 *
 * @class ose.lib.scope
 * @type class
 */

/**
 * Scope name
 *
 * @property name
 * @type String
 */

// Public {{{1
function C(name) {  // {{{2
/**
 * Class constructor
 *
 * @param name {String} Scope name
 *
 * @method constructor
 */

//  console.log('SCOPE INIT', name);

  this.name = name;
  this.kinds = {};  // Entry kinds.

  Ose.plugins.addDependency(afterConfig.bind(this));
};

exports.identify = function() {  // {{{2
/**
 * Returns scope identification. This object consists of `space name`
 * and `shards sid`.
 *
 * @returns {Object} Scope identification object.
 *
 * @method identify
 */

  return {scope: this.name};
};

exports.add = function(kind) {  // {{{2
/**
 * Adds a kind to this scope
 *
 * @param kind {Object} Kind to be added
 *
 * @method add
 */

  if (kind.name in this.kinds) {
    throw Ose.error(this, 'alreadyExist', kind.name);
  }

  this.kinds[kind.name] = kind;

//  console.log('SCOPE ADD', this.name, kind.name);
};

exports.getView = function(kind, params, callback) {  // {{{2
/**
 * Creates a view based on params
 *
 * @param [kind] {Object} Kind
 * @param [params] {Object} View parameters
 * @param callback {Function} Callback
 *
 * @method getView
 */
//  console.log('SCOPE GET VIEW', this.name, kind, params);

  var that = this;

  if (! callback) {
    callback = params;
    params = {};
  }

  if (! params) params = {};
  params.kind = kind;

  var result = {};

  var counter = Ose.counter();

  Ose.spaces.each(function(s) {
    var space = result[s.name] = {};

    s.eachShard({scope: that.name}, onShard);

    function onShard(shard, count) {
      if (! count) {
//        console.log('SCOPE SHARD GET VIEW', counter.count, shard.scope.name, kind, shard.alias);
        counter.inc();
      }

      shard.getView(params, function(err, data) {
        switch (err && err.message) {
        case null:
        case undefined:
          if (data.view && data.view.length) {
            space[shard.sid] = data.view;
          }
          break;
        case 'socketDisconnected':
          if (count) {
            count++;
          } else {
            count = 1;
          }

          if (count < 50) {  // Wait 5 seconds ...
            setTimeout(onShard.bind(null, shard, count), 100);
            return;
          }
        default:
          console.log('ERROR RETRIEVING VIEW', shard.alias, kind, params, data);
          M.log.error(err);
        }

        counter.dec();
//        console.log('SCOPE SHARD GET VIEW DONE', counter.count, shard.scope.name, kind, shard.alias);
      });

      return;
    };
  });

  counter.done(function() {
//    console.log('SCOPE GET VIEW FINISH', result);
    callback(null, {view: result});
  });
};

// }}}1
function afterConfig(cb) {  // {{{2
  for (var key in this.kinds) {
    this.kinds[key].afterInit();
  }

  cb();
};
