'use strict';

const O = require('ose')(module)
  .class('./field')
  .prepend('./parent')
;

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
exports.addChild = function(child) {  // {{{2
  if (this.children) {
    if (child.name in this.children) {
      throw O.log.error(this, 'Duplicit field name', child.name);
    }
  } else {
    this.children = {};
  }

  child.parent = this;

  return this.children[child.name] = child;
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

exports.iterPatch = function(wrap, patch, val) {  // {{{2
/**
 * Iterate over a patch and field wrapper structure. For each field wrapper with layout call `wrap.patch(patch, val)`.
 *
 * @param wrap {Object} Field wrapper
 * @param patch {Object} JSON patch
 *
 * @method iterPatch
 * @internal
 */

  if (wrap.layout) wrap.patch(patch, val);

  if (! wrap.children) return;

  for (var key in wrap.children) {
    var child = wrap.children[key];

    if (patch === null) {
      if (child.value !== undefined) {
        child.field.iterPatch(child, null, undefined);
      }
    } else if (key in patch) {
      child.field.iterPatch(child, patch[key], val[key]);
    }
  }
  return;
};

exports.iterLayout = function(wraps, name, val) {  // {{{2
/**
 * Iterate over described fields and add fields with layout `name` to `wraps`
 *
 * @param wraps {Object} Wrap fields object
 * @param name {Boolean|String} Layout name
 * @param val {Object} JSON data
 *
 * @return {Object} Field wrap
 *
 * @method iterLayout
 * @internal
 */

  var child;
  var children = {};

  for (var key in this.children) {
    child = this.children[key].iterLayout(wraps, name, val && val[key]);
    if (child) {
      children[key] = child;
    }
  }

  if (O._.isEmpty(children)) {
    children = undefined;
  }

  return wraps.wrap(this, name, val, children);
};

