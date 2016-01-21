'use strict';

const Fs = require('fs');
const Program = require('commander');
const Micro = require('microtime');

//process.on('uncaughtException', onError);
process.on('SIGABRT', terminate);
process.on('SIGINT', terminate);
process.on('SIGTERM', terminate);
process.on('SIGHUP', terminate);
process.on('SIGBREAK', terminate);
process.on('SIGQUIT', terminate);

require('./wrap').setup('node');

const O = new (require('./wrap'))(module);
O.extendO('now', now);
O.extendO('exit', exit);
O.extendO('readSslConfig', readSslConfig);

/** Doc {{{1
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
      extend(config, JSON.parse(Program.configData));
    }

    O.run(config);
  }

  function extend(config, ext) {  // {{{3
    for (var key in ext) {
      var c = config[key];

      if (typeof c === 'object') {
        extend(c, ext[key]);
      } else {
        config[key] = ext[key];
      }
    }
  }

  // }}}3
};

// Private {{{1
function now() {  // {{{2
  return Micro.now();
};

function exit(val) {  // {{{2
  process.exit(1);
};

function onError(err) {  // Global error handler, Exits process on uncaught exception. {{{2
  O.log.error(err);

  terminate();
};

function terminate(val) {  // {{{2
  O.quit();
};

function readSslConfig(config, deps) {  // {{{2
  var ssl = {};
  O.extendO('ssl', ssl);

  deps.add('core', function(cb) {
    Fs.readFile(config.key, function(err, val) {
      if (err) {
        cb(err);
        return;
      }

      ssl.key = val;
      cb();
      return;
    });
  });

  deps.add('core', function(cb) {
    Fs.readFile(config.cert, function(err, val) {
      if (err) {
        cb(err);
        return;
      }

      ssl.cert = val;
      cb();
      return;
    });
  });
};

