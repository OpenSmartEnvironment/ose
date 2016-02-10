'use strict';

const O = require('ose')(module)
  .class(init)
;

/** Docs {{{1
 * @module ose
 * @submodule ose.field
 */

/**
 * @caption Field value wrapper
 *
 * @readme
 * Connects the value of particular field with its description
 *
 * @aliases fieldWrappers
 *
 * @class ose.lib.field.wrap
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
function init(owner, field, layout, val, children) {  // {{{2
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

exports.on = function(name, cb) {  // {{{2
/**
 * Register handler `cb`. For 'patch' handler, call `cb(this.value)`.
 *
 * @param name {String} Event name to be registered, possible values are ('patch'|'input')
 * @param cb {Function} Event callback
 *
 * @method on
 * @chainable
 */

  if (typeof cb !== 'function') {
    throw O.log.error('INVALID_ARGS', 'cb', cb);
  }

  switch (name) {
  case 'patch':
    cb(this.value === undefined ? null : this.value);
    break;
  case 'input':
    break;
  default:
    throw O.log.error('INVALID_ARGS', 'name', name);
  }

  name = '_' + name;
  if (name in this) {
    this[name].push(cb);
  } else {
    this[name] = [cb];
  }

  return this;
};

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

  if (this.edit) {
    this.stopEdit();
  }
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
    return post(this.owner.view, ev);
  case 'string':
    return this.owner.view.post(post, this.field.asPost(ev));
  default:
    throw O.log.error(this, 'Invalid `layout.post`', post);
  }

  this._input && this._input.forEach(function(cb) {
    cb(input);
  });
};

exports.post = function(name, data) {  // {{{2
  this.owner.view.post(name, data);
};

exports.isReadonly = function() {  // {{{2
  return this.layout && this.layout.readonly || this.field.readonly;
};

exports.stopEdit = function(update) {  // {{{2
/**
 * Stop field editing
 *
 * @param update {Boolean} Whether to call update
 *
 * @method stopEdit
 * @internal
 */

  if (this.edit) {
    var e = this.edit;
    delete this.edit;
    this.owner.stopEdit(this, e);
    delete this.editError;

    if (update) {
      this.update();
    }
  }
};

exports.testValue = function(val, update) {  // {{{2
/**
 * Called when value is edited
 *
 * @param val {*} New value
 * @param update {Boolean} Whether to call update
 *
 * @method stopEdit
 * @internal
 */

  val = this.field.unformat(val);

  if (val instanceof Error) {
    this.editError = val;
    O.log.error(val);
    return;
  }

  delete this.editError;

  if (this.edit) {
    if (val === this.value) {
      this.stopEdit();
    } else {
      this.edit.value = val;
    }
  } else if (val !== this.value) {
    if (this.valueError) {
      delete this.editError;
      this.el.val('');
      this.edit = {
	last: undefined,
	value: undefined,
      };
    } else {
      this.edit = {
	last: this.value,
	value: val,
      };
    }

    this.owner.startEdit(this);
  }

  if (update) {
    if (this.edit) {
      this.edit.last = this.edit.value;
    }

    this.update();
  }

  return;
}

