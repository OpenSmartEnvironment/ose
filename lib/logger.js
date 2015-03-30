'use strict';

var O = require('ose').class(module, C);

/** Doc {{{1
 * @caption Logging and error handling
 *
 * @readme
 *
 * Logging is implemented in the OSE framework in the [Logger] class.
 * Currently messages are logged simply using `console.log()`.
 *
 * Error handling tries to adhere to the production practices outlined
 * by Joyent ([Error Handling in
 * Node.js](http://www.joyent.com/developers/node/design/errors)).
 *
 * @description
 *
 * ## Usage
 *
 * Example module :
 *
 *     'use strict';
 *
 *     var O = require('ose').module(module);
 *     ...
 *     O.log.info('Processing');
 *
 * To create an error, it is possible to use `O.error()`, which
 * appends optional `subject`, `code`, `message` and `data` to the
 * error object. These parameters make it easier to analyse
 * problems. If an error is logged, `subject.identify()`, if defined,
 * is used to display subject identification.
 *
 * Example:
 *
 *     var err = O.error(subject, 'Something has gone terribly wrong.', arguments);
 *     ...
 *
 *     // To log an error:
 *     O.log.error(err);
 *
 *     // or to use an error in callback:
 *     cb(err);
 *
 *     // or to throw an error:
 *     throw err;
 *
 *     // or send an error to a link:
 *     O.link.error(socket, err);
 *
 * When calling any callback with an error response, sending an error
 * to a link, or throwing an exception, an `Error` instance created by
 * `O.error()` or another error instance must be used.
 *
 * TODO: Describe suppression of recurrent errors
 *
 * @aliases error logging
 * @module ose
 * @submodule ose.logger
 */

/**
 * @caption Logger
 *
 * @class ose.lib.logger
 * @type class
 */

/**
 * Logging namespace
 *
 * @property context
 * @type String
 */

// Public {{{1
exports.dontLogThis = {};

function C(context) {  // {{{2
/**
 * Class constructor
 *
 * @param context {String} Context of logger instance
 *
 * @method constructor
 */

  this.context = context;
};

exports.interval = function(message, data) {  // {{{2
/**
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged
 *
 * @method interval
 */

  var now = new Date().getTime();

  this.log('debug', message, {
    interval: now - (this.lastInterval || now),
    data: data
  });

  this.lastInterval = now;
};

exports.obsolete = function(message, data) {  // {{{2
/**
 * Use when obsolete code is executed.
 * Displays message with data and stack trace.
 *
 * @param message {String} Message to be logged
 * @param [data] {*} Optional data to be logged
 *
 * @method obsolete
 */

  this.log('unhandled', 'Obsolete: ' + message, data);
  console.trace();
};

exports.todo = function(message, subject, data) {  // {{{2
/**
 * Use this method to indicate an intention to do something in the future.
 *
 * @param message {String} Message to be logged
 * @param [subject] {String} Subject to be logged
 * @param [data] {*} Optional data to be logged
 *
 * @method todo
 */

  var result = new Error(message);

  result.code = 'TODO';
  if (subject) {
    result.subject = subject;
  }
  if (data) {
    result._data = data;
  }

  this.error(result);

  return result;
};

exports.caught = function(err, message, data) {  // {{{2
/**
 * Use when an error object is caught
 *
 * @param err {Object} Error object
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged

 * @method caught
 */

  this.log('error', message, data);
  this.error(err);
//  console.trace();

//  this.log(err);
};

exports.bind = function(severity, message, data) {  // {{{2
/**
 * Creates logging function
 *
 * @param severity {String} Text indicating everity
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged
 *
 * @returns {Function} Logging function
 *
 * @method bind
 */

  var that = this;

  return function(data) {
    that.log(severity, message, data);
  };
};

exports.debug = function(message, data) {  // {{{2
/**
 * Log message with 'debug' severity.
 *
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged
 *
 * @method debug
 */

  this.log('debug', message, data);
};

exports.info = function(message, data) {  // {{{2
/**
 * Log message with 'info' severity.
 *
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged
 *
 * @method info
 */

  this.log('info', message, data);
};

exports.notice = function(message, data) {  // {{{2
/**
 * Log message with 'notice' severity.
 *
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged
 *
 * @method notice
 */

  this.log('notice', message, data);
};

exports.warning = exports.warn = function(message, data) {  // {{{2
/**
 * Log message with 'warning' severity.
 *
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged
 *
 * @method warning
 */

  this.log('warning', message, data);
};

exports.error = exports.err = function(err, message, count) {  // {{{2
/**
 * Log error object with the ability to suppress recurrent errors.
 *
 * @param err {Object} Error object
 * @param [message] {String} Error message
 * @param [count] {Number} Maximum number of recurrent errors for the same subject and error code
 *
 * @returns {Object} Error object
 *
 * @method error
 */

  if (! (err instanceof Error)) {
    err = O.error.apply(O, arguments);
  }

  var that = this;
  switch (arguments.length) {
  case 1:
  case 4:
    doit();
    return err;
  case 6:
    count = arguments[6];
    // NO BREAK
  case 5:
    message = arguments[5];
    // NO BREAK
  case 2:
  case 3:
    if (count) {
      if (! err.subject) {
        doit();
        break;
      }

      if (this.isSuppressed(err.subject, err.code, count)) {
        return;
      }
    }

    this.log('error', message, {ident: err.ident, code: err.code, message: err.message, data: err._data});
    return err;
  }

  doit();
  throw O.error(this, 'Invalid arguments', arguments);

  function doit() {
    console.log('========================================================');
    that.log('error', err.code, err.message);

    if ('_data' in err) {
      console.log('Data:', err._data);
    }

    if (err.subject && err.subject.O) {
      console.log('Class Name:', err.subject.O.module.id);
    }

    if (err.ident) {
      console.log('Identity:', err.ident);
    }

    console.log('Stack Trace:');
    console.log(err.stack);
    console.log('--------------------------------------------------------');

    console.log('Logged at:');
    console.trace();
    console.log('========================================================');
  }
};

exports.unhandled = function(message, data) {  // {{{2
/** TODO: Throw exceptions intead.
 * Log unhandled error object  with optional data
 *
 * @param message {String} Message to be logged
 * @param [data] {*} Optional data to be logged
 *
 * @method unhandled
 * @deprecated
 */

  this.log('unhandled', message, data);
  console.trace();
};

exports.log = function(severity, message, data) {  // {{{2
/**
 * Displays log message to stdout
 *
 * @param severity {String} Text indicating everity
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged
 *
 * @method log
 */

  if (severity in Inverted) {
    severity = Inverted[severity];
  }

  if (! severity in Severities) {
    this.error('Invalid severity', severity, message);
    severity = 'none';
  }

  if (data === undefined) {
    console.log(
      Math.round(new Date().getTime() / 1000),
      severity.toUpperCase() +
        ' | ' + this.context +
        ' | ' + message
    );
    return;
  }

  console.log(
    Math.round(new Date().getTime() / 1000),
    severity.toUpperCase() +
      ' | ' + this.context +
      ' | ' + message +
      (data !== undefined ? ' |' : '')
    ,
    data !== undefined ? data : ''
  );
  return;
};

exports.isSuppressed = function(subject, code, count) {  // {{{2
/**
 * Check whether an error with a given subject and error code is suppressed
 *
 * @param subject {Object} Error subject
 * @param code {String} Error code
 * @param count {Number} Maximum number of recurrent errors for the same subject and error code
 *
 * @returns {Boolean} Whether error is suppressed
 *
 * @method isSuppressed
 */

  if (! code) code = 'DEFAULT';

  if (! subject._suppressError) {
    subject._suppressError = {};
  }
  var c = subject._suppressError[code] || 1;
  if (c > count) {
    return true;
  }

  if (c === count) {
    console.log('Suppressing the following message, already logged', c, 'times');
  }
  subject._suppressError[code] = c + 1;

  return false;
};

exports.liftSuppress = function(subject) {  // {{{2
/**
 * Remove suppressing error messages from subject
 *
 * @param subject {Object} Subject of error to to have logging enabled
 *
 * @method liftSuppress
 */

  delete subject._suppressError;
};

// }}}1
// Private  {{{1
var Severities = {  // {{{2
  none: 0, //dark grey
  debug: 1, //light grey
  info: 2, //light grey
  notice: 3, //brown
  warning: 4, //yellow
  warn: 4, //yellow
  error: 5, //light red
  critical: 6, //ligh tred
  crit: 6, //light red
  alert: 7, //red
  fatal: 8, //red
  emergency: 9, //red
  emerg: 9, //red
  unhandled: 10, //red
  catch: 11 //red
};

var Inverted = O._.invert(Severities);

// }}}1
