'use strict';

var O = require('ose').module(module);

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
 *       id: 'ose/lib/cli',
 *       script: {
 *         'wait 10000',
 *         'space klinec.snasel.net',
 *         'shard d1',
 *         'entry kitchen.heater',
 *         'command power 0.23',
 *         'entry living.light',
 *         'command switch "on"',
 *         'info',
 *         'detail'
 *       }
 *     }
 *
 * @class ose.lib.cli
 * @type module
 */

/**
 * Readline interface
 *
 * @property iface
 * @type Object
 */

// Public {{{1

exports.config = function(key, val, deps) {  // {{{2
  var that = this;

  this.iface = Readline.createInterface(process.stdin, process.stdout, null);
  this.iface.on('line', onLine.bind(this));
  this.iface.on('close', onClose.bind(this));
  this.iface.on('error', onError.bind(this));
  this.iface.setPrompt(O.here.name + '> ');

  deps.add({after: 'finish'}, function(cb) {
    cb();

    O.async.setImmediate(function() {
      that.iface.prompt();

      if (val.script) {
        readScript(that, val.script);
      }
    });
  });
}

// }}}1
// Event Handlers {{{1
function onLine(line) {  // {{{2
//  console.log('CLI DATA', data);

  var that = this;

  readCommand(this, line, function(err) {
    if (err) O.log.error(err);

    that.iface.prompt();
  });
}

function onClose() {  // {{{2
  O.quit();
};

function onError(err) {  // {{{2
  O.log.unhandled('CLI error', err);
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
      console.log('');
      setTimeout(cb, timeout);
      return true;
    case 'scope':
      that.scope = O.getScope(data[1]);
      if (that.scope) {
        console.log('Selected scope: ', that.scope.name);
      } else {
        console.log('Unknown scope', data);
      }

      return cb();
    case 'space':
      return O.getSpace(data[1], onSpace);
    case 'shard':
      if (! that.space) {
        console.log('Space must be selected before selecting shard!');
        return cb();
      }

      var i = parseInt(data[1]);
      if (isNaN(i)) {
        return that.space.findShard(data[1], onShard);
      }
      return that.space.findShard(i, onShard);
    case 'query':
      if (! that.shard) {
        console.log('Shard must be selected before querying!');
        return cb();
      }

      var json;
      if (data.length > 2) {
        try {
          json = JSON.parse(data.slice(2).join(' '));
        } catch (err) {
          return cb(err);
        }
      }

      return that.shard.query(data[1], json, function(err, view) {
        if (err) return cb(err);

        console.log('Query response', view);
        return cb();
      });
    case 'entry':
      if (! that.shard) {
        console.log('Shard must be selected before selecting entry!');
        return cb();
      }

      var i = parseInt(data[1]);
      if (isNaN(i)) {
        return that.shard.find(data[1], onEntry);
      }

      return that.shard.get(i, onEntry);
    case 'detail':
      if (! that.entry) {
        console.log('No entry selected!');
        return cb();
      }

      console.log('Entry:', that.entry.id, JSON.stringify({
        kind: that.entry.kind.name,
        drev: that.entry.drev,
        srev: that.entry.srev,
        dtc: that.entry.dtc,
        stc: that.entry.dtc,
      }, null, 2));

      console.log('Data:', JSON.stringify(
        that.entry.dval
      , null, 2));

      console.log('State:', JSON.stringify(
        that.entry.sval
      , null, 2));

      console.log('Slaves:',
        that.entry.slaves ?
          JSON.stringify(Object.getOwnPropertyNames(that.entry.slaves), null, 2) :
          'undefined'
      );

      return cb();
    case 'info':
      console.log(JSON.stringify({
        space: that.space ? that.space.name: null,
        shard: that.shard ? {
          id: that.shard.id,
          alias: that.shard.alias,
          scope: that.shard.scope.name,
          atHome: that.shard.isAtHome(),
        } : null,
        entry: that.entry ? {
          id: that.entry.id,
          kind: that.entry.kind.name,
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
      if (data.length > 2) {
        json = data.slice(2).join(' ');
        try {
          json = JSON.parse(json);
        } catch (err) {
          console.log('Second argument must be valid JSON');
          O.log.error(err);
          cb();
          return;
        }
      }

      that.entry.post(data[1], json, function(err, resp) {
        if (err) {
          O.log.error(err);
        } else {
          console.log('Command response:', resp);
        }

        cb();
      });
      return;
    default:
      console.log('Unknown command: ' + data[0]);

      cb();
      return;
  }

  O.log.unhandled('This should never happen!');

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
      O.log.error(err);
    } else {
      that.shard = shard;
      delete that.entry;

      console.log('Selected shard: ', that.space.name, that.shard.alias || that.shard.id);
    }

    cb();
  };

  function onAlias(err, map) {  // {{{3
    console.log('ENTRY COMMAND RESPONSE', err, map);
  }

  function onEntry(err, entry) {  // {{{3
    if (err) {
      console.log('Entry not selected!', line, err);
    } else {
      that.entry = entry;
      console.log('Selected entry: ', that.space.name, that.shard.alias || that.shard.id, that.entry.id);
    }

    cb();
  }

  function onAction(resp) {  // {{{3
    console.log('Action processed', resp);

    cb();
  }

  // }}}
};

function readScript(that, script) {  // {{{2
  doIt();

  function doIt() {
    if ('scriptPos' in that) {
      that.scriptPos++;
    } else {
      O.log.notice('Starting CLI script ...');
      that.scriptPos = 0;
    }

    if (that.scriptPos >= script.length) {
      O.log.notice('CLI script finished.');
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

    readCommand(that, line, function(err) {
      if (err) {
        return O.log.error(err);
      }

      that.iface.prompt();

      return doIt();
    });
  }
};

// }}}1
