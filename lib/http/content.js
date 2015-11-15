'use strict';

var O = require('ose').class(module, C);

var Fs = require('fs');
var Path = require('path');
var Http = require('./index');

/** Docs {{{1
 *
 * @module ose
 * @submodule ose.http
 */

/**
 * @caption HTTP Content
 *
 * @readme
 * Descendants of this class provide browsers with files from
 * individual OSE packages.
 *
 * @class ose.lib.http.content
 * @type class
 */

/**
 * Content name
 *
 * @property name
 * @type String
 */

/**
 * Path to content
 *
 * @property path
 * @type String
 */

/**
 * List of modules provided by this content instance.
 *
 * @property modules
 * @type Object
 */

/**
 * List of JavaScript files provided by this content instance.
 *
 * @property scripts
 * @type Object
 */

/**
 * List of CSS style files provided by this content instance.
 *
 * @property styles
 * @type Object
 */

/**
 * List of handlers provided by this content instance.
 *
 * @property handlers
 * @type Object
 */

// Public {{{1
function C(path, name) {  // {{{2
/**
 * Class constructor
 *
 * @param name {String} Name of HttpContent instance
 * @param path {String} Path to content
 *
 * @method C
 */

  this.modules = {};
  this.handlers = {};
  this.scripts = [];
  this.styles = [];

  this.path = path || Path.dirname(this.O.module.filename);
  this.name = name || this.O.packageName || this.O.package.packageName;

  O.log.debug('Content', this.toString());

  Http.addContent(this);

  this.addFiles && this.addFiles();
};

exports.toString = function() {  // {{{2
  return 'Content: ' + this.name + ' ' + this.path;
};

exports.addHead = function(uri, index) {  // {{{2
/**
 * Adds a URI to the HTML <head> element.
 *
 * @param uri {String} URI
 * @param index {Number} Order index
 *
 * @method addHead
 */

  var remote = uri.match(/^https?:\/\//);
  if (! remote) {
    uri = this.name + '/' + uri;
  }

  Http.addHead(uri, index, remote);
};

exports.addModule = function(file, name) {  // {{{2
/**
 * Adds a module among scripts in the `<head>`.
 *
 * @param filename {String} Module filename
 * @param name {String} Registered module name
 *
 * @method addModule
 */

  var ext = Path.extname(file);

  if (ext) {
    if (ext !== '.js') {
      O.log.unhandled('Only possible extension for module is ".js".');
      return;
    }

    file = file.substring(0, file.length - ext.length);
  }

  if (! name) {
    name = file;

    var match = name.match(/(.*)\/index$/);
    if (match) {
      name = match[1];
    }

    switch (name) {
    case 'lib':
    case 'index':
      name = '';
    }

    if (name) {
      name = this.name + '/' + name;
    } else {
      name = this.name;
    }
  }

  this.modules[file + '.js'] = name;
};

exports.addJs = function(name) {  // {{{2
/**
 * Adds a JavaScript file to scripts in `<head>`.
 *
 * @param name {String} Script filename
 *
 * @method addJs
 */

  var ext = Path.extname(name);

  if (ext) {
    if (ext !== '.js') {
      O.log.unhandled('Only possible extension for js is ".js".', name, ext);
      return;
    }

    name = name.substring(0, name.length - ext.length);
  }

  this.scripts.push(name);
};

exports.addCss = function(name) {  // {{{2
/**
 * Adds a CSS file to scripts in the `<head>`.
 *
 * @param name {String} CSS file filename
 *
 * @method addCss
 */

 var ext = Path.extname(name);

  if (ext) {
    if (ext !== '.css') {
      O.log.unhandled('Only possible extension for stylesheet is ".css".');
      return;
    }

    name = name.substring(0, name.length - ext.length);
  }

  this.styles.push(name);
};

exports.addHandler = function(uri, cb) {  // {{{2
/**
 * Adds a handler for this content instance to list of handlers.
 *
 * @param uri {String} URI to handle
 * @param cb {Function (req, resp, params)} Hanlder to add
 *
 * @method addHandler
 */

  this.handlers[uri] = cb;
};

exports.printIndex = function(req, resp) {  // {{{2
/**
 * Adds this content of this instance to index.html.
 *
 * @param req {Object} HTTP request object
 * @param resp {Object} HTTP response object
 *
 * @method printIndex
 */

  for (var i = 0; i < this.styles.length; i++) {
    resp.write('  <link rel="stylesheet" href="' + this.name + '/' + this.styles[i] + '.css' + '" />');
  }

  for (var i = 0; i < this.scripts.length; i++) {
    resp.write('  <script src="' + this.name + '/' + this.scripts[i] + '.js"></script>');
  }

  for (var key in this.modules) {
    resp.write('  <script src="' + this.name + '/' + key + '"></script>');
  };
};

exports.respond = function(req, resp, name, ext, params) {  // {{{2
/**
 * Method called from HTTP module to handle reponses
 *
 * @param req {Object} HTTP request object
 * @param req {Object} HTTP response object
 * @param name {String} Part of URI relative to this content prefix.
 * @param ext {String} File extension
 * @param params {Object} Additional request parameters
 *
 * @method respond
 */

//  console.log('RESPOND', this.path, name, ext);

  if ((name + ext) in this.handlers) {
    this.handlers[name + ext](req, resp, params);
    return;
  }

  var etag;
  var that = this;
  var path = this.path + '/' + name + ext;

  Fs.stat(path, onStat);

  return;

  function onStat(err, stat) {  // {{{3
    if (err) {
      O.log.unhandled('File stat error!', {path: path, err: err});

      if (err.errno === 34) {
        resp.statusCode = 404;
      } else {
        resp.statusCode = 500;
      }

      resp.end();

      return;
    }

    etag = stat.size + '-' + Date.parse(stat.mtime);
    resp.setHeader('Last-Modified', stat.mtime);

    if (params.cache && (req.headers['if-none-match'] === etag)) {
      resp.statusCode = 304;
      resp.end();

      return;
    }

    Fs.readFile(path, onRead);

    return;
  };

  function onRead(err, val) {  // {{{3
    var module;

    if (err) {
      O.log.unhandled('File read error!', {path: path, err: err});
      resp.statusCode = 500;
      resp.end();

      return;
    }

    if (ext === '.js') {
      module = params.module || that.modules[name + '.js'];
    }

    switch (ext) {
    case '.html':
      resp.setHeader('Content-Type', 'text/html');
      break;
    case '.css':
      resp.setHeader('Content-Type', 'text/css');
      break;
    case '.js':
      resp.setHeader('Content-Type', 'application/javascript');

      if (module) {
//        console.log('RESPOND MODULE', module, name);

        val = 'window.ose("' + module + '", "' + that.name + '/' + name + '.js", function(exports, require, module, __filename, __dirname) {' + val + '\n});';
      }
      break;
    case '.map':
      resp.setHeader('Content-Type', 'application/json');
      break;
    case '.webapp':
      resp.setHeader('Content-Type', 'application/x-web-app-manifest+json');
      break;
    case '.appcache':
      resp.setHeader('Content-Type', 'text/cache-manifest');
      break;
    case '.gif':
      resp.setHeader('Content-Type', 'image/gif');
      break;
    case '.png':
      resp.setHeader('Content-Type', 'image/gif');
      break;
    case '.jpg':
      resp.setHeader('Content-Type', 'image/jpeg');
      break;
    case '.svg':
      resp.setHeader('Content-Type', 'image/svg+xml');
      break;
    case '.woff':
      resp.setHeader('Content-Type', 'application/x-font-woff');
      break;
    case '.ttf':
      resp.setHeader('Content-Type', 'application/x-font-ttf');
      break;
    case '.mp4':
      resp.setHeader('Content-Type', 'video/mp4');
      break;
    default:
      O.log.unhandled('Uknown file extension, "Content-Type" is not specified', path);
    }

//    resp.setHeader('Content-Length', val.length);  // WARNING: Some files are truncated when this header is sent, propably due to UTF characters in module.
    resp.setHeader('ETag', etag);
    resp.statusCode = 200;

    resp.end(val);

    return;
  };

  // }}}3
};

// }}}1
// Private {{{1
function expandFileName(path, name) {  // {{{2
  if (name.charAt(0) === '/') {
    return name;
  }

  return path + '/' + name;
};

// }}}1
