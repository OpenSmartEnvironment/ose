'use strict';

// Public
exports.superClass = 'ose/lib/field/common';
exports.viewer = 'timestamp';
exports.editor = 'timestamp';

exports.format = function(type, data, params) {  // {{{
  if (params) {
    moment.lang(params.language); // or params.locale.toLowerCase()
  }

  if (! data) return '';

  if (parseInt(data).toString() != data) return 'Invalid timestamp value';

  switch (type) {
    case 'sort': return data;
    case 'slk': return data / 1000 / 86400 + 25569; // days since 1.1.1900
    case 'display': return moment(data).format('LLLL');
    case 'edit': return moment(data).format('LLLL');
    default: throw new Error('Invalid type: ' + type);
  }

  // switch (type) {
  //   case 'sort': return data;

  //   case 'slk': return data / 1000 / 86400 + 25569; // days since 1.1.1900

  //   case 'date': 
  //     return moment(data).format('LL');

  //   case 'time': 
  //     return moment(data).format('LT');

  //   case 'edit': 
  //     if (params && params.type) {
  //       switch (params.type) {
  //         case 'date': 
  //         return moment(data).format('LL');

  //         case 'time': 
  //           return moment(data).format('HH:mm');
  //       }
  //     } else return moment(data).format('LLLL');
  // }

//  return data.toString();
}

// }}}
exports.unformat = function(data, params) {  // {{{
  if (! data) return {data: undefined}

  return {data: moment(data).valueOf()};
}

// }}}
