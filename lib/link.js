'use strict';

var O = require('ose').module(module);

var WsRead = O.class('./ws/read');

/** Doc {{{1
 * @caption Sockets and links
 *
 * @readme
 * The framework makes it possible to easily create links between
 * `entries` to allow communication regardless of whether it is
 * realized within one OSE instance or transparently across multiple
 * OSE instances. A link is a virtual bidirectional communication
 * channel between two sockets. A link cannot exist without an active
 * [peer-to-peer] connection channel between two sockets. When some
 * WebSocket channel is closed, an `error` handler is called on both
 * ends of links using such channel and links are closed.
 *
 *
 * @description
 *
 * ## Internals
 *
 * Each socket is an object with handlers or an event emitter. A
 * socket is either a client socket or a response socket. To establish
 * a link, a client socket must first be created. The client socket
 * must then be delivered to the master entry's handler. This handler
 * must then create a corresponding response socket and open a link.
 * After the link is established, the client and response sides become
 * equal.
 *
 * @aliases link links socket sockets clientSocket responseSocket
 * @module ose
 * @submodule ose.link
 * @main ose.link
 */

/*
 * TODO: Event emitter chapter
 * TODO: Object with handlers chapter
 *
 * ## Example using an object with handlers TODO: Update
 *
 * Below is a real example of how a link is created and works between
 * the [light entry] and the [switch entry]. The [light entry] has a
 * controlling [switch entry] identification assigned in its
 * `entry.data.switch` value. Based on this object, the [light entry]
 * calls its `postTo()` method that sends a `relay` command to the
 * [switch entry] together with the client socket. The [switch entry]
 * then creates a response socket and links the two sockets by calling
 * `O.link.open()`. The `open()` handler of the client socket is
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
 *     var Switch = O.class('ose-control/lib/light/switch');
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
 *     var Relay = O.class('ose-control/lib/switch/relay');
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
 *     O.link.open(this, socket, resp);
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
 *   `O.link.open(resp, client, data)`. On both sides, the other
 *   socket is assigned to the `link` property (e.g. `client.link =
 *   response`). There is no `open()` handler on the response side.
 *
 * - `close([data])`:<br />
 *   Invoked when the link is gracefully closed by
 *   `O.link.close(socket, data)`. Can be called instead of
 *   `O.link.open()` from the response side. In such case the link
 *   is not opened and acts only as a callback. `O.link.close()`
 *   destroys the link and deletes the `link` property of both
 *   sockets.
 *
 * - `error(err)`:<br />
 *   Invoked in the case of an error with `O.link.error(socket,
 *   err)`. `err` should be an instance of `Error`. `O.link.error()`
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
 */

/**
 * @caption Links helper module
 *
 * @readme
 * This module contains methods for controlling links.
 *
 * @class ose.lib.link
 * @type module
 */

// }}}1
// Public {{{1
exports.socketState = {  // {{{2
/**
 * List of states entered by sockets
 *
 * TODO: Document individual states.
 *
 * @property socketState
 * @type Object
 */

  // undefined,   Waiting for open
  OPENED:  1,  // Socket was opened
  SPLIT:   2,  // Closed, connection was broken
  CLOSED:  3,  // Closed by some of sockets
  ERROR:   4,  // Closed with error
  MOCK:    5,  // Mock socket; replace this object with real socket after socket open
  RELAY:   6,  // Relay between two WebSockets
};

exports.homeState = {  // {{{2
/**
 * List of states entered by spaces, shards and entries
 *
 * TODO: Document individual states.
 *
 * @property homeState
 * @type Object
 */

  // Initializing
  // ------------
  // undefined,   // Before the first `setLhs()` call
    // READING, AT_HOME, GETTING, CLOSED

  // Removed
  // -------
  // - Removed from cache
  // - Has no followup states
  // - Property `_err` will contain the optional error
  // - These states can follow after and of other states
  DELETED:   1,   // Was deleted from the database
  NOT_FOUND: 2,   // Doesn't exist
  ERROR:     3,   // Error while geting or reading
  REMOVED:   4,   // Removed from cache, not necessary

  // At home
  // -------
  INIT_READ: 5,   // Not initialized; reading from database
    // AT_HOME
  AT_HOME:   6,   // At home with data and everything
    // no followups

  // Not at home
  // -----------
  INIT_GET:  7,   // Not initialized; otherwise same as GETTING
  INIT_LINK: 8,   // Not initialized; otherwise same is LINKING

  CLOSED:    9,   // Not connected; `master === undefined`; `slaves === undefined`; no need for connection
    // LINKING
  WAITING:   10,  // Trying to connect; `master === undefined`; "lhs" will be emitted after conditions change
    // LINKING, CLOSED
  GETTING:   11,  // Trying to get; `master === undefined`; "lhs" will be emitted soon; do not do anything with subject; register `.once('lhs')`
    // CLOSED
  LINKING:   12,  // Trying to link; `master` is defined; `master` is responsible to emit "lhs" soon; do not do anything with subject; register `.once('lhs')`
    // WAITING, MASTER, HOME
  TRACKING:  13,  // Trying to link; `master` is defined; `master` is responsible to emit "lhs" soon; do not do anything with subject; register `.once('lhs')`
    // CLOSED, WAITING, MASTER, HOME
  MASTER:    14,  // Connected to the master but not linked to the home
    // CLOSED, WAITING, TRACKING, HOME
  HOME:      15,  // Linked to the home
    // CLOSED, WAITING, TRACKING, MASTER
};

exports.canReplace = function(socket) {  // {{{2
/**
 * Check whether it is possible to substitute a mock socket with a
 * real socket.
 *
 * @param socket {Object} Mock socket to be checked
 *
 * @method canReplace
 * @internal
 */

  return socket &&
    typeof socket === 'object' &&
    socket._state === SS.MOCK &&
    socket._ws &&
    socket._lid &&
    socket._lid.toString(16) in socket._ws.links &&
    socket._ws.isConnected()
  ;
};

exports.canOpen = function(socket) {  // {{{2
/**
 * Check whether it is possible to establish a link to `socket`.
 *
 * @param socket {Object} Client socket
 *
 * @returns {Boolean} Whether the socket can be opened
 *
 * @method canOpen
 */

  if (
    ! socket ||
    typeof socket !== 'object' ||
    '_link' in socket
  ) {
    return false;
  }

  switch (socket._state) {
  case undefined:
    return ! ('_ws' in socket || '_lid' in socket);
  case SS.MOCK:
    return canTx(socket);
  }

  return false;
};

exports.open = function(socket, client, data, safe) {  // {{{2
/**
 * Call by the response side to open a link. The `open(data)` handler
 * on the client side is invoked.
 *
 * @param socket {Object} Reponse socket
 * @param client {Object} Client socket
 * @param [data] {Object} Data to be sent to the client
 * @param [safe] {Boolean} Optionally return an error object instead of throwing it, when the error can't be handled by the `socket`
 *
 * @return {Object} Optional error object; `undefined` on success
 *
 * @method open
 */

//  console.log('LINK OPEN', data, safe);

  var err;

  if (! socket || typeof socket !== 'object') {
    return error(O.error(socket, 'Socket is invalid'));
  }
  if (socket._state || socket._link)  {
    return error(O.error(socket, 'Socket is not waiting for open', socket._state));
  }

  if (! client || typeof client !== 'object') {
    return error(O.error(client, 'Socket is invalid'));
  }

  if (canTx(client)) {
    // Link is communicating through network

    if (client._state !== SS.MOCK) {
      return error(O.error(client, 'Socket is not waiting for replace during open', client._state));
    }

    socket._state = SS.OPENED;
    socket._lid = client._lid;
    socket._ws = client._ws;
    socket._ws.links[socket._lid.toString(16)] = socket;

    delete client._ws;

    socket._ws.tx({
      type: 'open',
      lid: socket._lid,
      data: data,
    });
    return;
  }

  // Link is between local sockets
  if (client._ws) {
    return error(O.error(client, 'Client has `._ws` property defined but cant send to socket'));
  }

  if (client._link || client._state) {
    return error(O.error(client, 'Socket is not waiting for open', client._state));
  }

  if (O.isSuper('EventEmitter', client)) {
    socket._link = client;
    client._link = socket;
    socket._state = SS.OPENED;
    client._state = SS.OPENED;
    client.emit('open', data);
    return;
  }

  if (typeof client.open !== 'function') {
    return error(O.error(client, 'Missing socket handler', 'open'));
  }

  socket._link = client;
  client._link = socket;
  socket._state = SS.OPENED;
  client._state = SS.OPENED;
  client.open(data);

  return;

  function error(e) {  // {{{3
    // Returns or throws error only when it is not possible to handle it by `socket` error handler

    err = e;
    if (socket && exports.canClose(socket)) {
      e = undefined;
      exports.error(socket, err);
    }

    if (client && exports.canClose(client)) {
      exports.error(client, err);
    }

    if (e && ! safe) {
      throw e;
    }

    return e;
  }

  // }}}3
};

exports.isOpened = function(socket) {  // {{{2
/**
 * Check whether a socket is opened.
 *
 * @param socket {Object} Socket to be checked
 *
 * @returns {Boolean} Whether socket is opened
 * 
 * @method isOpened
 */

  return socket &&
    socket._state === SS.OPENED &&
    (socket._link || socket._ws && socket._lid)
  ;
};

exports.canClose = function(socket) {  // {{{2
/**
 * Check whether a socket can be closed.
 *
 * @param socket {Object} Socket to be checked
 *
 * @returns {Boolean} Whether socket can be closed
 *
 * @method canClose
 */

//  console.log('LINK CAN CLOSE', socket._lid);
//  console.trace();

  if (! socket) return true;

  switch (typeof socket) {
  case 'object':
    break;
  case 'undefined':
    return true;
  case 'function':
    return true;
  default:
    return false;
  }

  switch (socket._state) {
  case undefined:
    return ! (
      '_lid' in socket ||
      '_link' in socket ||
      '_ws' in socket
    );
  case SS.MOCK:
    return canTx(socket);
  case SS.OPENED:
    if ('_ws' in socket) {
      return ! ('_link' in socket) && canTx(socket);
    }

    return socket._link &&
      socket._link._link === socket &&
      socket._link._state === SS.OPENED
    ;
  }

  return false;
};

exports.close = function(socket, data, safe) {  // {{{2
/**
 * Call to gracefully close a link. This method invokes `close(data)`
 * handlers on both the client and response side.
 *
 * @param [socket] {undefined | Object | Function} Socket to be closed
 * @param [data] {Object} Data to be sent to the close handler
 * @param [safe] {Boolean} Optionally return an error object instead of throwing it, when the error can't be handled by the `socket`
 *
 * @return {Object} Optional error object; `undefined` on success
 *
 * @method close
 */

//  console.log('LINK CLOSE', socket && socket._lid, data);

  var le;  // Local error

  switch (typeof (socket || undefined)) {
  case 'undefined':
    return;
  case 'function':
    socket(null, data);
    return;
  case 'object':
    break;
  default:
    return error(O.error(socket, 'Invalid typeof socket'));
  }

  switch (socket._state) {
  case undefined:
    socket._state = SS.CLOSED;
    return doit(socket);
  case SS.MOCK:
    socket._state = SS.CLOSED;
    return ws();
  case SS.OPENED:
    break;
  default:
    return error(O.error(socket, 'Invalid socket state for close', socket._state));
  }

  socket._state = SS.CLOSED;

  if ('_ws' in socket) {
    return ws(true);
  }

  var mate = socket._link;
  delete socket._link;
  doit(socket);

  if (! mate || typeof mate !== 'object') {
    error(O.error(mate, '`_link` is not an object', mate));
    return le;
  }
  if (mate._state !== SS.OPENED) {
    error(O.error(mate, 'Invalid socket state for error', mate._state));
    return le;
  }

  mate._state = SS.ERROR;
  delete mate._link;
  doit(mate);
  return le;

  function ws(real) {  // {{{3
    // `socket` is connected to the WebSocket

    var ws = socket._ws;
    var lid = socket._lid;
    delete socket._ws;

    if (real) doit(socket);

    if (typeof lid !== 'number' || ! ws.isConnected()) {
      return le || error(O.error(socket, 'Socket has no valid `_lid` or WebSocket is not connected', lid));
    }

    ws.delLid(lid);
    ws.tx({
      type: 'close',
      lid: lid,
      data: data,
    });
    return le;
  }

  function doit(s) {  // {{{3
    if (O.isSuper('EventEmitter', s)) {
      s.emit('close', data);
      return;
    }

    if (typeof s.close !== 'function') {
      return error(O.error(s, 'Missing socket handler', 'close'));
    }

    s.close(data);
    return;
  }

  function error(e) {  // {{{3
    if (! safe) {
      throw e;
    }

    if (! le) {
      le = e;
    }

    return e;
  }

  // }}}3
};

exports.error = function(socket, err, safe) {  // {{{2
/**
 * Call to close a link with an error. This method invokes
 * `error(err)` handler on socket at first. When link is connected,
 * this method invokes `error(err)` handler on the other side.
 *
 * @param socket {Object} Socket object
 * @param err {Object} `Error` instance
 * @param [safe] {Boolean} Optionally return an error object instead of throwing it, when the error can't be handled by the `socket`
 *
 * @return {Object} Optional error object; `undefined` on success
 *
 * @method error
 */

//  console.log('LINK ERROR', socket._lid, err.code, err.message);

  var le;  // Local error

  if (! (err instanceof Error)) {
    return error(O.error(socket, '`err` must be instance of `Error`', err));
  }

  switch (typeof (socket || undefined)) {
  case 'undefined':
    O.log.error(err);
    return;
  case 'function':
    socket(err);
    return;
  case 'object':
    break;
  default:
    return error(O.error(socket, 'Invalid typeof socket'));
  }

  switch (socket._state) {
  case undefined:
    socket._state = SS.ERROR;
    return doit(socket);
  case SS.MOCK:
    socket._state = SS.ERROR;
    return ws();
  case SS.OPENED:
    break;
  default:
    return error(O.error(socket, 'Invalid socket state for error', socket._state));
  }

  socket._state = SS.ERROR;

  if ('_ws' in socket) {
    return ws(true);
  }

  var mate = socket._link;
  delete socket._link;
  doit(socket);

  if (! mate || typeof mate !== 'object') {
    error(O.error(mate, '`_link` is not an object', mate));
    return le;
  }
  if (mate._state !== SS.OPENED) {
    error(O.error(mate, 'Invalid socket state for error', mate._state));
    return le;
  }

  mate._state = SS.ERROR;
  delete mate._link;
  doit(mate);
  return le;

  function ws(real) {  // {{{3
    // `socket` is connected to the WebSocket

    var ws = socket._ws;
    var lid = socket._lid;
    delete socket._ws;

    if (real) doit(socket);

    if (typeof lid !== 'number' || ! ws.isConnected()) {
      return le || error(O.error(socket, 'Socket has no valid `_lid` or WebSocket is not connected', lid));
    }

    ws.delLid(lid);
    ws.txError(lid, err);
    return le;
  }

  function doit(s) {  // {{{3
    if (O.isSuper('EventEmitter', s)) {
      s.emit('error', err);
      return;
    }

    if (typeof s.error !== 'function') {
      return error(O.error(s, 'Missing socket handler', 'error'));
    }

    s.error(err);
    return;
  }

  function error(e) {  // {{{3
    if (! safe) {
      throw e;
    }

    if (! le) {
      le = e;
    }

    return e;
  }

  // }}}3
};

exports.canReuse = function(socket) {  // {{{2
/**
 * Check if a socket can be reused.
 *
 * @param socket {Object} Socket to be checked
 *
 * @returns {Boolean} Whether socket can be reused
 *
 * @method canReuse
 */

  switch (socket._state) {
  case SS.SPLIT:
  case SS.CLOSED:
  case SS.ERROR:
    return true;
  }

  return false;
};

exports.reuse = function(socket, safe) {  // {{{2
/**
 * Reuse an existing socket
 *
 * @param socket {Object} Socket to be reused
 * @param [safe] {Boolean} Optionally return an error object instead of throwing it, when the error can't be handled by the `socket`
 *
 * @return {Object} Optional error object; `undefined` on success
 *
 * @method reuse
 */

  switch (socket._state) {
  case SS.SPLIT:
  case SS.CLOSED:
  case SS.ERROR:
    delete socket._lid;
    delete socket._link;
    delete socket._state;
    delete socket._ws;
    return;
  }

  var e2;
  var err = O.error(socket, 'Invalid socket state for reuse', socket._state);
  e2 = exports.error(socket, err, true);

  if (e2) {
    O.log.error(e2);
  }

  if (safe) {
    return err;
  }

  throw err;
};

exports.canSend = function(socket) {  // {{{2
/**
 * Checks whether data can be sent through a link
 *
 * @param socket {Object} Socket
 *
 * @method canSend
 */

  if (! socket || typeof socket !== 'object') {
    return false;
  }

  if (socket._state !== SS.OPENED) {
    return false;
  }

  if ('_link' in socket) {
    if ('_ws' in socket) return false;

    return true
  }

  return canTx(socket);
};

exports.read = function(socket, name, data, cb, safe) {  // {{{2
/**
 * Sends a message to the other end of a `socket`
 *
 * @param socket {Object} Socket object
 * @param name {String} Command name
 * @param data {Object} Data to be sent
 * @param cb {Function(err, stream)} Callback
 * @param [safe] {Boolean} Optionally return an error object instead of throwing it, when the error can't be handled by the `socket`
 *
 * @return {Object} Optional error object; `undefined` on success
 *
 * @method send
 */

  var err;

  switch (arguments.length) {
  case 5:
  case 4:
    break;
  case 3:
    cb = data;
    data = null;
    break;
  default:
    throw O.error('Invalid argument count', arguments);
  }
  if (socket._state !== SS.OPENED) {
    return error(O.error(socket, 'CLOSED', 'Socket is not opened', {name: name, data: data}));
  }
  if (typeof cb !== 'function') {
    return error(O.error(socket, '`cb` must be a function', {name: name, data: data}));
  }
  if (exports.forbiddenNames.hasOwnProperty(name)) {
    return error(O.error(socket, 'Command is forbidden', {name: name, data: data}));
  }

  if (canTx(socket)) {
    socket._ws.tx({
      type: 'read',
      lid: socket._lid,
      name: name,
      data: data,
      newLid: socket._ws.addLink(new WsRead(cb)),
    });
    return;
  }

  var mate = socket._link;
  if (! mate || '_ws' in socket) {
    return error(O.error(socket, 'Can\'t send data to socket'));
  }

  if (O.isSuper('EventEmitter', mate)) {
    mate.emit(name, data, cb);
    return;
  }

  if (typeof mate[name] !== 'function') {
    return error(O.error(mate, 'Missing socket handler', {name: name, data: data}));
  }

  mate[name](data, client);
  return;

  function error(e) {  // {{{3
    // Returns or throws error only when it is not possible to handle it by `socket` error handler

    err = e;
    if (socket && exports.canClose(socket)) {
      e = undefined;
      exports.error(socket, err);
    }

    if (mate && exports.canClose(mate)) {
      exports.error(mate, err);
    }

    if (e && ! safe) {
      throw e;
    }

    return e;
  }

  // }}}3
};

exports.send = function(socket, name, data, client, safe) {  // {{{2
/**
 * Sends a message to the other end of a `socket`
 *
 * @param socket {Object} Socket object
 * @param name {String} Command name
 * @param data {Object} Data to be sent
 * @param client {Object} Client socket
 * @param [safe] {Boolean} Optionally return an error object instead of throwing it, when the error can't be handled by the `socket`
 *
 * @return {Object} Optional error object; `undefined` on success
 *
 * @method send
 */

  var err;

  if (socket._state !== SS.OPENED) {
    return error(O.error(socket, 'CLOSED', 'Socket is not opened', {name: name, data: data}));
  }

  switch (arguments.length) {
  case 5:
  case 4:
    break;
  case 3:
  case 2:
    if (typeof name !== 'string') {
      client = data;
      data = name;
      name = 'data';
      break;
    }

    break;
  default:
    throw O.error('Invalid argument count', arguments);
  }

  if (exports.forbiddenNames.hasOwnProperty(name)) {
    return error(O.error(socket, 'Command is forbidden', {name: name, data: data}));
  }

  if (! exports.canClose(client)) {
    return error(O.error(client, 'Invalid client socket', {name: name, data: data}));
  }

  if (canTx(socket)) {
    var d = {
      type: 'send',
      lid: socket._lid,
      name: name,
      data: data,
    };

    if (client) {
      d.newLid = socket._ws.addLink(client);
    }

    socket._ws.tx(d);
    return;
  }

  var mate = socket._link;
  if (! mate || '_ws' in socket) {
    return error(O.error(socket, 'Can\'t send data to socket'));
  }

  if (O.isSuper('EventEmitter', mate)) {
    mate.emit(name, data, client);
    return;
  }

  if (typeof mate[name] !== 'function') {
    return error(O.error(mate, 'Missing socket handler', {name: name, data: data}));
  }

  mate[name](data, client);
  return;

  function error(e) {  // {{{3
    // Returns or throws error only when it is not possible to handle it by `socket` error handler

    err = e;
    if (socket && exports.canClose(socket)) {
      e = undefined;
      exports.error(socket, err);
    }

    if (mate && exports.canClose(mate)) {
      exports.error(mate, err);
    }

    if (e && ! safe) {
      throw e;
    }

    return e;
  }

  // }}}3
};

exports.bindResp = function(m, path) {  // {{{2
/**
 * @method bindResp
 * @internal
 */

  var c;

  return function(req, socket) {
    if (! c) {
      c = m.class(path);
    }

    var resp = new c(this.entry);

    exports.open(resp, socket);
  }
};

exports.mock = function(ws, req) {  // {{{2
/**
 * @method mock
 * @internal
 */

  if (! req.newLid) {
    return undefined;
  }

  var res = {
    _state: SS.MOCK,
    _lid: req.newLid,
    _ws: ws,
  };

  ws.addLink(res);  // TODO: check lid duplicity

  return res;
};

exports.isForbidden = function(name) {  // {{{2
/**
 * Checks if a command name is forbidden.
 *
 * @param name {String} Command name
 *
 * @method isForbidden
 * @internal
 */

  if (exports.forbiddenNames.hasOwnProperty(name)) {
    return O.error(socket, 'Handler is forbidden', {name: name});
  }

  return false;
};

exports.forbiddenNames = [  // {{{2
/**
 * Array of handler names that can't be used.
 *
 * @property forbiddenNames {Array}
 * @internal
 */

  'close',
  'error',
  '_link',
  '_lid',
  'O',
  'open',
  'split',
  '_ws',
];

// }}}1
// Private {{{1
var SS = exports.socketState;

function canTx(socket) {  // {{{2
/**
 * Returns true when `socket` is linked via connected WebSocket
 */

  if (
    ! socket ||
    typeof socket !== 'object'
  ) {
    return false;
  }

  switch (socket._state) {
  case undefined:
  case SS.OPENED:
  case SS.MOCK:
  case SS.RELAY:
    break;
  default:
    return false;
  }

  var ws = socket._ws;

//  console.log('LINK CAN WS TX', socket._lid, ws.isConnected(), socket._lid.toString(16) in ws.links);

  return ws &&
    ! ('_link' in socket) &&
    '_lid' in socket &&
    ws.links &&
    socket._lid.toString(16) in ws.links &&
    ws.isConnected()
  ;
}

// }}}1
