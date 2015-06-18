'use strict';

var O = require('ose').class(module, C);

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
 * Optional profile for altering description
 *
 * @property profile
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
 * Displayed HTML element
 *
 * @property el
 * @type
 */

/**
 * Optional error returned from field.unformat
 *
 * @property editError
 * @type Object
 */

// Public {{{1
function C(owner, field, val, profile) {  // {{{2
/**
 * Field wrapper constructor
 *
 * @param owner {Object} Owning wrap list
 * @param field {Object} Field description
 * @param val {*} Field value
 * @param [profile] {Object} Optional profile for altering description
 *
 * @method constructor
 */

  this.owner = owner;
  this.field = field;
  this.value = val;

  switch (typeof profile) {
  case 'boolean':
  case 'undefined':
    this.profile = {};
    return;
  case 'object':
    if (! profile) {
      this.profile = {};
      return;
    }
    this.profile = profile;
    return;
  case 'number':
  case 'string':
    this.profile = {order: profile};
    return;
  }

  throw O.error(this, 'Invalid field profile', profile);
}

exports.patch = function(val) {  // {{{2
/**
 * @param val {*}
 *
 * @method patch
 * @internal
 */

  if (val === this.value) return;

  this.value = val;

  if (this.edit) {
    if (val !== this.edit.value) {
      return;
    }

    this.stopEdit(this);
  }

  this.update();
  return;
}

exports.update = function() {  // {{{2
/**
 * Update value
 *
 * @method update
 * @internal
 */

  if (! this.el) return;

  delete this.valueError;

  var val = this.field.format('edit', this.edit ? this.edit.value : this.value);

  if (! val) {
    this.el.val('');
    return;
  }

  if (val instanceof Error) {
    O.log.error(val);
    this.valueError = val;
    this.el.val('Error formating: ' + val.message + '; value: ' + this.value.toString());
    return;
  }

  this.el.val(val);
  return;
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

// }}}1
