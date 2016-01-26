'use strict';

const O = require('ose')(module)
  .class(init)
;

/** Docs {{{1
 * @caption Object-relational mapping
 *
 * @readme
 * This component allows to describe JSON data structures.
 *
 * Data descriptions contain no particular data.
 *
 * Entry kinds uses this component to describe `entry.data` and `entry.state` data structure.
 *
 * Generate UI views (detail, list, listItem, ... )
 *
 * Layouts - Kinds
 *
 * Generate flat list of fields from hierarchical document based on defined order
 *
 * @module ose
 * @submodule ose.field
 * @main ose.field
 */

/**
 * @caption Common field description
 *
 * @readme
 * Ancestor for field descriptions
 *
 * @class ose.lib.field.field
 * @type class
 */

/**
 * Field name
 *
 * @property name
 * @type String
 */

/**
 * Field order
 *
 * @property order
 * @type Number
 */

/**
 * Whether the field is required
 *
 * @property required
 * @type Boolean
 */

/**
 * Whether the field is read-only
 *
 * @property readonly
 * @type Boolean
 */

// Public {{{1
function init(parent, name) {  // {{{2
/**
 * Field constructor
 *
 * @param [parent] {Object} Parent object
 * @param [name] {String} Field name
 *
 * @method constructor
 */

  if (name) this.name = name;

  if (parent) {
    parent.addChild(this);
  }
}

exports.detail = function(order, params) {  // {{{2
/**
 * Setup detail layout of this field
 *
 * @method detail
 */

  this.layout('detail', order, params);

  return this;
};

exports.layout = function(name, order, params) {  // {{{2
/**
 * Setup layout `name` of this field
 *
 * @method layout
 */

  if (! this.layouts) this.layouts = {};

  switch (arguments.length) {  // Check arguments, fill params
  case 2:  // {{{3
    switch (typeof order) {
    case 'string':
    case 'number':
      params = {
        order: order,
      };
      break;
    case 'function':
      params = {
        display: order,
      };
      break;
    case 'object':
      params = order || {};
      break;
    default:
      throw O.log.error(this, 'INVALID_ARGS', arguments);
    }
    break;
  case 3:  // {{{3
    switch (typeof (params || undefined)) {
    case 'function':
      params = {
        order: order,
        display: params,
      };
      break;
    case 'undefined':
      params = {
        order: order,
      };
      break;
    case 'object':
      params.order = order;
      break
    default:
      throw O.log.error(this, 'INVALID_ARGS', arguments);
    }
    break;
  default:  // {{{3
    throw O.log.error(this, 'INVALID_ARGS', arguments);
  // }}}3
  }

  if (name in this.layouts) {
    O._.extend(this.layouts[name], params);
  } else {
    this.layouts[name] = params;
  }

  return this;
};

exports.params = function(val) {  // {{{2
/**
 * Set parameters of field
 *
 * @param [val] {Object} Field parameters, copied to field object
 *
 * @method params
 */

  if (arguments.length === 2) {
    this[val] = arguments[1];
    return this;
  }

  if (typeof val !== 'object') {
    throw O.log.error(this, 'INVALID_ARGS', val);
  }

  O._.extend(this, val);

  return this;
};

exports.describe = function(title, brief) {  // {{{2
  if (title) {
    this.title = title;
  }

  if (brief) {
    this.brief = brief;
  }

  return this;
};

exports.iterPatch = function(wrap, patch, val) {  // {{{2
/**
 * @method iterPatch
 * @internal
 */

  if (! (patch === null && wrap.value === undefined)) {
    wrap.patch(patch, val);
  }
};

exports.iterLayout = function(wraps, layout, val) {  // {{{2
/**
 * @method iterLayout
 * @internal
 */

  return wraps.wrap(this, layout, val);
};

exports.displayName = function() {  // {{{2
  if (this.title) return this.title;

  return O.translate(this.name);
};

exports.displayDetail = function(view, wrap) {  // {{{2
  return view.li()
    .h3(this.displayName())
    .stub('p', undefined, wrap)
  ;
};

exports.displayListDetail = function(wrap, ul, li, index, patch) {  // {{{2
  if (patch === null) {
    if (li) li.remove();
    return;
  }

  patch = this.asEditText(patch);
  if (patch instanceof Error) {
    O.log.error(patch);
    patch = 'error';
  }

  if (li) {
    li.find('h3').val(patch);
    return;
  }

  ul.li({listindex: index})
    .h3(patch)
  ;
  return;
};

exports.displayMapDetail = function(wrap, ul, li, key, patch) {  // {{{2
  if (patch === null) {
    if (li) li.remove();
    return;
  }

  patch = this.asEditText(patch);
  if (patch instanceof Error) {
    O.log.error(patch);
    patch = 'error';
  }

  if (li) {
    li.find('p').val(patch);
    return;
  }

  ul.li({mapkey: key}).section('row').section('stretch')
    .h3(O._s.capitalize(O._s.underscored(key).replace('_', ' ')))
    .p(patch)
  ;
  return;
};

exports.asText =  // {{{2

exports.asEditText = function(val) {  // {{{2
  switch (typeof val) {
  case 'undefined':
    return '';
  case 'string':
    return val;
  case 'boolean':
  case 'number':
    return val.toString();
  };

  return JSON.stringify(val);
};

exports.asNumber = function(val) {  // {{{2
  return Number(val);
};

exports.asBoolean = function(val) {  // {{{2
  return Boolean(val);
};

exports.asPost = function(ev) {  // {{{2
  return ev.value;
};

