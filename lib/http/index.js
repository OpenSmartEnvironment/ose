'use strict';

var Ose = require('ose');
var M = Ose.module(module);
Ose.http = exports;

var Url = require('url');
var Fs = require('fs');
var Path = require('path');

/** Docs {{{1
 * @caption HTTP server
 *
 * @readme
 * This component provides an HTTP server for OSE. It responds to HTTP
 * requests and provides data needed to run OSE instance in the
 * browser. Each OSE package that needs to run in the browser creates
 * one `ose/lib/http/content` class instance and defines which files
 * will be provided to the browser.
 *
 * It also handles incoming WebSocket requests from other OSE
 * instances and relays them to the [peers component].
 *
 * @module ose
 * @submodule ose.http
 * @main ose.http
 */

/**
 * @caption HTTP server plugin
 *
 * @readme
 * This singleton provides HTTP server for OSE instance.
 *
 * @class ose.lib.http
 * @type module
 */

/**
 * IP address of Node.js host
 *
 * @property ip
 * @type String
 */

/**
 * Port of Node.js HTTP server
 *
 * @property port
 * @type Number
 */

/**
 * List of files
 *
 * @property files
 * @type Object
 */

/**
 * List of content objects
 *
 * @property contents {Object}
 */

// Public {{{1
exports.files = [];  // Files in index, ordered.
exports.contents = {};  // contents registered to this http server.

exports.config = function(key, data) {  // {{{2
/**
 * [OSE plugin] configuration method
 *
 * @param data {Object} Configuration data object
 *
 * @method config
 */

//  console.log('data HTTP', data);

  this.ip = data.ip;
  this.port = data.port || 8124;

  this.cache = data.cache;

  Ose.plugins.addDependency(dependencyConfig.bind(this, data));
  Ose.plugins.once('initialized', sortFiles.bind(this));
};

exports.addContent = function(content) {  // {{{2
/**
 * Adds content instance
 *
 * @param content {Object}
 *
 * @method addContent
 */

//  console.log('ADDING CONTENT', content.name);

  if (this.contents[content.name]) {
    M.log.unhandled('content already exist', content.name);
  } else {
    this.contents[content.name] = content;
  }
};

exports.addHead = function(uri, order, remote) {  // {{{2
/**
 * TODO
 *
 * @param uri {String} URI
 * @param order {Number} Order in which to provide file
 * @param remote {} TODO
 *
 * @method addHead
 */

  var pos = uri.lastIndexOf('.');
  if (pos) {
    var ext = uri.substr(pos);
    uri = uri.substr(0, pos);
  } else {
    var ext = '';
  }

  this.files.push({
    uri: uri,
    ext: ext,
    order: order,
    remote: remote
  });
}

exports.getUrl = function() {  // {{{2
/**
 * Returns url of this Http instance.
 *
 * @return {String} URL of Http instance
 *
 * @method getUrl
 */

  return (Ose.ssl ? 'https' : 'http') + '://' +
    this.ip + ':' +
    this.port
  ;
}

// }}}1
// Event Handlers {{{1
function dependencyConfig(config, cb) {  // {{{2
  var that = this;

  if (Ose.ssl) {
    Ose.readSsl(onSsl);
  } else {
    this.http = require('http').createServer();
    bindHttp();
  }

  function onSsl(err, data) {  // {{{3
    if (err) {
      cb(err);
      return;
    }

    var options = {
      key: data.key,
      cert: data.cert
    };

    that.http = require('https').createServer(options);

    bindHttp();

    return;
  };

  function bindHttp() {  // {{{3
    that.http.on('error', onError);
    that.http.on('request', onRequest.bind(that));
    that.http.listen(that.port, that.ip, httpDone);
  }

  function httpDone() {  // {{{3
    M.log.notice((Ose.ssl ? 'HTTPs' : 'HTTP') + ' server started.', {ip: that.ip || 'all', port: that.port});

    that.ws = new (require('ws').Server)({
      server: that.http,
      verifyClient: Ose.peers.onVerify
    });
    that.ws.on('connection', Ose.peers.onConnect);
    that.ws.on('error', onError);

    M.log.notice('WebSockets server started.');

    cb();  // TODO What if "httpDone" is not invoked.
  }

  // }}}3
};

function sortFiles() {  // {{{2
  this.files.sort(function(a, b) {
    return a.order - b.order;
  });
}

function onRequest(req, resp) {  // {{{2
  var url = Url.parse(req.url, true);

  switch (url.pathname) {
    case '':
    case '/':
    case '/index':
    case '/index.html':
      return respondIndex(this, req, resp);
    case '/apple-touch-icon.png':
    case '/apple-touch-icon-precomposed.png':
    case '/favicon.ico':
      return respondFavicon(this, req, resp);
  }

  var path = url.pathname.split(Path.sep);
  if (! path[0]) path.shift();

  var content = this.contents[path[0]];
  if (content) {
    path.shift();
    path = path.join('/');

    var pos = path.lastIndexOf('.');
    if (pos) {
      var ext = path.substr(pos);
      path = path.substr(0, pos);
    } else {
      var ext = '';
    }

    return content.respond(req, resp, path, ext, {cache: this.cache});
  };

  resp.statusCode = 404;
  resp.end();

  M.log.unhandled('HTTP file not found!', url.pathname);

  return;
};

function onError() {  // {{{2
  M.log.unhandled('HTTP error', arguments);
};

// }}}1
// Private {{{1
function respondIndex(that, req, resp) {  // {{{2
  resp.writeHead(200, {'Content-Type': 'text/html'});

  resp.write('<!DOCTYPE html>');
  // TODO: Make html5 offline cache work.
  //  resp.write('<html manifest="./ose-bb/offline.appcache"><head>');
  resp.write('<html><head>');
  resp.write('  <meta charset="utf-8">');
  resp.write('  <meta name="viewport" content="width=device-width, user-scalable=0, initial-scale=1, maximum-scale=1">');
  resp.write('  <title>Personal Environment</title>');

  for (var i = 0; i < that.files.length; i++) {
    file(that.files[i]);
  }

  for (var key in that.contents) {
    that.contents[key].printIndex(req, resp);
  }

  resp.write('  <script src="ose/config.js"></script>');
  resp.write('</head><body>');

  resp.write('<div id="oseLoading">');
  resp.write('  <p>Loading Open Smart Environment</p>');
  resp.write('</div>');

  resp.write('<script>');
  resp.write('  "use strict";');
//  resp.write('  $(document).ready(function() {window.ose.run(' + JSON.stringify(Ose.plugins.browserConfig()) + ');});');
  resp.write('  $(document).ready(function() {window.ose.run();});');
  resp.write('</script>');

  resp.end('</body></html>');

  function file(data) {
    switch (data.ext) {
      case '.css':
        resp.write('  <link rel="stylesheet" href="' + data.uri + '.css" />');
        break;
      case '.js':
        resp.write('  <script src="' + data.uri + '.js"></script>');
        break;
    }
  }
};

function respondFavicon(that, req, resp) {  // {{{2
  resp.end();
};

// }}}1
