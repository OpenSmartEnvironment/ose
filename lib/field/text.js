'use strict';

var O = require('ose').class(module, 'ose/lib/field/common');

// Public {{{1
exports.format = function(type, data) {  // {{{2
  if (! data) data = '';

  if (typeof data !== 'string') {
    O.log.error(this, 'Invalid data, string expected', data);
    return '';
  }

  switch (type) {
  case 'csv': return '"' + data + '"';
  case 'slk': return '"' + String(data).replace(/;/g, ';;') + '"';
  case 'edit': return data;
  case 'sort': return data;
  };
};

exports.unformat = function(data) {  // {{{2
  switch (data) {
  case null:
  case undefined:
  case '':
    return null;
  }

  if (typeof data !== 'string') {
    O.log.error(this, 'Invalid data, string expected', data);
    return '';
  }

  return data;
};

// }}}1
