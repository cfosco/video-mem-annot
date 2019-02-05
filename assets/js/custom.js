var custom = {

  loadTasks: function (numSubtasks) {
    /*
     * This function is called on page load and should implement the promise interface
     *
     * numSubtasks - int indicating what length array to return (how many subtasks this task should have)
     *
     * returns: if config.meta.aggregate is set to false, an array of objects with length config.meta.numTasks,
     * one object for each task; else, an object that will be made available to all subtasks
     */
    return $.get("").then(function () {
      return [];
    });
  },

  showTask: function (taskInput, taskIndex, taskOutput) {
    /*
     * This function is called when the experiment view is unhidden
     * or when the task index is changed
     *
     * taskInput - if config.meta.aggregate is false, the object in the array from loadTasks
     *   corresponding to subtask taskIndex; else, the input object from loadTasks
     * taskIndex - the number of the current subtask
     * taskOutput - a partially filled out task corresponding to the subtask taskIndex
     *   If config.meta.aggregate is set to false, this is the results object for the current
     *   subtask. If config.meta.aggregate is set to true, this is the results object for the
     *   entire task.
     *
     * returns: None
     */

    // $(".exp-data").text("Input for task " + taskInput.toString());
    // $("#exp-input").val(taskOutput);
    // $("#exp-input").focus();
    // if (taskIndex == 1) {
    //     hideIfNotAccepted();
    // }

    // string[] -- urls for videos composing a 3-5 minute "movie" of 3s clips
    // TODO: get these on the server
    var transcripts = [
      "https://www.dropbox.com/s/zvdmd1amf1bcy2r/flickr-0-5-6-10568583056_3.mp4?raw=1",
      "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1",
      "https://www.dropbox.com/s/dtw1n4pr5hi23ki/bulldozer-clears-road-and-military-assist-in-rebuilding-bridge-video-id1B011458_0005.mp4?raw=1",
      "https://www.dropbox.com/s/evo48ad638e1j95/getty-at-the-police-officers-gesture-the-bulldozer-smashes-its-shovel-into-video-id654455954_31.mp4?raw=1",
      "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1",
      "https://www.dropbox.com/s/cqntd1ngxpn8xm7/flickr-1-7-2-1-3-6-9-0-19617213690_2.mp4?raw=1",
      "https://www.dropbox.com/s/zvdmd1amf1bcy2r/flickr-0-5-6-10568583056_3.mp4?raw=1",
      "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1",
      "https://www.dropbox.com/s/dtw1n4pr5hi23ki/bulldozer-clears-road-and-military-assist-in-rebuilding-bridge-video-id1B011458_0005.mp4?raw=1",
      "https://www.dropbox.com/s/evo48ad638e1j95/getty-at-the-police-officers-gesture-the-bulldozer-smashes-its-shovel-into-video-id654455954_31.mp4?raw=1",
      "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1",
      "https://www.dropbox.com/s/cqntd1ngxpn8xm7/flickr-1-7-2-1-3-6-9-0-19617213690_2.mp4?raw=1",
      "https://www.dropbox.com/s/zvdmd1amf1bcy2r/flickr-0-5-6-10568583056_3.mp4?raw=1",
      "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1",
      "https://www.dropbox.com/s/dtw1n4pr5hi23ki/bulldozer-clears-road-and-military-assist-in-rebuilding-bridge-video-id1B011458_0005.mp4?raw=1",
      "https://www.dropbox.com/s/evo48ad638e1j95/getty-at-the-police-officers-gesture-the-bulldozer-smashes-its-shovel-into-video-id654455954_31.mp4?raw=1",
      "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1",
      "https://www.dropbox.com/s/cqntd1ngxpn8xm7/flickr-1-7-2-1-3-6-9-0-19617213690_2.mp4?raw=1",
      "https://www.dropbox.com/s/zvdmd1amf1bcy2r/flickr-0-5-6-10568583056_3.mp4?raw=1",
      "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1",
      "https://www.dropbox.com/s/dtw1n4pr5hi23ki/bulldozer-clears-road-and-military-assist-in-rebuilding-bridge-video-id1B011458_0005.mp4?raw=1",
      "https://www.dropbox.com/s/evo48ad638e1j95/getty-at-the-police-officers-gesture-the-bulldozer-smashes-its-shovel-into-video-id654455954_31.mp4?raw=1",
      "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1",
      "https://www.dropbox.com/s/cqntd1ngxpn8xm7/flickr-1-7-2-1-3-6-9-0-19617213690_2.mp4?raw=1",
      "https://www.dropbox.com/s/zvdmd1amf1bcy2r/flickr-0-5-6-10568583056_3.mp4?raw=1",
      "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1",
      "https://www.dropbox.com/s/dtw1n4pr5hi23ki/bulldozer-clears-road-and-military-assist-in-rebuilding-bridge-video-id1B011458_0005.mp4?raw=1",
      "https://www.dropbox.com/s/evo48ad638e1j95/getty-at-the-police-officers-gesture-the-bulldozer-smashes-its-shovel-into-video-id654455954_31.mp4?raw=1",
      "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1",
      "https://www.dropbox.com/s/cqntd1ngxpn8xm7/flickr-1-7-2-1-3-6-9-0-19617213690_2.mp4?raw=1",
      "https://www.dropbox.com/s/zvdmd1amf1bcy2r/flickr-0-5-6-10568583056_3.mp4?raw=1",
      "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1",
      "https://www.dropbox.com/s/dtw1n4pr5hi23ki/bulldozer-clears-road-and-military-assist-in-rebuilding-bridge-video-id1B011458_0005.mp4?raw=1",
      "https://www.dropbox.com/s/evo48ad638e1j95/getty-at-the-police-officers-gesture-the-bulldozer-smashes-its-shovel-into-video-id654455954_31.mp4?raw=1",
      "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1",
      "https://www.dropbox.com/s/cqntd1ngxpn8xm7/flickr-1-7-2-1-3-6-9-0-19617213690_2.mp4?raw=1",
      "https://www.dropbox.com/s/zvdmd1amf1bcy2r/flickr-0-5-6-10568583056_3.mp4?raw=1",
      "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1",
      "https://www.dropbox.com/s/dtw1n4pr5hi23ki/bulldozer-clears-road-and-military-assist-in-rebuilding-bridge-video-id1B011458_0005.mp4?raw=1",
      "https://www.dropbox.com/s/evo48ad638e1j95/getty-at-the-police-officers-gesture-the-bulldozer-smashes-its-shovel-into-video-id654455954_31.mp4?raw=1",
      "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1",
      "https://www.dropbox.com/s/cqntd1ngxpn8xm7/flickr-1-7-2-1-3-6-9-0-19617213690_2.mp4?raw=1",
    ]

    // constants
    var CLIP_DURATION = 3; // in seconds
    var NUM_LOAD_AHEAD = 4;

    // state
    var videoElements = [];
    var counter = 0; // index in transcripts of next video to load

    // adds a new video element to the DOM
    var videoContainer = document.getElementById('video_container');
    function newVideo(src) {
      var video = document.createElement('video');
      video.setAttribute('src', src);
      video.innerHTML = 'Your browser does not support HTML5 video.';
      videoContainer.appendChild(video);
      videoElements.push(video);

      video.ontimeupdate = function() {
        if (video.currentTime >= CLIP_DURATION) {
          video.ontimeupdate = function() {}; // sometimes it gets called again
          video.remove();
          videoElements.shift();
          if (videoElements.length > 0) {
            videoElements[0].play();
          }
          if (counter < transcripts.length) {
            newVideo(transcripts[counter]);
            counter += 1;
          }
        }
      }
    }

    // preload a few videos
    for (counter; counter < 1 + NUM_LOAD_AHEAD; counter += 1) {
      newVideo(transcripts[counter]);
    }

    /************************Actions*********************/
    // HANDLE KEYPRESS (R or Spacebar)
    document.onkeydown = function (e) {
      if (e.keyCode == 32 || e.keyCode == 82) {
        videoElements[0].currentTime = CLIP_DURATION; // trigger end
      }
    }

    //play
    var playBtn = document.getElementById('playButton');
    playBtn.onclick = function (e) {
      videoElements[0].play();
    }

    //pause
    var pauseBtn = document.getElementById('pauseButton');
    pauseBtn.onclick = function (e) {
      videoElements[0].pause();
    }

  },

  collectData: function (taskInput, taskIndex, taskOutput) {
    /*
     * This function should return the experiment data for the current task
     * as an object.
     *
     * taskInput - if config.meta.aggregate is false, the object in the array from loadTasks
     *   corresponding to subtask taskIndex; else, the input object from loadTasks
     * taskIndex - the number of the current subtask
     * taskOutput - outputs collected for the subtask taskIndex
     *   If config.meta.aggregate is set to false, this is the results object for the current
     *   subtask. If config.meta.aggregate is set to true, this is the results object for the
     *   entire task.
     *
     * returns: if config.meta.aggregate is false, any object that will be stored as the new
     *   taskOutput for this subtask in the overall array of taskOutputs. If
     *   config.meta.aggregate is true, an object with key-value pairs to be merged with the
     *   taskOutput object.
     */
    return $("#exp-input").val();
  },

  validateTask: function (taskInput, taskIndex, taskOutput) {
    /*
     * This function should return a falsey value if data stored in taskOutput is valid
     * (e.g. fully filled out), and otherwise an object {errorMessage: "string"}
     * containing an error message to display.
     *
     * If the errorMessage string has length 0, the data will still be marked as invalid and
     * the task will not be allowed to proceed, but no error message will be displayed (for
     * instance, if you want to implement your own error announcement).
     *
     * taskInput - if config.meta.aggregate is false, the object in the array from loadTasks
     *   corresponding to subtask taskIndex; else, the input object from loadTasks
     * taskIndex - the number of the current subtask
     * taskOutput - outputs collected for the subtask taskIndex
     *   If config.meta.aggregate is set to false, this is the results object for the current
     *   subtask. If config.meta.aggregate is set to true, this is the results object for the
     *   entire task
     *
     * returns: falsey value if the data is valid; otherwise an object with a field "errorMessage"
     *    containing a string error message to display.
     */
    if (taskOutput.trim().length > 0) {
      return false;
    } else {
      return { errorMessage: "please complete the task!" };
    }
  }

};
