'use strict';

/** Docs {{{1
 * @module ose
 * @submodule ose.peer
 */

/**
 * @caption WebSocket browser worker
 *
 * @readme
 * Worker object that isolates the [WebSocket wrapper] timer from the
 * `window` object in the browser. A workaround for better (but still
 * not correct!) timer behaviour in the Android environmnent while
 * sleeping.
 *
 * @class ose.lib.ws.worker
 * @type module
 */

// Public {{{1
onmessage = function(ev) {
  switch (ev.data) {
    case 'open':
      setInterval(onTime, 10000);
      self.postMessage('open');

      break;
    default:
      throw new Error('Invalid message! ' + JSON.stringify(ev.data));
  }
};

function onTime() {
  self.postMessage('time');
};

