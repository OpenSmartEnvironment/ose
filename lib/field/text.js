'use strict';

var O = require('ose').class(module, 'ose/lib/field/common');

// Public {{{1
exports.format = function(type, data) {  // {{{2
  if (! data) data = '';

  switch (type) {
    case 'csv': return '"' + data + '"';
    case 'slk': return '"' + String(data).replace(/;/g, ';;') + '"';
    case 'edit': return data;
    case 'sort': return data;
  };

  return Strings.htmlEntityEncode(String(data));
};

exports.unformat = function(data) {  // {{{2
  switch (data) {
    case null:
    case undefined:
    case '':
      return {data: undefined};
  }

  if (typeof data !== 'string') throw new Error('String expected. ' + data);

  return {data: data};
};

// }}}1
