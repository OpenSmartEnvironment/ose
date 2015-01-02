'use strict';

var Ose = require('ose');
var M = Ose.module(module);

var Readline = require('readline');

/** Doc {{{1
 * @module ose
 */

/**
 * @caption CLI interface module
 *
 * @readme
 * This module provides a CLI interface module for OSE Node.js
 * instances. Commands can be entered to readline interface or run as
 * a script from a configuration file.
 *
 * Interactive example:
 *     > sleep 10000
 *     > space klinec.snasel.net
 *     > shard d1
 *     > entry kitchen.heater
 *     > command power 0.23
 *     > entry living.heater
 *     > info
 *     > detail
 *
 * Configuration file example:
 *
 *     exports.cli = {
 *       type: 'ose/lib/cli',
 *       script: TODO
 *         'wait 10000',
 *         'space klinec.snasel.net',
 *         'shard d1',
 *         'entry kitchen.heater',
 *         'command power 0.23',
 *         'entry living.light',
 *         'command switch "on"',
 *         'info',
 *         'detail'
 *     }
 *
 * @class ose.lib.cli
 * @type module
 */

// Public {{{1
// exports.iface = <readline interface>

exports.config = function(key, data) {  // {{{2
  var that = this;

  this.iface = Readline.createInterface(process.stdin, process.stdout, null);
  this.iface.on('line', onLine.bind(this));
  this.iface.on('close', onClose.bind(this));
  this.iface.on('error', onError.bind(this));
  this.iface.setPrompt('ha> ');

  Ose.plugins.once('initialized', function() {
    that.iface.prompt();

    if (data.script) readScript(that, data.script);
  });
}

// }}}1
// Event Handlers {{{1
function onLine(line) {  // {{{2
//  console.log('CLI DATA', data);

  var that = this;

  readCommand(this, line, function() {
    that.iface.prompt();
  });
}

function onClose() {  // {{{2
  Ose.terminate();
};

function onError(err) {  // {{{2
  M.log.unhandled('CLI error', err);
};

// }}}1
// Private {{{1
function readCommand(that, line, cb) {  // {{{2
  var data = line.split(' ');

  switch (data[0]) {
    case '':
    case '\n':
      return cb();
    case 'sleep':
    case 'wait':
      var timeout = parseInt(data[1]) || 1000;
      console.log('Waiting ', timeout, '...');
      setTimeout(cb, timeout);
      return;
    case 'scope':
      that.scope = Ose.scope(data[1]);
      if (that.scope) {
        console.log('Selected scope: ', that.scope.name);
      } else {
        console.log('Unknown scope', data);
      }

      return cb();
    case 'space':
      Ose.spaces.get(data[1], onSpace);
      return;
    case 'shard':
      if (that.space) {
        that.space.findShard(data[1], onShard);
        return;
      }

      console.log('Space must be selected before selecting shard!');
      cb();
      return;
    case 'entry':
      if (that.shard) {
        that.shard.get(data[1], onEntry);
        return;
      }

      console.log('Shard must be selected before selecting entry!');
      cb();
      return;
    case 'detail':
      if (! that.entry) {
        console.log('No entry selected!');
        cb();
        return;
      }

      console.log('Entry:', that.entry.id, JSON.stringify({
        kind: that.entry.kind.name,
        synced: that.entry.synced,
        dtc: that.entry.dtc,
        stc: that.entry.dtc,
      }, null, 2));

      console.log('Data:', JSON.stringify(
        that.entry.data
      , null, 2));

      console.log('State:', JSON.stringify(
        that.entry.state
      , null, 2));

      console.log('Slaves:',
        that.entry.slaves ?
          JSON.stringify(Object.getOwnPropertyNames(that.entry.slaves), null, 2) :
          'undefined'
      );

      cb();
      return;
    case 'info':
      console.log(JSON.stringify({
        space: that.space ? that.space.name: null,
        shard: that.shard ? {
          id: that.shard.id,
          sid: that.shard.sid,
          mid: that.shard.mid,
          alias: that.shard.alias,
          scope: that.shard.scope.name,
          atHome: that.shard.atHome(),
        } : null,
        entry: that.entry ? {
          id: that.entry.id,
          kind: that.entry.kind.name,
//          sync: that.entry.sync,
//          dtc: that.entry.dtc,
//          stc: that.entry.stc,
//          data: that.entry.data,
//          state: that.entry.state,
        } : null,
      }, null, 2));

      cb();
      return;
    case 'command':
      if (! that.entry) {
        console.log('No entry selected!');
        cb();
        return;
      }

      var json;
      if (data[2]) {
        try {
          json = JSON.parse(data[2]);
        } catch (err) {
          console.log('Second argument must be valid JSON');
          M.log.error(err);
          cb();
          return;
        }
      }

      that.entry.post(data[1], json);
      cb();
      return;
    default:
      console.log('Unknown command: ' + data[0]);

      cb();
      return;
  }

  M.log.unhandled('This should never happen!');

  return cb();

  function onSpace(err, space) {  // {{{3
    if (err) {
      console.log('Space not found', line, err);
    } else {
      that.space = space;
      delete that.shard;
      delete that.entry;

      console.log('Selected space', that.space.name);
    }

    cb();
  };

  function onShard(err, shard) {  // {{{3
    if (err) {
      console.log('No shard selected!', line, err);
    } else {
      that.shard = shard;
      delete that.entry;

      console.log('Selected shard: ', that.space.name, that.shard.alias || that.shard.sid);
    }

    cb();
  };

  function onEntry(err, entry) {  // {{{3
    if (err) {
      console.log('Entry not selected!', line, err);
    } else {
      that.entry = entry;
      console.log('Selected entry: ', that.space.name, that.shard.alias || that.shard.sid, that.entry.id);
    }

    cb();
  };

  function onAction(resp) {  // {{{3
    console.log('Action processed', resp);

    cb();
  }

  // }}}
};

function readScript(that, script) {  // {{{2
  doIt();

  function doIt() {  // {{{3
    if ('scriptPos' in that) {
      that.scriptPos++;
    } else {
      M.log.notice('Starting CLI script ...');
      that.scriptPos = 0;
    }

    if (that.scriptPos >= script.length) {
      M.log.notice('CLI script finished.');
      that.iface.prompt();
      return;
    }

    var line = script[that.scriptPos];

    if (Array.isArray(line)) {
      var text = '';
      for (var i = 0; i < line.length; i++) {
        var param = line[i];

        switch (typeof param) {
          case 'object':
            text += JSON.stringify(param)
            text += ' ';
            break;
          case 'string':
            text += param;
            text += ' ';
            break;
          default:
            throw new Error('Unhandled ' + JSON.stringify(param));
        }
      }

      line = text;
    }

    console.log(line);
    that.iface.prompt();

    readCommand(that, line, onDone);
  }

  function onDone() {  // {{{3
    that.iface.prompt();

    doIt();
  }

  // }}}
};

// }}}1
