'use strict';

var O = require('ose').module(module);
O.extend('http', exports);

var Url = require('url');
var Fs = require('fs');
var Path = require('path');
var Ws = O.class('../ws');

/** Docs {{{1
 * @caption HTTP server
 *
 * @readme
 * This component provides an HTTP server for OSE. It responds to HTTP
 * requests and provides data needed to run OSE instances in the
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
 * @property contents
 * @type Object
 */

// Public {{{1
exports.files = [];  // Files in index, ordered.
exports.contents = {};  // contents registered to this http server.

exports.config = function(key, data, deps) {  // {{{2
//  console.log('data HTTP', data);

  this.ip = data.ip;
  this.port = data.port || 8124;

  this.cache = data.cache;

  var that = this;

  deps.add('http', 'core', function(cb) {
    openServer(that, function onServer(err) {
      if (err) {
        O.log.error(err);
      }

      cb('http');
    });
  });

  deps.once('done', function() {
    that.files.sort(function(a, b) {
      return a.order - b.order;
    });
  });
};

exports.addContent = function(content) {  // {{{2
/**
 * Add content instance
 *
 * @param content {Object}
 *
 * @method addContent
 */

//  console.log('ADDING CONTENT', content.name);

  if (this.contents[content.name]) {
    O.log.unhandled('content already exist', content.name);
  } else {
    this.contents[content.name] = content;
  }
};

exports.addHead = function(uri, order, remote) {  // {{{2
/**
 * Add script to document head
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
 * Get url of this Http instance.
 *
 * @return {String} URL of Http instance
 *
 * @method getUrl
 */

  return (O.ssl ? 'https' : 'http') + '://' +
    this.ip + ':' +
    this.port
  ;
}

// }}}1
// Event Handlers {{{1
function onVerify(data) {  // {{{2
/**
 * Verify event handler. Called before a remote peer WebSocket
 * connects as a client to this HTTP server.
 *
 * @param data {Object} Verification request data.
 *
 * @method onVerify
 * @private
 */

  /*
  var name = data.req.url.substr(1);

  var peer = exports[name];

//  console.log('PEERS VERIFY', name, peer && peer.name, peer && peer.id);

  if (! peer) {
    peer = new Remote(name);
    peer.dynamic = true;
  }

  if (! peer.verify(data.req)) return false;

  exports[name] = peer;
*/

  return true;
}

function onConnect(ws) {  // {{{2
/**
 * Connect event handler. Called after remote peer WebSocket connects
 * as a client to this HTTP server.
 *
 * @method onConnect
 * @private
 */

  O.log.notice('Client socket connected, authenticating ...', ws.upgradeReq.url);

  var wsw = new Ws();

  wsw.rx = function(data) {
    if (data.space === O.here.space.name) {
      O.here.space.peer(data.peer).connectClient(wsw);
      return;
    }

    O.log.error(O.error(wsw, 'Invalid connect request', data));
    wsw.close();
    return;
  };

  wsw.setWs(ws);
  wsw.tx({
    space: O.here.space.name,
    peer: O.here.name,
  }, true);


  /*
  var peer = exports[ws.upgradeReq.url.substr(1)];

  if (peer) {
//    console.log('PEERS CONNECT', ws.upgradeReq.url, peer.name, peer.id);

    peer.serverConnect(ws);
  } else {
    O.log.error(O.error(O, 'UNEXPECTED', 'Trying to connect peer that was not verified', {url: ws.upgradeReq.url}));
    ws.close();
  }
  */
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

  O.log.unhandled('HTTP file not found!', url.pathname);

  return;
};

function onError() {  // {{{2
  O.log.unhandled('HTTP error', arguments);
};

// }}}1
// Private {{{1
function openServer(that, cb) {  // {{{2
  if (O.ssl) {
    that.http = require('https').createServer({
      key: O.ssl.key,
      cert: O.ssl.cert,
    });
  } else {
    that.http = require('http').createServer();
  }

  that.http.on('error', onError);
  that.http.on('request', onRequest.bind(that));
  that.http.listen(that.port, that.ip, function httpDone() {
    O.log.notice((O.ssl ? 'HTTPs' : 'HTTP') + ' server started', {ip: that.ip || 'all', port: that.port});

    that.ws = new (require('ws').Server)({
      server: that.http,
      verifyClient: onVerify.bind(that),
    });
    that.ws.on('connection', onConnect.bind(that));
    that.ws.on('error', onError);

    O.log.notice('WebSockets server started');

    cb();
  });
};

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

  resp.write('<div id="oseLoading" class="theme-communications">');
  resp.write('  <p style="text-align:center;">Loading Open Smart Environment</p>');
  resp.write('</div>');

  resp.write('<script>');
  resp.write('  "use strict";');
  resp.write('  if (! document.registerElement) {');
  resp.write('    alert("Enable Web components by enabling the \'dom.webcomponents.enabled\' option in \'about:config\'");');
  resp.write('    ');
  resp.write('  }');
  resp.write('  window.onload = function(){window.ose.run();};');
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
