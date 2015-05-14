'use strict';

var O = require('ose').class(module, C, './common');

// Public {{{1
function C() {  // {{{2
  /*
   * - What can be doc child?
   *   another object 
   *   array doc
   *   field
   *
   * - Every child must have following properties:
   *   name
   *
   */

//  if (! this.name) this.name = name;  // Doc name can be specified in particular doc class.

  this.children = {};

//  this.initChildren && this.initChildren();
};

exports.afterInit = function() {  // {{{2
  for (var key in this.children) {
    var child = this.children[key];

    if (child.afterInit) child.afterInit();
  }
};

exports.text = function(name) {  // {{{2
  var res = O.new('./text')();
  this.addChild(name, res);
  return res;
};

exports.number = function(name, params) {  // {{{2
  var res = O.new('./number')(params);
  this.addChild(name, res);
  return res;
};

exports.millitime = function(name, params) {  // {{{2
  var res = O.new('./number')({
    min: 0,
    decimal: 0,
    unit: 'millisecond',
  });

  this.addChild(name, res);
  return res;
};

exports.lookup = function(name) {  // {{{2
  var res = O.new('./text')();
  this.addChild(name, res);
  return res;
};

exports.addChild = function(name, child) {  // {{{2
  child.name = name;
  return this.children[name] = child;
};

exports.getChild = function(path) {  // {{{2
  switch (typeof path) {
    case 'string':
      path = path.split('.');
      break;
    case 'object':
      if (path.length) break;
    default:
      throw new Error('Invalid field path: ' + path);
  }

  switch (path.length) {
    case 0: throw new Error('Child not found');
    case 1: return this.children[path[0]];
    default: return this.children[path.shift()].getChild(path);
  }
};

exports.iterPatch = function(patch, orig, cb) {  // {{{2
  for (var key in patch) {
    var c = this.children[key];
    if (! c) continue;

    c.iterPatch(patch[key], typeof orig === 'object' ? orig[key] : undefined, cb);
  }
};

exports.iterFields = function(data, profile, cb) {  // {{{2
  for (var key in this.children) {
    var p = profile === true ?
      true :
      profile[key]
    ;

    switch (p) {
    case false:
    case null:
    case undefined:
      break;
    default:
      this.children[key].iterFields(data && data[key], p, cb);
    }
  }
};

exports.getPatch = function(data, get) {  // {{{2
/*
 * @param data [Object] Original data
 * @param get [Function] Function that gets data for suplied field
 *
 * @return {Object} Patch; `null` = delete key; `undefined` = no change
 *
 * @method getPatch
 */

  var c = 0;  // Count of non-null values
  var res = {};

  for (var key in this.children) {
    var r = this.children[key].getPatch(data && data[key], get);
    if (r === undefined) continue;

    if (r !== null) c++;

    res[key] = r;
  }

  if (O._.isEmpty(res)) {
    return undefined;
  }

  if (! c && ! data) {
    return null;
  }

  return res;
};

exports.getField = function(path, index) {  // {{{2
  if (! index) {
    if (! Array.isArray(path)) path = path.split('.');
    index = 0;
  }

  return this.children[path[index]].getField(path, index + 1);
};

exports.formatField = function(path, type, data, params, index) {  // {{{2
  if (! index) {
    if (! Array.isArray(path)) path = path.split('.');
    index = 0;
  }

  var name = path[index];

  return this.children[name].formatField(path, type, data && data[name], params, index + 1);
};

exports.doValidate = function(data, path, errors) {  // {{{2
  for (var key in this.children) {
    if (path) path += '.';

    this.children[key].doValidate(data && data[key], path + key, errors);
  }
};

// }}}1

/* OBSOLETE {{{1
exports.getFields = function(data, profile, createItem) {  // {{{2
  var results = [];

  this.iterFields(data, profile, onField);

  if (profile) results.sort(sort);

  return results;

  function onField(field, data, fieldProfile) {  // {{{3
    if (profile && ! fieldProfile) return;

    if (typeof fieldProfile === 'number') fieldProfile = {order: fieldProfile};
    if (! fieldProfile) fieldProfile = {};

    if (createItem) {
      var result = createItem(field, data, fieldProfile);
    } else {
      var result = {
        field: field,
        data: data,
        profile: fieldProfile
      };
    }

    results.push(result);
  }

  function sort(a, b) {  // {{{3
    return a.profile.order - b.profile.order;
  }

  // }}}3
};

exports.mergeData = function(data, onField) {  // {{{2
  // @data: original data
  // @onField: callback for fetching data from some field

  var key;
  var childResult;  // child new value
  var origChild;  // child original value
  var origData = {};  // this doc original data
  var result = {changed: false, data: {}};

  // clone to origData
  for (key in data) origData[key] = data[key];

  for (key in this.children) {
    if (origData) origChild = origData[key];
    else origChild = undefined;

    childResult = this.children[key].mergeData(origChild, onField);

    if (childResult.changed) result.changed = true;
    else childResult.data = origChild;

    if (childResult.data === undefined) delete result.data[key];
    else result.data[key] = childResult.data;

    if (origData) delete origData[key];
  }

  // copy rest of original data
  if (origData) for (key in origData) if (origData[key] !== undefined) result.data[key] = origData[key];

  // if result.data has no property delete it
  for (key in result.data) return result;

  delete result.data;

  return result;
};

exports.newDoc = function(name, init) {  // {{{2
  var result = O.classes.object('ose/lib/kind/common', name);

  init.call(result, name);

  return this.addChild(result);
};

exports.newField = function(name, type) {  // {{{2
  var args = ['ose/lib/field/' + type];

  for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);

  var result = this.children[name] = O.new(O.classes, args);

  this.addChild(result);


  return result;
};

// }}}1 */
