'use strict';

var O = require('ose').class(module, C, './field');

/** Docs {{{1
 * @module ose
 * @submodule ose.orm
 */

/**
 * @caption JSON object description
 *
 * @class ose.lib.orm.object
 * @extends ose.lib.orm.field
 * @type module
 */

/**
 * Child fields
 *
 * @property children
 * @type Object
 */

// Public {{{1
function C() {  // {{{2
/**
 * Object field constructor
 *
 * @method constructor
 */

  /*
   * - What can be doc child?
   *   another object
   *   array doc
   *   field
   *
   * - Every child must have following properties:
   *   name
   *
   */

//  if (! this.name) this.name = name;  // Doc name can be specified in particular doc class.

  this.children = {};

//  this.initChildren && this.initChildren();
};

exports.afterInit = function() {  // {{{2
/**
 * @method afterInit
 * @internal
 */

  for (var key in this.children) {
    var child = this.children[key];

    if (child.afterInit) child.afterInit();
  }
};

exports.add = function(name, type, params) {  // {{{2
/**
 * Add new field to this object description
 *
 * @param name {String} Field name
 * @param type {String} Field type
 * @param [params] {Object} Optional field parameters
 *
 * @method add
 */

  if (type.indexOf('/') < 0) {
    type = './' + type;
  }

  return this.children[name] = O.new(type)(name, params);
};

exports.getChild = function(path) {  // {{{2
/**
 * @param path {String} Path to the field
 *
 * @method getChild
 * @internal
 */

  switch (typeof path) {
    case 'string':
      path = path.split('.');
      break;
    case 'object':
      if (path.length) break;
    default:
      throw new Error('Invalid field path: ' + path);
  }

  switch (path.length) {
    case 0: throw new Error('Child not found');
    case 1: return this.children[path[0]];
    default: return this.children[path.shift()].getChild(path);
  }
};

exports.getVal = function(get) {  // {{{2
/**
 * Get JSON value for this object
 *
 * @param get [Function] Callback that gets called for each primitive field
 *
 * @return {Object} Value
 *
 * @method getVal
 * @internal
 */

  var res = {};

  for (var key in this.children) {
    var r = this.children[key].getVal(get);
    if (r !== undefined) {
      res[key] = r;
    }
  }

  if (O._.isEmpty(res)) {
    return undefined;
  }

  return res;
};

exports.iterPatch = function(patch, orig, cb) {  // {{{2
/**
 * Iterate over a patch and call `cb` for each primitive field
 *
 * @param patch {Object} JSON patch
 * @param orig {Object} Original JSON
 * @param cb {Function} Callback to be called on each primitive field
 *
 * @method iterPatch
 * @internal
 */

  for (var key in patch) {
    var c = this.children[key];
    if (! c) continue;

    c.iterPatch(patch[key], typeof orig === 'object' ? orig[key] : undefined, cb);
  }
};

exports.getPatch = function(orig, get) {  // {{{2
/*
 * Get JSON patch from altered fields
 *
 * @param orig [Object] Original JSON
 * @param get [Function] Callback called for each primitive field
 *
 * @return {Object} Patch; `null` = delete key; `undefined` = no change
 *
 * @method getPatch
 * @internal
 */

  var c = 0;  // Count of non-null values
  var res = {};

  for (var key in this.children) {
    var r = this.children[key].getPatch(orig && orig[key], get);
    if (r === undefined) continue;

    if (r !== null) c++;

    res[key] = r;
  }

  if (O._.isEmpty(res)) {
    return undefined;
  }

  if (! c && ! orig) {
    return null;
  }

  return res;
};

exports.iterFields = function(val, profile, cb) {  // {{{2
/**
 * Iterate over described fields and call `cb` for each primitive field
 *
 * @param val {Object} JSON data
 * @param [profile] {Object|Boolean} Optional profile modifyinng the description
 * @param cb {Function} Callback called for each primitive field
 *
 * @method iterFields
 * @internal
 */

  for (var key in this.children) {
    var p = profile === true ?
      true :
      profile[key]
    ;

    switch (p) {
    case false:
    case null:
    case undefined:
      break;
    default:
      this.children[key].iterFields(val && val[key], p, cb);
    }
  }
};

exports.getField = function(path, depth) {  // {{{2
/**
 * @param path {String}
 * @param depth {Number}
 *
 * @method getField
 * @internal
 */

  if (! depth) {
    if (! Array.isArray(path)) path = path.split('.');
    depth = 0;
  }

  return this.children[path[depth]].getField(path, depth + 1);
};

exports.formatField = function(path, type, val, params, index) {  // {{{2
/**
 * @param path
 * @param type
 * @param val
 * @param params
 * @param index
 *
 * @method formatField
 * @internal
 */

  if (! index) {
    if (! Array.isArray(path)) path = path.split('.');
    index = 0;
  }

  var name = path[index];

  return this.children[name].formatField(path, type, val && val[name], params, index + 1);
};

exports.doValidate = function(val, path, errors) {  // {{{2
/**
 * @param val
 * @param path
 * @param errors
 *
 * @method doValidate
 * @internal
 */

  for (var key in this.children) {
    if (path) path += '.';

    this.children[key].doValidate(val && val[key], path + key, errors);
  }
};

// }}}1
