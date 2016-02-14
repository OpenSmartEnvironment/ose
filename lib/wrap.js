'use strict';

/** Doc {{{1
 * @caption Module wrapper
 *
 * @readme
 * This component is the core of the framework based on the
 * CommonJS Modules spec.
 *
 * Before you can start using the framework's methods and properties from some module,
 * it is necessary to wrap the module:<br>
 * `const O = require("ose")(module);`
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
 *   `const O = require("ose")(module);`
 * - class definition:<br>
 *   `const O = require("ose")(module).class(constructor, "super_module_path");`
 * - singleton definition:<br>
 *   `const O = require("ose")(module).singleton(init_method, "super_module_path");`
 *
 * **IMPORTANT:**<br>
 * Each time a module is wrapped using `require("ose")(module).class();` or `require("ose")(module).singleton();`, the wrapper adds the `O` property
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
 * `O.extendO("property_name", property_value)`. Calling this method
 * adds the supplied property to the prototype of module wrapper (`const O = require('ose')...`
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
 *   `const O = require("ose")(module).class(constructor_method, "super_module_path");`
 * - chainable mixing modules into class prototypes:<br>
 *   `const O = require("ose")(module).class().prepend("module_path").append("another_module_path");`
 * - runtime-specific behaviour with simple code sharing between
     Node.js and the browser:<br>
 *   `O.prepend("browser")`, `O.append("runtime");`
 * - definition class prototype properties using `exports` variable:<br>
 *   `exports.config = function(...) { ... };`
 * - calling methods of superclass:<br>
 *   `O.inherited(this, "method")(args ...);`
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
 * class definition by calling, for example, `const O =
 * require("ose")(module).class(init, super)`. The
 * `init` parameter is an optional class initialization method. The `super` parameter
 * defines a superclass. The `super` parameter can be `undefined`, a
 * class constructor or a path to the module containing class definition.
 *
 * Example module with class preparation:
 *
 *     // Module "ose/lib/entry"
 *     "use strict";
 *
 *     // Wrap a module to be used as a class inheriting `EventEmitter` with an `init` method.
 *     const O = require("ose")(module).class(init, "EventEmitter");
 *
 *     // Class constructor
 *     function init(...) {
 *       // Call super constructor
 *       O.inherited(this)();
 *       ...
 *     }
 *
 *     // Add properties of the class prototype to the `exports` object:
 *     exports.config = function(name, data) {
 *       ...
 *     };
 *
 *     // Define another property
 *     exports.getIdent = function() {
 *       return ...
 *     };
 *
 * The second step is to obtain a class constructor with its
 * prototype. This step is carried out when the class is first
 * accessed by calling `O.getClass("ose/lib/entry")`. Multiple calls to
 * `O.getClass("ose/lib/entry")` return the same, already created
 * class. When called for the first time, the class prototype is
 * created from module exports and optional mixins. If the class has
 * an ancestor, the constructor should usually call the super
 * constructor (see example above).
 *
 * The last step is to create a new object based on the class.
 *
 * Class usage example:
 *
 *     // Some other module ...
 *     "use strict";
 *     const O = require("ose")(module);
 *
 *     // Obtain class constructor (second step).
 *     var Entry = O.getClass("ose/lib/entry");
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
 *     const O = require("ose")(module);
 *
 *     ...
 *
 *     // Create a new Entry instance object (second and third step together).
 *     entry = O.new("ose/lib/entry")(shard, id);
 *
 *
 * The **EventEmitter** class is built in. To use this
 * class, pass `"EventEmitter"` to the `class()` method (see the
 * examples above).
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
 *     const O = require("ose")(module).class(C, "EventEmitter");
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
 *     const O = require("ose")(module).singleton(I, "EventEmitter");
 *
 *     // Initialize of the singleton
 *     exports = O.init();
 *
 *     // Singleton initialization function
 *     function I() {
 *       // Call super constructor
 *       O.inherited(this)();
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
 *     const O = require("ose")(module).singleton(I, "EventEmitter");
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
 *     const O = require("ose")(module);
 *
 *     ...
 *
 *     var result = require("ose/lib/peer/list").O.init(arg);
 *
 *     ...
 *
 * To access or extend any initialized singleton, standard `require` can be used:
 *
 *     // Module changing singleton.
 *     "use strict";
 *
 *     // Require OSE.
 *     const O = require("ose")(module);
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
module.exports = exports = function(mod) {  // {{{2
/**
 * Module wrapper constructor
 *
 * @param mod {Object} Module to be wrapped
 *
 * @method constructor
 */

  if (! mod || typeof mod.id !== 'string') {
    throw O.log.error(this, 'INVALID_ARGS', 'module', mod);
  }

  this.module = mod;
};

exports.PD_TYPE = {  // {{{2
/**
 * [Property descriptor]
 * (https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/defineProperty)
 * types enumeration.
 *
 * @property PD_TYPE
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
  exports.prototype.runtime = runtime;
};

// Prototype {{{1
exports.prototype = Object.create(Object.prototype, object2Def({  // {{{2
  prototype: {get: getPrototype},
  /**
   * Class prototype
   *
   * @property prototype
   * @type Object
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

exports.prototype.translate = function(val) {  // {{{2
/**
 * @todo
 */

  return O._s.capitalize(O._s.underscored(val).replace('_', ' '));
};

exports.prototype.date2UTCString = function(val) {  // {{{2
/**
 * @todo
 */

  if (! val) {
    val = new Date();
  } else if (! (val instanceof Date)) {
    val = new Date(val);
  }

  return val.getUTCFullYear().toString() + '-' +
    str(val.getUTCMonth() + 1) + '-' +
    str(val.getUTCDate()) + '--' +
    str(val.getUTCHours()) + '-' +
    str(val.getUTCMinutes()) + '-' +
    str(val.getUTCSeconds()) + '--' +
    ('00' + val.getUTCMilliseconds()).substr(-3)
  ;

  function str(val) {
    if (val < 10) {
      return '0' + val;
    }

    return val.toString();
  }
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
 * Return typeof val. For null it returns `"null"` and for arrays it returns `"array"`.
 *
 * @param [val] {*}
 *
 * @method typeof
 */

  var res = typeof val;

  if (res === 'object') {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
  }

  return res;
};

exports.prototype.applyError = function(subject, args) {  // {{{2
/**
 * Create and return new error object
 *
 * @param subject {Object} Subject of error
 * @param args {Object} Error properties
 *
 * @return {Object} New error object
 *
 * @method applyError
 */

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
 *
 * @returns {Object} Newly created error
 *
 * @method error
 */

  switch (arguments.length) {
  case 1:
    message = subject;
    code = 'UNEXPECTED';
    subject = undefined;
    break;
  case 2:
    if (typeof subject === 'object' && (subject.O instanceof O.exports)) {
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
 * Register a class among predefined `classes`.
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
    ctor = require(ctor);
    if (typeof ctor !== 'function') {
      break;
    }
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

exports.prototype.extendO = function(key, val, noWarn) {  // {{{2
/**
 * Extend prototype for all wrappers, even those not yet created (the `O` variable)
 *
 * @param key {String} Property name
 * @param val {*} Property value
 *
 * @method extendO
 */

  if (! noWarn && exports.prototype.hasOwnProperty(key)) {
    O.log.warn('Duplicit property name', key);
  }

  exports.prototype[key] = val;
};

exports.prototype.require = function(id) {  // {{{2
/**
 * Safe version of `module.require()`
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
 * @returns {Object} Module found or `undefined`
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

exports.prototype.new = function(id) {  // {{{2
/**
 * Create new object based on a class
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
    var c = this.getClass(id);
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
    sup = this.getClass(sup);
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
    return this.getClass(desc).prototype instanceof sup;
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
 * Return a short description
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
 * @param extend {String|Array|Object} Extension to be mixed into wrapped class or singleton.
 *
 * @method prepend
 * @chainable
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
 * @method append
 * @chainable
 */

  xpend(this, 'appends', extend);

  return this;
};

exports.prototype.quit = function() {  // {{{2
/**
 * Gracefully close everything and terminate the process.
 *
 * @method quit
 */

  O.extendO('quitting', true);

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
 *
 * @method random
 */

  return (Math.floor(Math.random() * 0xF0000000) + 0x10000000).toString(16);
};

exports.prototype.nextTime = function() {  // {{{2
/**
 * Return current time in unix timestamp format in microseconds
 *
 * @return {Number} Current timestamp in microseconds
 *
 * @method nextTime
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
/**
 * Return or create an object containing constants
 *
 * @param name {string} Name of object containing constants
 *
 * @returns {Object} Global object containing constants
 *
 * @method consts
 */

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

exports.prototype.inherited = function(obj, method) {  // {{{2
/**
 * Return a function that call the `method` in `obj.prototype`
 *
 * @param obj {Object} Class instance
 * @param [method] {String} Method name. When no method is specified, the default initialization method or constructor is used.
 *
 * @method inherited
 */

  var fn;
  switch (arguments.length) {
  case 1:
    if (! this.super) return undefined;
    if (! this.super.O) {
      fn = this.super;
      break;
    }
    if (this.super.O._init) {
      fn = this.super.O._init;
      break;
    }
    return this.super.O.inherited(obj);
  case 2:
    fn = this.super.prototype[method];

    break;
  default:
    throw O.log.error(obj, 'INVALID_ARGS', arguments);
  }

  if (typeof fn !== 'function') return undefined;

  return function() {
    return fn.apply(obj, arguments);
  }
};

exports.prototype.isModule = function() {  // {{{2
/**
 * Tell whether an wrapper is a module
 *
 * @returns {Boolean}
 *
 * @method isModule
 */

  return ! (this.isClass() || this.isSingleton());
};

exports.prototype.isClass = function() {  // {{{2
/**
 * Tell whether an wrapper is a class
 *
 * @returns {Boolean}
 *
 * @method isClass
 */

  return this.hasOwnProperty('prototype') ||
    this.module.exports &&
    typeof this.module.exports === 'function' &&
    this.module.exports.prototype &&
    this.module.exports.prototype.O === this
  ;
};

exports.prototype.isSingleton = function() {  // {{{2
/**
 * Tell whether an wrapper is a singleton
 *
 * @returns {Boolean}
 *
 * @method isSingleton
 */

  return this.hasOwnProperty('singleton') ||
    this.module.exports &&
    typeof this.module.exports === 'object' &&
    this.module.exports.O === this
  ;
};

exports.prototype.getClass = function(name) {  // {{{2
/**
 * Return class constructor
 *
 * @param name {String} Name of class
 *
 * @returns {Function} Class constructor
 *
 * @method getClass
 */

  if (typeof name !== 'string') {
    throw O.log.error(this, 'INVALID_ARGS', 'Module is not a class', name);
  }

  if (name in this.classes) {
    return this.classes[name];
  }

  const u = this.module.require(name);
  if (typeof u === 'function' && (! u.O || u.O.isClass())) {
    return u;
  }

  throw O.log.error(this, 'Module is not a class', name);
}

exports.prototype.class = function(init, superClass) {  // {{{2
/**
 * Specify that the current module is a class definition
 *
 * @param [init] {Function} Initialization method
 * @param [superClass] {Function|String} Super class constructor or name or path to class module
 *
 * @method class
 * @chainable
 */

  if (this.hasOwnProperty('prototype')) {
    throw O.log.error(this, 'Can\'t setup module as a class');
  }

  Object.defineProperty(this, 'prototype', {value: this.module.exports, configurable: true});
  this.module.exports = prepareConstructor(this);
  defineO(this);

  inherits(this, init, superClass);

  this.module.exports.prototype = Object.create((this.super || Object).prototype);
  defineO(this, this.module.exports.prototype);

  return this;
};

exports.prototype.singleton = function(init, superClass) {  // {{{2
/**
 * Specify that the current module is a singleton definition
 *
 * @param [init] {Function} Initialization method
 * @param [superClass] {Function|String} Super class constructor or name or path to class module
 *
 * @method singleton
 * @chainable
 */

  this.singleton = true;

  inherits(this, init, superClass);

  this.module.exports = Object.create((this.super || Object).prototype);
  defineO(this);

  return this;
};

exports.prototype.isInitialized = function() {  // {{{2
/**
 * Determine whether a singleton has been initialized
 *
 * @returns {Boolean}
 *
 * @method isInitialized
 */

  if (this.hasOwnProperty('singleton')) return false;

  if (! this.isSingleton()) {
    throw O.log.error(this, 'Module is not a singleton')
  }

  return true;
};

exports.prototype.init = function() {  // {{{2
/**
 * Initialize current singleton
 *
 * @returns {Object} Singleton object
 *
 * @method init
 */

  if (this.isInitialized()) {
    throw O.log.error(this, 'Init on singleton was alread called');
  }
  delete this.singleton;

  if (this.prepends) {
    useExtend(this, this.prepends, this.module.exports, true);
    delete this.prepends;
  }

  if (this.appends) {
    useExtend(this, this.appends, this.module.exports);
    delete this.appends;
  }

  callInit(this, this.module.exports, arguments);

  return this.module.exports;
};

exports.prototype.setPackage = function(name) {  // {{{2
/**
 * Specify that the current module is a main package module
 *
 * @param name {String} Package name
 *
 * @method setPackage
 * @chainable
 */

  if (this.packageName) {
    throw O.log.error(this, 'Package is already specified');
  }

  this.packageName = name;
  defineO(this);

  this._log = O.new('Logger')(name);

  return this;
};

exports.prototype.checkCb = function(cb, subject) {  // {{{2
  if (cb) {
    if (typeof cb !== 'function') {
      throw O.log.error('INVALID_ARGS', arguments);
    }

    return cb;
  }

  return (function(err) {
    if (! err) return;

    if (subject) {
      err.logged = {subject: subject};
    }

    this.log.error(err);

    return;
  }).bind(this);
};

// Private {{{1
const O = new exports(module);  // This module wrapper
defineO(O);
defineO(O, O.exports);

const Consts = {};  // All contants

function getPropType(prop) {  // {{{2
/**
 * Return property descriptor type of "prop". (exports.PD_TYPE.data || exports.PD_TYPE.accessor || exports.PD_TYPE.object)
 */

  if ((prop === null) || Array.isArray(prop)) {
    return exports.PD_TYPE.object;
  }

  var result = exports.PD_TYPE.none;

  for (var key in prop) {
    switch (key) {  // Find if "prop" is property descriptor.
    case 'configurable':
    case 'enumerable':
      if (typeof prop[key] !== 'boolean') return exports.PD_TYPE.object;
      if (result === exports.PD_TYPE.none) result = exports.PD_TYPE.descriptor
      break;
    case 'placeholder':
      if ((result === exports.PD_TYPE.data) || (typeof prop[key] !== 'function')) return exports.PD_TYPE.object;
      result = exports.PD_TYPE.accessor;
      break;
    case 'get':
    case 'set':
      if ((result === exports.PD_TYPE.data) || (typeof prop[key] !== 'function')) return exports.PD_TYPE.object;
      result = exports.PD_TYPE.accessor;
      break;
    case 'writable':
      if (typeof prop[key] !== 'boolean') return exports.PD_TYPE.object;
      // Do not break, continue to next case.
    case 'value':
      if (result === exports.PD_TYPE.accessor) return exports.PD_TYPE.object;
      result = exports.PD_TYPE.data;
      break;
    default:  // "prop" is not property descriptor.
      return exports.PD_TYPE.object;
    }
  }

  if (result === exports.PD_TYPE.none) {
    return exports.PD_TYPE.object;  // Empty object is not property descriptor.
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
      case exports.PD_TYPE.object:  // "val" is not property descriptor.
        dst[key] = {
          configurable: false,
          enumerable: false,
          value: val,
          writable: true,
        };

        break;
      case exports.PD_TYPE.data:  // "val" is data property descriptor.
        dst[key] = {
          configurable: val.configurable || false,
          enumerable: val.enumerable || false,
          value: val.value,
          writable: 'writable' in val ? val.writable : true,
        };

        break;
      case exports.PD_TYPE.accessor:  // "val" is accessor property descriptor.
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

function getExports() {  // {{{2
  return this.module.exports;
};

function getPrototype() {  // {{{2
  return this.module.exports.prototype;
};

function getCtor() {  // {{{2
  var that = this;

  if ('_ctor' in this) {
    if (this._finish && this.module.loaded) this._finish();

    return this._ctor;
  }

  if (! ('__ctor' in this)) {
    throw O.log.error(this, 'Wrap is not a class');
  }

  this._finish = finish.bind(this);

  if (this.__ctor) {
    this._ctor = this.__ctor;
  } else {
    if (this.super) {
      this._ctor = newConstructor(this.super);
    } else {
      this._ctor = new Function();
    }
  }

  delete this.__ctor;

  if (this.module.loaded) {
    this._finish();
  } else {
    O.async.nextTick(this._finish);
  }

  return this._ctor;

  function finish() {  // {{{3
    if (! this._finish) return;
    delete this._finish;

    var def = {};

    if (this.prepends) {
      extend2Def(this, this.prepends, def);
      delete this.prepends;
    }

    extend2Def(this, this.module.exports, def);
    if (this.appends) {
      extend2Def(this, this.appends, def);
      delete this.appends;
    }

    this._ctor.prototype = Object.create(
      (this.super || Object).prototype,
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

  const name = this.module.filename.split('/');
  name.pop();
  while (name.length) {
    switch (name[name.length - 1]) {
    case '':
//    case 'lib':
      break;
    default:
      var u = this.require(name.join('/'));
      if (u && u.O && u.O.packageName) {
        return u.O;
      }
    }

    name.pop();
  }

  return null;
}

function getThisPackage() {  // {{{2
  return this;
};

function xpend(that, key, extend) {  // {{{2
  if (that.isClass()) {
    if (! that.hasOwnProperty('prototype')) {
      throw O.log.error(that, 'Class was already created', extend);
    }
  } else if (that.isSingleton()) {
    if (that.isInitialized()) {
      throw O.log.error(that, 'Singleton was already created', extend);
    }
  } else {
    throw O.log.error(that, 'Can\'t extend ordinary module');
  }

  switch (O.typeof(extend)) {
  case 'null':
  case 'undefined':
    return;
  case 'array':
    if (key in that) {
      that[key] = union(that[key], extend);
      return;
    }

    that[key] = extend;
    return;
  case 'object':
  case 'function':
  case 'string':
    if (key in that) {
      that[key].push(extend);
      return;
    }

    that[key] = [extend];
    return;
  }

  throw O.log.error(that, 'INVALID_ARGS', arguments);
};

function newConstructor(sup) {  // {{{2
  return function() {
    sup.apply(this, arguments);
  };
};

function useExtend(wrap, extend, dst, keep) {  // {{{2
  switch (exports.prototype.typeof(extend)) {
  case 'null':
  case 'undefined':
    return;
  case 'string':
    useExtend(wrap, wrap.requireExtend(extend), dst, keep);
    return;
  case 'object':
    useExtendObject(extend, dst, keep);
    return;
  case 'array':
    for (var i = 0; i < extend.length; i++) {
      useExtend(wrap, extend[i], dst, keep);
    }
    return;
  case 'function':
    if (extend.O instanceof O.exports) {
      if (! extend.O.module.loaded) {
        throw O.log.error(extend.O, 'Module is not yet loaded');
      }
      if (extend.O.isClass()) {
        useExtend(wrap, extend.O.prototype, dst, keep);
        return;
      }
    }
    extend(wrap, dst, keep);
    return;
  }

  throw O.log.error('INVALID_ARGS', arguments);
};

function useExtendObject(src, dst, keep) {  // {{{2
  Object.getOwnPropertyNames(src).forEach(function(key) {  // Enumerate all own properties of "src".
    if (keep && key in dst) return;
    if (key === 'O') return;

    const val = src[key];

    switch (typeof val) {
    case 'boolean':
    case 'number':
    case 'string':
    case 'undefined':
    case 'function':
      break;
    case 'object':
      switch (getPropType(val)) {
      case exports.PD_TYPE.object:  // "val" is not property descriptor.
        break;
      case exports.PD_TYPE.data:  // "val" is data property descriptor.
        Object.defineProperty(dst, key, {
          configurable: val.configurable || false,
          enumerable: val.enumerable || false,
          value: val.value,
          writable: 'writable' in val ? val.writable : true,
        });
        return;
      case exports.PD_TYPE.accessor:  // "val" is accessor property descriptor.
        Object.defineProperty(dst, key, {
          configurable: val.configurable || false,
          enumerable: val.enumerable || false,
          get: val.get || undefined,
          set: val.set || undefined,
        });
        return;
      default:
        throw O.log.error('Unknown property descriptor type', val);
      }

      break;
    default:
      throw O.log.error('Unknown property type', val);
    }

    Object.defineProperty(dst, key, {
      configurable: false,
      enumerable: false,
      value: val,
      writable: true,
    });

    return;
  });

  return dst;
};

function prepareConstructor(that) {  // {{{2
  return function() {
    if (this instanceof that.module.exports) {
      callInit(that, this, arguments);
      return;
    } else {
      const res = new that.module.exports;
      callInit(that, res, arguments);
      return res;
    }
  };
}

function callInit(that, obj, args) {  // {{{2
  if (that.hasOwnProperty('prototype')) {
    preparePrototype(that);
  }

  if (that._init) {
    that._init.apply(obj, args);
    return;
  }

  if (! that.super) return;
  if (! that.super.O) {
    that.super.apply(obj, args);
    return;
  }

  callInit(that.super.O, obj, args);
  return;
}

function preparePrototype(that) {  // {{{2
  if (! that.module.loaded) {
    throw O.log.error(that, 'Class module loading is not yet finished!');
  }

  if (that.prepends) {
    useExtend(that, that.prepends, that.module.exports.prototype, true);
    delete that.prepends;
  }

  useExtend(that, that.prototype, that.module.exports.prototype);
  delete that.prototype;

  if (that.appends) {
    useExtend(that, that.appends, that.module.exports.prototype);
    delete that.appends;
  }

  // Call prepare prototype for super class
  if (
    that.super &&
    that.super.O instanceof O.exports &&
    that.super.O.hasOwnProperty('prototype')
  ) {
    preparePrototype(that.super.O);
  }
}

function defineO(that, obj) {  // {{{2
  if (! obj) obj = that.module.exports;

  if (! obj.hasOwnProperty('O')) {
    Object.defineProperty(obj, 'O', {
      value: that,
      configurable: false,
      enumerable: false,
      writeable: false,
    });
  }
}

function inherits(that, init, superClass) {  // Setup `O._init` and `O.super` {{{2
  if (that.module.loaded || that.appends || that.prepends) {
    throw O.log.error(that, 'Setup wrapper type must be the first thing in the module');
  }

  switch (typeof (init || undefined)) {
  case 'undefined':
    break;
  case 'string':
    if (superClass) {
      throw O.log.error(that, 'INVALID_ARGS', 'init', init);
    }

    superClass = init;
    init = undefined;
    break;
  case 'function':
    if (! that._.isEmpty(init.prototype)) {
      O.log.warn(that, 'INVALID_ARGS', 'There is something defined on `init.prototype`, but `init` should be ordinary function', init);
    }
    that._init = init;
    break;
  default:
    throw O.log.error(that, 'INVALID_ARGS', 'init', init);
  }

  switch (typeof (superClass || undefined)) {
  case 'undefined':
    break;
  case 'function':
    that.super = superClass;
    break;
  case 'string':
    that.super = that.getClass(superClass);

    if (! that.super) {
      delete that.super;
      break;
    }

    if (typeof that.super === 'function') {
      break;
    }

    delete that.super;
    // NO BREAK
  default:
    throw O.log.error(that, 'INVALID_ARGS', 'super', superClass);
  }
};
