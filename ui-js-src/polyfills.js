/**
 * Adds support for features that we need that are not supported
 * by some target browsers
 */

import 'babel-polyfill';
import 'url-search-params-polyfill';
import 'objectFitPolyfill'; // adds window.objectFitPolyfill

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(search, this_len) {
      if (this_len === undefined || this_len > this.length) {
          this_len = this.length;
      }
      return this.substring(this_len - search.length, this_len) === search;
  };
}

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
