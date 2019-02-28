(function () {

  // add playing property to video elements
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

  // populated from query
  var assignmentId;
  var workerId;
  var hitId;
  var submitUrl;

  // populated from server
  var inputData;
  var levelID;

  // Debug settings
  var DEBUG = {
    onlyOneVideo: true,
    fakeSubmit: false
  }

  /**
   * Gets the values from the URL query string that we need
   */
  function getURLParams() {
    // this is an advanced feature but it is polyfilled
    var urlParams = new URLSearchParams(window.location.search);
    let submitDomain = urlParams.get('turkSubmitTo') || 'https://www.mturk.com/';
    if (!submitDomain.endsWith('/')) {
      submitDomain += '/';
    }
    submitUrl = submitDomain + 'mturk/externalSubmit';
    assignmentId = urlParams.get('assignmentId') || '';
    workerId = urlParams.get('workerId') || '';
    hitId = urlParams.get('hitId') || '';
  }

  /**
   * Adds a hidden input to a form
   * Exists because we need to submit via a form element
   */
  function addHiddenField(form, name, value) {
    // form is a jQuery object, name and value are strings
    var input = $('<input type="hidden" name="' + name + '" value="">');
    input.val(value);
    form.append(input);
  }

  /**
   * Hide the instructions and start the task
   */
  function startTask() {
    $('#experiment').show();
    $('#instructions').css('display', 'none');
    showTask(inputData); // from custom.js
  }

  /**
   * Add click handlers to buttons, start and submit
   */
  function setupButtons() {
    $('#start-button').show();
    $('#start-button').click(startTask);
    $('#submit-button').click(submitHIT);
  }

  /**
   * Submit the HIT to MTurk
   */
  function submitHIT() {
    $('#submit-button').addClass('loading');

    // MTurk ONLY accepts submits via form elements
    var form = $('#submit-form');
    addHiddenField(form, 'assignmentId', assignmentId);
    addHiddenField(form, 'workerId', workerId);
    $('#submit-form').attr('action', submitUrl);
    $('#submit-form').attr('method', 'POST');
    $('#submit-form').submit();

    $('#submit-button').removeClass('loading');
    $('#submit-button').addClass('disabled');
  }

  function showTask(taskData) {

    // constants
    var BASE_PATH_VIDEOS = "https://data.csail.mit.edu/soundnet/actions3/";
    var VID_TYPES = {
      TARGET_REPEAT: "target_repeat",
      VIG_REPEAT: "vig_repeat",
      VIG: "vig",
      TARGET: "target",
      FILLER: "filler",
    }
    var CLIP_DURATION = 3; // in seconds
    var LOAD_VIDEOMEM = false

    if (LOAD_VIDEOMEM) {
      BASE_PATH_VIDEOS = ""
    }

    // inputs
    var level = taskData.level;
    var transcripts = [];
    var types = [];
    taskData.videos.forEach(function(video) {
      transcripts.push(BASE_PATH_VIDEOS + video.url);
      types.push(video.type);
    });

    // ui configuration options
    var SHOW_PLAY_PAUSE = false;
    var SHOW_PROGRESS = true;
    var PLAY_SOUND = false;
    var SHOW_FLASH = true;
    var JUMP_ON_RIGHT = true;
    var JUMP_ON_WRONG = false;
    var NUM_LOAD_AHEAD = 4;

    // get DOM references
    var $progressBar = $("#progress-bar > .ui.progress");
    var $mainInterface = $('#main-interface');
    var $experiment = $('#custom-experiment');
    var $endGame = $('#endGame')
    var videoContainer = document.getElementById('video_container');

    // state
    var videoElements = [];
    var counter = 0; // index in transcripts of next video to load
    var checked = false; // don't check video at end if already checked
    var responses = [];

    function showRadialPercentage(score, passed) {
      $('#score-radial').attr("data-percentage", (score * 100).toFixed(0) + '%');

      var margin = 40;

      var wrapper = document.getElementById('score-radial');
      var start = 0;
      var end = parseFloat(wrapper.dataset.percentage);

      var colours;
      if (passed) {
        colours = {
          fill: '#' + wrapper.dataset.fillColour,
          track: '#' + wrapper.dataset.trackColour,
          text: '#' + wrapper.dataset.textColour,
          stroke: '#' + wrapper.dataset.strokeColour,
        }
      } else {
        colours = {
          fill: '#cc0000',
          track: '#' + wrapper.dataset.trackColour,
          text: '#660000',
          stroke: '#' + wrapper.dataset.strokeColour,
        }
      }

      $('.results-text').css('color', colours.text);

      var radius = 100;
      var border = wrapper.dataset.trackWidth;
      var strokeSpacing = wrapper.dataset.strokeSpacing;
      var endAngle = Math.PI * 2;
      var formatText = d3.format('.0%');
      var boxSize = radius * 2 + margin;
      var count = end;
      var progress = start;
      var step = end < start ? -0.01 : 0.01;

      //Define the circle
      var circle = d3.svg.arc()
        .startAngle(0)
        .innerRadius(radius)
        .outerRadius(radius - border);

      //setup SVG wrapper
      var svg = d3.select(wrapper)
        .append('svg')
        .attr('width', boxSize)
        .attr('height', boxSize);

      // ADD Group container
      var g = svg.append('g')
        .attr('transform', 'translate(' + boxSize / 2 + ',' + boxSize / 2 + ')');

      //Setup track
      var track = g.append('g').attr('class', 'radial-progress');
      track.append('path')
        .attr('class', 'radial-progress__background')
        .attr('fill', colours.track)
        .attr('stroke', colours.stroke)
        .attr('stroke-width', strokeSpacing + 'px')
        .attr('d', circle.endAngle(endAngle));

      //Add colour fill
      var value = track.append('path')
        .attr('class', 'radial-progress__value')
        .attr('fill', colours.fill)
        .attr('stroke', colours.stroke)
        .attr('stroke-width', strokeSpacing + 'px');

      //Add text value
      var numberText = track.append('text')
        .attr('class', 'radial-progress__text')
        .attr('style','font-size: 30pt;')
        .attr('fill', colours.text)
        .attr('text-anchor', 'middle')
        .attr('dy', '.9rem');

      function update(progress) {
        //update position of endAngle
        value.attr('d', circle.endAngle(endAngle * progress));
        //update text value
        numberText.text(formatText(progress));
      }

      (function iterate() {
        //call update to begin animation
        update(progress);
        if (count > 0) {
          //reduce count till it reaches 0
          count--;
          //increase progress
          progress += step;

          //Control the speed of the fill
          setTimeout(iterate, 10);
        }
      })();
    }

    /**
     * Shows a line graph on the page
     * @param {number[]} yData y values of data points (x is index)
     * @param {[number, number]} yRange min and max of y
     *    not gotten from yData because yData may not span its range
     * @param {string} selector
     *    where on the DOM to insert the graph
     */
    function showGraph(yData, yRange, selector, graphType, graphTitle) {

      if (graphType == 'scores') {
        var style = 'stroke: steelblue;';
        var fill = ' fill: #679fce;';
        var suffix = '%';
      } else {
        var style = 'stroke: green;';
        var fill = ' fill: #36a049;'
        var suffix = '$'
      }

      var v_width = Math.min($("#app").width()*0.9, 360);
      // var v_height = $(window).height();
      // console.log(v_width, v_height)
      var margin = { top: 40, right: 50, bottom: 50, left: 50 };
      var width = v_width - margin.left - margin.right;
      var height = width - margin.top - margin.bottom;

      var data = yData.map(function(y, x) { return [x + 1, y || 0]; });

      var x = d3.scale.linear().range([0, width]);
      var y = d3.scale.linear().range([height, 0]);

      x.domain([0, data.length+1]);
      y.domain(yRange);

      var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks((data.length+1)%15);
      var yAxis = d3.svg.axis().scale(y).orient("left");

      var line = d3.svg.line()
        .x(function(d) { return x(d[0]); })
        .y(function(d) { return y(d[1]); });

      var svg = d3.select(selector).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("style", "display:flex;")
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .attr("style", style)
        .call(xAxis);

      svg.append("g")
        .attr("class", "y axis")
        .attr("style", style)
        .call(yAxis)
        .append("text")
        // .attr("y", 6)
        .attr("dy", ".71em")
        .attr("x", 5)
        .style("text-anchor", "start")
        .text(graphTitle);

      svg.append("path")
        .datum(data) // 10. Binds data to the line
        .attr("class", "line") // Assign a class for styling
        .attr("style",style)
        .attr("d", line); // 11. Calls the line generator

      svg.selectAll("line-circle")
        .data(data)
        .enter().append("circle")
          .attr("style",style+fill)
          .attr("r", 4)
          .attr("cx", function(d) { return x(d[0]); })
          .attr("cy", function(d) { return y(d[1]); });

      var focus = svg.append("g")
        .attr("class", "focus")
        .style("display", "none");

      focus.append("circle")
        .attr("r", 7)
        .attr("fill-opacity", 0.3)

      focus.append("text")
        .attr("x", 15)
        .attr("dy", ".55em");

      svg.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .on("mouseover", function () { focus.style("display", null); })
        .on("mouseout", function () { focus.style("display", "none"); })
        .on("mousemove", mousemove);

      function mousemove() {
        var x0 = x.invert(d3.mouse(this)[0])
        var i = Math.round(x0)
        if (i > data.length) {
          i = data.length
        }
        focus.attr("transform", "translate(" + x(i) + "," + y(data[i - 1][1]) + ")");
        // focus.attr("class", "focus animated infinite zoomIn")
        focus.select("text").text(data[i - 1][1]+suffix);
      }

    }

    /**
     * Submits task data to our database
     */
    function submitData() {
      if (DEBUG.fakeSubmit) {
        var data = {};

        data.overallScore = 0.81
        data.completedLevels = [
          {"score":0.3, "reward":1},
          {"score":0.44, "reward":1},
          {"score":0.56, "reward":1},
          {"score":0.54, "reward":1},
          {"score":0.7, "reward":1},
          {"score":0.83, "reward":1},
          {"score":0.44, "reward":1},
          {"score":0.56, "reward":1}
        ]
        data.passed = true;
        data.numLives = 2;
        showResultsPage(data)
      } else {
        var payload = {
          workerID: workerId,
          levelID: levelID,
          responses: responses,
          inputs: taskData
        }
        $.post({
          url: "api/end/",
          data: JSON.stringify(payload),
          contentType: 'application/json; charset=utf-8',
          dataType: 'json'
        }).done(showResultsPage)
        .catch(function(err) {
          showError(err, headerText="Your answers could not be submitted.")
        });
      }
    }

    /**
     * Called when the level is over
     * @param {object} data the response body for /api/done
     */
    function showResultsPage(data) {
      $experiment.hide();
      $endGame.show();

      $("#score-verdict").text(data.passed ? "You passed!" : "You failed");
      $("#score-text").text("Level " + data.completedLevels.length + " Score:")
      var livesMessage;
      var iconElts = "";
      if (data.numLives <= 0) {
        // put a sad face emoji
        livesMessage = "You have no lives left. You can no longer play the game."
        iconElts += '<i class="frown outline icon"></i>';

      } else {
        var livesWord = data.numLives > 1 ? "lives" : "life";
        livesMessage = "You have " + data.numLives + " " + livesWord + " left";
        for (let i = 0; i < data.numLives; i++) {
          iconElts += '<i class="heart icon"></i>';
        }
      }
      $("#lives-message").text(livesMessage);
      $("#lives-left").append(iconElts);

      var pastScores = data.completedLevels.map(function(d) {
        return Math.floor(d.score * 100);
      });

      var earnings = [];
      data.completedLevels.reduce(function(a,b,i) { return earnings[i] = a+b.reward; },0);
      showRadialPercentage(data.overallScore, data.passed);
      showGraph(pastScores, [0,100], '#graph-accuracy', 'scores', 'Your scores');
      showGraph(earnings, [0,earnings[earnings.length-1]+1], '#graph-earnings', 'earnings', 'Your earnings ($)');
      $('#submit-button').show();
    }

    /**
     * @return {boolean} whether or not the current video is a repeat
     */
    function isRepeat() {
      var curVidType = videoElements[0].dataset.vidType;
      return (
        curVidType === VID_TYPES.VIG_REPEAT)
        || (curVidType === VID_TYPES.TARGET_REPEAT
      );
    }

    var gameStartMsec;
    var videoStartMsec;

    /**
     * Call at the end of the video or when the user presses spacebar
     * @param {boolean} response user says is or isn't repeat
     * @param {boolean} showFeedback whether or not to show right or wrong
     */
    function handleCheck(response, showFeedback) {
      if (checked) return;

      responses.push({
        response,
        startMsec: videoStartMsec,
        durationMsec: (new Date()).getTime() - (videoStartMsec + gameStartMsec)
      });
      var right = isRepeat() === response;
      checked = true;

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
          // clear the old anim value
          $mainInterface.css('animation', 'none');
          // trigger a "reflow" to get the anim to reset
          void $mainInterface.css('animation');
          // set the new anim value
          var val = (right ? 'right' : 'wrong') + ' 0.5s';
          $mainInterface.css('animation', val);
        }
      }
    }

    /**
     * Adds a new video element to the DOM
     * @param {string} src url to get video
     * @param {valueof VID_TYPES} type
     */
    function newVideo(src, type) {
      console.log('SRC FOR NEW VIDEO:',src)
      var video = document.createElement('video');
      video.setAttribute('src', src);
      video.dataset.vidType = type;
      video.muted = 'muted';
      video.innerHTML = 'Your browser does not support HTML5 video.';
      video.setAttribute('playsinline', 'playsinline'); // needed by iOS
      video.load(); // needed by iOS
      video.style.visibility = 'hidden';
      videoContainer.appendChild(video);
      videoElements.push(video);

      video.ontimeupdate = function () {
        if (video.currentTime >= CLIP_DURATION) {
          // check for missed repeat
          handleCheck(false, false);
          // remove active video
          video.ontimeupdate = function () { }; // sometimes it gets called again
          video.remove();
          // play next video
          videoElements.shift();

          if (videoElements.length > 0) {
            //const vidToPlay = videoElements[0];
            playWhenReady(videoElements[0]);

            //videoElements[0].play();
            // queue up another video
            if (counter < transcripts.length) {
              newVideo(transcripts[counter], types[counter]);
            }
            // update progress bar
            $progressBar.progress("set progress", counter - NUM_LOAD_AHEAD);
            // update state
            counter += 1;
            checked = false;
          } else {
            submitData();
          }
        }
      }
    }

    function playWhenReady(vidToPlay) {
      function playIfReady() {
        console.log("checking if ready", vidToPlay.readyState);
        if (vidToPlay.readyState == 4) {
          vidToPlay.style.visibility = 'visible';
          if (gameStartMsec === undefined) {
            gameStartMsec = (new Date()).getTime();
          }
          videoStartMsec = (new Date()).getTime() - gameStartMsec;
          vidToPlay.play();
        }
      }
      vidToPlay.oncanplaythrough = playIfReady;
      playIfReady();
    }

    // HANDLE KEYPRESS (Spacebar)
    document.onkeydown = function (e) {
      if (e.keyCode == 32 && videoElements.length > 0 && videoElements[0].playing) {
        e.preventDefault(); // don't move page
        handleCheck(true, true);
      }
    }

    // Handle tap video (for mobile)
    $('#video_container').on('touchstart', function() {
      handleCheck(true, true);
    });

    if (SHOW_PLAY_PAUSE) {
      $('.dev-controls').show();
    }

    if (!SHOW_PROGRESS) {
      $('#progress-bar').css('display', 'none');
    }
    $progressBar.progress({ total: transcripts.length });

    // preload videos and start game
    const numVidsToLoad = Math.min(1 + NUM_LOAD_AHEAD, taskData.videos.length);
    for (counter; counter < numVidsToLoad; counter += 1) {
      newVideo(transcripts[counter], types[counter]);
    }
    if (!SHOW_PLAY_PAUSE) {
      //videoElements[0].play();
      playWhenReady(videoElements[0]);
    }
  }

  /**
   * Displays an error message received by an API endpoint to the user.
   */
  function showError(error, headerText) {
    console.log(error);
    $("#error-message").find(".header").text(headerText);
    $("#error-message").find("p").text(error.responseText);
    $("#main-interface").hide();
    $("#instructions").hide();
    $("#experiment").show();
    $("#error-message").show();
  }

  $(document).ready(function () {
    getURLParams();

    if (assignmentId == "ASSIGNMENT_ID_NOT_AVAILABLE" || !workerId) {
      // have not accepted the hit, we should NOT load a level for them
      $('#start-button').hide();
      $("#accept-hit-message").show();
      return;
    }
    // get videos and start game
    $.post({
      "url": "api/start/",
      "data": {
        workerID: workerId,
        hitID: hitId,
        assignmentID: assignmentId
      }
    }).done(function (res) {

      if (DEBUG.onlyOneVideo) {
        res.videos = res.videos.slice(0, 1);
      }

      // freeze the input data so we can send this back to the server to ensure
      // that the data was not corrupted
      inputData = Object.freeze(res);
      levelID = res.levelID;
      $('.level-num').html(res.level);
      setupButtons();
    })
    .catch(function(err) {
      showError(err, headerText="There was a problem loading the game.")
    });
  });

})();
