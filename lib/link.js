'use strict';

const O = require('ose')(module);

var WsRead = O.getClass('./ws/read');

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
 * `entry.dval.switch` value. Based on this object, the [light entry]
 * calls its `shard.post()` method that sends a `relay` command to the
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
 *     var Switch = O.getClass('ose-control/lib/light/switch');
 *
 *     ...
 *     // Create a client socket when an entry is initializing
 *     new Switch(entry);
 *     ...
 *
 * Send a command to the [switch entry] after the client socket is initialized – [ose-control/lib/light/switch.js]
 *
 *     ...
 *     that.entry.shard.post(
 *       that.entry.dval.switch,
 *       'relay',
 *       null,
 *       that
 *     );
 *     ...
 *
 * Create a switch response socket in [switch entry] `relay` command handler – [ose-control/lib/switch/index.js]
 *
 *     // Creates response socket class
 *     var Relay = O.getClass('ose-control/lib/switch/relay');
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
  SPLIT:   2,  // Closed, connection was broken, `error(err)` handler is called on sockets with `err.code === DISCONNECTED` and `err.splitError === true`
  CLOSED:  3,  // Closed by some of sockets
  ERROR:   4,  // Closed with error
  MOCK:    5,  // Mock socket; replace this object with real socket after socket open; Mock is not registered anywhere; Mock has _lid and _ws defined;
  RELAY:   6,  // Relay between two WebSockets, created as a pair from a mock socket, that gets replaced by one RELAY + one new RELAY; Relay has _lid, _ws and _relay defined
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
    typeof socket === 'function' &&
//    (typeof socket === 'object' || socket._state === SS.MOCK) &&
    socket._state === SS.MOCK &&
    socket._ws &&
    socket._lid
  ;
};

exports.canOpenMock = exports.canReplace  // {{{2

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

  if (! socket) return false;

  switch (typeof socket) {
  case 'object':
    return ! ('_ws' in socket || '_lid' in socket);
  case 'function':
    return socket._state === SS.MOCK && socket._ws.links;
//      ! ('_link' in socket) &&
//      '_lid' in socket &&
//      socket._ws &&
//    ;
  }

  return false;

/*


  if (
    ! socket ||
    typeof socket !== 'object' && socket._state !== SS.MOCK ||
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
  */
};

exports.open = function(socket, client, data) {  // {{{2
/**
 * Call by the response side to open a link. The `open(data)` handler
 * on the client side is invoked.
 *
 * @param socket {Object} Reponse socket
 * @param client {Object} Client socket
 * @param [data] {Object} Data to be sent to the client
 *
 * @return {Object} Optional error object; `undefined` on success
 *
 * @method open
 */

//  console.log('LINK OPEN', data);

  if (! socket || typeof socket !== 'object') {
    throw O.log.error(socket, 'Invalid socket');
  }

  if (socket._state || socket._link)  {
    return error('Socket is not waiting for open');
  }

  switch (typeof (client || undefined)) {
  case 'function':  // Client is etwork socket
    if (client._state !== SS.MOCK || ! client._ws.links) {
      return error('Client socket is not waiting for open');
    }

    // Mark mock socket as not usable any more
    delete client._state;

    // Replace mock socket with response socket and register socket to ws
    socket._ws = client._ws;
    socket._lid = client._lid;
    socket._state = SS.OPENED;

    socket._ws.addLid(socket._lid, socket);
    socket._ws.tx({
      type: 'open',
      lid: socket._lid,
      data: data,
    });
    return;
  case 'object':  // Client is local socket
    if (client._ws || client._link || client._state) {
      return error('Client socket is not waiting for open');
    }

    if (O.isSuper('EventEmitter', client)) {
      socket._link = client;
      client._link = socket;
      socket._state = SS.OPENED;
      client._state = SS.OPENED;
      O.async.setImmediate(function() {
        client.emit('open', data);
      });
      return;
    }

    if (typeof client.open !== 'function') {
      return error('Missing client socket handler: "open"');
    }

    socket._link = client;
    client._link = socket;
    socket._state = SS.OPENED;
    client._state = SS.OPENED;
    O.async.setImmediate(function() {
      client.open(data);
    });
    return;
  }

  return error('Invalid client socket: ' + typeof client);

  function error(message) {
    var err = new Error(message);

    if (O.link.canClose(client)) {
      O.link.error(client, err);
    }

    if (O.link.canClose(socket)) {
      O.link.error(socket, err);
    } else {
      throw err;
    }
  }

  /*
  if (client._state === SS.MOCK) {
    // Link is communicating through network
    if (! canTx(client)) {
      return error(client, 'Mock socket is not waiting for open', client._state);
    }

    // Replace mock socket with response socket
    socket._ws = client._ws;
    socket._lid = client._lid;
    socket._state = SS.OPENED;

    delete client._ws;
    client._state === SS.CLOSED;

    socket._ws.addLid(socket._lid, socket);
    socket._ws.tx({
      type: 'open',
      lid: socket._lid,
      data: data,
    });
    return;
  }

  // Link is between local sockets
  if (client._ws) {
    return error(O.error(client, 'Client has `._ws` property defined but is not a MOCK'));
  }

  if (client._link || client._state) {
    return error(O.error(client, 'Socket is not waiting for open', client._state));
  }

  if (O.isSuper('EventEmitter', client)) {
    socket._link = client;
    client._link = socket;
    socket._state = SS.OPENED;
    client._state = SS.OPENED;
    O.async.setImmediate(function() {
      client.emit('open', data);
    });
    return;
  }

  if (typeof client.open !== 'function') {
    return error(O.error(client, 'Missing socket handler', 'open'));
  }

  socket._link = client;
  client._link = socket;
  socket._state = SS.OPENED;
  client._state = SS.OPENED;
  O.async.setImmediate(function() {
    client.open(data);
  });
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
      return;
    }

    if (e) throw O.log.error(e);

    / *
    if (e && ! safe) {
      throw O.log.error(e);
    }
    * /

    return e;
  }

  // }}}3
  */
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

//  console.log('LINK CAN CLOSE', socket && {state: socket._state, lid: socket._lid, ws: typeof socket._ws, link: typeof socket._link});

  if (! socket) return true;

  switch (typeof (socket || undefined)) {
  case 'object':
    break;
  case 'undefined':
    return true;
  case 'function':
    if ('_state' in socket) {
      return canTx(socket);
    }
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
  /*
  case SS.MOCK:
    return canTx(socket);
    */
  case SS.OPENED:
    if ('_ws' in socket) {
      return canTx(socket) && ! ('_link' in socket);
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

/*
 * `socket` can be in states:
 *   undefined - it is not opened
 *   OPENED - it has _link || _ws + _lid
 *   MOCK - it has _ws + _lid
 */

//  console.log('LINK CLOSE', socket && {state: socket._state, lid: socket._lid, ws: typeof socket._ws, link: typeof socket._link});

  switch (typeof (socket || undefined)) {
  case 'undefined':
    return;
  case 'function':
    if ('_state' in socket) {
      break;
    }
    O.async.setImmediate(function() {
      socket(null, data);
    });
    return;
  case 'object':
    break;
  default:
    return error(O.error(socket, 'Invalid typeof socket'));
  }

  switch (socket._state) {
  case SS.OPENED:
    break;
  case undefined:
    socket._state = SS.CLOSED;
    return doit(socket);
  case SS.MOCK:
    var ws = socket._ws;
    delete socket._ws;
    socket._state = SS.CLOSED;

    ws.tx({
      type: 'close',
      lid: socket._lid,
      data: data,
    });
    return;
  default:
    return error(O.error(socket, 'Invalid socket state for close', socket._state));
  }

  socket._state = SS.CLOSED;

  if ('_ws' in socket) {
    var ws = socket._ws;
    delete socket._ws;

    ws.delLid(socket._lid);
    ws.tx({
      type: 'close',
      lid: socket._lid,
      data: data,
    });

    return doit(socket);
  }

  var mate = socket._link;
  delete socket._link;
  var le = doit(socket);

  if (! mate || typeof mate !== 'object') {
    return error(O.error(mate, '`_link` is not an object', {state: socket._state, link: mate}));
  }
  if (mate._state !== SS.OPENED) {
    return error(O.error(mate, 'Invalid socket state for error', mate._state));
  }

  mate._state = SS.ERROR;
  delete mate._link;
  return doit(mate) || le;

  function doit(s) {  // {{{3
    if (O.isSuper('EventEmitter', s)) {
      O.async.setImmediate(function() {
        s.emit('close', data);
      });
      return;
    }

    if (typeof s.close !== 'function') {
      return error(O.error(s, 'Missing socket handler', 'close'));
    }

    O.async.setImmediate(function() {
      s.close(data);
    });
    return;
  }

  function error(e) {  // {{{3
    if (safe) return e;

    throw O.log.error(e);
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

  if (! (err instanceof Error)) {
    err = O.error.apply(O, Array.prototype.slice.call(arguments, 1));
  }

  switch (typeof (socket || undefined)) {
  case 'undefined':
    O.log.error(err);
    return;
  case 'function':
    if ('_state' in socket) {
      break;
    }
    O.async.setImmediate(function() {
      socket(err);
    });
    return;
  case 'object':
    break;
  default:
    return error(O.error(socket, 'Invalid typeof socket'));
  }

  switch (socket._state) {
  case SS.OPENED:
    break;
  case undefined:
    socket._state = SS.ERROR;
    return doit(socket);
  case SS.MOCK:
    var ws = socket._ws;
    delete socket._ws;
    socket._state = SS.ERROR;

    ws.txError(socket._lid, err);
    return;
  default:
    return error(O.error(socket, 'Invalid socket state for error', socket._state));
  }

  socket._state = SS.ERROR;

  if ('_ws' in socket) {
    // `socket` is connected to the WebSocket
    var ws = socket._ws;
    delete socket._ws;

    ws.delLid(socket._lid);
    ws.txError(socket._lid, err);
    return doit(socket);
  }

  var mate = socket._link;
  delete socket._link;
  var le = doit(socket);

  if (! mate || typeof mate !== 'object') {  // TODO: Is it possible to handle and recover from the following errors? Throw them? The same in `exports.close()`
    return error(O.error(mate, '`_link` is not an object', mate));
  }
  if (mate._state !== SS.OPENED) {
    return error(O.error(mate, 'Invalid socket state for error', mate._state));
  }

  mate._state = SS.ERROR;
  delete mate._link;
  return doit(mate) || le;

  function doit(s) {  // {{{3
    if (O.isSuper('EventEmitter', s)) {
      O.async.setImmediate(function() {
        s.emit('error', err);
      });
      return;
    }

    if (typeof s.error !== 'function') {
      return error(O.error(s, 'Missing socket handler', 'error'));
    }

    O.async.setImmediate(function() {
      s.error(err);
    });
    return;
  }

  function error(e) {  // {{{3
    O.log.error(err);

    if (safe) return e;
    throw O.log.error(e);
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

exports.read = function(socket, name, data, cb) {  // {{{2
/**
 * Sends a stream read request to `socket`. Callback will provide readable stream.
 *
 * @param socket {Object} Socket object
 * @param name {String} Command name
 * @param data {Object} Data to be sent
 * @param cb {Function(err, stream)} Callback
 *
 * @method read
 */

  switch (arguments.length) {
  case 4:
    break;
  case 3:
    cb = data;
    data = undefined;
    break;
  default:
    throw O.log.error(socket, 'INVALID_ARGS', 'Arguments length', arguments);
  }

  if (typeof cb !== 'function') {
    throw O.log.error(socket, 'INVALID_ARGS', '`cb`', arguments);
  }

  if ((socket && socket._state) !== SS.OPENED) {
    return error('`socket` is not opened');
  }

  if (exports.forbiddenNames.hasOwnProperty(name)) {
    return error('Command is forbidden');
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
    return error('Can\'t send data to socket');
  }

  if (O.isSuper('EventEmitter', mate)) {
    if (mate.listenerCount(name) === 0) {
      return error('Missing socket handler');
    }

    return O.async.setImmediate(function() {
      mate.emit(name, data, cb);
    });
  }

  if (typeof mate[name] !== 'function') {
    return error('Missing socket handler');
  }

  return O.async.setImmediate(function() {
    mate[name](data, cb);
  });

  function error(message) {
    O.async.setImmediate(function() {
      cb(O.error(socket, message, {name: name, data: data}));
    });
  }
};

exports.send = function(socket, name, data, client) {  // {{{2
/**
 * Sends a message to the other end of a `socket`
 *
 * @param socket {Object} Socket object
 * @param name {String} Command name
 * @param data {Object} Data to be sent
 * @param client {Object} Client socket
 *
 * @method send
 */

  if ((socket && socket._state) !== SS.OPENED) {
    error(O.error(socket, 'CLOSED', 'Socket is not opened', {name: name, data: data}));
    return false;
  }

  switch (arguments.length) {
  case 4:
  case 3:
  case 2:
    break;
  default:
    throw O.log.error(socket, 'INVALID_ARGS', arguments);
  }

  if (exports.forbiddenNames.hasOwnProperty(name)) {
    error(O.error(socket, 'Command is forbidden', {name: name, data: data}));
    return false;
  }

  if (! exports.canClose(client)) {
    error(O.error(client, 'Invalid client socket', {name: name, data: data}));
    return false;
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
    return true;
  }

  var mate = socket._link;
  if (! mate || '_ws' in socket) {
    error(O.error(socket, 'Can\'t send data to socket'));
    return false;
  }

  if (O.isSuper('EventEmitter', mate)) {
    O.async.setImmediate(function() {
      mate.emit(name, data, client);
    });
    return false;
  }

  if (typeof mate[name] !== 'function') {
    error(O.error(mate, 'Missing socket handler', {name: name, data: data}));
    return false;
  }

  O.async.setImmediate(function() {
    mate[name](data, client);
  });
  return false;

  function error(err) {  // {{{3
    // Returns or throws error only when it is not possible to handle it by `socket`'s error handler

    if (socket && exports.canClose(socket)) {
      exports.error(socket, err);
    }

    if (mate && exports.canClose(mate)) {
      exports.error(mate, err);
    }

    if (client && exports.canClose(client)) {
      exports.error(client, err);
      return;
    }

    throw O.log.error(err);
  }

  // }}}3
};

exports.bindClose = function(socket, data) {  // {{{2
/**
 * Return function that can be used as standard `callback(err, data)`.
 *
 * @params socket {Object} Socket to be closed
 *
 * @return {Function(err, data)}
 *
 * @method bindClose
 */

  return function(err, resp) {
    if (! exports.canClose(socket)) return;

    if (err) return exports.error(socket, err);

    return exports.close(socket, data || resp);
  }
};

exports.bindCommandClass = function(wrap, path, data) {  // {{{2
/**
 * Return [entry kind] command handler that creates new response socket based on the class defined by `path`. When called, the new response socket is created with parameters `(entry, client_socket, command_request_data, data)`. Response socket is responsible to open or close provided `client_socket`.
 *
 * @param wrap {Object} Module wrapper, `path` can be relative to this module wrapper.
 * @param path {String} Path to response socket class
 * @param [data] {*} Optional data sent to response object constructor
 *
 * @return {Function(req, socket)}
 *
 * @method bindCommandClass
 */

  return function(req, socket) {
    return wrap.new(path)(this.entry, socket, req, data);
  }
};

exports.relay = function(ws, req, mock) {  // {{{2
/**
 * TODO:
 *
 * Call to relay `req` to response side socket `ws`. If `mock` is defined, semi-open a link by registering `mock` to `ws` to receive `open`, `close`, or `error` message. `mock._ws` is the socket on the client side. `mock` is now registered by both sockets. Sending anything from client side should respond in closing the link.
 *
 * Call to relay `req` received by `mock._ws` to `ws`. Couple of SS.RELAY sockets is created and replaces `mock`.
 *
 * @method relay
 * @internal
 */

  if (! mock) {
    ws.tx(req);
    return;
  }

  if (! mock._ws || ! mock._lid || mock._lid !== req.newLid || mock._state !== SS.MOCK) {
    O.log.todo('When using `O.link.send(some_entry_slave, "command", anything)` socket._state !== SS.MOCK, what to do? Close the whole ws instead of throwing something?');
    throw O.log.error(ws, 'Invalid mock socket', mock);
  }

  /*
  var res = {
    _state: SS.RELAY,
    _lid: mock._lid,
    _ws: mock._ws,
    _relay: mock,
  };

  mock._state = SS.RELAY;
  mock._ws = ws;
  mock._relay = res;

  ws.addLink(res);
*/

  ws.addLid(mock._lid, mock);

  ws.tx(req);
  return;
};

exports.mock = function(ws, req) {  // {{{2
/**
 * Call when new `req` is received by `ws` to create new mock socket.
 *
 * @method mock
 * @internal
 */

  if (! req.newLid) {
    return null;
  }

  var res = function(err, data) {
    switch (res._state) {
    case SS.MOCK:
    case SS.OPENED:
      if (err) {
        delete res._ws;
        res._state = SS.ERROR;
        ws.txError(res._lid, err);
        return;
      }

      delete res._ws;
      res._state = SS.CLOSED;
      ws.tx({
        type: 'close',
        lid: res._lid,
        data: data,
      });
      return;
    case SS.ERROR:
    case SS.CLOSED:
      O.log.error(ws, 'Trying to call mock socket multiple times', res._lid);
      return;
    }

    return O.log.error(ws, 'Invalid mock socket', res._lid);
  };

  res._state = SS.MOCK;
  res._lid = req.newLid;
  res._ws = ws;

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
  '_lid',
  '_link',
  'O',
  'open',
  '_relay',
  'split',
  '_state',
  '_ws',
];

// Private {{{1
var SS = exports.socketState;

function canTx(socket) {  // {{{2
/**
 * Returns true when `socket` is linked via connected WebSocket
 */

  if (
    ! socket ||
    typeof socket !== 'object' && socket._state !== SS.MOCK ||
    ! ('_lid' in socket) ||
    '_link' in socket
  ) {
    return false;
  }

  var ws = socket._ws;
  if (
    ! ws.links ||
    typeof ws.links !== 'object'
  ) {
    return false;
  }

  switch (socket._state) {
  case undefined:
  case SS.OPENED:
    return ws.links[socket._lid.toString(16)] === socket;
  case SS.MOCK:
  case SS.RELAY:
    return true;
  }

  return false;
}
