'use strict';

// Public
exports.superClass = 'ose/lib/field/lookup';
exports.editor = 'lookups';

exports.format = function(type, data) {  // {{{
  if (! data) return '';

  if (! Array.isArray(data)) return 'Invalid field value';

  return data.join(', ');

};

// }}}
exports.unformat = function(data) {  // {{{
  var result = [];

  while (data) {
    data = data.match(/(\w+)(.*)/);

    if (! data) break;

    if (result.indexOf(data[1]) < 0) result.push(data[1]);
    data = data[2];
  }
   
  if (! result.length) result = null;

  return {data: result};
};

// }}}
