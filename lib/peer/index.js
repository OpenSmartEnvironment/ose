'use strict';

var O = require('ose').object(module, 'ose/lib/kind');
exports = O.exports;

/** Doc {{{1
 * @caption Peers
 *
 * @readme
 * The system, which is based on the OSE framework, consist of one or
 * more configured instances, called OSE instances. An OSE instance is
 * identified by a unique `name` an can run in Node.js or in a web
 * browser.
 *
 * From the point of view of an OSE instance, a peer is another OSE
 * instance. Each peer is assinged to a certain [space]. Two peers can
 * communicate with each other using the WebSocket protocol. Peers can
 * be accessed directly, when a WebSocket channel exists, or
 * indirectly, by using another peer as a gateway.
 *
 * This component allows the following communication between OSE
 * instances:
 *
 * - Obtaining [entries] and maps of entries.
 * - Synchronization of [states of entries] in near real-time.
 * - Sending commands to entries.
 * - Streaming blobs contained by entries
 * - Establishing transparent, asynchronous bidirectional [links]
 *   between entries.
 *
 *
 * @description
 *
 * ## Peer-to-peer relationships
 * Remote peers of an OSE instance can enter the following connection
 * states:
 *
 * - near: peer reachable directly through a WebSocket
 * - far: peer not reachable directly, but through a gateway "near"
 *   (or chain of "nears")
 * - unreachable: a peer that can't be reached
 *
 * In addition, each OSE instance creates a [here peer] object
 * describing itself.
 *
 * From the point of view of a [shard], a `home` is a [peer] to which
 * its [entries] logically belong. The `home` is where commands are
 * executed.
 *
 *
 * ## Establishing a peer-to-peer channel
 *
 * When a communication channel between two OSE instances is
 * established, the following steps are taken:
 *
 * 1. The client Peer instance calls the `connect()` method.
 *   - A [WebSocket wrapper] is created.
 *   - A WebSocket native object is created and connects to `peer.url`.

 * 2. The server verifies the incoming request
 *   - When there is no Peer instance for the client OSE instance, one is created.

 * 3. Server opens a WebSocket channel
 *   - A [WebSocket wrapper] is created.

 * 4. Handshake between peers

 * 5. Both Peer instances assign the `rxData()` method to the `rx`
 *    property of the [WebSocket wrapper] instance.
 *    - After this step, the client and server become equal.
 *
 *
 * ## Messages
 * For standard peer to peer communication, data blocks, sent through
 * WebSockets, are called "messages". Each message has a type.
 * Depending on the message type, the appropriate method from [peer rx
 * handlers] is called to handle the incoming message.
 *
 *
 * @aliases peers homeOseInstance homeInstance oseInstance home peer-to-peer peersComponent
 *
 * @submodule ose.peer
 * @main ose.peer
 */

/* *
 * @caption Peer kind
 *
 * @readme
 * TODO: This class is not used yet
 *
 * @class ose.lib.peer
 * @extends ose.lib.kind
 * @wrap singleton
 */

/*
 *
 *
 * Peer:
 * =====
 * @property ws {Object}
 * @property [gw] {Object} "Peer" instance, gateway to OSE instance; overrides "O.gw".
 * When an OSE instance can't be accessed directly via WebSocket, it should be accessed via some other "near" peer.
 *
 * TODO: @property timeshift {Number} Count of microseconds that is "here" OSE instance in advance to remote peer OSE instance.
 *
 *
 *
 *
 * Message types:
 * ==============
 * System:
 * -------
 * Communication between nears.
 *
 * - ping
 * - pong
 *
 * Open requests:
 * --------------
 * Semi-open the link - create only a way back.
 *
 * - shard: request to build a new link to the near shard.
 * - command: request to build a new link based on already created link. Contains original lid, new lid, command name and data.
 *
 * Responses:
 * ----------
 * - open: confirm openning link, send data and create two way communication link.
 * - close: send data and close the semi-opened link.
 * - error: send error message and data, and close the semi-opened link.
 *
 * Link communication:
 * -------------------
 * - command: command name with JSON data
 * - json: JSON data
 * - binary: binary data
 *
 * Closing link:
 * -------------
 * - close: send data and close the link
 * - error: send error message and data, and close the link.
 *
 *
 *


Message:
========
"Messages" are used for asynchronous communication between subjects. Each "message" is sent from a sender "subject" and delivered to a recipient "subject".

"Messages" can be sent from any subject in any peer to:
- itself in the same peer
- same subject in another peer
- another subject in the same peer
- another subject in another peer

Each "message" is handled by a message "handler" of the recipient subject. (Now it is called "actions" in entry. TODO: DELETE THIS NOTE!)

"Messages" are not class instances, but sets of the following properties:
@property from {Object} Sender subject identification, including the peer name.
@property to {Object} Recipient subject identification, including the peer name.
@property name {String} Message name; the recipient must have a handler of this name.
@property [data] {JSON} Data to be sent.
@property type {String} Each message can be of one of the following types:
- action: attempt to execute an individual action or set of actions
- pipe: attempt to open an asynchronous bidirectional pipe
- chain: attempt to open a synchronous bidirectional pipe
- stream: attempt to open a unidirectional pipe

Each message handler is predefined for a particular message type.
For each message type, there are classes defined that handle such communication.

Packet
======

First byte of packet is a packet type. Following data depends on packet type.

"Ws" supports sending following packet types:
- system: communication between "nears"
  - ping
- addressed: addressed to specific peer
  - message
- handled: processing is predefined by handler id previously defined by message
  - open
  - callback
  - data
  - command
  - follow
  - close
  - error

System:
-------
Communication between "nears".

- ping

Message:
--------
Each message contains sender, recipient, message name and data.
Optionally it can contain handler id. In such case there are prepared handlers for such handler id.

Next 4 bytes {UInt32} handler id; When handler id is not 0, it will be prepared for next message processing.
Next 2 bytes {UInt16} recipient peer name length followed by recipient peer name {String}
Next 2 bytes {UInt16} recipient subject identification length followed by recipient subject identification {BSON}
Next 2 bytes {UInt16} sender peer name length followed by sender peer name {String}
Next 2 bytes {UInt16} sender subject identification length followed by sender subject identification {BSON}
Next 2 bytes {UInt16} message name length followed by message name {String}
Till "packet" end {BSON} message data

Handled:
--------
Next 4 bytes {UInt32} contains handler id.

- open: do not close the handler
Till "packet" end {BSON} command data

- data: do not close the handler
Till "packet" end {BSON} command data

- command: do not close the handler
Next 2 bytes {UInt16} command name length followed by command name {String}
Till "packet" end {BSON} command data

- close: close the handler
Till "packet" end {BSON} data

- error: close the handler
Till "packet" end {BSON} data

 *
 *
 */

// Public {{{1
exports.homeInit = function(entry) {
  entry.setState({created: Date.now()});
};

// }}}1
