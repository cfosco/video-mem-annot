function secToHMS(duration) {
  let seconds = parseInt(duration % 60);
  let minutes = parseInt((duration / 60) % 60);
  let hours = parseInt((duration / (60 * 60)) % 24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds;
}

module.exports = {
  secToHMS
};
