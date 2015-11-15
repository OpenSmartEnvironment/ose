'use strict';

var O = require('ose').class(module, C);

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Kind class
 *
 * @readme
 * Each [entry] is of a certain kind. Kinds define the behaviour of
 * [entries].
 *
 * Kinds should describe, as closely as possible, physical or virtual
 * objects.
 *
 * @aliases kind kinds entryKind entryKinds kindsOfEntries
 *
 * @class ose.lib.kind
 * @type class
 */

/**
 * Initializes an entry in the home OSE instance
 *
 * @param entry {Object} Entry to initialize
 *
 * @method homeInit
 * @virtual
 */

/**
 * Scope to which the kind is assigned
 *
 * @property scope
 * @type Object
 */

/**
 * Kind name unique within a scope
 *
 * @property name
 * @type String
 */

/**
 * `entry.dval` structure description
 *
 * Contains an [ose/lib/orm/object] instance
 *
 * @property ddes
 * @type Object
 */

// Public  {{{1
function C(scope, name, deps) {  // {{{2
/**
 * Kind constructor
 *
 * @param scope {Object|String} Scope to which assign the kind
 * @param name {String} Unique kind name within the scope
 * @param deps {Object} Configuration dependencies
 *
 * @method init
 */

//  console.log('KIND INIT', scope, name);

  this.scope = scope;
  this.name = name;

  this.scope.add(this);

  O.callChain(this, 'init');

  if (! deps) {
    throw O.log.error('Kinds initialization requires dependencies');
  }

  var that = this;

  deps.add('core', function(cb) {
    if (that.ddes) that.ddes.afterInit();
    if (that.sdes) that.sdes.afterInit();

    cb();
  });

  return;
};

exports.toString = function() {  // {{{2
/**
 * Return short description
 *
 * @return {String} Description
 *
 * @method toString
 */

  return 'Kind: ' + this.name + ' ' + this.scope;
};

exports.getCaption = function(entry) {  // {{{2
/**
 * Returns entry caption
 *
 * @param entry {Object} `Entry` instance
 *
 * @return {String} Entry caption
 *
 * @method getCaption
 */

  return (entry.dval && (entry.dval.name || entry.dval.caption));
};

exports.on = function(name, handler) {  // {{{2
/**
 * Register a command handler
 *
 * @param name {String} Name of handler
 * @param handler {Function} Handler
 *
 * @method on
 */

/**
 * Register command handlers
 *
 * @param name {Object} Object containing handler or module name with handlers
 *
 * @method on
 */

  if (! this.commands) {
    this.commands = {};
  }

  switch (arguments.length) {
  case 1:
    switch (typeof name) {
    case 'string':
      this.on(this.O.requireChain(name));
      return;
    case 'object':
      for (var key in name) {
        this.on(key, name[key]);
      }
      return;
    }

    break;
  case 2:
    this.commands[name] = handler;
    return;
  };

  throw O.log.error(this, 'INVALID_ARGS', arguments);
};

exports.getLayout = function(page, layout) {  // {{{2
/**
 * Finds the right module for a given page and layout
 *
 * @param page {String}
 * @param layout {String}
 *
 * @returns {Object} Module
 *
 * @method getLayout
 */

  try {
    if (layout && (layout.indexOf('/') >= 0)) {
      return require(layout);
    } else {
      return this.O.requireChain('./gaia/' + (layout || page));
    }
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      return null;
    }

    throw err;
  }
};

exports.doHomeInit = function(entry) {  // {{{2
/**
 * @method doHomeInit
 * @internal
 */

  switch (typeof (this.homeInit || undefined)) {
  case 'undefined':
    return;
  case 'function':
    break;
  case 'string':
    if (this.homeInit.match(/^\.\//)) {
      this.homeInit = this.O.requireChain(this.homeInit);
    } else {
      this.homeInit = require(this.homeInit);
    }
    break;
  case 'boolean':
    this.homeInit = this.O.requireChain('./home');
    break;
  default:
    throw O.log.error(this, 'Invalid `homeInit`', this.homeInit);
  }

  this.homeInit(entry);
  return;
}

exports.addDdes = function() {  // {{{2
  var o = {value: 0};

  this.ddes = O.new('ose/lib/orm/object')('dval', {order: o});
};

// }}}1
// Private {{{1
function onClass(ctor) {  // {{{2
  return function(req, socket) {
    new ctor(this.entry, req, socket);
  };
}
// }}}1
