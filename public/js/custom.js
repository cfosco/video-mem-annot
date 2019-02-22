
function showTask(taskData) {
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

  function showRadialPercentage() {
    var margin = 40;

    var wrapper = document.getElementById('score-radial');
    var start = 0;
    var end = parseFloat(wrapper.dataset.percentage);

    var colours = {
      fill: '#' + wrapper.dataset.fillColour,
      track: '#' + wrapper.dataset.trackColour,
      text: '#' + wrapper.dataset.textColour,
      stroke: '#' + wrapper.dataset.strokeColour,
    }

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
  function showGraph(yData, yRange, selector, graphType) {

    if (graphType == 'Scores') {
      var style = 'stroke: steelblue;';
      var fill = ' fill: #679fce;';
      var suffix = '%';
    } else {
      var style = 'stroke: green;';
      var fill = ' fill: #36a049;'
      var suffix = '$'
    }

    var v_width = $("#app").width();
    // var v_height = $(window).height();
    // console.log(v_width, v_height)
    var margin = { top: 40, right: 50, bottom: 50, left: 50 };
    var width = v_width*0.45 - margin.left - margin.right;
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
      .text(graphType);

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
   * Called when the level is over
   * @param {object} data the response body for /api/done
   */
  function showResultsPage(data) {
    $experiment.hide();
    $endGame.show();
    $('#score-radial').attr("data-percentage", (data.overallScore * 100).toFixed(0) + '%');
    var pastScores = data.completedLevels.map(function(d) {
      return Math.floor(d.score * 100);
    });

    var earnings = [];
    data.completedLevels.reduce(function(a,b,i) { return earnings[i] = a+b.reward; },0);
    showRadialPercentage();
    showGraph(pastScores, [0,100], '#graph-accuracy', 'Scores');
    showGraph(earnings, [0,earnings[earnings.length-1]+1], '#graph-earnings', 'Earnings ($)');
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

  /**
   * Call at the end of the video or when the user presses spacebar
   * @param {boolean} response user says is or isn't repeat
   * @param {boolean} showFeedback whether or not to show right or wrong
   */
  function handleCheck(response, showFeedback) {
    if (checked) return;

    responses.push({
      response,
      time: videoElements[0].currentTime
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
    var video = document.createElement('video');
    video.setAttribute('src', src);
    video.dataset.vidType = type;
    video.muted = 'muted';
    video.innerHTML = 'Your browser does not support HTML5 video.';
    videoContainer.appendChild(video);
    videoElements.push(video);

    video.ontimeupdate = function () {

      // video.currentTime = CLIP_DURATION //DEBUG

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
              workerID: taskData.workerId,
              responses: responses
            }),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
          }).done(showResultsPage);
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


  $('#playButton').click(function () {
    videoElements[0].play();
  });

  $('#pauseButton').click(function () {
    videoElements[0].pause();
  });

  if (SHOW_PLAY_PAUSE) {
    $('.dev-controls').show();
  }

  // progress bar
  if (!SHOW_PROGRESS) {
    $('#progress-bar').css('display', 'none');
  }



    // get videos and start game
    // $.post({
    //   "url": "api/start/",
    //   "data": {
    //     workerID: "demo-worker"
    //   }
    // }).done(function (data) {
    //   var vids = data.videos;
    //   level = data.level;
    //   $('#level-num').html(level);
    //   for (var i = 0; i < vids.length; i++) {
    //     transcripts.push(BASE_PATH_VIDEOS + vids[i]["url"])
    //     types.push(vids[i]["type"])
    //   }
    //   $progressBar.progress({ total: transcripts.length });
    //   for (counter; counter < 1 + NUM_LOAD_AHEAD; counter += 1) {
    //     newVideo(transcripts[counter], types[counter]);
    //   }
    //   if (!SHOW_PLAY_PAUSE) {
    //     videoElements[0].play();
    //   }
    // });

  $('#level-num').html(level);
  $progressBar.progress({ total: transcripts.length });
  for (counter; counter < 1 + NUM_LOAD_AHEAD; counter += 1) {
    newVideo(transcripts[counter], types[counter]);
  }
  if (!SHOW_PLAY_PAUSE) {
    videoElements[0].play();
  }
}
