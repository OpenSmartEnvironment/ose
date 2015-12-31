'use strict';

var O = require('ose').class(module, C);

var Wrap = O.class('./wrap');

/** Docs {{{1
 * @module ose
 * @submodule ose.orm
 */

/**
 * @caption List of field wraps
 *
 * @readme
 * Manages particular data against field description objects. Converts
 * the description tree hierarchy into a simple list. This can be
 * used, for example, by the [detail view] to display and edit entry
 * data.  Makes it possible to obtain patches or full data objects
 * from edited fields.
 *
 * @class ose.lib.orm.list
 * @type module
 */

/**
 * Current view displaying data
 *
 * @property view
 * @type Object
 */

/**
 * List of [field wrappers]
 *
 * @property fields
 * @type Array
 */

/**
 * Whether editing can be stopped
 *
 * @property canStopEdit
 * @type Boolean
 */

/**
 * Whether the list is currently being edited
 *
 * TODO: Consider renaming to `isEdited`
 *
 * @property edit
 * @type Boolean
 */

// Public {{{1
function C(view) {  // {{{2
/**
 * Field list constructor
 *
 * @param view {Object} Current view
 *
 * @method constructor
 */

  this.fields = [];
  this.view = view;
}

exports.each = function(cb) {  // {{{2
/**
 * param cb {Function} Callback
 *
 * @method each
 * @internal
 */

  for (var i = 0; i < this.fields.length; i++) {
    cb(this.fields[i]);
  }
};

exports.sort = function() {  // {{{2
/**
 * @method sort
 * @internal
 */

  this.fields.sort(function(a, b) {
    if (! a.layout) return 1;
    if (! b.layout) return -1;

    return a.layout.order - b.layout.order;
  });
};

exports.wrap = function(field, layout, val, children) {  // {{{2
  switch (typeof layout) {
  case 'string':
    layout = field.layouts && field.layouts[layout];
    break;
  default:
    throw O.log.error(this, 'INVALID_ARGS', 'Layout', layout);
  }

  if (! (layout || children)) return undefined;

  return new Wrap(this, field, layout, val, children);
};

exports.getVal = function(def, orig) {  // {{{2
/**
 * @param def
 * @param orig
 *
 * @method getVal
 * @internal
 */

  var that = this;

  return def.getVal(function(field, o) {
    for (var i = 0; i < that.fields.length; i++) {
      var fw = that.fields[i];

      if (fw.field === field) {
        if (fw.edit) return fw.edit.value;

        return fw.value;
      }
    }

    return undefined;
  });
};

exports.getPatch = function(def, orig) {  // {{{2
/**
 * @param def
 * @param orig

 * @method getPatch
 * @internal
 */

  var that = this;

  return def.getPatch(orig, function(field, o) {
    for (var i = 0; i < that.fields.length; i++) {
      var fw = that.fields[i];

      if (
        fw.field === field &&
        fw.edit &&
        fw.edit.value !== o
      ) {
        if (fw.edit.value === undefined) {
          return null;
        }

        return fw.edit.value;
      }
    }

    return undefined;
  });
};

/* OBSOLETE {{{1
exports.startEdit = function(wrap) {  // {{{2
/ **
 * @param wrap
 *
 * @method startEdit
 * @internal
 * /

  if (wrap === true) {
    this.cantStopEdit = true;
  }

  if (this.edit) return;

  this.edit = true;

  this.view.startEdit(wrap);
  return;
};

exports.stopEdit = function(wrap) {  // {{{2
/ **
 * @param wrap
 *
 * @method stopEdit
 * @internal
 * /

  if (! this.edit) return;

  for (var i = 0; i < this.fields.length; i++) {
    var fw = this.fields[i];
    if (! fw.edit) continue;

    switch (wrap) {
    case 'save':
      if (fw.edit.value === null) {
        fw.value = undefined;
      } else {
        fw.value = fw.edit.value;
      }
      // NO BREAK
    case 'cancel':
      delete fw.edit;
      fw.update();
      break;
    default:
      return;  // Some field is still editing, do not cancel
    }
  }

  if (this.cantStopEdit) {
    return;
  }

  this.edit = false;

  this.view.stopEdit();
  return;
};

}}}1 */
