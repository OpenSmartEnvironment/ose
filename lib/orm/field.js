'use strict';

var O = require('ose').class(module, C);

/** Docs {{{1
 * @caption Object-relational mapping
 *
 * @readme
 * This component allows to describe JSON data structures. Data descriptions contian no particular data.
 *
 * @TODOfeatures
 * - JSON data editing
 * - lookups
 *
 * @module ose
 * @submodule ose.orm
 * @main ose.orm
 */

/**
 * @caption Common field description
 *
 * @readme
 * Ancestor for field descriptions
 *
 * @class ose.lib.orm.field
 * @type module
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
 * Whether field is required
 *
 * @property required
 * @type Boolean
 */

// Public {{{1
function C(parent, name) {  // {{{2
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

  if (typeof val !== 'object') {
    throw O.log.error(this, 'INVALID_ARGS', val);
  }

  O._.extend(this, val);

  return this;
};

exports.iterPatch = function(master, patch, val) {  // {{{2
/**
 * @method iterPatch
 * @internal
 */

  master.wrap.patch(patch, val);
};

exports.iterLayout = function(fields, layout, val) {  // {{{2
/**
 * @method iterLayout
 * @internal
 */

//  console.log('FIELD ITER LAYOUT', this.name);

  switch (typeof layout) {
  case 'undefined':
  case 'string':
    if (this.layouts && layout in this.layouts) {
      return {
        field: this,
        wrap: fields.wrap(this, this.layouts[layout], val),
      };
    }
    return undefined;
  case 'boolean':
    if (! layout) return undefined;

    return {
      field: this,
      wrap: fields.wrap(this, true, val),
    };
  case 'object':
    if (! layout) return;
    // NO BREAK
  case 'number':
    return {
      field: this,
      wrap: fields.wrap(this, layout, val),
    };
  }
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

/* OBSOLETE {{{1
exports.getVal = function(get) {  // {{{2
/ **
 * @method getVal
 * @internal
 * /

  return get(this);
};

exports.getPatch = function(val, get) {  // {{{2
/ **
 * @method getPatch
 * @internal
 * /

  return get(this, val);
};

exports.getField = function() {  // {{{2
/ **
 * @method getField
 * @internal
 * /

  return this;
};

exports.formatField = function(path, type, val, params) {  // {{{2
/ **
 * @method formatField
 * @internal
 * /

  return this.format(type, val, params);
};

exports.doValidate = function(val, path, errors) {  // {{{2
/ **
 * TODO
 * @method doValidate
 * @internal
 * /

  if (this.required) {
    switch (val) {
    case undefined:
    case null:
    case NaN:  // TODO won't work test isNaN(val)
    case '':
      errors.push({
        error: 'required',
        field: path
      });
      break;
    }
  }
};

exports.setOrder = function(order) {  // {{{2
/ **
 * Automatic field ordering
 *
 * @param order {Object} Object defining the order of fields
 * @param order.value {Number} Numeric order of field
 *
 * @method setOrder
 * @internal
 * /

  if (! this.order) {
    this.order = ++order.value;
  }
};

exports.format = function(type, val, params) {  // {{{2
/ **
 * Format field value
 *
 * @param type {String} Field type ('csv', 'slk', 'sort', 'edit', 'display')
 * @param val {*} Raw value to format
 * @param [params] {Object} Optional formatting parameters
 *
 * @returns {String} Formatted value
 *
 * @method format
 * /

  return '';
};

exports.unformat = function(val, params) {  // {{{2
/ **
 * Unformat field and return raw value
 *
 * @param val {*} Edited field value
 * @param params {Object} Optional unformatting parameters
 *
 * @returns {*} Raw field value
 *
 * @method unformat
 * /

  return O.error(this, 'Not implemented');
};

}}}1 */
