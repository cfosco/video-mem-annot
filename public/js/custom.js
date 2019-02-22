function showTask() {
  // constants
  var BASE_PATH_VIDEOS = "http://data.csail.mit.edu/soundnet/actions3/";
  var VID_TYPES = {
    TARGET_REPEAT: "target_repeat",
    VIG_REPEAT: "vig_repeat",
    VIG: "vig",
    TARGET: "target",
    FILLER: "filler",
  }
  var CLIP_DURATION = 3; // in seconds

  // ui configuration options
  var SHOW_PLAY_PAUSE = false;
  var SHOW_PROGRESS = true;
  var PLAY_SOUND = false;
  var SHOW_FLASH = true;
  var JUMP_ON_RIGHT = true;
  var JUMP_ON_WRONG = false;
  var NUM_LOAD_AHEAD = 4;

  // populated in getJSON below
  var transcripts = [];
  var types = [];
  var level = 0;

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

  /**
   * Shows a line graph on the page
   * @param {number[]} yData y values of data points (x is index)
   * @param {[number, number]} yRange min and max of y
   *    not gotten from yData because yData may not span its range
   * @param {string} selector
   *    where on the DOM to insert the graph
   */
  function showGraph(yData, yRange, selector, graphType) {

    var style = graphType == 'Accuracy' ? 'stroke: steelblue' : 'stroke: green';

    var v_width = $(window).width();
    // var v_height = $(window).height();
    // console.log(v_width, v_height)
    var margin = { top: 20, right: 50, bottom: 30, left: 50 };
    var width = v_width*0.45 - margin.left - margin.right;
    var height = width - margin.top - margin.bottom;

    var data = yData.map(function(y, x) { return [x + 1, y || 0]; });

    var x = d3.scale.linear().range([0, width]);
    var y = d3.scale.linear().range([height, 0]);

    x.domain([1, data.length]);
    y.domain(yRange);

    var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(data.length);
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
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text(graphType);

    svg.append("path")
      .datum(data) // 10. Binds data to the line
      .attr("class", "line") // Assign a class for styling
      .attr("style",style)
      .attr("d", line); // 11. Calls the line generator

    var focus = svg.append("g")
      .attr("class", "focus")
      .style("display", "none");

    focus.append("circle")
      .attr("r", 7);

    focus.append("text")
      .attr("x", 9)
      .attr("dy", ".35em");

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
      focus.select("text").text(data[i - 1][1]);
    }

  }

  /**
   * Called when the level is over
   * @param {object} data the response body for /api/done
   */
  function showResultsPage(data) {
    $experiment.css('display', 'none');
    $endGame.css('display', 'flex');
    $('#repeats-detected').text((data.overallScore * 100).toFixed(0) + '%');
    var pastScores = data.completedLevels.map(function(d) {
      return Math.floor(d.score * 100);
    });

    var earnings = [];
    data.completedLevels.reduce(function(a,b,i) { return earnings[i] = a+b.reward; },0);

    showGraph(pastScores, [0,100], '#graph-accuracy', 'Accuracy');
    showGraph(earnings, [0,earnings[earnings.length-1]+1], '#graph-earnings', 'Earnings');
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

  /**
   * Call at the end of the video or when the user presses spacebar
   * @param {boolean} response user says is or isn't repeat
   * @param {boolean} showFeedback whether or not to show right or wrong
   */
  function handleCheck(response, showFeedback) {
    if (checked) return;

    responses.push(response);
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
    var video = document.createElement('video');
    video.setAttribute('src', src);
    video.dataset.vidType = type;
    video.muted = 'muted';
    video.innerHTML = 'Your browser does not support HTML5 video.';
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
        // videoElements = [] // DEBUG
        if (videoElements.length > 0) {
          videoElements[0].play();
        } else {
          $.post({
            "url": "api/end/",
            "data": JSON.stringify({
              workerID: "demo-worker",
              responses: responses
            }),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
          }).done(showResultsPage);
          // var data = {};
          // data.overallScore = 0.80
          // data.completedLevels = [{"score":0.3, "reward":1},
          // {"score":0.4, "reward":1},
          // {"score":0.44, "reward":1},
          // {"score":0.56, "reward":1},
          // {"score":0.54, "reward":1},
          // {"score":0.7, "reward":1},
          // {"score":0.83, "reward":1}]
          showResultsPage(data)
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

  // HANDLE KEYPRESS (Spacebar)
  document.onkeydown = function (e) {
    if (e.keyCode == 32 && videoElements.length > 0) {
      e.preventDefault(); // don't move page
      handleCheck(true, true);
    }
  }

  // play/pause buttons
  if (SHOW_PLAY_PAUSE) {
    $('#playButton').click(function () {
      videoElements[0].play();
    });

    $('#pauseButton').click(function () {
      videoElements[0].pause();
    });
  } else {
    $('#playButton').hide();
    $('#pauseButton').hide();
  }

  // progress bar
  if (!SHOW_PROGRESS) {
    $('#progress-bar').css('display', 'none');
  }

  // get videos and start game
  $.post({
    "url": "api/start/",
    "data": {
      workerID: "demo-worker"
    }
  }).done(function (data) {
    var vids = data.videos;
    level = data.level;
    $('#level-num').html(level);
    for (var i = 0; i < vids.length; i++) {
      transcripts.push(BASE_PATH_VIDEOS + vids[i]["url"])
      types.push(vids[i]["type"])
    }
    $progressBar.progress({ total: transcripts.length });
    for (counter; counter < 1 + NUM_LOAD_AHEAD; counter += 1) {
      newVideo(transcripts[counter], types[counter]);
    }
    if (!SHOW_PLAY_PAUSE) {
      videoElements[0].play();
    }
  });

}
