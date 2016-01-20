'use strict';

const O = require('ose')(module)
  .class(init)
;

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
 * `entry.dval` structure description
 *
 * Contains an [ose/lib/orm/object] instance
 *
 * @property ddef
 * @type Object
 */

// Public  {{{1
function init(schema, name) {  // {{{2
/**
 * Kind constructor
 *
 * @param schema {Object|String} Schema containing the kind
 * @param name {String} Unique kind name within the schema
 *
 * @method constructor
 */

  this.name = name;  // {{{3
  /**
   * Kind name unique within a schema
   *
   * @property name
   * @type String
   */


  this.schema = typeof schema === 'string' ?  // {{{3
    O.data.schemas[schema] :
    schema
  ;
  /**
   * Schema to which the kind is assigned
   *
   * @property schema
   * @type Object
   */

  if (! this.schema) {
    throw O.log.error('Missing schema', schema);
  }

  if (this.name in this.schema.kinds) {
    throw O.log.error(this.schema, 'Duplicit kind', this.name);
  }

  this.schema.kinds[this.name] = this;

  // }}}3

//  O.callChain(this, 'init')();

//  console.log('KIND INIT', this.schema.name, this.name);
};

exports.toString = function() {  // {{{2
/**
 * Return short description
 *
 * @return {String} Description
 *
 * @method toString
 */

  return 'Kind: ' + this.name + ' ' + this.schema;
};

exports.getTitle = function() {
  if (this.title) return this.title;

  return O.translate(this.name);
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

  if (this.layouts) {
    if (layout && layout in this.layouts) {
      return this.layouts[layout];
    }

    if (page in this.layouts) {
      return this.layouts[page];
    }
  }

  try {
    if (layout && (layout.indexOf('/') >= 0)) {
      return require(layout);
    } else {
      return this.O.requireChain('./' + (layout || page));
    }
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      return undefined;
    }

    throw O.log.error(err);
  }
};

exports.layout = function(name, params) {  // {{{2
  switch (typeof (params || undefined)) {
  case 'undefined':
    params = {};
    break;
  case 'object':
    break;
  case 'function':
    params = {
      displayLayout: params,
    };
    break;
  default:
    throw O.log.error(this, 'INVALID_ARGS', 'params', params);
  }

  if (! this.layouts) {
    this.layouts = {};
  }

  if (name in this.layouts) {
    O._.extend(this.layouts[name], params);
  } else {
    this.layouts[name] = params;
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
};

// Private {{{1
function onClass(ctor) {  // {{{2
  return function(req, socket) {
    new ctor(this.entry, req, socket);
  };
}

/* Obsolete {{{1
exports.addDdes = function() {  // {{{2
  var o = {value: 0};

  this.ddes = O.new('ose/lib/orm/object')('dval', {order: o});
};

*/
