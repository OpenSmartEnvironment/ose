'use strict';

var Ose = require('ose');
var M = Ose.singleton(module, 'EventEmitter');
exports = M.init();

/** Doc {{{1
 * @caption Plugins
 *
 * @readme
 *
 * To run, each `OSE instance` requires a main configuration object
 * (JavaScript object or JSON). Each main configuration object
 * property contains configuration data for one plugin. A plugin can
 * be a class, singleton or module.
 *
 * All plugins are registered to the `Ose.plugins` singleton. This
 * singleton prepares configurations for the OSE browser instances as
 * part of the response to HTTP requests for `index.html`.
 *
 * During `OSE instance` startup, the following steps are carried out:
 * 1. Setup of the framework
 * 2. Preparation of plugins
 * 3. Configuration of plugins
 * 4. Asynchronous processing of plugin dependencies
 *
 * After all dependencies are processed, the `initialized` event is
 * emitted by `Ose.plugins`.
 *
 *
 * @description
 *
 * ## OSE framework setup
 *
 * Basic classes and singletons are set up depending on the specified
 * runtime environment (browser or server).
 *
 *
 * ## Preparation of plugins
 *
 * Each property of the main configuration object contains the
 * configuration of a single OSE plugin. The `id` property of each
 * plugin configuration specifies the module to be loaded with
 * `require()`. If the `id` property is omitted, the key of the plugin
 * configuration is taken as the module id.
 *
 * Any CommonJS module can be a plugin. If a module defines a class,
 * its instance is created without parameters and becomes a plugin.
 * If a module defines a singleton, it gets initialized without any
 * arguments. Modules not defining a class or singleton are simply
 * required.
 *
 *
 * ## Configuration of plugins
 *
 * After all plugins are created, individual plugins are configured
 * using the `plugin.config(data)` method, where `data` is taken from
 * the main configuration object for each plugin.
 *
 * The `config` method, if it exists, is called on every prototype in
 * a plugin prototype chain. It must not call the ancestor `config()`
 * method.
 *
 * During this step, dependencies can be registered by calling
 * `ose.plugins.addDependency()`.
 *
 *
 * ## Dependencies
 *
 * Each dependency is defined by a method with a callback and an
 * optional 'test' parameter.
 *
 * Example:
 *
 * TODO addDependency(dependency, test) ...
 *
 * TODO dependency(cb)...
 *
 * When a dependency is processed, it must call the provided
 * callback. When the processing of one dependency ends, the next
 * dependency whose `test` method returns `TRUE` is found and
 * processed. Other dependencies can be added during this step. When
 * there are no more dependencies left, the `initialized` event is
 * emitted by `Ose.plugins`.
 *
 * To run some code after all plugins are initialized, register a
 * method via `Ose.plugins.on('initialized', <method>)` during the
 * "configuration" or "dependencies" phase.
 *
 *
 * ## Extending
 *
 * It is easy to extend OSE by creating a new npm package and adding
 * an empty object with the package name as a key to the main
 * configuration object of an [OSE instance].
 *
 * To use some configuration, define the `config()` method on the
 * package's main `module.exports` and provide some configuration data
 * to the package configuration property of the main configuration
 * object. The [Plugins component] then initializes the new package as
 * another OSE plugin during startup of an [OSE instance].
 *
 * TODO: example
 *
 * @aliases osePlugin oseConfig pluginsComponent
 *
 * @module ose
 * @submodule ose.plugin
 * @main ose.plugin
 */

/** TODO
 * @caption Plugins singleton
 *
 * @readme
 * Handles plugin instances defined in configuration file (or object).
 *
 * @class ose.lib.plugins
 * @type singleton
*/

// Public {{{1
exports.config = function(data) {  // Create all plugins defined in "data", emit "initialized" after all plugins are initialized. {{{2
  if (this.setMaxListeners) this.setMaxListeners(1000);

  M.log.notice('Reading configuration, creating plugins ...');

  // Create and register all plugins.
  for (var key in data) {
    if (key in Plugins) {
      throw Ose.error('duplicitPlugin', key);
    }

    var value = data[key];
    if (typeof value === 'string') {  // Plugin configuration can be in a single file.
      value = require(value);
    }

    if (typeof value !== 'object') {
      throw Ose.error(this, 'invalidPluginConfig', {key: key, config: value});
    }

    var plugin = require(value.id || key)

//    console.log('CONFIGURING', key, value, typeof plugin.config);

    if (plugin.M) {
//      console.log('CONFIGURING M', key, typeof plugin.config);

      plugin = plugin.M;

      switch (plugin.type) {
      case 'class':
        plugin = new (plugin.ctor)();  // Create new instance.
        break;
      case 'package':
      case 'singleton':
        if ('_init' in plugin) {
          plugin = plugin.exports;  // Already initialized singleton.
        } else {
          plugin = plugin.init();  // Initialize singleton
        }
        break;
      default:
        throw Ose.error(plugin, 'invalidModule', value);
      }
    }

    Plugins[key] = {
      plugin: plugin,
      data: value,
    };
  }

  M.log.notice('Plugins created, calling config() ...');

  for (var key in Plugins) {
    var item = Plugins[key];
    var plugin = item.plugin;

    if (plugin.M) {
      Ose.callChain(plugin, 'config', key, item.data);
    } else {
      if (typeof plugin.config === 'function') {
        plugin.config(key, item.data);
      }
    }
  }

  M.log.notice('Plugins configured, calling dependencies ...');

  // Call dependencies.
  var timeout;
  callDependency();

  function callDependency() {  // {{{3
    if (timeout) clearTimeout(timeout);

    var dep = nextDependency();

    if (dep) {
      if (typeof dep === 'number') {
        throw Ose.error(this, 'pendingDependencies');
      }

//      console.log('CALL DEPENDENCY', Dependencies.length, dep.index);

      timeout = setTimeout(onTime.bind(dep), 2000);
      delete Dependencies[dep.index];
      Ose._.defer(dep.cb, callDependency);
    } else {
      Dependencies = [];
      M.log.notice('Plugins, successfully initialized.');

      exports.emit('initialized');
    }
  }

  function nextDependency() {  // {{{3
    var count = 0;
    var result;

    for (var i = 0; i < Dependencies.length; i++) {
      var result = Dependencies[i];

      if (! result) continue;

      count++;

      if (typeof result === 'function') {
        return {
          cb: result,
          index: i
        };
      }

      switch (typeof result.test) {
        case 'function':
          if (result.test()) {
            return {
              cb: result.cb,
              index: i
            };
          }
          break;
        case 'number':
          if (! Dependencies[result.test]) {
            return {
              cb: result.cb,
              index: i
            };
          }
          break;
        default:
          throw new Error('Unhandled condition');
      }
    }

    return count;
  }

  function onTime() {  // {{{3
    throw Ose.error(exports, 'Dependency timeout.');

    callDependency();
  }

  // }}}3
};

exports.addDependency = function(test, cb) {  // Adds dependency, returns dependency index (handle). {{{2
  // test:
  //   undefined: "cb" can be called whenever.
  //   function: "cb" can be called after "test()" returns true value.
  //   number: "cb" can be called after dependency with number "test" is done.

  if ((typeof test === 'function') && ! cb) {
    Dependencies.push(test);
  } else {
    Dependencies.push({
      test: test,
      cb: cb
    });
  }

  return Dependencies.length - 1;
};

exports.get = function(name) {  // Find plugin by its name and return it. {{{2
  if (! (name in Plugins)) {
    throw Ose.error(this, 'missingPlugin', name);
  }

  return Plugins[name];
};

exports.respondConfig = function(req, resp, params) {  // {{{2
  var data = ['window.ose("ose/config", "ose/config.js", function(exports, require, module, __filename, __dirname) {"use strict";\n'];

  for (var key in Plugins) {
    var p = Plugins[key];

    if (! p.plugin.browserConfig) continue;

    data.push('exports[' + JSON.stringify(key) + '] = ' + JSON.stringify(browserConfig(p.plugin, p.data), null, 2) + ';\n');
  };

  data.push('});')
//    resp.setHeader('ETag', etag);
  resp.statusCode = 200;

  resp.end(data.join('\n'));
};

exports.extend = function(config, ext) {  // {{{2
//  console.log('EXTENDING', config, ext);
  for (var key in ext) {
    var c = config[key];

    if (typeof c === 'object') {
      exports.extend(c, ext[key]);
    } else {
      config[key] = ext[key];
    }
  }
//  console.log('EXTENDED', config);
};

exports.push = function(key, plugin, data) {
/**
 * Adds configuration item to configuration object for the browser.
 *
 * @param key {String} Configuration name
 * @param plugin {Object} Plugin
 * @param data {Object} Configuration data
 *
 * @method push
 */

  Plugins[key] = {
    plugin: plugin,
    data: data || {},
  };
};

// }}}1
// Private {{{1
var Plugins = {};
var Dependencies = [];

function browserConfig(plugin, data) {  // {{{2
  var result;
  switch (typeof plugin.browserConfig) {
  case 'boolean':
    return data;
  case 'function':
    var result = {
      id: data && data.id,
    };

    plugin.browserConfig(result, data);
    return result;
  case 'object':
    return plugin.browserConfig;
  }

  throw Ose.error(plugin, 'invalidBrowserConfig', plugin.browserConfig);
};

// }}}1
