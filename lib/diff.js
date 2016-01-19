'use strict';

const O = require('ose')(module);

// Public {{{1
exports.diff = function(data, orig) {  // Alter "data": set keys not existing in "orig" to null. {{{2
  if (typeof data !== 'object' || typeof orig !== 'object') {
    return data === orig;
  }

  for (var key in orig) {
    if (key in data) {
      if (exports.diff(data[key], orig[key])) {
        delete data[key];
      }
    } else {
      data[key] = null;
    }
  }

  return O._.isEmpty(data);
};

exports.merge = function(data, change) {  // Alter "data" by "change", return data. {{{2
  for (var key in change) {
    var value = change[key];

    if (value === null) {
      delete data[key];
      continue;
    }

    if (
      typeof value === 'object' &&
      data[key] &&
      typeof data[key] === 'object'
    ) {
      exports.merge(data[key], value);
      continue;
    }

    data[key] = value;
  }

  return data;
};

exports.cleanPatch = function(patch, orig) {  // Alter "patch" - remove properties that are same as in "orig". {{{2
  if (! orig) return;
  if (typeof orig !== 'object') return;

  for (var key in patch) {
    var value = patch[key];

    if (key in orig) {  // Key is found in original patch.
      if (value === null) continue;  // Keep key in the patch

      if (value === undefined) {  // Value in orig will be kept
        delete patch[key];
        continue;
      }

      var o = orig[key];

      if (O._.isEqual(value, o)) {
        delete patch[key];  // Values are same, remove the key.
        continue;
      }

      if (Array.isArray(value)) continue;  // Array is different, keep the key.

      if (typeof value === 'object') {
        exports.cleanPatch(value, o);

        if (O._.isEmpty(value)) {
          delete patch[key];
        }
      }
    } else { // Key is not found in original patch.
      switch (value) {
      case undefined:
      case null:
        delete patch[key];
      }
    }
  }

  return;
};

exports.mergeCopy = function(data, patch) {  // Merge `data` and `patch`. `data` remain untouched, `patch` structure can be part of resulting data. {{{2
  switch (O.typeof(patch)) {
  case 'undefined':
    if (typeof data === 'object') {
      return JSON.parse(JSON.stringify(data));
    }
    return data;
  case 'null':
    return undefined;
  case 'array':
    /* TODO: merge arrays?
    if (Array.isArray(data)) {
      return copyArray(data, patch);
    }
    */
    return patch;
  case 'object':
    if (Array.isArray(data)) {
      return patch;
    }

    var res = {};
    for (var key in data) {
      var r = exports.mergeCopy(data[key], patch[key]);
      if (r !== undefined) {
        res[key] = r;
      }
    }
    return res;
  }

  return patch;
};
function mergeClean(dst, src, orig) {  // {{{2
  for (var key in orig) {
    if (key in src) {
      if (typeof orig[key] === 'object') {
        mergeClean(dst[key] = {}, src[key], orig[key])
      } else {
        dst[key] = src[key];
      }
    } else {
      dst[key] = null;
    }
  }

  for (var key in src) {
    if (! (key in orig)) {
      dst[key] = src[key];
    }
  }
};

function mergeQueue(dst, src, orig) {  // {{{2
  throw O.log.todo();

  /*
  for (var key in src) {
    var s = src[key];

    if (s === null) {
      dst[key] = null;
      continue;
    }

    var d = dst[key];

    if (d && typeof d === 'object' && typeof s === 'object') {
      mergeQueue(d, s, orig && orig[key]);
      continue;
    }

    if (d === null && orig && typeof orig[key] === 'object') {
      mergeClean(dst[key] = {}, s, orig[key]);
    } else {
      dst[key] = s;
    }
  }
  */
};

