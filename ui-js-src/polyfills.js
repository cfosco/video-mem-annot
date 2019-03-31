/**
 * Adds support for features that we need that are not supported
 * by some target browsers
 */

import '@babel/polyfill';
import 'url-search-params-polyfill';
import 'objectFitPolyfill'; // adds window.objectFitPolyfill

// add playing property to video elements
// okay, this isn't part of the spec, but it's useful
Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
  get: function() {
    return !!(
      this.currentTime > 0
      && !this.paused
      && !this.ended
      && this.readyState > 2
    );
  }
});
