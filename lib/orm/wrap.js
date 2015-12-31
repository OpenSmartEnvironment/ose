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

exports.onUpdate = function(cb) {  // {{{2
  if (! this.updates) {
    this.updates = [];
  }

  this.updates.push(cb);

  if (this.value === undefined) {
    cb(null);
  }

  cb(this.value);
};

exports.update = function(patch) {  // {{{2
/**
 * @method update
 * @internal
 */

  if (! this.updates) return;

  for (var i = 0; i < this.updates.length; i++) {
    this.updates[i](patch);
  }

  return;
};

/* OBSOLETE {{{1
exports.stopEdit = function(update) {  // {{{2
/ **
 * Stop field editing
 *
 * @param update {Boolean} Whether to call update
 *
 * @method stopEdit
 * @internal
 * /

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
/ **
 * Called when value is edited
 *
 * @param val {*} New value
 * @param update {Boolean} Whether to call update
 *
 * @method stopEdit
 * @internal
 * /

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
      for (var i = 0; i < this.updates.length; i++) {
        this.updates[i](undefined);
      }

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

// }}}1 */
