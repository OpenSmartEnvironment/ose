'use strict';

// Public
exports.superClass = 'ose/lib/field/common';

exports.format = function(type, data) {  // {{{
  if (! data) data = '';

  return data;
};

// }}}
exports.unformat = function(data) {  // {{{
  return {data: data};
};

// }}}

