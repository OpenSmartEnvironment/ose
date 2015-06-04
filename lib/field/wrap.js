'use strict';

var O = require('ose').class(module, C);

// Public {{{1
function C(owner, field, val, profile) {  // {{{2
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
