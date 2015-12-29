'use strict';

var O = require('ose').class(module, './field');
O.prepend('./parent');

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

exports.iterPatch = function(master, patch, val) {  // {{{2
/**
 * Iterate over a patch and call `cb` for each primitive field
 *
 * @param master {Object} Master of fields structure
 * @param patch {Object} JSON patch
 *
 * @method iterPatch
 * @internal
 */

  if (! master) return;

  if (master.wrap) {
    master.wrap.patch(patch, val);
  }

  if (! master.children) return;

  for (var key in patch) {
    if (key in master.children) {
      master.children[key].field.iterPatch(master.children[key], patch[key], val && val[key]);
    }
  }

  return;
};

exports.iterLayout = function(fields, layout, val) {  // {{{2
/**
 * Iterate over described fields and add fields with layout to `fields`
 *
 * @param fields {Object} Fields object
 * @param layout {Boolean|Number|String|Object} Layout
 * @param val {Object} JSON data
 *
 * @return {Object} Iterable master
 *
 * @method iterLayout
 * @internal
 */

//  console.log('OBJECT ITER layout', this.name);

  var master;
  var res = {
    field: this,
    children: {},
  };

  switch (typeof layout) {
  case 'string':
    if (this.layouts && layout in this.layouts) {
      res.wrap = fields.wrap(this, this.layouts[layout], val);
    }

    for (var key in this.children) {
      master = this.children[key].iterLayout(fields, layout, val && val[key]);
      if (master) {
        res.children[key] = master;
      }
    }

    return res;
  case 'boolean':
    if (! layout) return undefined;

    res.wrap = fields.wrap(this, true, val && val[key]);

    for (var key in this.children) {
      master = this.children[key].iterLayout(fields, true, val && val[key]);
      if (master) {
        res.children[key] = master;
      }
    }

    return res;
  case 'object':
    if (! layout) return undefined;

    for (var key in this.children) {
      if (key in layout) {
        master = this.children[key].iterLayout(fields, layout[key], val && val[key]);
        if (master) {
          res.children[key] = master;
        }
      }
    }

    return res;
  case 'number':
    res.wrap = fields.wrap(this, layout, val && val[key]);
    return res;
  }

  throw O.log.error('INVALID_ARGS', 'Layout', layout);
};

/* OBSOLETE {{{1
exports.getField = function(path, depth) {  // {{{2
/ **
 * @param path {String}
 * @param depth {Number}
 *
 * @method getField
 * @internal
 * /

  if (! depth) {
    if (! Array.isArray(path)) path = path.split('.');
    depth = 0;
  }

  return this.children[path[depth]].getField(path, depth + 1);
};

exports.formatField = function(path, type, val, params, index) {  // {{{2
/ **
 * @param path
 * @param type
 * @param val
 * @param params
 * @param index
 *
 * @method formatField
 * @internal
 * /

  if (! index) {
    if (! Array.isArray(path)) path = path.split('.');
    index = 0;
  }

  var name = path[index];

  return this.children[name].formatField(path, type, val && val[name], params, index + 1);
};

*/
