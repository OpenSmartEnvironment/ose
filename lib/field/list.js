'use strict';

var O = require('ose').class(module, C);

var Wrap = O.class('./wrap');

// Public {{{1
function C(view) {  // {{{2
  this.fields = [];
  this.view = view;
}

exports.each = function(cb) {  // {{{2
  for (var i = 0; i < this.fields.length; i++) {
    cb(this.fields[i]);
  }
};

exports.sort = function() {  // {{{2
  this.fields.sort(function(a, b) {
    return a.profile.order - b.profile.order;
  });
};

exports.add = function(def, val, profile) {  // {{{2
  var that = this;

  def.iterFields(val, profile, function(field, v, p) {
    that.fields.push(new Wrap(that, field, v, p));
  });
};

exports.getVal = function(def, orig) {  // {{{2
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

exports.patch = function(def, patch, orig) {  // {{{2
  var that = this;

  def.iterPatch(patch, orig, function(field, val, o) {
    for (var i = 0; i < that.fields.length; i++) {
      var fw = that.fields[i];

      if (fw.field === field) {
        fw.patch(val);
      }
    }
  });
}

exports.startEdit = function(wrap) {  // {{{2
  if (wrap === true) {
    this.cantStopEdit = true;
  }

  if (this.edit) return;

  this.edit = true;

  this.view.startEdit(wrap);
  return;
};

exports.stopEdit = function(wrap) {  // {{{2
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

// }}}1
