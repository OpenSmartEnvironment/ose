'use strict';

var Ose = require('ose');
var M = Ose.class(module, C, 'EventEmitter');

/* * Doc {{{1
 * @caption Actions
 *
 * @readme
 * An `action` is a command to an `entry`. It is created and
 * handled as an object. An `action` can be created in any
 * `instance`. It is delivered and executed in the target
 * `entry`'s `home` `instance`.
 *
 *
 * Use cases:
 * Link from media player entry to it's home.
 * Link from LIRC entry to media player entry's home.
 * Link from switch entry to one pic pin.
 * Link from light entry to more pic pins.
 * Link from relay board to more pic pins.
 * Link from heater to relay board pins.
 * Link from touch control to xorg entry's home.
 * Link from action source to action target sending action execution results.
 *
 * Bricks:
 *
 * Command:
 * --------
 * An entry can execute commands at it's home instance.
 * A command consist of command name and data.
 * A command can receive a link where it can send response.
 * Shard can send commands to entries too.
 * Command is sent with shard's `command` handler.
 *
 * Action:
 * -------
 * Action is an object containing command to be executed on specific entry.
 * Action can chain other actions.
 * Action execution can be imediate, delayed or scheduled.
 * Action can build a link to original action.
 * Each action is at first delivered to its target peer.
 * Action is sent with shard's `action` handler.
 * Is action a specific type of link?
 *
 * Other:
 * ------
 * Link contains source peer and entry.

entry.action  // Create an action
entry.command  // Send a command with a response to entry's harbour.
shard.command  // Send a command with a response to entry's harbour.

entry.home  // Link to home entry.

entry.link
entry.send
entry.sendTo
entry.sendHome

Action:
=======
The "Action" class instance handles action sending, execution and follow-up processing.
Action is sent as a whole to the recipient, where it is to be executed.

Each "action" can have the following abilities:
- chain another action or array of actions
- postpone action execution
- repeat action execution periodically
- pause or stop action processing

"Actions" have the same properties as "messages" plus the following additional properties:
@property [cb] {Function} Callback to be called after the action is executed. If there is no callback, the "action" is not kept by the sender peer when sent to another peer.
@property [chained] {Object | Array} Chained "action" or "actions"



 * @module ose
 * @submodule ose.action
 * @main ose.action
 */

/* *
 * @caption Action
 * @class ose.lib.action
 */

// }}}1
// Public {{{1
function C(peer, source) {  // {{{2
  this.peer = peer;

  this.source = source;
};

exports.serialize = function() {  // {{{2
  return {
    name: this.name,
    data: this.data,
    peer:
      this.peer && this.peer.name ?
      this.peer.name :
      this.peer
    ,
    source: subject(this.source),
    target: subject(this.target)
  };

  function subject(value) {
    if (! value) {
      return undefined;
    }

    if (typeof value.identify === 'function') {
      return value.identify();
    } else {
      return value;
    }
  }
};

exports.deserialize = function(data, cb) {  // {{{2
  var that = this;

  this.peer = Ose.peers[data.peer];
  this.name = data.name;
  this.data = data.data;

  Ose.findEntry(data.source, function(err, entry) {
    if (err) {
      M.log.unhandled('ENTRY NOT FOUND', data.source);
    } else {
      that.source = entry;

      Ose.findEntry(data.target, function(err, entry) {
        if (err) {
          M.log.unhandled('ENTRY NOT FOUND', data.target);
        } else {
          cb && that.cb(cb);
          that.post(entry);
        }
      });
    }
  });
};

exports.action = function(name, data) {  // {{{2
  this.name = name;
  this.data = data;

  return this;
};

exports.logError = function() {  // {{{2
  this.on('error', function(err) {
    M.log.unhandled('Action response error', {
      action: this.name,
      data: this.data,
      source: this.source.identify(),
      target: this.target && (typeof this.target.identify === 'function' ? this.target.identify() : this.target),
      error: err
    });
  });
};

exports.chain = function(name, data, target, cb) {  // {{{2
  M.log.missing();  // Not yet tested!

  if (! Action) {
    Action = M.class('ose/lib/action');
  }
  var result = new Action(this.peer, this.source);

  switch (arguments.length) {
    case 0:
      break;
    case 1:
      switch (typeof name) {
        case 'object':
          data = name;
          name = undefined;
          break;
        case 'function':
          cb = name;
          name = undefined;
          break;
      }

      break;
    case 2:
      switch (typeof name) {
        case 'object':
          target = name;
          name = undefined;
          break;
        case 'function':
          cb = name;
          name = undefined;
          break;
      }

      break;
  }
};

exports.cb = function(value) {  // {{{2
  this.on('done', function(resp) {
    value(null, resp);
  });

  this.on('error', function(err) {
    value(err);
  });

  return this;
};

exports.post = function(value) {  // {{{2
  if (value) {
    this.target = value;
  } else {
    if (! this.target) {
      M.log.unhandled('Target is not defined', action.serialize());
      return this;
    }
  }

  setTimeout(send.bind(null, this), 0);
  return this;
};

// }}}1
// Private {{{1
var Action;

function send(that) {  // {{{2
//  console.log('********SENDING ACTION', that.serialize());

  if (((typeof that.source) === 'object') && M.isSuper('ose/lib/entry', that.source)) {
    testTarget();
  } else {
    Ose.findEntry(that.source, onSource);
  }

  function onSource(err, entry) {  // {{{3
    if (err) {
      console.log('EMITTING ERROR sourceNotFound', that.serialize());
      that.emit('error', 'sourceNotFound');
    } else {
      that.source = entry;
      testTarget();
    }
  }

  function testTarget() {  // {{{3
    if (((typeof that.target) === 'object') && M.isSuper('ose/lib/entry', that.target)) {
      doIt();
    } else {
      that.source.findEntry(that.target, onTarget);
    }
  }

  function onTarget(err, target) {  // {{{3
    switch (err) {
      case 0:
      case null:
      case false:
      case undefined:
        that.target = target;
        doIt();

        break;
      default:
//        M.log.unhandled('ACTION ON TARGET ERROR', {error: err, action: that.name, source: that.source.identify(), target: that.target});
        console.log('EMITTING ERROR targetNotFound', that.serialize());
        that.emit('error', 'targetNotFound');
    }
  };

  function doIt() {
    if (that.target.shard.atHome()) {
      exec(that);
    } else {
      sendTarget(that);
    }
  };
  // }}}3
};

function sendTarget(that) {  // {{{2
  that.target.shard.sendHome('action', that.serialize(), onResp);

  function onResp(err, data) {  // {{{3
    switch (err) {
      case 0:
      case null:
      case false:
      case undefined:
        that.emit('done', data);
//        M.log.unhandled('ACTION RESPONSE', data);
        break;
      case 'socketDisconnected':
//        console.log('********POSTPONING ACTION TILL PEER IS CONNECTED', that.target.shard.master, that.target.shard.peer);
        that.target.shard.once('peer', onPeer);
        break;
      default:
        console.log('EMITTING ERROR', err, that.serialize());
        that.emit('error', err);
//        M.log.unhandled('ACTION RESPONSE ERROR', err);
    }
  };

  function onPeer(data) {  // {{{3
    if (data) {
//      console.log('****************PEER IS CONNECTED, SENDING ACTION', that.serialize());
      that.target.shard.sendMaster('action', that.serialize(), onResp);
    } else {
      M.log.unhandled('INVALID PEER EVENT', data);
    }
  };

  // }}}3
};

function exec(that) {  // {{{2
  var action = that.target.actions && that.target.actions[that.name];

  if (action) {
    action(that.target, that, cb);
  } else {
    console.log('EMITTING ERROR actionNotFound', that.serialize());
    that.emit('error', 'actionNotFound');
  }

  function cb(err, data) {  // {{{3
    if (err) {
      console.log('EMITTING ERROR', err, that.serialize());
      that.emit('error', err);
    } else {
      that.emit('done', data);
    }

//    M.log.unhandled('ACTION DONE HANDLER');
//    console.log(err, data);
  };

  // }}}3
};

// }}}1
