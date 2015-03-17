/*/ CHECK {{{1
var OLD = {};
OLD.configExt = function(config) {  // {{{2
/ **
 * Extends config method.in Node.js.
 *
 * @param config {Object} Configuration data
 *
 * @method configExt
 * 

  this.browserScript = config.browserScript;

  if (config.ssl) {
    this.ssl = config.ssl;
  }
};

OLD.readSsl = function(cb) {  // {{{2
/ **
 * Reads ssl certificates
 *
 * @param cb {Function} Callback called when certificates are read.
 *
 * @async
 * @method readSsl
 * /

  if (this.ssl) {
    var counter = this.counter();
    Fs.readFile(this.ssl.key, counter.bind('key'));
    Fs.readFile(this.ssl.cert, counter.bind('cert'));
    counter.done(cb);
  } else {
    cb(O.error(this, 'missingSslConfig'));
  }
};

// }}}1*/

