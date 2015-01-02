'use strict';

var Ose = require('ose');
var M;  // This module wrapper; defined during `setup()`

/** Doc {{{1
 * @caption Classes and singletons
 * @readme
 *
 *
 * This component facilitates the usage of classes or singletons with
 * simple code sharing and runtime specific behaviour by the browser
 * and Node.js environments. This makes it possible to use
 * prototypal inheritance to create classes and singletons and to mix
 * in modules into class prototypes and singletons.
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
 * - `Ose.class(module)`.
 * - `Ose.singleton(module)`.
 * - `Ose.package(module)`.
 * - `Ose.module(module)`.
 *
 * Example:
 *
 *     // Module containing class definiton.
 *     'use strict';
 *
 *     // Require OSE.
 *     var Ose = require('ose');
 *     // Create and return wrap instance
 *     var M = Ose.class(module);
 *     ...
 *
 * The `Ose` variable gives access to global OSE functionalities.  The
 * `M` variable contains the module wrapper and gives access to
 * functionalities relative to the module.
 *
 * **IMPORTANT:**<br />
 * Each time a module is wrapped using `Ose.class`, `Ose.singleton` or
 * `Ose.package` (ie. not `Ose.module`), the wrapper adds the `M`
 * property to `module.exports`. It is not allowed to overwrite this
 * property. The `M` property is read-only and non-configurable. It is
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
 * class definition by calling `Ose.class(module, [constructor],
 * [super])`. The `constructor` is an optional class constructor
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
 *     var Ose = require('ose');
 *
 *     // Wrap module and specifies a class with a constructor
 *     // function `C` and "EventEmitter" as a super-class.
 *     var M = Ose.class(module, C, 'EventEmitter');
 *
 *     // Class constructor
 *     function C(...) {
 *       // Call super constructor
 *       M.super.call(this);
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
 *         space: this.shard.space.name,
 *         shard: this.shard.sid,
 *         entry: this.id
 *       };
 *     };
 *
 *
 * The second step is to obtain a class constructor with its
 * prototype. This step is carried out when the class is first
 * accessed by calling `M.class('ose/lib/entry')`. Multiple calls to
 * `M.class('ose/lib/entry')` return the same, already created
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
 *     var Ose = require('ose');
 *     // Wrap module
 *     var M = Ose.module(module);
 *
 *     // Obtain class constructor (second step).
 *     var Entry = M.class('ose/lib/entry');
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
 * examples above). In the browser environment, the
 * ["wolfy87-eventemitter"](https://github.com/Wolfy87/EventEmitter)
 * package is used.
 *
 * To access the `module.exports` object that is wrapped and prepared
 * as a class, call the standard `require('ose/lib/entry')`
 * method. This call returns the original `module.exports` object.
 *
 * To extend any class, use the following example:
 *
 *     // Require OSE
 *     var Ose = require('ose');
 *     // Wrap module
 *     var M = Ose.module(module);
 *
 *     // Obtain Entry class
 *     var Entry = M.class('ose/lib/entry');
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
 *     var Ose = require('ose');
 *     // Wrap module as a singleton
 *     var M = Ose.singleton(module, I, 'EventEmitter');
 *     // Initialization of the singleton
 *     exports = M.init();
 *
 *     // Singleton initialization
 *     function I() {
 *       // Call super constructor
 *       M.super.call(this);
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
 *     var Ose = require('ose');
 *     // Wrap module as a singleton
 *     var M = Ose.singleton(module, I, 'EventEmitter');
 *     // Initialization of the singleton
 *     exports = M.exports;
 *     ...
 *
 * Example module with separate singleton initialization:
 *
 *     // Some other module ...
 *     'use strict';
 *
 *     // Require OSE
 *     var Ose = require('ose');
 *     // Wrap module
 *     var M = Ose.module(module);
 *
 *     ...
 *
 *     // Obtain singleton initialization (second step)
 *     var init = M.singleton('ose/lib/peer/list');
 *
 *     // Initialize and obtain singleton (third step)
 *     var result = init(arg);
 *
 *     // Or the second and third step together without the init
 *     // variable:
 *     var result = M.singleton('ose/lib/peer/list')(arg);
 *
 *     ...
 *
 * To access or extend any initialized singleton, use standard `require`:
 *
 *     // Module changing singleton.
 *     'use strict';
 *
 *     // Require OSE.
 *     var Ose = require('ose');
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
 *     var Ose = require('ose');
 *
 *     // Wrap module
 *     var M = Ose.class(module, C, 'EventEmitter');
 *
 *     // Prepend a module
 *     M.prepend('someModuleName')
 *     // Append a module depending on the runtime.
 *     M.append('runtime')
 *
 * The `append()` or `prepend()` methods supports call chaining. Both
 * methods accept a module name or array of module names. Properties
 * to a class prototype or singleton are mixed in the second step of
 * class or singleton creation. Conflicting properties are overwritten
 * in the following order: Last prepended, prepended, module.exports,
 * first appended, appended.
 *
 * It is possible to use the following predefined values as module names:
 * * 'browser' – If in the browser environment, use the `browser.js`
 *    module from the same directory.
 * * 'node' – If in the Node.js environment, use the `node.js`
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

exports.setup = function() {  // {{{2
/**
 * Sets up module wrapper of this module
 *
 * @method setup
 */

  M = Ose.module(module);

  Logger = M.class('./logger');
};

exports.common = object2Def({  // {{{2
/**
 * @caption Common wrapper class
 *
 * @readme
 * Properties common for all wrappers
 *
 * @class ose.wrap.common
 * @type class
 */
  exports: {get: getExports},
  log: {get: getLog},
  consts: {get: getConsts},
  require: moduleRequire,
  package: {get: getPackage},
  class: getClass,
  singleton: getSingleton,
  isSuper: isSuper,
  identify: identify,
  requireChain: requireChain,
});

exports.class = function(m, ctor, sup) {  // {{{2
/**
 * @caption Class wrapper
 *
 * @readme
 * Class defining a class module wrapper.
 *
 * @param m {Object} Module to be wrapped
 * @param [ctor] {Function} Class constructor
 * @param [sup] {Function|String} Super-class
 *
 * @class ose.wrap.class
 * @extends ose.wrap.common
 * @type class
 */

  if (! (m && (typeof m.exports === 'object'))) {
    throw Ose.error(this, 'INVALID_ARGS', 'Missing module', m);
  }

  Object.defineProperty(m.exports, 'M', {
    value: this,
    configurable: false,
    enumerable: false,
    writeable: false,
  });

  this.type = 'class';
  this.module = m;

  this.setCtor(ctor || undefined);
  this.setSuper(sup || undefined);
};

exports.classProto = object2Def({  // {{{2
  prepend: prepend,
  append: append,
  setSuper: setSuper,
  ctor: {get: getCtor},
  setCtor: setCtor,
});

exports.module = function(m) {  // {{{2
/**
 * @caption Module wrapper
 *
 * @readme
 * Class defining a standard module wrapper.
 *
 * @class ose.wrap.module
 * @extends ose.wrap.common
 * @type class
 */

  this.type = 'module';
  this.module = m;
};

exports.moduleProto = object2Def({  // {{{2
});

exports.package = function(m, init) {  // {{{2
/**
 * @caption Package wrapper
 *
 * @readme
 * Class defining a package module wrapper.
 *
 * @param m {Object} Module to be wrapped
 * @param [init] {Function} Init function
 *
 * @class ose.wrap.package
 * @extends ose.wrap.common
 * @type class
 */

  this.type = 'package';
  this.module = m;

  this.setInit(init || undefined);
  this.setSuper(undefined);

  // Package singleton can't have `super` and change exports due to
  // initialization limitations.

  Object.defineProperty(m.exports, 'M', {
    value: this,
    configurable: false,
    enumerable: false,
    writeable: false,
  });
};

exports.packageProto = object2Def({  // {{{2
  log: {get: getPackageLog},
  package: {get: getThisPackage},
  prepend: prepend,
  append: append,
  setSuper: setSuper,
  init: {get: getInit},
  setInit: setInit,
  kind: newKind,
  consts: {get: getPackageConsts},
  content: newContent,
  scope: {
    get: getScope,
    set: setScope,
  },
});

exports.singleton = function(m, init, sup) {  // {{{2
/** Singleton
 * @caption Singleton wrapper
 *
 * @readme
 * The class defining a singleton module wrapper.
 *
 * @param m {Object} Module to be wrapped
 * @param [init] {Function} Init function
 * @param [sup] {Function|String} Super-class
 *
 * @class ose.wrap.singleton
 * @extends ose.wrap.common
 * @type class
 */

  this.type = 'singleton';
  this.module = m;

  this.setInit(init || undefined);
  this.setSuper(sup || undefined);

  if (this.super) {
    m.exports = Object.create((this.super || Object).prototype);
  }

  Object.defineProperty(m.exports, 'M', {
    value: this,
    configurable: false,
    enumerable: false,
    writeable: false,
  });
};

exports.singletonProto = object2Def({  // {{{2
  prepend: prepend,
  append: append,
  setSuper: setSuper,
  init: {get: getInit},
  setInit: setInit,
});

// }}}1
// Private {{{1
var Logger;  // Logger class instance; defined during `setup()`  // {{{2

function identify() {  // {{{2
/**
 * Return identification object
 *
 * @result {Object}
 *
 * @method identify
 */

  return {
    type: 'wrap ' + this.type,
    id: this.module.id
  };
};

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

function extend2Proto(m, extend, proto, keep) {  // {{{2
  if (! extend) return;

  var def = {};

  extend2Def(m, extend, def);

  for (var key in def) {
    if ((key in proto) && keep) continue;

    Object.defineProperty(proto, key, def[key]);
  }
};

function extend2Def(m, extend, dst) {  // {{{2
  if (! extend) return;

//  console.log('EXTEND 2 DEF', extend);

  switch (typeof extend) {
  case 'function':
    extend(m, dst);
    return;
  case 'string':
    extend2Def(m, m.require(extend), dst);
    return;
  case 'object':
    if (Array.isArray(extend)) {
      for (var i = 0; i < extend.length; i++) {
        extend2Def(m, extend[i], dst);
      }
      return;
    }

    object2Def(extend, dst);
    return;
  }

  throw Ose.error('invalidArgs', arguments);
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
        throw Ose.error('unknownPropertyDescriptorType', val);
      }

      break;
    default:  // {{{3
      throw Ose.error('unknownPropertyType', val);
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

function getSingleton(id) {  // {{{2
//  console.log('OSE SINGLETON', id);

  if (arguments.length === 0) {
    return this.init;
  }

  var m = id ? this.module.require(id) : this.module;

  if (m.M && ('init' in m.M)) {
    return m.M.init;
  }

  throw Ose.error(this, 'notSingleton', id);
};

function getClass(name) {  // {{{2
  if (arguments.length === 0) {
    return this.ctor;
  }

  if (name in Ose.classes) {
    return Ose.classes[name];
  }

  var u = this.module.require(name);

  if (u.M && ('ctor' in u.M)) {
    return u.M.ctor;
  }

  throw Ose.error(this, 'notClass', name);
};

function getExports() {  // {{{2
  return this.module.exports;
};

function getInit() {  // {{{2
  if ('_init' in this) {
    throw Ose.error(this, 'alreadyInitialized');
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
    throw Ose.error(that, 'alreadyInitialized');
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

function setInit(val) {  // {{{2
  if (('__init' in this) || ('_init' in this)) {
    throw Ose.error(this, 'duplicitInit', val);
  }

  switch (typeof val) {
  case 'undefined':
  case 'function':
    this.__init = val;
    return this;
  }

  throw Ose.error(this, 'invalidArgs', arguments);
}

function getCtor() {  // {{{2
  if ('_ctor' in this) {
    return this._ctor;
  }

  if (! ('__ctor' in this)) {
    throw Ose.error(this, 'invalidClass');
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

  var def = {};
  if (this.prepends) {
    extend2Def(this, this.prepends, def);
    delete this.prepends;
  }

  if (this.module.loaded) {
    extend2Def(this, this.module.exports, def);
    if (this.appends) {
      extend2Def(this, this.appends, def);
      delete this.appends;
    }
  } else {
    this.timeout = setTimeout(finish.bind(this), 0);
  }

  this._ctor.prototype = Object.create(
    (this.super || Object).prototype,
    def
  );

//  console.log('CTOR PROTOTYPE DEF', this.module.loaded, def);

  return this._ctor;

  function finish() {
    delete this.timeout;
    extend2Proto(this.module.exports, this._ctor.prototype);

    if (this.appends) {
      extend2Proto(this, this.appends, this._ctor.prototype);
      delete this.appends;
    }
  }
}

function setCtor(val) {  // {{{2
  if (('__ctor' in this) || ('_ctor' in this)) {
    throw Ose.error(this, 'duplicitCtor', val);
  }

  switch (typeof val) {
  case 'undefined':
  case 'function':
    this.__ctor = val;
    return this;
  }

  throw Ose.error(this, 'invalidArgs', arguments);
}

function setSuper(val) {  // {{{2
  if (('_ctor' in this) || ('_init' in this)) {
    throw Ose.error(this, 'alreadyInitialized');
  }

  if ('super' in this) {
    throw Ose.error(this, 'duplicitSuper', val);
  }

  switch (typeof val) {
  case 'string':
    this.super = this.class(val);
    return this;
  case 'object':
    if (val) break;
  case 'null':
  case 'undefined':
    this.super = undefined;
    return this;
  case 'function':
    this.super = val;
    return this;
  }

  throw Ose.error(this, 'invalidArgs', arguments);
}

function getConsts() {  // {{{2
  return this.package.consts;
};

function getPackageConsts() {  // {{{2
  if (this._consts) {
    return this._consts;
  }

  return this._consts = {};
}

function getLog() {  // {{{2
  if (this._log) {
    return this._log;
  }

  return this._log = this.package.log;
};

function getPackageLog() {  // {{{2
  if (this._log) {
    return this._log;
  }

  return this._log = new Logger(this.name);
}

function getPackage() {  // {{{2
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
      try {
        var m = this.module.require(name.join('/'));

//        console.log('REQUIRE', m.M && m.M.type);

        if (m && m.M && (m.M.type === 'package')) {
          return this._package = m.M;
        }
      } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') throw e;
      }
    }

    name.pop();
  }

  return null;
}

function getThisPackage() {  // {{{2
  return this;
};

function prepend(extend) {  // {{{2
/**
 * TODO
 *
 * @param extend {String|Array} Extension to be mixed into wrapped class or singleton.
 *
 * @method prepend
 */

  if (('_ctor' in this) || ('_init' in this)) {
    throw Ose.error(this, 'alreadyCreated', extend);
  }

  switch (typeof extend) {
  case 'function':
  case 'string':
    extend = [extend];
    break;
  case 'array':
    break;
  default:
    throw Ose.error(this, 'invalidArgs', arguments);
  }

  if (this.prepends) {
    this.prepends = union(this.prepends, extend);
  } else {
    this.prepends = extend;
  }

  return this;
};

function append(extend) {  // {{{2
/**
 *
 * @param extend {object} TODO
 *
 * @method
 */

  if (('_ctor' in this) || ('_init' in this)) {
    throw Ose.error(this, 'alreadyCreated', extend);
  }

  switch (typeof extend) {
  case 'function':
  case 'string':
    extend = [extend];
    break;
  case 'array':
    break;
  default:
    throw Ose.error('invalidArgs', arguments);
  }

  if (this.appends) {
    this.appends = union(this.appends, extend);
  } else {
    this.appends = extend;
  }

  return this;
};

function isSuper(sup, desc) {  // {{{2
/**
 * Tests whether `desc` is descendant of `sup`. When called with one argument, this argument is assigned to `desc` and super is `this.ctor`
 *
 * @param sup {String|Object|Function} Super
 * @param desc {String|Object|Function} Descendant
 *
 * @return {Boolean} isSuper
 *
 * @method isSuper
 */

  // console.log('IS SUPER 1', sup, desc);

  if (arguments.length === 1) {
    desc = sup;
    sup = this.ctor;
  }

  if (! (sup && desc)) return false;

  switch (typeof sup) {
  case 'string':
    sup = this.class(sup);
    break;
  case 'object':
    sup = sup.constructor;
    break;
  case 'function':
    break;
  default:
    throw Ose.error('invalidArgs', arguments);
  }

  switch (typeof desc) {
  case 'string':
    return this.class(desc).prototype instanceof sup;
  case 'object':
    return desc instanceof sup;
  case 'function':
    return desc.prototype instanceof sup;
  default:
    throw Ose.error('invalidArgs', arguments);
  }
};

function moduleRequire(id) {  // {{{2
  switch (id) {
  case null:
  case undefined:
    return undefined;
  case 'runtime':
    return this.module.require('./' + Ose.runtime);
    break;
  case 'node':
  case 'browser':
    if (id !== Ose.runtime) {
      return undefined;
    }

    return this.module.require('./' + id);
  }
};

function newKind(path, name) {  // {{{2
  if (! ('_scope' in this)) {
    throw Ose.error(this, 'missingScope');
  }

  this.singleton(path)(this.scope, name);
};

function newContent() {  // {{{2
  if (Ose.runtime === 'browser') return;

  this.singleton(this.path + '/content')(this.path, this.name);
};

function getScope() {  // {{{2
  return this._scope;
};

function setScope(scope) {  // {{{2
  switch (typeof scope) {
  case 'string':
    this._scope = Ose.scope(scope);
    return;
  case 'object':
    this._scope = scope;
    return;
  }

  throw Ose.error(this, 'invalidArgs', arguments);
};

function requireChain(id) {  // {{{2
  var m = this;
  while (m) {
    try {
      return m.module.require(id);
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND') {
        throw err;
      }
    }

    switch (m.type) {
    case 'package':
    case 'singleton':
    case 'class':
      m = m.super && m.super.prototype.M;
      break;
    case 'module':
      return m.module.require(id);
    default:
      throw Ose.error(this, 'invalidModuleType', m.type);
    }
  }

  var err = Ose.error(this, 'MODULE_NOT_FOUND', 'Module not found!', id);
  throw err;
};

// }}}1
