'use strict';

const O = require('ose')(module)
  .class(C)
;

/** Docs {{{1
 * @module ose
 * @submodule ose.orm
 */

/**
 * @caption Field value wrapper
 *
 * @readme
 * Connects the value of particular field with its description
 *
 * @aliases fieldWrappers
 *
 * @class ose.lib.orm.wrap
 * @type class
 */

/**
 * List of field wraps
 *
 * @property owner
 * @type Object
 */

/**
 * Field description
 *
 * @property field
 * @type Object
 */

/**
 * Field value
 *
 * @property value
 * @type *
 */

/**
 * Optional error returned from field.format
 *
 * @property valueError
 * @type Object
 */

/**
 * Optional layout for altering description
 *
 * @property layout
 * @type Object
 */

/**
 * Current edit information
 *
 * @property edit
 * @type Object
 */

/**
 * Field value before last edit
 *
 * @property edit.last
 * @type
 */

/**
 * Edited field value
 *
 * @property edit.value
 * @type
 */

/**
 * Optional error returned from field.unformat
 *
 * @property editError
 * @type Object
 */

// Public {{{1
function C(owner, field, layout, val, children) {  // {{{2
/**
 * Field wrapper constructor
 *
 * @param owner {Object} Owning wrap list
 * @param field {Object} Field description object
 * @param layout {Object} Layout
 * @param val {*} Field value
 *
 * @method constructor
 */

  this.owner = owner;
  owner.fields.push(this);

  this.field = field;
  this.value = val;

  if (layout) this.layout = layout;
  if (children) this.children = children;
}

exports.patch = function(patch, val) {  // {{{2
/**
 * Called when field value is patched
 *
 * @method patch
 * @internal
 */

  this.value = val;

  this._patch && this._patch.forEach(function(cb) {
    cb(patch);
  });
};

exports.onPatch = function(cb) {  // {{{2
/**
 * Register field patch handler `cb` and call it with current `this.value`
 */

  if (typeof cb !== 'function') {
    throw O.log.error('INVALID_ARGS', 'cb', cb);
  }

  if (this._patch) {
    this._patch.push(cb);
  } else {
    this._patch = [cb];
  }

  cb(this.value === undefined ? null : this.value);
};

exports.input = function(ev) {  // {{{2
/**
 * Invoked when control was changed by user
 */

  var post = this.layout.post || this.field.post || undefined;

  switch (typeof (post)) {
  case 'undefined':
    break;
  case 'function':
    post(this.owner.view, ev);
    break;
  case 'string':
    this.owner.view.post(post, this.field.asPost(ev));
    break;
  default:
    throw O.log.error(this, 'Invalid layout `post`', post);
  }
};

