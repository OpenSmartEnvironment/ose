'use strict';

var O;  // This module wrapper; defined during `setup()`

/** Doc {{{1
 * @caption Classes and singletons
 * @readme
 *
 * This component facilitates the usage of classes or singletons with
 * simple code sharing and runtime specific behaviour by the browser
 * and Node.js environments. This makes it possible to use
 * prototypal inheritance to create classes and singletons and to mix
 * in modules into class prototypes and singletons.
 *
 *
 * @description
 * ## Module wrapping
 *
 * The creation of classes and singletons is based on the CommonJS
 * Modules spec. Each class or singleton is defined within its own
 * module.
 *
 * To create a class or singleton, you first need to wrap the module
 * containing the class or singleton definition by calling one of the
 * following:
 *
 * - `O.class(module)`.
 * - `O.singleton(module)`.
 * - `O.package(module)`.
 * - `O.module(module)`.
 *
 * Example:
 *
 *     // Module containing class definiton.
 *     'use strict';
 *
 *     // Require OSE.
 *     var O = require('ose');
 *     // Create and return wrap instance
 *     var O = O.class(module);
 *     ...
 *
 * The `O` variable gives access to global OSE functionalities.  The
 * `O` variable contains the module wrapper and gives access to
 * functionalities relative to the module.
 *
 * **IMPORTANT:**<br />
 * Each time a module is wrapped using `O.class`, `O.singleton` or
 * `O.package` (ie. not `O.module`), the wrapper adds the `O`
 * property to `module.exports`. It is not allowed to overwrite this
 * property. The `O` property is read-only and non-configurable. It is
 * better not to overload this property.
 *
 * ## Classes
 *
 * A class is a function used as a class constructor with a prototype.
 *
 * To use a class, you need to carry out three steps:
 * 1. Prepare a module containing a class definition.
 * 2. Obtain a class constructor.
 * 3. Create a new object.
 *
 * First, the class needs to be prepared in the module containing the
 * class definition by calling `O.class(module, constructor,
 * super)`. The `constructor` is an optional class constructor
 * method. If it is not defined, it gets created automatically. The
 * `super` parameter can be `undefined`, a class constructor or a
 * class name. It is not possible to inherit from singletons.
 *
 * Example module with class preparation::
 *
 *     // Module "ose/lib/entry"
 *     'use strict';
 *
 *     // Require OSE
 *     var O = require('ose');
 *
 *     // Wrap module and specifies a class with a constructor
 *     // function `C` and "EventEmitter" as a super-class.
 *     var O = O.class(module, C, 'EventEmitter');
 *
 *     // Class constructor
 *     function C(...) {
 *       // Call super constructor
 *       O.super.call(this);
 *       ...
 *     }
 *
 *     // Add properties of the class' prototype to the `exports`
 *     // object:
 *
 *     // Define property.
 *     exports.config = function(name, data) {
 *       ...
 *     };
 *
 *     // Define another property
 *     exports.identify = function() {
 *       return {
 *         id: this.id
 *         sid: this.shard.sid,
 *         space: this.shard.space.name,
 *       };
 *     };
 *
 *
 * The second step is to obtain a class constructor with its
 * prototype. This step is carried out when the class is first
 * accessed by calling `O.class('ose/lib/entry')`. Multiple calls to
 * `O.class('ose/lib/entry')` return the same, already created
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
 *     'use strict';
 *
 *     // Require OSE
 *     var O = require('ose');
 *     // Wrap module
 *     var O = O.module(module);
 *
 *     // Obtain class constructor (second step).
 *     var Entry = O.class('ose/lib/entry');
 *
 *     ...
 *
 *     // Create new object as an Entry instance (third step).
 *     entry = new Entry(shard, kind);
 *
 *     ...
 *
 * There is a built-in class named **EventEmitter**. To use this
 * class, pass `'EventEmitter'` to the `class()` method (see the
 * examples above).
 *
 * To access the `module.exports` object that is wrapped and prepared
 * as a class, call the standard `require('ose/lib/entry')`
 * method. This call returns the original `module.exports` object.
 *
 * To extend any class, use the following example:
 *
 *     // Require OSE
 *     var O = require('ose');
 *     // Wrap module
 *     var O = O.module(module);
 *
 *     // Obtain Entry class
 *     var Entry = O.class('ose/lib/entry');
 *
 *     // Add new method to entry class prototype
 *     Entry.prototype.newMethod = function() {...};
 *
 * Changing the prototype of a class alters all its instances and
 * descendants, even those already created.
 *
 * ## Singletons
 *
 * Each singleton is an object. There are two types of singletons. The
 * first initializes itself, and the second is initialized outside the
 * singleton definition.
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
 *     // Require OSE
 *     var O = require('ose');
 *     // Wrap module as a singleton
 *     var O = O.singleton(module, I, 'EventEmitter');
 *     // Initialization of the singleton
 *     exports = O.init();
 *
 *     // Singleton initialization
 *     function I() {
 *       // Call super constructor
 *       O.super.call(this);
 *       ...
 *     }
 *
 *     // Properties of the singleton are defined in the `exports` variable:
 *
 *     exports.identify = function() {
 *       return {
 *         id: this.id
 *       };
 *     };
 *
 *     exports.getId = function() {
 *       return id;
 *     };
 *
 *     ...
 *
 * Example module without singleton self-initialization:
 *
 *     // Require OSE
 *     var O = require('ose');
 *     // Wrap module as a singleton
 *     var O = O.singleton(module, I, 'EventEmitter');
 *     // Initialization of the singleton
 *     exports = O.exports;
 *     ...
 *
 * Example module with separate singleton initialization:
 *
 *     // Some other module ...
 *     'use strict';
 *
 *     // Require OSE
 *     var O = require('ose');
 *     // Wrap module
 *     var O = O.module(module);
 *
 *     ...
 *
 *     // Obtain singleton initialization (second step)
 *     var init = O.singleton('ose/lib/peer/list');
 *
 *     // Initialize and obtain singleton (third step)
 *     var result = init(arg);
 *
 *     // Or the second and third step together without the init
 *     // variable:
 *     var result = O.singleton('ose/lib/peer/list')(arg);
 *
 *     ...
 *
 * To access or extend any initialized singleton, use standard `require`:
 *
 *     // Module changing singleton.
 *     'use strict';
 *
 *     // Require OSE.
 *     var O = require('ose');
 *
 *     // Obtain singleton.
 *     var result = require('ose/lib/id');
 *
 *     // Add new method to the singleton.
 *     result.newMethod = function() {...};
 *
 * The singleton can be changed before it is initialized. If this is
 * done, it is possible that the change will be overwritten by mixing
 * other modules during singleton initialization.
 *
 *
 * ## Mixins
 *
 * It is possible to mix another module into a class prototype or
 * singleton. To do that, use the `append()` or `prepend()` methods of
 * the `wrap` object.
 *
 * Example:
 *
 *     // Some module
 *     'use strict';
 *     // Require OSE
 *     var O = require('ose');
 *
 *     // Wrap module
 *     var O = O.class(module, C, 'EventEmitter');
 *
 *     // Prepend a module
 *     O.prepend('someModuleName')
 *     // Append a module depending on the runtime.
 *     O.append('runtime')
 *
 * The `append()` or `prepend()` methods supports call chaining. Both
 * methods accept a module name or array of module names. Properties
 * to a class prototype or singleton are mixed in the second step of
 * class or singleton creation. Conflicting properties are overwritten
 * in the following order: Last prepended, prepended, module.exports,
 * first appended, appended.
 *
 * It is possible to use the following predefined values as module names:
 * * 'browser' – If in a browser environment, use the `browser.js`
 *    module from the same directory.
 * * 'node' – If in a Node.js environment, use the `node.js`
 *    module from the same directory.
 * * 'runtime' – Use either the `browser.js` or `node.js` module
 *    depending on the environment.
 *
 * It is possible to use relative paths as module names.
 *
 * ## Relative paths
 * TODO
 *
 * A class or singleton is identified by its module
 * (e.g. `ose/lib/entry`).
 *
 * @aliases class classes singleton singletons eventEmitter super
 *
 * @module ose
 * @submodule ose.wrap
 * @main ose.wrap
 */

// Public {{{1
// TODO document all methods and properties

module.exports = exports = function(mod, type) {  // {{{2
  if (! mod || typeof mod.id !== 'string') {
    throw O.error(mod, 'Invalid module');
  }

  this.module = mod;
  this.type = type;
};

exports.pdType = {  // {{{2
/**
 * [Property descriptor]
 * (https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/defineProperty)
 * types enumeration.
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
 * @method setup
 */

  exports.prototype.runtime = runtime;

  var ose = require('ose');
  ose.setupO();
  O = ose.module(module);

  O.addClass('EventEmitter', require('events').EventEmitter);
  O.addClass('Counter', './counter');
  O.addClass('Deps', './deps');
  O.addClass('Logger', './logger');
  O.addClass('Scope', './scope');
};

exports.prototype = Object.create(Object.prototype, object2Def({  // {{{2
  consts: {get: getConsts},
  ctor: {get: getCtor},
  init: {get: getInit},
  exports: {get: getExports},
  log: {get: getLog},
  package: {
    get: getPackage,
    set: setPackage,
  },
  scope: {
    get: getScope,
    set: setScope,
  },
}));

exports.prototype.lastTime = 0;  // {{{2

exports.prototype._ = require('underscore');  // {{{2

exports.prototype._s = require('underscore.string');  // {{{2

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

exports.prototype.scopes = {};  // {{{2
/**
 * List of all scopes
 *
 * @property scopes
 * @type Object
 * @internal
 */

exports.prototype.classes = {};  // {{{2
/**
 * Predefined class names and constructors
 *
 * @property classes
 * @type Object
 * @internal
 */

exports.prototype.error = function(subject, code, message, data) {  // {{{2
/**
 * Creates `Error` instance and appends a subject and data to it.
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

  var result = new Error(message);
  result.code = code;
  if (subject) {
    result.subject = subject;
  }
  result.data = data;

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
    throw O.error(this, 'Class is already defined', name);
  }

  switch (typeof (ctor || undefined)) {
  case 'string':
    ctor = this.class(ctor);
    // NO break;
  case 'function':
    this.classes[name] = ctor;
    return;
  }

  O.error(this, 'Invalid arguments', arguments);
};

exports.prototype.callChain = function(obj, method/*, args*/) {  // {{{2
/**
 * Call all methods with name `method` in prototype chain of `obj`.
 *
 * `method` is called with `args` specified after argument `method`.
 *
 * @param obj {Object}
 * @param method {Function}
 * @param [arg]* {*} Optional arguments to send to obj's init function.
 *
 * @method callChain
 */

  var args;
  if (arguments.length > 2) {
    args = this._.rest(arguments, 2);
  }

  var w = obj;
  while (w) {
    if (w.hasOwnProperty(method) && (typeof w[method] === 'function')) {
//      console.log('CALL CHAIN', method, w.O && w.O.module.id);

      w[method].apply(obj, args);
    }
    w = Object.getPrototypeOf(w);
  }
};

exports.prototype.extend = function(key, val) {
  if (Object.hasOwnProperty(exports.prototype, key)) {
    throw O.error(this, 'Duplicit property name', key);
  }

  exports.prototype[key] = val;
};

exports.prototype.inherited = function(obj, method/*, args*/) {  // {{{2
/**
 * Call super.protope[method] with `args`
 *
 * @param obj {Object}
 * @param method {Function}
 * @param [arg]* {*} Optional arguments to send to obj's init function.
 *
 * @method inherited
 */

  return this.super.prototype[method].apply(obj, this._.rest(arguments, 2));
};

exports.prototype.extend = function(key, val) {
  if (Object.hasOwnProperty(exports.prototype, key)) {
    throw O.error(this, 'Duplicit property name', key);
  }

  exports.prototype[key] = val;
};

exports.prototype.require = function(id) {  // {{{2
/**
 * Safe version of `require()`
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
  var w = this;

  while (w) {
    var res = w.require(id);
    if (res) {
      return res;
    }

    switch (w.type) {
    case undefined:
      w = null;
      break;
    case 'object':
    case 'class':
      w = w.super && w.super.prototype.O;
      break;
    default:
      throw O.error(this, 'Invalid module type', w.type);
    }
  }

  var err = O.error(this, 'MODULE_NOT_FOUND', 'Module not found!', id);
  throw err;
};

exports.prototype.content = function(id) {  // {{{2
  if (this.runtime === 'browser') return;

  this.module.require(id);
};

exports.prototype.class = function(name) {  // {{{2
  if (arguments.length === 0) {
    return this.ctor;
  }

//  console.log('WRAP CLASS', name);

  if (name in this.classes) {
    return this.classes[name];
  }

  var u = this.module.require(name);

  if (typeof u === 'function') {
    return u;
  }

  if (u.O && ('ctor' in u.O)) {
    return u.O.ctor;
  }

  throw O.error(this, 'Module is not a class', name);
};

exports.prototype.new = function(id) {  // {{{2
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
  }
};

exports.prototype.object = function(id) {  // {{{2
//  console.log('OSE SINGLETON', id);

  if (arguments.length === 0) {
    return this.init;
  }

  var u = id ? this.module.require(id) : this.module;

  if (u.O && ('init' in u.O)) {
    return u.O.init;
  }

  throw O.error(this, 'Module is not a singleton', id);
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
    throw O.error('Invalid arguments', arguments);
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
    throw O.error('Invalid arguments', arguments);
  }

  switch (typeof desc) {
  case 'string':
    return this.class(desc).prototype instanceof sup;
  case 'object':
    return desc instanceof sup;
  case 'function':
    return desc.prototype instanceof sup;
  default:
    throw O.error('Invalid arguments', arguments);
  }
};

exports.prototype.identify = function(subject) {  // {{{2
/**
 * Return identification object
 *
 * TODO: params
 *
 * @result {Object}
 *
 * @method identify
 */

  if (! arguments.length) {
    return {
      type: 'wrap',
      wrap: this.type,
      id: this.module.id,
    };
  }

  if (! subject) {
    return {
      subject: subject,
      wrap: this.type,
      id: this.module.id,
    };
  }

  if (typeof subject.identify === 'function') {
    return subject.identify();
  }

  var result = {
    identity: 'unidentifed',
    type: typeof subject,
  };

  if (subject.O) {
    result.module = subject.O.module.filename;
  }

  if (typeof subject === 'object') {
    if ('name' in subject) {
      result.name = subject.name;
    }

    if ('id' in subject) {
      result.id = subject.id;
    }

    if ('_lid' in subject) {
      result.lid = subject._lid;
    }
  } else {
    result.subject = subject;
  }

  return result;
};

exports.prototype.kind = function(path, name, plugins) {  // {{{2
  if (! ('_scope' in this)) {
    throw O.error(this, 'Missing scope');
  }

  this.object(path)(this.scope, name, plugins);
};

exports.prototype.prepend = function(extend) {  // {{{2
/**
 * TODO
 *
 * @param extend {String|Array} Extension to be mixed into wrapped class or singleton.
 *
 * @method prepend
 */
  xpend(this, 'prepends', extend);

  return this;
}

exports.prototype.append = function(extend) {  // {{{2
/**
 *
 * @param extend {object} TODO
 *
 * @method append
 */
/*
  if (('_ctor' in this) || ('_init' in this)) {
    throw O.error(this, 'alreadyCreated', extend);
  }

  switch (typeof extend) {
  case 'function':
  case 'string':
    extend = [extend];
    break;
  case 'array':
    break;
  default:
    throw O.error('Invalid arguments', arguments);
  }

  if (this.appends) {
    this.appends = union(this.appends, extend);
  } else {
    this.appends = extend;
  }
*/
  xpend(this, 'appends', extend);

  return this;
};

exports.prototype.defineO = function() {  // {{{2
  if (! Object.hasOwnProperty(this.module.exports, 'O')) {
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
 * Gracefully close everything and exit process.
 *
 * @method quit
 */

  O.extend('quitting', true);

  for (var key in O.spaces) {
    O.spaces[key].remove();
  };

  O.exit && O.exit();
};

exports.prototype.random = function() {  // {{{2
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
    throw exports.error('Invalid arguments');
  case 'object':
    if (! val) return false;
    throw exports.error('Invalid arguments');
  }

  throw exports.error('Invalid arguments');
};

exports.prototype.dummyFn = function() {};  // {{{2

exports.prototype.counter = function(cb) {  // {{{2
/**
 * Creates a new counter. If `cb` is already a counter instance, it only increments it.
 * Counters are used for multiple asynchronous operations with one final callback.
 *
 * @param cb {Function} Final callback
 *
 * @returns {Object} Counter with callback
 *
 * @method counter
 */

  if (cb instanceof O.classes.Counter) {
    cb.inc();
    return cb;
  }

  return O.new('Counter')(cb);
};

exports.prototype.getScope = function(name) {  // {{{2
/**
 * Creates a new scope instance of a given name or returns an existing one.
 *
 * @param name {String} Name of a scope
 *
 * @returns {Object} `Scope` instance
 *
 * @method scope
 */

  if (name in this.scopes) {
    return this.scopes[name]
  }

  var res = this.scopes[name] = this.new('Scope')(name);
  return res;
};

exports.prototype.run = function(config) {  // {{{2
/**
 * Creates a new scope instance of a given name or returns an existing one.
 *
 * @param name {String} Name of a scope
 *
 * @returns {Object} `Scope` instance
 *
 * @method scope
 */

  this.readConfig(config || this.module.exports);
};

// }}}1
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

  throw O.error('Invalid arguments', arguments);
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
        throw O.error('unknownPropertyDescriptorType', val);
      }

      break;
    default:  // {{{3
      throw O.error('unknownPropertyType', val);
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
    throw O.error(this, 'Already initialized');
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
    throw O.error(this, 'Already initialized');
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
    throw O.error(this, 'Wrap is not a class', this.type);
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
      throw O.error(this, 'Timeout should be set up only once');
    }

    this.timeout = setTimeout(finish, 0);
  }

  return this._ctor;

  function finish() {
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
}

function getConsts() {  // {{{2
  return this.scope.consts;
};

function getLog() {  // {{{2
  return this.scope.log;
}

function getPackage() {  // {{{2
  if (this.packageName) {
    throw O.error(this, 'Package is already specified');
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
    throw O.error(this, 'Package is already specified');
  }

  this.packageName = val;
  this.defineO();
}

function getThisPackage() {  // {{{2
  return this;
};

function getScope() {  // {{{2
  if (this._scope) {
    return this._scope;
  }

  return this.package.scope;
};

function setScope(scope) {  // {{{2
  switch (typeof (scope || undefined)) {
  case 'string':
    if (scope in this.scopes) {
      this._scope = this.scopes[scope];
      return;
    }
    this._scope = this.scopes[scope] = new (this.classes.Scope)(scope);
    this._scope.package = this;
    return this._scope;
  case 'object':
    this._scope = scope;
    return;
  }

  throw O.error(this, 'Invalid arguments', arguments);
};

function xpend(that, key, extend) {  // {{{2
  if (('_ctor' in that) || ('_init' in that)) {
    throw O.error(that, 'alreadyCreated', extend);
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
    throw O.error(that, 'Invalid arguments', arguments);
  }

  if (key in that) {
    that[key] = union(that[key], extend);
  } else {
    that[key] = extend;
  }
};

// }}}1
