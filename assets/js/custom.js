var custom = {
    loadTasks: function(numSubtasks) {
        /*
         * This function is called on page load and should implement the promise interface
         *
         * numSubtasks - int indicating what length array to return (how many subtasks this task should have)
         *
         * returns: if config.meta.aggregate is set to false, an array of objects with length config.meta.numTasks,
         * one object for each task; else, an object that will be made available to all subtasks
         */
        return $.get("").then(function() {
            return [];
        });
    },
    showTask: function(taskInput, taskIndex, taskOutput) {
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


        /* HTML5 Video Play sequence of video segments - Working version - Vanilla JS
        Description: a plain vanilla javascript that makes the most of the HTML5 Video element to play a sequence of video segments continuosly, where src, inp point and out point are specified.
        Notes: Needs refactoring to remove side effects from methods.
        */

        //sample sequence of video segments, array of objects with src, in point, and outpoint.
        // In the mem annotation task, inpoint and outpoint will always be 0 and 3.

        // We should load a set of videos with a given number of repeats and vigilance tasks, and make sure that the videos cover 3 to 5 minutes of content.

        var transcripts = [
        {"src": "https://www.dropbox.com/s/zvdmd1amf1bcy2r/flickr-0-5-6-10568583056_3.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/dtw1n4pr5hi23ki/bulldozer-clears-road-and-military-assist-in-rebuilding-bridge-video-id1B011458_0005.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/evo48ad638e1j95/getty-at-the-police-officers-gesture-the-bulldozer-smashes-its-shovel-into-video-id654455954_31.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/cqntd1ngxpn8xm7/flickr-1-7-2-1-3-6-9-0-19617213690_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/zvdmd1amf1bcy2r/flickr-0-5-6-10568583056_3.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/dtw1n4pr5hi23ki/bulldozer-clears-road-and-military-assist-in-rebuilding-bridge-video-id1B011458_0005.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/evo48ad638e1j95/getty-at-the-police-officers-gesture-the-bulldozer-smashes-its-shovel-into-video-id654455954_31.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/cqntd1ngxpn8xm7/flickr-1-7-2-1-3-6-9-0-19617213690_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/zvdmd1amf1bcy2r/flickr-0-5-6-10568583056_3.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/dtw1n4pr5hi23ki/bulldozer-clears-road-and-military-assist-in-rebuilding-bridge-video-id1B011458_0005.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/evo48ad638e1j95/getty-at-the-police-officers-gesture-the-bulldozer-smashes-its-shovel-into-video-id654455954_31.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/cqntd1ngxpn8xm7/flickr-1-7-2-1-3-6-9-0-19617213690_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/zvdmd1amf1bcy2r/flickr-0-5-6-10568583056_3.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/dtw1n4pr5hi23ki/bulldozer-clears-road-and-military-assist-in-rebuilding-bridge-video-id1B011458_0005.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/evo48ad638e1j95/getty-at-the-police-officers-gesture-the-bulldozer-smashes-its-shovel-into-video-id654455954_31.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/cqntd1ngxpn8xm7/flickr-1-7-2-1-3-6-9-0-19617213690_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/zvdmd1amf1bcy2r/flickr-0-5-6-10568583056_3.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/dtw1n4pr5hi23ki/bulldozer-clears-road-and-military-assist-in-rebuilding-bridge-video-id1B011458_0005.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/evo48ad638e1j95/getty-at-the-police-officers-gesture-the-bulldozer-smashes-its-shovel-into-video-id654455954_31.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/cqntd1ngxpn8xm7/flickr-1-7-2-1-3-6-9-0-19617213690_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/zvdmd1amf1bcy2r/flickr-0-5-6-10568583056_3.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/dtw1n4pr5hi23ki/bulldozer-clears-road-and-military-assist-in-rebuilding-bridge-video-id1B011458_0005.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/evo48ad638e1j95/getty-at-the-police-officers-gesture-the-bulldozer-smashes-its-shovel-into-video-id654455954_31.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/cqntd1ngxpn8xm7/flickr-1-7-2-1-3-6-9-0-19617213690_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/zvdmd1amf1bcy2r/flickr-0-5-6-10568583056_3.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/dtw1n4pr5hi23ki/bulldozer-clears-road-and-military-assist-in-rebuilding-bridge-video-id1B011458_0005.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/evo48ad638e1j95/getty-at-the-police-officers-gesture-the-bulldozer-smashes-its-shovel-into-video-id654455954_31.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/yd4pwarjkqr8mcd/flickr-2-6-2-9-2-3-7-2-2526292372_2.mp4?raw=1", "inPoint": 0, "outPoint":3},
        {"src": "https://www.dropbox.com/s/cqntd1ngxpn8xm7/flickr-1-7-2-1-3-6-9-0-19617213690_2.mp4?raw=1", "inPoint": 0, "outPoint":3}
      ]

        //Video instance
        var video = document.getElementById("video_canvas");

        function playVideoSegments(transcripts){
        // initialised counter to play video segments in the array
        var counter = 0;
        /*******************base case, first video ****************/
        //base case, playing first video segment in sequence
        var videoSrc = transcripts[counter]['src'];
        var inPoint  = transcripts[counter]['inPoint'];
        var outPoint = transcripts[counter]['outPoint'];
        // helper function to play one video segment
        playOneSegment(videoSrc,inPoint,outPoint);
        /*******************subsequent videos ****************/
        // for video segments following first one, triggered on play end event listener for HTML5 video
        video.addEventListener('ended', function(e) {
            // helper function to play video segments
              playSqOfSegments(transcripts);
            }, false);
        /*******************Helper functions ****************/
            //define helper method - play sequence of segments
            function playSqOfSegments(transcripts){
                    videoSrc = transcripts[counter]['src'];
                    inPoint  = transcripts[counter]['inPoint'];
                    outPoint = transcripts[counter]['outPoint'];
                   playOneSegment(videoSrc,inPoint,outPoint);
            }

            //define helper method - play one video segment
            function playOneSegment(videoSrc,inPoint,outPoint){
                 	video.src = videoSrc;
                    video.load;
                    video.currentTime = inPoint;
                    video.play();
                    video.ontimeupdate = function() {stopAtOutPoint()};
                    counter += 1;
            }

            //define helper method - play video till end point
            function stopAtOutPoint() {
                if( parseInt(video.currentTime) > outPoint){
                    video.pause();
                    video.currentTime = video.duration;
                }
            }
        }

        //wrap in a function for play button
        function playVideo(){
            playVideoSegments(transcripts);
        }


        // HANDLE KEYPRESS (R or Spacebar)
        document.onkeydown = function(e) {
          if(e.keyCode == 32 || e.keyCode == 82){
                document.getElementById("video_canvas").style = "border: 8px solid #76b900";
            }
        }

        document.onkeyup = function(e) {
          if(e.keyCode == 32 || e.keyCode == 82){
            document.getElementById("video_canvas").style = "";
            }
        }

        /************************Buttons*********************/
        //play
        var playBtn = document.getElementById('playButton');

        playBtn.onclick = function(e) {
         playBtn.innerHTML = "Restart";
            playVideoSegments(transcripts);
        }
        //pause
        var pauseBtn = document.getElementById('pauseButton');

        pauseBtn.onclick = function(e) {
         pauseBtn.innerHTML = "Pause";
           console.log(video.src);
            video.pause();
        }
        //resume
        var resumeButton = document.getElementById('resumeButton');

        resumeButton.onclick = function(e) {
         resumeButton.innerHTML = "Resume";
            video.play();
        }



    },
    collectData: function(taskInput, taskIndex, taskOutput) {
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
    validateTask: function(taskInput, taskIndex, taskOutput) {
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
            return {errorMessage: "please complete the task!"};
        }
    }
};
