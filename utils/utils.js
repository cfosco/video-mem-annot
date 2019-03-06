const assert = require('assert');

/**
 * @param {number} duration in seconds, < 24hrs
 * @return {string} SQL-legible duration string
 */
function secToHMS(duration) {
  const rawHours = duration / (60 * 60);
  assert(rawHours < 24, 'Duration must be less than 24 hours.');

  let seconds = Math.floor(duration % 60);
  let minutes = Math.floor((duration / 60) % 60);
  let hours = Math.floor(rawHours % 24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds;
}

module.exports = {
  secToHMS
};
