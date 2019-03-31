import $ from 'jquery'; // with color plugin
import { now } from './utils';

/**
 * @typedef Video
 * @prop {string} url
 * @prop {valueof VID_TYPES} string
 */

/**
 * @typedef Response
 * @prop {boolean} response - repeat or not
 * @prop {number} startMsec - msec since first video started that this video started
 * @prop {number} durationMsec - msec between the video starting to play and it ending
 * @prop {MementoError} [error]
 * must satisfy the condition !((response != null) && error)
 */

/**
 * @typedef MementoError
 * @prop {number} [code] - numeric error code
 * @prop {string} [text] - description of the error
 * @prop {string} [where] - what function the error was thrown in
 */

/**
 * @enum { 'done' | 'error' | 'fail' } EndReason
 */

// constants
const VID_TYPES = {
  TARGET_REPEAT: "target_repeat",
  VIG_REPEAT: "vig_repeat",
  VIG: "vig",
  TARGET: "target",
  FILLER: "filler",
}

// ui configuration options
const NUM_LOAD_AHEAD = 4;
const MAX_SKIPS_IN_ROW = 3;
const VID_CHANGE_LAG_MSEC = 200;
const MAX_VID_DUR_SEC = 3;

// settings for vigilance checks
const REQ_ACCURACIES = {
  PREFIX_VIG: .5,
  PREFIX_NON_REPEAT: .5,
  FIRST_QUARTER_VIG: .6,
  FIRST_QUARTER_NON_REPEAT: .55
}
// time range in which you can fail early, in seconds
const FAIL_EARLY_ELIGIBLE = [30, 120];
// if the video takes longer than this to finish we assume it freezed
const MAX_LOAD_MSEC = 15000;

/**
 * @return {boolean} whether or not the video is a repeat
 */
function isRepeat($video) {
  const curVidType = $video.data('vidType');
  return (
    curVidType === VID_TYPES.VIG_REPEAT)
    || (curVidType === VID_TYPES.TARGET_REPEAT
  );
}

/**
 * Runs the memento game
 * Calls a callback with the user's responses when done
 * @param {Video[]} videos 
 * @param {({ responses: Response[], endReason: EndReason }) => void} onDone 
 */
export default function showTask(videos, onDone) {
  // get DOM references
  const $progressBar = $("#progress-bar > .ui.progress");
  const $mainInterface = $('#main-interface');
  const $videoContainer = $('#video_container');

  // state
  const videoElements = []; // jQuery video elements
  let counter = 0; // index in transcripts of next video to load
  let checked = false; // don't check video at end if already checked
  const gameStartMsecDefault = (new Date).getTime(); // a default is needed in case a video never loads
  let gameStartMsec = gameStartMsecDefault; // when the first video started playing (absolute)
  let videoStartMsec = 0; // when the current video started playing, relative to game start
  let numSkipsInRow = 0; // we skip videos sometimes to dodge bugs but need to limit this
  let done = false;

  // task data
  const responses = [];
  let errorEnd = false; // whether or not the game ended due to an error

  /**
   * Signal the end of the task, passing task data to the callback
   */
  function submitData() {
    if (done) return;
    done = true;
    let endReason = 'done';
    if (errorEnd) {
      endReason = 'error';
    } else if (responses.length < videos.length) {
      endReason = 'fail';
    }
    onDone({
      responses,
      endReason
    });
  }

  // number right and number seen for each vid type
  // used to kick people out early
  const fracs = {};
  Object.keys(VID_TYPES).forEach((key) => {
    fracs[VID_TYPES[key]] = [0, 0];
  });
  function updateFrac(frac, right) {
    frac[1] += 1;
    if (right) {
      frac[0] += 1;
    }
  }

  /**
   * Early fail condition
   * After two vigilance repeats, if you missed both
   * or false positived on both initial presentations
   * you are out!
   */
  function earlyFail() {
    const vigFrac = fracs[VID_TYPES.VIG];
    const vigRepeatFrac = fracs[VID_TYPES.VIG_REPEAT];
    if (vigRepeatFrac[1] === 2) {
      return (
        vigRepeatFrac[0] / vigRepeatFrac[1] < REQ_ACCURACIES.PREFIX_VIG
        || vigFrac[0] / vigFrac[1] < REQ_ACCURACIES.PREFIX_NON_REPEAT
      );
    }
    const gameTimeMsec = now() - gameStartMsec;
    if (gameTimeMsec > FAIL_EARLY_ELIGIBLE[0] * 1000 && gameTimeMsec < FAIL_EARLY_ELIGIBLE[1] * 1000) {
      const nonDupFrac = [VID_TYPES.FILLER, VID_TYPES.TARGET, VID_TYPES.VIG]
        .reduce((frac, key) => {
          return [frac[0] + fracs[key][0], frac[1] + fracs[key][1]];
        }, [0, 0]);
      return (
        vigRepeatFrac[0] / vigRepeatFrac[1] < REQ_ACCURACIES.FIRST_QUARTER_VIG
        || nonDupFrac[0] / nonDupFrac[1] < REQ_ACCURACIES.FIRST_QUARTER_NON_REPEAT
      );
    }
  }

  /**
   * Call at the end of the video or when the user presses spacebar
   * @param {boolean} response user says is or isn't repeat
   * @param {boolean} showFeedback whether or not to show right or wrong
   */
  function handleCheck(response, showFeedback) {
    if (checked) return;
    checked = true;

    const $video = videoElements[0];
    responses.push({
      response: response,
      startMsec: videoStartMsec,
      durationMsec: now() - (videoStartMsec + gameStartMsec)
    });
    const right = isRepeat($video) === response;
    updateFrac(fracs[$video.data('vidType')], right);

    // if they detected a repeat, jump to the next video after a small delay
    if (right) {
      setTimeout(() => {
        if (videoElements[0] === $video) { // the video may have ended by now
          playNextVideo();
        }
      }, VID_CHANGE_LAG_MSEC);
    }

    if (showFeedback) {
      // we are using jQuery animations because CSS animations have flaky support
      const bgColor = right ? 'rgba(0, 255, 0, 0.25)' : 'rgba(255, 0, 0, 0.25)';
      $mainInterface.stop().css('background-color', bgColor)
        .animate({ 'background-color': 'rgba(255, 255, 255, 0)' }, 500);
    }
    
    numSkipsInRow = 0;
  }

  /**
   * Call when a video has an error and it must be skipped or the game must end
   * Saves the error to the responses array
   * @param {MementoError} error 
   */
  function saveErrorResponse(error) {
    if (checked) return;
    checked = true;
    responses.push({
      response: null,
      startMsec: videoStartMsec,
      durationMsec: now() - (videoStartMsec + gameStartMsec),
      error: error
    });
  }

  /**
   * Call when a video throws a error to log the occurrence and skip the video
   * @param {MementoError} error
   */
  function skipOnError(error) {
    saveErrorResponse(error);
    playNextVideo();
    numSkipsInRow += 1;
  }

  /**
   * Remove the current video from the DOM
   * Play the next one
   * Queue up another video
   */
  function playNextVideo() {
    // remove current video
    const $oldVideo = videoElements[0];
    $oldVideo.off('ended'); // sometimes it gets called again
    $oldVideo.off('timeupdate');
    $oldVideo.remove();

    if (earlyFail()) {
      submitData(); // fail
      return;
    }

    // play next video
    videoElements.shift();
    window.focus()
    if (videoElements.length > 0) {
      // queue up another video
      if (counter < videos.length) {
        newVideo(videos[counter]);
      }
      counter += 1;
      checked = false;
      // play the next video
      playWhenReady(videoElements[0]);
      // update progress bar
      $progressBar.progress("set progress", counter - NUM_LOAD_AHEAD);
      // update state
    } else {
      submitData(); // done
    }
  }

  /**
   * Adds a new video element to the DOM
   * @param {Video} video
   */
  function newVideo(video) {
    const $video = $("<video></video>");
    $video.attr('src', video.url);
    $video.attr('controls', null);
    $video.data('vidType', video.type);
    $video.prop('muted', true);
    $video.html('Your browser does not support HTML5 video.');
    $video.attr('playsinline', 'playsinline'); // needed by iOS
    $video[0].load(); // needed by iOS
    $video.css('visibility', 'hidden');
    $videoContainer.append($video);
    window.objectFitPolyfill($video); // polyfill
    videoElements.push($video);

    // handle video end (some videos are slightly less than 3sec)
    $video.on('ended', () => {
      // check for missed repeat
      handleCheck(false, false);
      // remove active video
      playNextVideo();
    });
    // handle video end (some videos are more than 3sec)
    $video.on('timeupdate', () => {
      if ($video[0].currentTime >= MAX_VID_DUR_SEC) {
        $video.trigger('ended');
      }
    });
  }

  /**
   * Plays the video element when it is ready, handling errors
   * @param {$.Element<HTMLVideoElement>} $video 
   */
  function playWhenReady($video) {
    let playing = false;

    function onError() {
      playing = false;
      const error = $video[0].error;
      const maybeBadVideo = error.code !== MediaError.MEDIA_ERR_NETWORK;
      if (maybeBadVideo && numSkipsInRow < MAX_SKIPS_IN_ROW) {
        skipOnError({
          code: error.code,
          text: error.message,
          where: 'playWhenReady'
        });
      } else {
        // network error -- repeatedly try to reload
        setTimeout(() => {
          $video[0].load();
          playIfReady();
        }, 3000);
      }
    }

    function playIfReady() {
      if ($video[0].readyState == 4) {
        playing = true;
        $("#vid-loading-dimmer").addClass('disabled').removeClass('active');
        $video.css('visibility', 'visible');
        if (gameStartMsec === gameStartMsecDefault) {
          gameStartMsec = now();
        }
        videoStartMsec = now() - gameStartMsec;
        const playPromise = $video[0].play();
        if (playPromise) { // IE returns nothing
          playPromise.catch((err) => {
            playing = false;
            if (numSkipsInRow < MAX_SKIPS_IN_ROW) {
              skipOnError({
                code: err.code,
                text: err.message,
                where: 'playIfReady -> video.play'
              });
            } else {
              saveErrorResponse({
                code: err.code,
                text: err.message,
                where: 'playIfReady -> video.play'
              });
              errorEnd = true;
              submitData(); // error
            }
          });
        }
      } else if ($video[0].error) {
        onError();
      } else {
        // show loading
        $("#vid-loading-dimmer").addClass('active').removeClass('disabled');
      }
    }

    function detectFreeze() {
      if (videoElements[0] === $video) {
        const err = {
          code: 0,
          text: 'The video froze',
          where: 'playWhenReady -> setTimeout'
        };
        if (numSkipsInRow < MAX_SKIPS_IN_ROW) {
          skipOnError(err);
        } else {
          $.get({
            url: '/api',
            timeout: 3000
          }) // check if we can reach the server
            .then(() => { // we can: we got too many bad videos in a row, so end the game
              if (!playing) { // if video has started playing, we don't want to fail
                saveErrorResponse(err);
                errorEnd = true;
                submitData(); // error
              }
            })
            .catch(() => { // we can't: keep waiting for network to come back
              $video[0].load();
              setTimeout(detectFreeze, MAX_LOAD_MSEC);
            });
        }
      }
    }

    $video.on('error', onError);
    $video.on('canplaythrough', playIfReady);
    playIfReady();
    setTimeout(detectFreeze, MAX_LOAD_MSEC);
  }

  // HANDLE KEYPRESS (Spacebar)
  document.onkeydown = function (e) {
    if (e.keyCode == 32 && videoElements.length > 0 && videoElements[0][0].playing) {
      e.preventDefault(); // don't move page
      handleCheck(true, true);
    }
  }
  // Handle tap video (for mobile)
  $('#video_container').on('touchstart', () => {
    handleCheck(true, true);
  });

  $progressBar.progress({ total: videos.length });

  // preload videos and start game
  const numVidsToLoad = Math.min(1 + NUM_LOAD_AHEAD, videos.length);
  for (counter; counter < numVidsToLoad; counter += 1) {
    newVideo(videos[counter]);
  }
  playWhenReady(videoElements[0]);
}
