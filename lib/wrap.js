'use strict';

var O;  // This module wrapper; defined during `setup()`
var Consts = {};  // All contants

/** Doc {{{1
 * @caption Module wrapper
 *
 * @readme
 * This component is the core of the framework based on the
 * CommonJS Modules spec.
 *
 * Before you can start using the framework's methods and properties from some module,
 * it is necessary to wrap the module:<br>
 * `var O = require("ose").module(module);`
 *
 * The `O` variable then gives access to both general and
 * module-related properties and methods of the framework, see [Module
 * wrapper class].
 *
 *
 * @description
 * ## Description
 *
 * There are several types of module wrapping:
 * - simple module:<br>
 *   `var O = require("ose").module(module);`
 * - class definition:<br>
 *   `var O = require("ose").class(module, [constructor], ["super_module_path"]);`
 * - singleton definition:<br>
 *   `var O = require("ose").object(module, [init_method], ["super_module_path"]);`
 *
 * **IMPORTANT:**<br />
 * Each time a module is wrapped using `require("ose").class(module);` or `require("ose").object();`, the wrapper adds the `O` property
 * to `module.exports`. The `O` property is read-only and
 * non-configurable. It is not safe to overwrite this property.
 *
 * Simple modules do nothing with `module` or `module.exports`. They
 * only provide the framework's methods and properties to the current
 * module.
 *
 *
 * ## Extending `O`
 *
 * It is possible to extend the framework using
 * `O.extend("property_name", property_value)`. Calling this method
 * adds the supplied property to the prototype of module wrapper (`var O = require('ose')...`
 * variable).
 *
 *
 * ## Classes
 *
 * A class is a function used as a class constructor with a prototype. It
 * is good practice to define each class within its own module.
 *
 * Of course, it is still possible to use `util.inherits(...);`
 *
 * Using the OSE module wrapping for class definition brings syntactic
 * sugar for:
 * - creating classes:<br>
 *   `var O = require("ose").class(module, constructor_method, "super_module_path");`
 * - chainable mixing modules into class prototypes:<br>
 *   `var O = require("ose").class(module).prepend("module_path").append("another_module_path");`
 * - runtime-specific behaviour with simple code sharing between
     Node.js and the browser:<br>
 *   `O.prepend("browser")`, `O.append("runtime");`
 * - definition class prototype properties using `exports` variable:<br>
 *   `exports.config = function(...) { ... };`
 * - calling methods of superclass:<br>
 *   `O.super.prototype.method.call(this, args ...);` or `O.inherited(this, "method")(args ...);`
 * - calling methods of all ancestors in prototype chain without
     explicitly calling "inherited" methods in method definition:<br>
 *   `O.callChain(this, "method")(args ...);`
 * - creating class instances:<br>
 *   `O.new("module_path")(args ...);`
 *
 * To use a class, you need to carry out three steps:
 *
 * 1. Prepare a module containing the class definition.
 * 2. Obtain a class constructor.
 * 3. Create a new object.
 *
 * First, the class needs to be prepared in the module containing the
 * class definition by calling, for example, `var O =
 * require("ose").class(module, constructor, super)`. The
 * `constructor` is an optional class constructor method. If it is not
 * defined, it gets created automatically. The `super` parameter
 * defines a superclass. The `super` parameter can be `undefined`, a
 * class constructor or a path to the module containing class definition.
 *
 * Example module with class preparation:
 *
 *     // Module "ose/lib/entry"
 *     "use strict";
 *
 *     // Wrap a module to be used as a class inheriting `EventEmitter` with a constructor `C`
 *     var O = require("ose").class(module, C, "EventEmitter");
 *
 *     // Class constructor
 *     function C(...) {
 *       // Call super constructor
 *       O.super.call(this);
 *       ...
 *     }
 *
 *     // Add properties of the class prototype to the `exports` object:
 *     exports.config = function(name, data) {
 *       ...
 *     };
 *
 *     // Define another property
 *     exports.identify = function() {
 *       return [this.id, this.shard.id, this.shard.space.name];
 *     };
 *
 * The second step is to obtain a class constructor with its
 * prototype. This step is carried out when the class is first
 * accessed by calling `O.class("ose/lib/entry")`. Multiple calls to
 * `O.class("ose/lib/entry")` return the same, already created
 * class. When called for the first time, the class prototype is
 * created from module exports and optional mixins. If the class has
 * an ancestor, the constructor should usually call the super
 * constructor (see example above). If a class is defined without a
 * constructor, the constructor is created.
 *
 * The last step is to create a new object based on the class.
 *
 * Class usage example:
 *
 *     // Some other module ...
 *     "use strict";
 *     var O = require("ose").module(module);
 *
 *     // Obtain class constructor (second step).
 *     var Entry = O.class("ose/lib/entry");
 *
 *     ...
 *
 *       // Create a new Entry instance object (third step).
 *       entry = new Entry(shard, id);
 *
 *     ...
 *
 * Or another way:
 *
 *     // Some other module ...
 *     "use strict";
 *     var O = require("ose").module(module);
 *
 *     ...
 *
 *       // Create a new Entry instance object (second and third step together).
 *       entry = O.new("ose/lib/entry")(shard, id);
 *
 *
 * The **EventEmitter** class is built in. To use this
 * class, pass `"EventEmitter"` to the `class()` method (see the
 * examples above).
 *
 * To access the `module.exports` object that is wrapped and prepared
 * as a class, call the standard `require("ose/lib/entry")`
 * method. This call returns the original `module.exports` object.
 *
 * To extend any class, use the following example:
 *
 *     // Require OSE
 *     var O = require("ose").module(module);
 *
 *     // Obtain Entry class
 *     var Entry = O.class("ose/lib/entry");
 *
 *     // Add new method to entry class prototype
 *     Entry.prototype.someMethod = function() {...};
 *
 * Changing the prototype of a class alters all its instances and
 * descendants, even those already created.
 *
 *
 * ## Mixins
 *
 * It is possible to mix another module into a class prototype. To do
 * that, use the `prepend()` or `append()` methods of the `O` wrap
 * object.
 *
 * Example:
 *
 *     // Some module
 *     "use strict";
 *
 *     // Wrap module as a class definition
 *     var O = require("ose").class(module, C, "EventEmitter");
 *
 *     // Prepend a module
 *     O.prepend("some_module");
 *
 *     // Append a module depending on the runtime.
 *     O.append("runtime");
 *
 * The `prepend()` or `append()` methods supports call chaining. Both
 * methods accept a module name or array of module names. Properties
 * to a class prototype are mixed in the second step of
 * class creation. Conflicting properties are overwritten
 * in the following order: Last prepended, prepended, module.exports,
 * first appended, appended.
 *
 * It is possible to use the following predefined values as module names:
 * * "browser" – If in a browser environment, use the `browser.js`
 *    module from the same directory.
 * * "node" – If in a Node.js environment, use the `node.js`
 *    module from the same directory.
 * * "runtime" – Use either the `browser.js` or `node.js` module
 *    depending on the environment.
 *
 * It is possible to use relative paths as module names.
 *
 *
 * ## Singletons
 *
 * A singleton is a JavaScript object assigned to `module.exports`. It can be
 * created as any class instance and can use the same `append()` and
 * `prepend()` mixin methods as classes. There are two types of
 * singletons. The first initializes itself in its own module and the
 * second is initialized outside the singleton module.
 *
 * **IMPORTANT:**<br />
 * Every singleton must always exist in only one instance
 * within a single running instance of OSE. The use of npm can result
 * in mixing multiple installations of packages using singletons
 * within a single OSE instance. This situation must be avoided.
 *
 * Like the creation of a class, the creation of a singleton is a
 * three-step process:
 *
 * 1. Prepare a module containing the singleton's definition and
 *    create the singleton
 * 2. Obtain singleton initialization method
 * 3. Initialize and obtain the singleton
 *
 * Example module with self-initializing singleton::
 *
 *     // Wrap module to be used as a singleton
 *     var O = require("ose").object(module, I, "EventEmitter");
 *
 *     // Initialize of the singleton
 *     exports = O.init();
 *
 *     // Singleton initialization function
 *     function I() {
 *       // Call super constructor
 *       O.super.call(this);
 *       ...
 *     }
 *
 *     // Properties of the singleton are defined in the `exports` variable:
 *
 *     exports.getId = function() {
 *       return id;
 *     };
 *
 *     ...
 *
 * Example module without singleton self-initialization:
 *
 *     // Wrap module to be used as a singleton
 *     var O = require("ose").object(module, I, "EventEmitter");
 *
 *     // Obtain singleton object
 *     exports = O.exports;
 *     ...
 *
 * Example module with separate singleton initialization:
 *
 *     // Some other module ...
 *     "use strict";
 *
 *     // Wrap module as module
 *     var O = require("ose").module(module);
 *
 *     ...
 *
 *     // Obtain singleton initialization function (second step)
 *     var init = O.object("ose/lib/peer/list");
 *
 *     // Initialize and obtain singleton (third step)
 *     var result = init(arg);
 *
 *     // Or the second and third step together without the init
 *     // variable:
 *     var result = O.object("ose/lib/peer/list")(arg);
 *
 *     ...
 *
 * To access or extend any initialized singleton, standard `require` can be used:
 *
 *     // Module changing singleton.
 *     "use strict";
 *
 *     // Require OSE.
 *     var O = require("ose");
 *
 *     // Obtain singleton.
 *     var result = require("ose/lib/id");
 *
 *     // Add new method to the singleton.
 *     result.newMethod = function() {...};
 *
 * Be careful when altering singletons before their initialization
 * because your changes may get overwritten by mixing of other modules
 * during singleton initialization.
 *
 *
 * @aliases class classes singleton singletons eventEmitter super moduleWrapping wrappingModule wrappingModules
 *
 * @module ose
 * @submodule ose.wrap
 * @main ose.wrap
 */

/**
 * @caption Module wrapper class
 *
 * @readme
 * Class providing the framework's methods and properties
 *
 *
 * @class ose.lib.wrap
 * @type class
 */

// Class {{{1
module.exports = exports = function(mod, type) {  // {{{2
/**
 * Module wrapper constructor
 *
 * @param mod {Object} Module to be wrapped
 * @param type {String} Wrap type
 *
 * @method constructor
 */

  if (! mod || typeof mod.id !== 'string') {
    throw O.log.error('Invalid module, first argument must be `module` variable');
  }

  this.module = mod;
};

exports.pdType = {  // {{{2
/**
 * [Property descriptor]
 * (https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/defineProperty)
 * types enumeration.
 *
 * @property pdType
 * @type Object
 * @internal
 */

  none: 0,  // Not yet recognized.
  descriptor: 1,  // Propably a descriptor.
  object: 2,  // Not a property descriptor.
  data: 3,  // Data descriptor.
  accessor: 4,  // Accessor descriptor.
};

exports.setup = function(runtime) {  // {{{2
/**
 * Sets up module wrapper of this module
 *
 * @param runtime {String} Browser or Node.js runtime
 *
 * @method setup
 * @internal
 */

  exports.prototype.runtime = runtime;

  var ose = require('ose');
  ose.setupO();
  O = ose.module(module);

  O.addClass('EventEmitter', require('events').EventEmitter);
  O.addClass('Deps', './deps');
  O.addClass('Logger', './logger');
};

// Prototype {{{1
exports.prototype = Object.create(Object.prototype, object2Def({  // {{{2
  /* *
//  consts: {get: getConsts},
   * Predefined constants
   *
   * @property consts
   * @type Object
   */
  type: {get: getType},
  /**
   * Type of a wrap
   *
   * @property type
   * @type String
   */
  ctor: {get: getCtor},
  /**
   * Constructor
   *
   * @property ctor
   * @type Function
   */
  init: {get: getInit},
  /**
   * [Singleton] initialization method
   *
   * @property init
   * @type Function
   */
  exports: {get: getExports},
  /**
   * Module exports
   *
   * @property exports
   * @type *
   */
  log: {get: getLog},
  /**
   * [Logger] instance
   *
   * @property log
   * @type Object
   */
  package: {
  /**
   * Package wrapper reference
   *
   * @property package
   * @type Object
   */
    get: getPackage,
    set: setPackage,
  },
}));

exports.prototype.lastTime = 0;  // {{{2
/**
 * @property lastTime
 * @type Number
 * @internal
 */

exports.prototype._ = require('underscore');  // {{{2
/**
 * Reference to [Underscore.js](http://underscorejs.org/)
 *
 * @property _
 * @type Object
 */

exports.prototype._s = require('underscore.string');  // {{{2
/**
 * Reference to [Underscore string library](https://github.com/epeli/underscore.string)
 *
 * @property _s
 * @type Object
 */

exports.prototype.translate = function(val) {
  return O._s.capitalize(O._s.underscored(val).replace('_', ' '));
};

exports.prototype.async = require('async');  // {{{2
/**
 * Reference to [Async.js library](https://github.com/caolan/async)
 *
 * @property async
 * @type Object
 */

exports.prototype.dia = require('diacritics').remove;  // {{{2
/**
 * Return new string based on `val` with diacriticts transformed to ascii.
 *
 * @param val {String} Value to transform.
 *
 * @return {String} Transformed string.
 *
 * @method dia
 */

exports.prototype.classes = {};  // {{{2
/**
 * Predefined class names and constructors
 *
 * @property classes
 * @type Object
 * @internal
 */

exports.prototype.typeof = function(val) {  // {{{2
/**
 * Return typeof val
 *
 * @param [val] {*}
 */

  var res = typeof val;

  if (res === 'object') {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
  }

  return res;
};

exports.prototype.applyError = function(subject, args) {  // {{{2
  switch (args.length) {
  case 0: return this.error(subject);
  case 1: return this.error(subject, args[0]);
  case 2: return this.error(subject, args[0], args[1]);
  }

  return this.error(subject, args[0], args[1], args[2]);
};

exports.prototype.error = function(subject, code, message, data) {  // {{{2
/**
 * Create an `Error` instance and append a subject and data to it.
 *
 * See [logging].
 *
 * @param [subject] {*} Subject of the error
 * @param code {String} Error code
 * @param [message] {String} Error message
 * @param [data] {*} Optional data describing error
 */

  switch (arguments.length) {
  case 1:
    message = subject;
    code = 'UNEXPECTED';
    subject = undefined;
    break;
  case 2:
    if (typeof subject === 'object' && subject.O instanceof module.exports) {
      if (code instanceof Error) {
        code.subject = subject;
        code.subjectDescr = this.subjectToString(subject);
        if (! code.code) code.code = 'UNEXPECTED';
        return code;
      }
    }

    if (typeof subject !== 'string') {
      message = code;
      code = 'UNEXPECTED';
      break;
    }

    if (typeof code === 'string') {
      message = code;
      code = subject;
      subject = undefined;
      break;
    }

    data = code;
    message = subject;
    code = 'UNEXPECTED';
    subject = undefined;

    break;
  case 3:
    if (typeof subject === 'string') {
      data = message;
      message = code;
      code = subject;
      subject = undefined;
      break;
    }

    if (typeof message === 'string') {
      break;
    }

    data = message;
    message = code;
    code = 'UNEXPECTED';
    break;
  }

  if (code === 'UNEXPECTED' && typeof message === 'string' && message.match(/^[A-Z_]+$/)) {
    code = message;
  }

  if (! typeof message === typeof code === 'string') {
    throw O.log.error('INVALID_ARGS');
  }

  var result = new Error(message);
  result.code = code;
  if (subject) {
    result.subject = subject;
    result.subjectDescr = this.subjectToString(subject);
  }
  result._data = data;

  return result;
};

exports.prototype.addClass = function(name, ctor) {  // {{{2
/**
 * Add a class constructor `ctor` into predefined `classes`.
 *
 * @param name {String} Class name
 * @param ctor {Function} Class constructor
 *
 * @method addClass
 */

  if (name in this.classes) {
    throw O.log.error(this, 'Class is already defined', name);
  }

  switch (typeof (ctor || undefined)) {
  case 'string':
    ctor = this.class(ctor);
    // NO break;
  case 'function':
    this.classes[name] = ctor;
    return;
  }

  throw O.log.error(this, 'INVALID_ARGS', arguments);
};

exports.prototype.callChain = function(obj, method) {  // {{{2
/**
 * Call all methods with name `method` in prototype chain of `obj`.
 *
 * @param obj {Object}
 * @param method {Function}
 *
 * @method callChain
 */

  return function() {
    var w = obj;
    while (w) {
      if (w.hasOwnProperty(method) && (typeof w[method] === 'function')) {
        w[method].apply(obj, arguments);
      }
      w = Object.getPrototypeOf(w);
    }
  }
};

exports.prototype.inherited = function(obj, method) {  // {{{2
/**
 * Return function that call `method` in `obj.prototype`
 *
 * @param obj {Object}
 * @param method {Function}
 *
 * @method inherited
 */

  var fn = this.super.prototype[method];

  if (! fn) return undefined;

  return function() {
    return fn.apply(obj, arguments);
  }
};

exports.prototype.extend = function(key, val) {  // {{{2
/**
 * Extend prototype for all wrappers, even those not yet created
 *
 * @param key {String} Property name
 * @param val {*} Property value
 *
 * @method extend
 */

  if (exports.prototype.hasOwnProperty(key)) {
    O.log.warn('Duplicit property name', key);
  }

  exports.prototype[key] = val;
};

exports.prototype.require = function(id) {  // {{{2
/**
 * Safe version of `require()`
 *
 * @param id {String} Module to be required
 *
 * @returns {Object} Module or `null` if module was not found
 *
 * @method require
 */

  var mod;
  try {
    mod = this.module.require(id);
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      throw err;
    }
  }

  return mod;
};

exports.prototype.requireExtend = function(id) {  // {{{2
/**
 * @requireExtend
 * @internal
 */

  switch (id) {
  case null:
  case undefined:
    return undefined;
  case 'runtime':
    return this.module.require('./' + this.runtime);
    break;
  case 'node':
  case 'browser':
    if (id !== this.runtime) {
      return undefined;
    }

    return this.module.require('./' + id);
  }

  return this.module.require(id);
};

exports.prototype.requireChain = function(id) {  // {{{2
/**
 * Try to require the first module found in the prototype chain
 * based on a relative path
 *
 * @param id {String} Relative module path
 *
 * @method requireChain
 */

  var w = this;

  while (w) {
    var res = w.require(id);
    if (res) {
      return res;
    }

    w = w.super && w.super.prototype.O;
  }

  var err = O.error(this, 'MODULE_NOT_FOUND', 'Module not found!', id);
  throw err;
};

exports.prototype.content = function(id) {  // {{{2
/**
 * Create package content
 *
 * @param id {String} Content module id
 *
 * @method content
 */

  if (this.runtime === 'browser') return;

  this.module.require(id);
};

exports.prototype.class = function(id) {  // {{{2
/**
 * Return constructor for given module
 *
 * @param id {String} Class module id
 *
 * @return {Function} Class constructor
 *
 * @method class
 */

  if (arguments.length === 0) {
    return this.ctor;
  }

//  console.log('WRAP CLASS', id);

  if (id in this.classes) {
    return this.classes[id];
  }

  var u = this.module.require(id);

  if (typeof u === 'function') {
    return u;
  }

  if (u.O && ('ctor' in u.O)) {
    return u.O.ctor;
  }

  throw O.log.error(this, 'Module is not a class', id);
};

exports.prototype.new = function(id) {  // {{{2
/**
 * Create new object based on class
 *
 * Supply class constructor arguments to the returned function
 *
 * @param id {String} Class module id
 *
 * @returns {Function} Function that calls the constructor
 *
 * @method new
 */

  if (arguments.length) {
    var c = this.class(id);
  } else {
    var c = this.ctor;
  }

  return function() {
    var a = arguments;
    var f = function() {
      c.apply(this, a);
    };
    f.prototype = c.prototype;

    return new f();
  };
};

exports.prototype.object = function(id) {  // {{{2
/**
 * Initialize new singleton based on a module
 *
 * Supply singleton initialization arguments to the returned function
 *
 * @param id {String} Class module id
 *
 * @returns {Function} Function that calls the initialization function
 *
 * @method object
 */

//  console.log('OSE SINGLETON', id);

  if (arguments.length === 0) {
    return this.init;
  }

  var u = id ? this.module.require(id) : this.module;

  if (u.O && ('init' in u.O)) {
    return u.O.init;
  }

  throw O.log.error(this, 'Module is not a singleton', id);
};

exports.prototype.isSuper = function(sup, desc) {  // {{{2
/**
 * Tests whether `desc` is descendant of `sup`. When called with one
 * argument, this argument is assigned to `desc`, and `sup` is
 * assigned to `this.ctor`
 *
 * @param sup {String|Object|Function} Super
 * @param desc {String|Object|Function} Descendant
 *
 * @return {Boolean} isSuper
 *
 * @method isSuper
 */

  if (arguments.length === 1) {
    desc = sup;
    sup = this.ctor;
  }

  if (! (sup && desc)) {
    throw O.log.error('INVALID_ARGS', arguments);
  }

  switch (typeof sup) {
  case 'string':
    sup = this.class(sup);
    break;
  /*
  case 'object':
    sup = sup.constructor;
    break;
  */
  case 'function':
    break;
  default:
    throw O.log.error('INVALID_ARGS', arguments);
  }

  switch (typeof desc) {
  case 'string':
    return this.class(desc).prototype instanceof sup;
  case 'object':
    return desc instanceof sup;
  case 'function':
    return desc.prototype instanceof sup;
  default:
    throw O.log.error('INVALID_ARGS', arguments);
  }
};

exports.prototype.toString = function() {  // {{{2
/**
 * Return short description
 *
 * @return {String} Description
 *
 * @method toString
 */

  return 'Wrap: ' + (this.module && this.module.id);
};

exports.prototype.subjectToString = function(subject) {  // {{{2
/**
 * Return subject description
 *
 * @param subject {*} Subject to be described
 *
 * @result {String} Short descrition
 *
 * @method subjectToString
 */

  switch (subject) {
  case null:
    return 'null at ' + this.module.filename;
  case undefined:
    return 'undefined at ' + this.module.filename;
  }

  var res = subject.toString();
  if (res === '[object Object]') return 'Object at ' + this.module.filename;
  return res + ' at ' + this.module.filename;
};

exports.prototype.prepend = function(extend) {  // {{{2
/**
 * Utility method for class and singleton mixing
 *
 * @param extend {String|Array} Extension to be mixed into wrapped class or singleton.
 *
 * @returns {Object} `this`
 *
 * @method prepend
 */

  xpend(this, 'prepends', extend);

  return this;
}

exports.prototype.append = function(extend) {  // {{{2
/**
 * Utility method for class and singleton mixing
 *
 * @param extend {String|Array} Extension to be mixed into wrapped class or singleton.
 *
 * @returns {Object} `this`
 *
 * @method append
 */

  xpend(this, 'appends', extend);

  return this;
};

exports.prototype.defineO = function() {  // {{{2
/**
 * @method defineO
 * @internal
 */

  if (! this.module.exports.hasOwnProperty('O')) {
    Object.defineProperty(this.module.exports, 'O', {
      value: this,
      configurable: false,
      enumerable: false,
      writeable: false,
    });
  }
};

exports.prototype.quit = function() {  // {{{2
/**
 * Gracefully close everything and terminate the process.
 *
 * @method quit
 */

  O.extend('quitting', true);

  for (var key in O.data.spaces) {
    O.data.spaces[key].remove();
  };

  O.exit && O.exit();
};

exports.prototype.random = function() {  // {{{2
/**
 * Generate eight-digit pseudorandom hexadecimal digit
 *
 * @returns {String}  Eight-digit pseudorandom hexadecimal digit
 */

  return (Math.floor(Math.random() * 0xF0000000) + 0x10000000).toString(16);
};

exports.prototype.nextTime = function() {  // {{{2
/**
 * Return current time in unix timestamp format in microseconds
 *
 * @return {Number} Current timestamp in microseconds
 *
 * @method getTime
 */

  var result = O.now();

  if (result > O.lastTime) {
    return O.lastTime = result;
  }

  return ++O.lastTime;
};

exports.prototype.parseBool = function(val) {  // {{{2
/**
 * Parses booleans
 *
 * @param val {undefined|null|String|Number|Boolean} Value to parse
 *
 * @return {Boolean}
 *
 * @method parseBool
 */

  switch (typeof val) {
  case 'null':
  case 'undefined':
    return false;
  case 'boolean':
    return val;
  case 'number':
    return Boolean(val);
  case 'string':
    switch (val.toLowerCase()) {
    case '':
    case '0':
    case 'n':
    case 'no':
    case 'off':
    case 'false':
      return false;
    case '1':
    case 'y':
    case 'yes':
    case 'on':
    case 'true':
      return true;
    }
    throw exports.error('INVALID_ARGS');
  case 'object':
    if (! val) return false;
    throw exports.error('INVALID_ARGS');
  }

  throw exports.error('INVALID_ARGS');
};

exports.prototype.consts = function(name) {  // {{{2
  if (name in Consts) return Consts[name];

  return Consts[name] = {};
};

exports.prototype.run = function(config) {  // {{{2
/**
 * Starts OSE instance
 *
 * @param config {Object} Configuration object
 *
 * @method run
 */

  require('./plugins').read(config || this.module.exports);
};

// Private {{{1
function getPropType(prop) {  // {{{2
/**
 * Return property descriptor type of "prop". (exports.pdType.data || exports.pdType.accessor || exports.pdType.object)
 */

  if ((prop === null) || Array.isArray(prop)) {
    return exports.pdType.object;
  }

  var result = exports.pdType.none;

  for (var key in prop) {
    switch (key) {  // Find if "prop" is property descriptor.
    case 'configurable':
    case 'enumerable':
      if (typeof prop[key] !== 'boolean') return exports.pdType.object;
      if (result === exports.pdType.none) result = exports.pdType.descriptor
      break;
    case 'placeholder':
      if ((result === exports.pdType.data) || (typeof prop[key] !== 'function')) return exports.pdType.object;
      result = exports.pdType.accessor;
      break;
    case 'get':
    case 'set':
      if ((result === exports.pdType.data) || (typeof prop[key] !== 'function')) return exports.pdType.object;
      result = exports.pdType.accessor;
      break;
    case 'writable':
      if (typeof prop[key] !== 'boolean') return exports.pdType.object;
      // Do not break, continue to next case.
    case 'value':
      if (result === exports.pdType.accessor) return exports.pdType.object;
      result = exports.pdType.data;
      break;
    default:  // "prop" is not property descriptor.
      return exports.pdType.object;
    }
  }

  if (result === exports.pdType.none) {
    return exports.pdType.object;  // Empty object is not property descriptor.
  }

  return result;
};

function extend2Proto(wrap, extend, proto, keep) {  // {{{2
  if (! extend) return;

  var def = {};

  extend2Def(wrap, extend, def);

  for (var key in def) {
    if ((key in proto) && keep) continue;

    Object.defineProperty(proto, key, def[key]);
  }
};

function extend2Def(wrap, extend, dst) {  // {{{2
  if (! extend) return;

//  console.log('EXTEND 2 DEF', extend);

  switch (typeof extend) {
  case 'function':
    extend(wrap, dst);
    return;
  case 'string':
    extend2Def(wrap, wrap.requireExtend(extend), dst);
    return;
  case 'object':
    if (Array.isArray(extend)) {
      for (var i = 0; i < extend.length; i++) {
        extend2Def(wrap, extend[i], dst);
      }
      return;
    }

    object2Def(extend, dst);
    return;
  }

  throw O.log.error('INVALID_ARGS', arguments);
};

function object2Def(src, dst) {  // {{{2
/**
 * Copy and convert property definitions from "src" class definition
 * to "dst" class definition.
 *
 * @param src {Object} Source object
 * @param dst {Object} Destination definition object
 *
 * @return {Object} `dst`
 *
 * @method object2Def
 * @private
 */

  if (! dst) dst = {};
  if (! src) return dst;

  Object.getOwnPropertyNames(src).forEach(function(key) {  // Enumerate all own properties of "src".
    var val = src[key];

    switch (typeof val) {
    case 'boolean':
    case 'number':
    case 'string':
    case 'null':
    case 'undefined':
      dst[key] = {
        configurable: false,
        enumerable: false,
        value: val,
        writable: true,
      };

      break;
    case 'function':  // {{{3
      dst[key] = {
        configurable: false,
        enumerable: false,
        value: val,
        writable: true,
      };

      break;
    case 'object':  // {{{3
      switch (getPropType(val)) {
      case exports.pdType.object:  // "val" is not property descriptor.
        dst[key] = {
          configurable: false,
          enumerable: false,
          value: val,
          writable: true,
        };

        break;
      case exports.pdType.data:  // "val" is data property descriptor.
        dst[key] = {
          configurable: val.configurable || false,
          enumerable: val.enumerable || false,
          value: val.value,
          writable: 'writable' in val ? val.writable : true,
        };

        break;
      case exports.pdType.accessor:  // "val" is accessor property descriptor.
        dst[key] = {
          configurable: val.configurable || false,
          enumerable: val.enumerable || false,
          get: val.get || undefined,
          set: val.set || undefined,
        };

        break;
      default:
        throw O.log.error('unknownPropertyDescriptorType', val);
      }

      break;
    default:  // {{{3
      throw O.log.error('unknownPropertyType', val);
    // }}}3
    }
  });

  return dst;
};

function newCtor(sup) {  // {{{2
  return function() {
    sup.apply(this, arguments);
  }
};

function getExports() {  // {{{2
  return this.module.exports;
};

function getInit() {  // {{{2
  if ('_init' in this) {
    throw O.log.error(this, 'Already initialized');
  }

  this._init = init;

  var e = this.module.exports;

  if (this.prepends) {
    extend2Proto(this, this.prepends, e, true);
    delete this.prepends;
  }

  if (this.module.loaded) {
    if (this.appends) {
      extend2Proto(this, this.appends, e);
      delete this.appends;
    }
  } else {
    this.timeout = setTimeout(finish.bind(this), 0);
  }

  var that = this;

  return this._init;

  function init() {  // {{{3
    that._init = done;
    if (that.timeout) {
      clearTimeout(that.timeout);
      finish();
    }

    var result;
    if (that.__init) {
      result = that.__init.apply(e, arguments);
    } else if (that.super) {
      result = that.super.apply(e, arguments);
    }

    if (result === undefined) {
      return e;
    }

    return result;
  }

  function done() {  // {{{3
    throw O.log.error(this, 'Already initialized');
  }

  function finish() {  // {{{3
    delete that.timeout;

    if (that.appends) {
      extend2Proto(that, that.appends, e);
      delete that.appends;
    }
  }

  // }}}3
};

function getType() {  // {{{2
  if (this.__ctor || this._ctor) return 'class';

  if (this.__init || this._init) return 'object';

  return 'module';
}

function getCtor() {  // {{{2
  var that = this;

  if ('_ctor' in this) {
    if (this.timeout) {  // Prototype creation was defered
      if (this.module.loaded) {  // Module is loaded
        clearTimeout(this.timeout);
        delete this.timeout;
        finish();
      }
    }

    return this._ctor;
  }

  if (! ('__ctor' in this)) {
    throw O.log.error(this, 'Wrap is not a class');
  }

  if (this.__ctor) {
    this._ctor = this.__ctor;
  } else {
    if (this.super) {
      this._ctor = newCtor(this.super);
    } else {
      this._ctor = new Function();
    }
  }

  delete this.__ctor;

  if (this.module.loaded) {
    finish();
  } else {
    if (this.timeout) {
      throw O.log.error(this, 'Timeout should be set up only once');
    }

    this.timeout = setTimeout(finish, 0);
  }

  return this._ctor;

  function finish() {  // {{{3
    var def = {};

    if (that.prepends) {
      extend2Def(that, that.prepends, def);
      delete that.prepends;
    }

    extend2Def(that, that.module.exports, def);
    if (that.appends) {
      extend2Def(that, that.appends, def);
      delete that.appends;
    }

    that._ctor.prototype = Object.create(
      (that.super || Object).prototype,
      def
    );
  }

  // }}}3
}

function getLog() {  // {{{2
  if (this._log) return this._log;

  return this._log = this.package.log;
}

function getPackage() {  // {{{2
  if (this.packageName) {
    throw O.log.error(this, 'Package is already specified');
  }

  if (this._package) {
    return this._package;
  }

  var name = this.module.filename.split('/');
  name.pop();
  while (name.length) {
//    console.log('GET PACKAGE', name);
    switch (name[name.length - 1]) {
    case '':
    case 'lib':
      break;
    default:
      var u = this.require(name.join('/'));

      if (u && u.O && u.O.packageName) {
        return this._package = u.O;
      }
    }

    name.pop();
  }

  return null;
}

function setPackage(val) {  // {{{2
  if (this.packageName || this._package) {
    throw O.log.error(this, 'Package is already specified');
  }

  this.packageName = val;
  this.defineO();

  this._log = O.new('Logger')(val);
}

function getThisPackage() {  // {{{2
  return this;
};

function xpend(that, key, extend) {  // {{{2
  if (('_ctor' in that) || ('_init' in that)) {
    throw O.log.error(that, 'alreadyCreated', extend);
  }

  switch (typeof (extend || undefined)) {
  case 'object':
    if (Array.isArray(extend)) {
      break;
    }
    // NO BREAK
  case 'function':
  case 'string':
    extend = [extend];
    break;
  default:
    throw O.log.error(that, 'INVALID_ARGS', arguments);
  }

  if (key in that) {
    that[key] = union(that[key], extend);
  } else {
    that[key] = extend;
  }
};

