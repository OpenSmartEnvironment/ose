'use strict';

var Fs = require('fs');
var Program = require('commander');
var Micro = require('microtime');

var Ose = require('ose');
Ose.now = now;
Ose.resolvePackage = resolvePackage;
Ose.addClass('EventEmitter', require('events').EventEmitter);
Ose.setup('node');

var M = Ose.module(module);

process.on('uncaughtException', onError);

/** Docs {{{1
 * @module ose
 */

/**
 * @caption OSE node
 *
 * @readme
 * This module contains the OSE framework initialization in the Node.js.
 *
 * @class ose.lib.node
 * @type module
 */

// }}}1
// Public {{{1
exports.run = function() {  // {{{2
  Program
    .version('0.0.1')
    .option('-c, --config [file]', 'Configuration file')
    .option('-C, --config-data [JSON]', 'Configuration data')
    .parse(process.argv)
  ;

  if (! (Program.config || Program.configData)) {
    console.error('No --config option was found!');

    Program.help();
  }

  if (Program.config) {
    Fs.realpath(Program.config, onPath);
  } else {
    onPath();
  }

  function onPath(err, path) {  // Full path of config file name is resolved. {{{3
    if (err) throw err;

    var config = require(path);

    if (Program.configData) {
      Ose.plugins.extend(config, JSON.parse(Program.configData));
    }

    Ose.plugins.config(config);
  };

  // }}}3
};

// }}}1
// Private {{{1
function resolvePackage(m) {  // {{{2
  var n = m.module.filename.split('/');
  n.pop();

  if (n[n.length - 1] === 'lib') {
    n.pop();
  }

  m.path = n.join('/');

  try {
    var json = JSON.parse(Fs.readFileSync(m.path + '/package.json', 'utf8'));
    m.name = json.name;
  } catch (err) {
    M.log.warn('There is no "package.json" file for this package module', m.module.id);
    m.name = m.module.id;
  }

};

function now() {  // {{{2
  return Micro.now();
};

function onError(err) {  // Global error handler, Exits process on uncaught exception. {{{2
  M.log.error(err);

  process.exit(1);
};

// }}}1
