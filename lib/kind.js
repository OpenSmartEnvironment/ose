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
 * Each [entry] is of a certain kind. Kinds define the properties and
 * behaviour of [entries].
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

// Public  {{{1
function C(scope, name, deps) {  // {{{2
/**
 * Kind constructor
 *
 * @param scope {Object|String} Scope to which assign the kind
 * @param name {String} Unique kind name within the scope
 *
 * @method init
 */

//  console.log('KIND INIT', scope, name);

  this.scope = scope;
  this.name = name;

  this.scope.add(this);

  O.callChain(this, 'init');

  if (! deps) {
    throw O.error('Kinds initialization requires dependencies');
  }

  var that = this;

  /* CHECK
  deps.add('core', function(cb) {
    if (that.data) that.data.afterInit();
    if (that.state) that.state.afterInit();

    cb('core');
  });
  */

  return;
};

exports.identify = function() {  // {{{2
/**
 * Returns identification object
 *
 * @returns {Object} Identification object
 *
 * @method identify
 */

  return {
    kind: this.name,
    scope: this.scope
  };
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

  return (entry.data && (entry.data.name || entry.data.caption)) || entry.id;
};

exports.on = function(name, handler) {  // {{{2
/**
 * Registers a command handler
 *
 * @param name {String} Name of handler
 * @param handler {Function} Handler
 *
 * @method on
 */

/**
 * Registers command handlers
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
      handler = require(name);
      switch (typeof handler) {
      case 'function':
        this.on(name, handler);
        return;
      case 'object':
        this.on(handler);
        return;
      default:
        throw O.error(this, 'Invalid arguments', arguments);
      }
    case 'object':
      for (var key in name) {
        this.commands[key] = name[key];
      }
      return;
    default:
      throw O.error(this, 'Invalid arguments', arguments);
    }
  case 2:
    this.commands[name] = handler;
    return;
  default:
    throw O.error(this, 'Invalid arguments', arguments);
  };
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
    throw O.error(this, 'Invalid `homeInit`', this.homeInit);
  }

  this.homeInit(entry);
  return;
}

// }}}1

/*// CHECK {{{1
exports.initExt = function() {  // {{{2
  try {
    var filter = require(this.className + '/filter');  // Array of available filtering methods.
    if (filter) this.filter = filter;
  } catch (error) {}
};

exports.validate = function(data) {  // {{{2
  var errors = [];

  this.doValidate(data, '', errors);

  if (errors.length) return errors;

  return null;
};

exports.filterDocs = function(cache, space, params, onData, cb) {  // {{{2
  if (this.name !== 'common') {  // TODO generalize better
    if (! params.filter) params.filter = {};
    params.filter.kind = this.name;
  }

  var data;
  var filter = this.prepareFilter(params.filter);

  for (var key in cache) {
    var item = cache[key];

    if (item.data) data = item.data;
    else data = item.getData();

    if (filterDoc(data)) onData({
      space: space.name,
      data: data
    });
  }

  cb();

  function filterDoc(data) {  // {{{3
    for (var i = 0; i < filter.length; i++) {
      if (! filter[i](data)) return false;
    }

    return true;
  }

  // }}}3
};

exports.prepareFilter = function(filter) {  // {{{2
  var result = [];

  for (var key in filter) {
    if (this.filter[key]) {
      result.push(this.filter[key].bind(filter[key]));
    }
  }

  return result;
};

// }}}1*/
