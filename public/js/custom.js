BASE_PATH_VIDEOS = "http://data.csail.mit.edu/soundnet/actions3/";

const VID_TYPES = {
    TARGET_REPEAT: "target_repeat",
    VIG_REPEAT: "vig_repeat",
    VIG: "vig",
    TARGET: "target",
    FILLER: "filler",
}

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
    var JUMP_ON_WRONG = false;
    var FAIL_THRESHOLD = 0.6; // frac of vig. vids must get right
    var BONUS_THRESHOLD = 0.9; // frac of all vids right for bonus

    if (!SHOW_PROGRESS) {
      $('#progress-bar').css('display', 'none');
    }
    if (SHOW_LIFE) {
      $('#life-bar').css('display', 'block');
      $('#main-interface').css('padding-right', '44px');
    }

    // populated in getJSON below
    var transcripts = [];
    var types = [];

    // get DOM references
    var $progressBar =  $("#progress-bar > .ui.progress");
    var $lifeBar =  $("#life-bar > .ui.progress");
    var $mainInterface = $('#main-interface');
    var $experiment = $('#experiment');
    var $endGame = $('#endGame')
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
    var responses = [];

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

    function showResultsPage(data) {
      $experiment.css('display','none');
      $endGame.css('display', 'flex');
      $('#repeats-detected').text( (numVideosRight / numVideos).toFixed(3))

      // Graph
      var margin = {top: 20, right: 50, bottom: 30, left: 50},
          width = 640 - margin.left - margin.right,
          height = 300 - margin.top - margin.bottom;


      var data = [[1,0.3],[2,0.54],[3,0.55],[4,0.67],[5,0.65],
                  [6,0.71],[7,0.73],[8,0.76],[9,0.71],[10,0.85]]

      // var data = d3.range(n).map(function(d) { return {"y": d3.randomUniform(1)() } })

      var x = d3.scale.linear()
          .range([0, width]);

      var y = d3.scale.linear()
          .range([height, 0]);

      x.domain([1, data.length]);
      y.domain([0,1]);

      var xAxis = d3.svg.axis()
          .scale(x)
          .orient("bottom");

      var yAxis = d3.svg.axis()
          .scale(y)
          .orient("left");


      var line = d3.svg.line()
          .x(function(d,i) { console.log(i); return x(d[0]); })
          .y(function(d) { return y(d[1]); });

      var svg = d3.select("body").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");



          // data.forEach(function(d) {
          //   d.date = parseDate(d.date);
          //   d.close = +d.close;
          // });

          // data.sort(function(a, b) {
          //   return a.date - b.date;
          // });


          svg.append("g")
              .attr("class", "x axis")
              .attr("transform", "translate(0," + height + ")")
              .call(xAxis);

          svg.append("g")
              .attr("class", "y axis")
              .call(yAxis)
            .append("text")
              .attr("transform", "rotate(-90)")
              .attr("y", 6)
              .attr("dy", ".71em")
              .style("text-anchor", "end")
              .text("Accuracy");

          svg.append("path")
            .datum(data) // 10. Binds data to the line
            .attr("class", "line") // Assign a class for styling
            .attr("d", line); // 11. Calls the line generator

          var focus = svg.append("g")
              .attr("class", "focus")
              .style("display", "none");

          focus.append("circle")
              .attr("r", 4.5);

          focus.append("text")
              .attr("x", 9)
              .attr("dy", ".35em");

          svg.append("rect")
              .attr("class", "overlay")
              .attr("width", width)
              .attr("height", height)
              .on("mouseover", function() { focus.style("display", null); })
              .on("mouseout", function() { focus.style("display", "none"); })
              .on("mousemove", mousemove);

          function mousemove() {
            var x0 = x.invert(d3.mouse(this)[0])
            var i = Math.round(x0)
            if (i > data.length) {
              i = data.length
            }
                // d0 = data[i - 1],
                // d1 = data[i],
                // d = x0 - d0.date > d1.date - x0 ? d1 : d0;
            console.log(x0, i)
            focus.attr("transform", "translate(" + x(i) + "," + y(data[i-1][1]) + ")");
            focus.select("text").text(data[i-1][1]);
          }

    }

    // returns true or false for if current video is a repeat
    function isRepeat() {
      return Math.random() < 0.5; // TODO: real check
    }

    function isVigilance() {
      return Math.random() < 0.5; // TODO: real check
    }

    // update the UI after user reports or misses repeat
    function handleCheck(repeat, response, showFeedback) {
      if (checked) return;

      responses.push(response);
      var right = repeat === response;
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
            ? new Audio('wav/correct.wav')
            : new Audio('wav/wrong.wav')
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
    function newVideo(src, type) {
      var video = document.createElement('video');
      video.setAttribute('src', src);
      video.dataset.vidType = type;
      video.muted = 'muted';
      video.innerHTML = 'Your browser does not support HTML5 video.';
      videoContainer.appendChild(video);
      videoElements.push(video);

      video.ontimeupdate = function() {
        if (video.currentTime >= CLIP_DURATION) {
          // check for missed repeat
          handleCheck(isRepeat(), false, false);
          // remove active video
          video.ontimeupdate = function() {}; // sometimes it gets called again
          video.remove();
          // play next video
          videoElements.shift();
          if (videoElements.length > 0) {
            videoElements[0].play();
          }
          else {
            $.post({
              "url": "api/end/",
              "data": JSON.stringify({
                workerID: "demo-worker",
                responses: responses
              }),
              contentType: 'application/json; charset=utf-8',
              dataType: 'json'
            }).done(function(data) {

              console.log(data)
              showResultsPage(data)

            });
          }
          // queue up another video
          if (counter < transcripts.length) {
            newVideo(transcripts[counter], types[counter]);
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
    //$.getJSON("test_json.json").done(function(data) {
    $.post({
    	"url": "api/start/",
    	"data": {
    		workerID: "demo-worker"
    	}
    }).done(function(data) {
      console.log("data", data);
      var vids = data.videos;
      for (var i=0; i < vids.length; i++) {
        transcripts.push(BASE_PATH_VIDEOS + vids[i]["url"])
        types.push(vids[i]["type"])
      }
      for (counter; counter < 1 + NUM_LOAD_AHEAD; counter += 1) {
        newVideo(transcripts[counter], types[counter]);
      }
      updateLife();
    });

    /************************Actions*********************/
    // HANDLE KEYPRESS (R or Spacebar)
    document.onkeydown = function (e) {
      if (e.keyCode == 32 || e.keyCode == 82) {
      	const curVidType = videoElements[0].dataset.vidType;
      	console.log("curVidType", curVidType);
        const wasRepeat = (curVidType == VID_TYPES.VIG_REPEAT) || (curVidType == VID_TYPES.TARGET_REPEAT);
        handleCheck(wasRepeat, true, showFeedback=true);
      }
    }


    $('#playButton').click(function() {
      videoElements[0].play();
    });

    $('#pauseButton').click(function() {
      videoElements[0].pause();
    });

    // hide instruction button
    // this button causes problems with the way we are loading videos
    // TODO: either we must resolve these issues or remove the button
    $(".instruction-button").hide();

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
