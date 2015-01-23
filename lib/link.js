'use strict';

var Ose = require('ose');
var M = Ose.module(module);

/** Doc {{{1
 * @caption Sockets and links
 *
 * @readme
 * The framework makes it possible to easily create links between
 * `entries` to allow communication regardless of whether it is
 * realized within one OSE instance or transparently across multiple
 * OSE instances. A link is a virtual bidirectional communication
 * channel between two sockets. A link cannot exist without an active
 * [peer-to-peer] connection channel between sockets. When some
 * WebSocket channel is closed, an `error` handler is called on both
 * ends of links using such channel and links are closed.
 *
 * Each socket is an object with handlers. A socket is either a client
 * socket or a response socket. To establish a link, a client socket
 * must first be created. The client socket must then be delivered to
 * the master entry's handler. This handler must then create a
 * corresponding response socket and open a link.  After the link is
 * established, the client and response sides become equal.
 *
 *
 * @description

 * ## Example

 * Below is a real example of how a link is created and works between
 * the [light entry] and the [switch entry]. The [light entry] has a
 * controlling [switch entry] identification assigned in its
 * `entry.data.switch` value. Based on this object, the [light entry]
 * calls its `postTo()` method that sends a `relay` command to the
 * [switch entry] together with the client socket. The [switch entry]
 * then creates a response socket and links the two sockets by calling
 * `Ose.link.open()`. The `open()` handler of the client socket is
 * then invoked. From now on, the switch response socket relays
 * `press`, `release`, `hold` and `tap` events to the client socket of
 * the [light entry].
 *
 * This example is composed of snippets from the following files:
 *
 * - Light entry kind: [ose-control/lib/light/index.js]
 * - Light client socket class: [ose-control/lib/light/switch.js]
 * - Switch entry kind: [ose-control/lib/switch/index.js]
 * - Switch response socket class: [ose-control/lib/switch/relay.js]
 *
 * Creation of client socket – [ose-control/lib/light/index.js]
 *
 *     // Create a client socket class
 *     var Switch = M.class('ose-control/lib/light/switch');
 *
 *     ...
 *     // Create a client socket when an entry is initializing
 *     new Switch(entry);
 *     ...
 *
 * Send a command to the [switch entry] after the client socket is initialized – [ose-control/lib/light/switch.js]
 *
 *     ...
 *     that.entry.postTo(
 *       that.entry.data.switch,
 *       'relay',
 *       null,
 *       that
 *     );
 *     ...
 *
 * Create a switch response socket in [switch entry] `relay` command handler – [ose-control/lib/switch/index.js]
 *
 *     // Creates response socket class
 *     var Relay = M.class('ose-control/lib/switch/relay');
 *     ...
 *     // Registers a relay handler in the switch entry kind
 *     this.on('relay', relay);
 *     ...
 *     // Handler body
 *     function relay(req, socket) {
 *       // Creates response socket
 *       new Relay(this.entry, socket);
 *     };
 *
 * Open the link after response socket is initialized – [ose-control/lib/switch/relay.js]
 *
 *     // Open link; `this` is the response socket, and `socket` is the
 *     // client socket.  On both sides, the other socket is assigned to
 *     // the `link` property (e.g. `client.link = response`).
 *     Ose.link.open(this, socket, resp);
 *
 * The client's `open()` handler is called – [ose-control/lib/light/switch.js].
 *
 *     exports.open = function(req) {
 *       ...
 *     };
 *
 *
 * ## Handlers
 * Each `socket` is an object with handlers attached to it. A handler
 * is a method directly assigned to a socket object (or a prototype
 * chain) with the handler's `name` as the socket object's key. A
 * socket is not an `EventEmitter`.
 *
 * Handlers are called directly via `this.link.handler(data)`, where
 * `handler` is the handler's name and `this` is the the other socket
 * of the link.
 *
 * There are some special handlers:
 *
 * - `open([data])`:<br />
 *   Invoked on the client side when the response calls
 *   `Ose.link.open(resp, client, data)`. On both sides, the other
 *   socket is assigned to the `link` property (e.g. `client.link =
 *   response`). There is no `open()` handler on the response side.
 *
 * - `close([data])`:<br />
 *   Invoked when the link is gracefully closed by
 *   `Ose.link.close(socket, data)`. Can be called instead of
 *   `Ose.link.open()` from the response side. In such case the link
 *   is not opened and acts only as a callback. `Ose.link.close()`
 *   destroys the link and deletes the `link` property of both
 *   sockets.
 *
 * - `error(err)`:<br />
 *   Invoked in the case of an error with `Ose.link.error(socket,
 *   err)`. `err` should be an instance of `Error`. `Ose.link.error()`
 *   destroys the link and deletes the `link` property of both sides.
 *   An error handler is invoked, for example, when the underlying
 *   WebSocket channel is closed.
 *
 * ## Network transparency
 *
 * TODO
 *
 * @todo
 * - Resolve LID conflicts
 *
 * @aliases link links socket sockets clientSocket responseSocket
 * @module ose
 * @submodule ose.link
 * @main ose.link
 */

/**
 * @caption Links helper
 *
 * @readme
 * This module contains methods for controlling links.
 *
 * @class ose.lib.link
 * @type module
 */

// }}}1
// Public {{{1
exports.prepare = function(socket) {  // {{{2
  socket._state = 'WAIT';
};

exports.isOpen = function(socket) {  // {{{2
  switch (socket._state) {
  case 'OPEN':
  case 'WAIT':
    return true;
  }

  return false;
};

exports.open = function(socket, client, data) {  // {{{2
/**
 * Call by the response side to open a link. On both the response and
 * client side, the other socket is assigned to the `link` property
 * (e.g. `client.link = response`). The `open(data)` handler on the
 * client side is invoked.
 *
 * @param socket {Object} Reponse socket
 * @param client {Object} Client socket
 * @param data {Object} Data to be sent to the client
 *
 * @method open
 */
//  console.log('LINK OPEN');
//  console.trace();

  if (socket.link) {
    var err = Ose.error(socket, 'DUPLICIT_LINK');
    exports.error(socket, err);
    exports.error(client, err);
    return;
  }

  if (client.link) {
    var err = Ose.error(client, 'DUPLICIT_LINK');
    exports.error(client, err);
    exports.error(socket, err);
    return;
  }

  if (client._state !== 'WAIT')  {
    var err = Ose.error(client, 'SOCKET_NOT_WAITING');
    this.error(socket, err);
    this.error(client, err);
    return;
  }

  socket.link = client;
  socket._state = 'OPEN';
  client.link = socket;
  client._state = 'OPEN';

  if (typeof client.open !== 'function') {
    exports.error(client, Ose.error(client, 'MISSING_HANDLER', 'Missing socket handler', 'open'));
    return;
  }

  client.open(data);
};

exports.close = function(socket, data) {  // {{{2
/**
 * Call to gracefully close a link. This method invokes `close(data)`
 * handlers on both the client and response side.
 *
 * @param [socket] {undefined | Object | Function} Socket to be closed
 * @param [data] {Object} Data to be sent to the close handler
 *
 * @method close
 */

  switch (typeof socket) {
  case 'null':
  case 'undefined':
    return;
  case 'function':
    socket(null, data);
    return;
  case 'object':
    var mate = socket.link;
    if (mate) {
      delete mate.link;
      delete socket.link;
    }

    doIt(socket);
    doIt(mate);
    return;
  }

  throw Ose.error('INVALID_ARGS', 'Invalid socket', typeof socket);

  function doIt(s) {
    if (! s) return;

    var o = s._state;
    s._state = 'CLOSING';

    switch (o) {
    case 'OPEN':
    case 'WAIT':
      if (typeof s.close === 'function') {
        s.close(data);
//        delete s.lid;
      } else {
        exports.error(s, Ose.error(s, 'MISSING_HANDLER', 'Missing socket handler', 'close'));
      }
      s._state = 'CLOSED';
      return;
    }

    s._state = 'CLOSED';
    M.log.error(Ose.error(s, 'INVALID_ARGS', 'Socket state should be "OPEN" or "WAIT" for close', o));
    return;
  }
};

exports.error = function(socket, err, timeout) {  // {{{2
/**
 * Call to close a link with an error. This method invokes
 * `error(data)` handlers on both the client and response side.
 *
 * @param socket {Object} Socket object
 * @param err {Object} `Error` instance
 * @param timeout {Number} Defer error handler call in milliseconds
 *
 * @method error
 */

  switch (typeof socket) {
  case 'null':
  case 'undefined':
    if (err.code !== 'DISCONNECTED') {
      M.log.error(err);
    }
    return;
  case 'function':
    if (typeof timeout !== 'number') {
      socket(err);
      return;
    }

    setTimeout(function() {
      socket(err);
    }, timeout);
    return;
  case 'object':
    var mate = socket.link;
    if (mate) {
      delete mate.link;
      delete socket.link;
    }

    doIt(socket);
    doIt(mate);
    return;
  }

  throw Ose.error('INVALID_ARGS', 'Invalid socket', typeof socket);

  function doIt(s) {
    if (! s) return;

    var o = s._state;
    s._state = 'ERROR';

    switch (o) {
    case 'OPEN':
    case 'WAIT':
      if (typeof s.error === 'function') {
        s.error(err);
//        delete s.lid;
      } else {
        M.log.error(err);
        throw Ose.error(s, 'MISSING_HANDLER', 'Missing socket handler', 'error');
      }
      return;
    }

    M.log.error(Ose.error(s, 'INVALID_ARGS', 'Socket state should be "OPEN" or "WAIT" for error', o));
    return;
  }
};

exports.wsClose = function(data) {  // {{{2
//  console.log('WS CLOSE', this.lid);

  if (this.ws && this.ws.isConnected()) {
    this.ws.tx({
      type: 'close',
      lid: this.lid,
      data: data,
    });

    this.ws.delLid(this.lid);
    delete this.ws;
  }

  delete this.lid;
};

exports.wsError = function(err) {  // {{{2
  if (this.lid && this.ws && this.ws.isConnected()) {
    this.ws.txError(this.lid, err);

    this.ws.delLid(this.lid);
  }

  delete this.lid;
  delete this.ws;
};

exports.enumHandlers = function(socket) {  // {{{2
  var result = [];
  var p = socket.M.ctor.prototype;
  var h = Object.getOwnPropertyNames(p);
  for (var i = 0; i < h.length; i++) {
    var key = h[i];

    if (typeof p[key] !== 'function') continue;

    switch (key) {
    case 'open':
    case 'close':
    case 'error':
      break;
    default:
      if (key in exports.forbiddenNames) {
        throw Ose.error(socket, 'HANDLER_FORBIDDEN', key);
      }

      result.push(key);
    }
  }

  if (! result.length) result = undefined;

  Object.defineProperty(p, 'handlers', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: result,
  });
};

exports.bindHandlers = function(socket, handlers) {  // {{{2
  for (var i = 0; i < handlers.length; i++) {
    var name = handlers[i];

    if (name in socket) {
      return Ose.error(socket, 'DUPLICIT_HANDLER', name);
    }

    if (exports.forbiddenNames.indexOf(name) >= 0) {
      return Ose.error(socket, 'HANDLER_FORBIDDEN', key);
    }

    socket[name] = txCommand.bind(socket, name);
  }

  return null;
};

exports.relay = function(ws, name, req, socket) {  // {{{2
/**
 * Relay `req` to `ws`.
 */

  if (socket) {
    socket.handlers = undefined;
    ws.addLink(socket);
    socket.link = 'relay';
  }

  ws.tx(req);
};

exports.bindResp = function(m, path) {  // {{{2
  var c;

  return function(req, socket) {
    if (! c) {
      c = m.class(path);
    }

    var resp = new c(this.entry);

    exports.open(resp, socket);
  }
};

exports.forbiddenNames = [  // {{{2
/**
 * An array of handler names that can't be used.
 *
 * @property forbiddenNames {Array}
 * @private
 */

  'close',
  'error',
  'link',
  'lid',  // TODO rename to "_lid"
  'M',
  'open',
  '_wsw',  // TODO rename ws to "_wsw"
];

// }}}1
// Private {{{1
function txCommand(name, data, socket) {  // {{{2
  if (! (this.ws && this.ws.isConnected())) {
    var err = Ose.error(this, 'DISCONNECTED', 'Link is not connected!', {command: name, data: data});
    Ose.link.error(socket, err);
    Ose.link.error(this, err);
    return;
  }

  var cmd = {
    type: 'command',
    lid: this.lid,  // Already created target socket lid.
    name: name,  // Command name to be called on target.
    data: data,  // Data to be sent to a command.
  };

  if (socket) {
    cmd.newLid = this.ws.addLink(socket);
    cmd.handlers = socket.handlers;
  }

  this.ws.tx(cmd);
  return;
};

// }}}1
