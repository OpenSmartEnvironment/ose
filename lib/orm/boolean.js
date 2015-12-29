'use strict';

var O = require('ose').class(module, './field');

/** Docs {{{1
 * @module ose
 * @submodule ose.orm
 */

/**
 * @caption Boolean field description
 *
 * @readme
 * Description of fields containing a boolean
 *
 * @class ose.lib.orm.boolean
 * @extends ose.lib.orm.field
 * @type class
 */

// Public {{{1
exports.displayDetail = function(view, wrap) {
  view.li('row')
    .h3(this.displayName(), 'stretch')
    .checkbox({
      field: wrap,
      post: wrap.layout.post,
    });
  ;
};

exports.asText = function(val) {  // {{{2
  return Boolean(val).toString();
};

exports.asEditText = function(val) {  // {{{2
  return Boolean(val).toString();
};

exports.asNumber = function(val) {  // {{{2
  if (val) return 1;

  return 0;
};

exports.asBoolean = function(val) {  // {{{2
  return Boolean(val);
};

/* OBSOLETE {{{1
exports.format = function(type, val) {
  switch (val) {
  case undefined:
  case null:
    return '';
  case true:
    return 'true';
  case false:
    return 'false';
  }

  throw O.log.error(this, 'Invalid boolean value', val);
};

exports.unformat = function(val) {
  switch (val.toLowerCase()) {
  case '':
    return null;
  case '0':
  case 'no':
  case 'false':
    return false;
  case '1':
  case 'yes':
  case 'true':
    return true;
  }
};

}}}1 */
