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

    // config options
    var SHOW_PROGRESS = true;
    var SHOW_LIFE = false;
    var PLAY_SOUND = false;
    var SHOW_FLASH = true;
    var JUMP_ON_RIGHT = true;
    var JUMP_ON_WRONG = true;
    var FAIL_THRESHOLD = 0.6; // frac of vig. vids must get right
    var BONUS_THRESHOLD = 0.9; // frac of all vids right for bonus

    if (!SHOW_PROGRESS) {
      $('#progress-bar').css('display', 'none');
    }
    if (SHOW_LIFE) {
      $('#life-bar').css('display', 'block');
      $('#main-interface').css('padding-right', '44px');
    }

    // string[] -- urls for videos composing a 3-5 minute "movie" of 3s clips


    // TODO: get these on the server

    var transcripts = [];
    var types = [];

    $.getJSON("test_json.json").done(function(data) {

    vids = data.videos;
    console.log(data, vids)
    for (i=0; i<vids.length; i++) {
      transcripts.push(vids[i]["url"])
      types.push(vids[i]["type"])
    }

    console.log(transcripts)
    console.log(types)




    var transcripts2 = [
      "https://www.dropbox.com/s/zvdmd1amf1bcy2r/flickr-0-5-6-10568583056_3.mp4?raw=1",
      "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1",
      "https://www.dropbox.com/s/dtw1n4pr5hi23ki/bulldozer-clears-road-and-military-assist-in-rebuilding-bridge-video-id1B011458_0005.mp4?raw=1",

    ]

    // get DOM references
    var $progressBar =  $("#progress-bar > .ui.progress");
    var $lifeBar =  $("#life-bar > .ui.progress");
    var $mainInterface = $('#main-interface');
    var videoContainer = document.getElementById('video_container');

    // init progress & life bars
    $progressBar.progress({ total: transcripts.length });
    $lifeBar.progress({ total: 100, showActivity: false });

    // constants
    var CLIP_DURATION = 3; // in seconds
    var NUM_LOAD_AHEAD = 4;

    // state
    var videoElements = [];
    var counter = 0; // index in transcripts of next video to load
    var checked = false; // don't check video at end if already checked

    // life state
    var numVideos = 5;
    var numVideosRight = 4;
    var numVigilance = 2;
    var numVigilanceRight = 2;

    function updateLife() {
      var smallerFrac = Math.min(
        numVigilanceRight / numVigilance,
        numVideosRight / numVideos
      );
      var newLife = Math.floor(
        (smallerFrac - FAIL_THRESHOLD) / (1 - FAIL_THRESHOLD) * 100
      );
      $lifeBar.removeClass('orange');
      $lifeBar.removeClass('olive');
      $lifeBar.removeClass('green');
      if (newLife <= 30) {
        $lifeBar.addClass('orange');
      } else if (numVideosRight / numVideos >= BONUS_THRESHOLD) {
        $lifeBar.addClass('green');
      } else {
        $lifeBar.addClass('olive');
      }
      $lifeBar.progress("set progress", newLife);
    }

    // returns true or false for if current video is a repeat
    function isRepeat() {
      return Math.random() < 0.5; // TODO: real check
    }

    function isVigilance() {
      return Math.random() < 0.5; // TODO: real check
    }

    // update the UI after user reports or misses repeat
    function handleCheck(right, showFeedback=false) {
      checked = true;
      var vigilance = isVigilance();

      numVideos += 1;
      numVideosRight += right ? 1 : 0;
      numVigilance += vigilance ? 1 : 0;
      numVigilanceRight += (right && vigilance) ? 1 : 0;

      if (showFeedback) {
        if ((right && JUMP_ON_RIGHT) || (!right && JUMP_ON_WRONG)) {
          videoElements[0].currentTime = CLIP_DURATION; // trigger end
        }
  
        if (PLAY_SOUND) {
          (right
            ? new Audio('assets/wav/correct.wav')
            : new Audio('assets/wav/wrong.wav')
          ).play();
        }
  
        if (SHOW_FLASH) {
          $mainInterface.css('animation', 'none');
          // timeout is necessary to get anim to show
          setTimeout(function() {
            var val = (right ? 'right' : 'wrong') + ' 0.5s';
            $mainInterface.css('animation', val);
          });
        }
      }

      if (numVigilanceRight / numVigilance < FAIL_THRESHOLD) {
        console.log('FAIL') // TODO
      }

      updateLife();
    }

    // adds a new video element to the DOM
    function newVideo(src) {
      var video = document.createElement('video');
      video.setAttribute('src', src);
      video.muted = 'muted';
      video.innerHTML = 'Your browser does not support HTML5 video.';
      videoContainer.appendChild(video);
      videoElements.push(video);

      video.ontimeupdate = function() {
        if (video.currentTime >= CLIP_DURATION) {
          // check for missed repeat
          if (!checked && isRepeat()) {
            handleCheck(false, false);
          }
          // remove active video
          video.ontimeupdate = function() {}; // sometimes it gets called again
          video.remove();
          // play next video
          videoElements.shift();
          if (videoElements.length > 0) {
            videoElements[0].play();
          }
          // queue up another video
          if (counter < transcripts.length) {
            newVideo(transcripts[counter]);
          }
          // update progress bar
          $progressBar.progress("set progress", counter - NUM_LOAD_AHEAD);
          // update state
          counter += 1;
          checked = false;
        }
      }
    }

    // set up UI
    for (counter; counter < 1 + NUM_LOAD_AHEAD; counter += 1) {
      newVideo(transcripts[counter]);
    }
    updateLife();

    /************************Actions*********************/
    // HANDLE KEYPRESS (R or Spacebar)
    document.onkeydown = function (e) {
      if (e.keyCode == 32 || e.keyCode == 82) {
        handleCheck(isRepeat(), true);
//         document.getElementById("video_container").style = "border: 8px solid #76b900";
//         videoElements[0].currentTime = CLIP_DURATION; // trigger end
      }
    }

    document.onkeyup = function(e) {
      if(e.keyCode == 32 || e.keyCode == 82){
//         document.getElementById("video_container").style = "";
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


      });

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
