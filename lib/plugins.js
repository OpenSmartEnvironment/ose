'use strict';

var O = require('ose').module(module);

/** Doc {{{1
 * @caption Plugins
 *
 * @readme
 *
 * To run, each [OSE instance] requires a main configuration object
 * (JavaScript object or JSON). Each main configuration object
 * property contains configuration data for one plugin. A plugin can
 * be a class, singleton or module.
 *
 * All plugins are registered to the `O.plugins` object. From this
 * object are prepared configurations for the OSE browser instances as
 * part of the response to HTTP requests for `config.js`.
 *
 * During [OSE instance] startup, the following steps are carried out:
 * 1. Setup of the framework
 * 2. Preparation of plugins
 * 3. Configuration of plugins
 * 4. Asynchronous processing of plugin dependencies
 *
 * When all dependencies are processed, the `done` event is emitted by
 * the `dependencies` object sent to the `config()`.method of each
 * plugin.
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
 * using the `plugin.config(key, data, deps)` method, where `key` is
 * the key taken from the main configuration object, `data` is a
 * property corresponding to the key, and `deps` is the dependencies
 * object, which is the same for all plugins.
 *
 * The `config` method, if it exists, is called on every prototype in
 * a plugin prototype chain. It must not call the ancestor `config()`
 * method.
 *
 *
 * ## Dependencies
 *
 * Dependencies make it possible to carry out asynchronous operations
 * in a specific order.
 *
 * During the previous step or in any dependency callback, a new
 * dependency can be registered by calling `deps.add(name, after,
 * cb)`, where `cb()` represents the particular dependency.  Optional
 * parameter `name` is the name of a group of dependencies to which
 * the given dependency belongs. Optional parameter `after` is the
 * name of a group whose all dependencies must be processed before the
 * dependency is called by the `deps` object.
 *
 * Each dependency receives a callback as a parameter. This callback
 * must be called after the dependency is processed. If a dependency
 * is registered using a `name` of a group, the provided callback must
 * be called with the same name as its parameter.
 *
 *
 * Example:
 *
 * TODO deps.add
 *
 * When there are no dependencies left, the `done` event is emitted on
 * the `deps` object.
 *
 * To run some code after all plugins are initialized, register a
 * method via `deps.on('done', <method>)` during the
 * "configuration" or "dependencies" phase.
 *
 *
 * ## Order of plugins initialization
 *
 * - `O.readConfig()` reads configuration object and create all plugins
 * - `config()` is called on each plugin.
 * - `deps.exec()` processes the following dependency groups:
 *   - "core" - creates kinds
 *   - "peers" - creates peers in spaces
 *   - "shards" - creates all shards
 *   - "entries" - creates all entries
 *   - "connect" - connects all peers with `url` property defined
 *   - "lhs" - finishes spaces, shards and entries initialization
 * - `deps.emit("done")`
 *
 * It is possible to add new groups and use existing ones.
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
 * object. The [Plugins component] then initialiazes the new package as
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

/**
 * @module ose
 */

/**
 * @class ose.core
 */

/**
 * List of all plugins
 *
 * @property plugins
 * @type Object
 */

// Public {{{1
O.extend('readConfig', function(data) {  // Create all plugins defined in "data", emit "done" after all plugins are initialized. {{{2
/**
 * Reads main configuration object, creates all plugins based on this
 * object and processes all dependencies. See the [plugins component].
 *
 * @param data {Object} Main configuration object
 *
 * @method readConfig
 */

  O.log.notice('Reading configuration, creating plugins ...');

  // Create and register all plugins.
  for (var key in data) {
    if (key in exports) {
      throw O.error('Plugin already exists', key);
    }

    var value = data[key];
    if (typeof value === 'string') {  // Plugin configuration can be in a single file.
      value = require(value);
    }

    if (typeof value !== 'object') {
      throw O.error('Plugin configuration is not an object', {key: key, config: value});
    }

    var plugin = require(value.id || key)

//    console.log('CONFIGURING', key, value, typeof plugin.config);

    if (plugin.O) {
      var wrap = plugin.O;

      switch (wrap.type) {
      case undefined:
        break;
      case 'class':
        plugin = wrap.new()();
        break;
      case 'object':
        if (! ('_init' in wrap)) {
          plugin = wrap.init();  // Initialize singleton
        }
        break;
      default:
        throw O.error(wrap, 'Invalid module', value);
      }
    }

    exports[key] = {
      process: true,
      plugin: plugin,
      wrap: wrap,
      data: value,
    };
  }

  O.log.notice('Plugins created, calling `config()` ...');

  var d = O.new('Deps')();
  d.on('error', function(err) {
    O.log.error(err);
    O.quit();
    return;
  });

  d.on('done', function() {
    O.log.notice('Plugins, successfully initialized.');
  });

  for (var key in exports) {
    var item = exports[key];

    if (! item.process) continue;
    delete item.process;

//    var plugin = item.plugin;

    if (item.wrap) {
      item.wrap.callChain(item.plugin, 'config', key, item.data, d);
    } else {
      if (typeof item.plugin.config === 'function') {
        item.plugin.config(key, item.data, d);
      }
    }
  }

  O.log.notice('Plugins configured, calling dependencies ...');

  d.exec();
});

O.extend('respondConfig', function(req, resp) {  // {{{2
/**
 * Creates the configuration object for the browser in response to a
 * HTTP request.
 *
 * @param req {Object} HTTP request
 * @param resp {Object} HTTP response
 *
 * @method respondConfig
 */

  var data = ['window.ose("ose/config", "ose/config.js", function(exports, require, module, __filename, __dirname) {"use strict";\n'];

  for (var key in exports) {
    var p = exports[key];

    if (! p.plugin.browserConfig) continue;

    data.push('exports[' + JSON.stringify(key) + '] = ' + JSON.stringify(browserConfig(p.plugin, p.data), null, 2) + ';\n');
  };

  data.push('});')
//    resp.setHeader('ETag', etag);
  resp.statusCode = 200;

  resp.end(data.join('\n'));
});

// }}}1
// Private {{{1
function browserConfig(plugin, data) {  // {{{2
  switch (typeof (plugin.browserConfig || undefined)) {
  case 'undefined':
    return;
  case 'boolean':
    return data;
  case 'function':
    var result = {};
    if (data.id) {
      result.id = data.id;
    }

    plugin.browserConfig(result, data);
    return result;
  case 'object':
    return plugin.browserConfig;
  }

  throw O.error(plugin, 'UNEXPECTED', 'Invalid `browserConfig` plugin property', plugin.browserConfig);
};

// }}}1
