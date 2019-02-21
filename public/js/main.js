// references showTask from custom.js

(function () {
  // populated from query
  var assignmentId;
  var workerId;
  var submitUrl;

  var CONFIG = {
    title: 'Memento: The Video Memory Game',
    description: 'Indicate which videos you remember by playing a simple memory game on short 3 second videos!',
    instructions: 'You will watch a stream of 3-second videos. Your task is to tell us when you see a video we\'ve already shown.',
    steps: [
      'Press the play button to start the video sequence.',
      'Press SPACEBAR when you see a video that has been shown already.',
      'If your accuracy is good, you will be able to advance to the next level!'
    ],
    images: [],
    disclaimer: 'By playing this game, you are participating in a study being performed by MIT. You may decline further participation, at any time, without adverse consequences. Your anonymity is assured; the researchers who have requested your participation will not receive any personal information about you.'
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
    assignmentId = urlParams.get('assignmentId') || 'ASSIGNMENT_ID_NOT_AVAILABLE';
    workerId = urlParams.get('workerId') || 'test-worker';
  }

  /**
   * Show a message to the user on the page
   * @param {string} cls class to include in the containing tag
   * @param {string} header the actual message text
   */
  function generateMessage(cls, header) {
    clearMessage();
    if (!header) return;
    var messageStr = '<div class="ui message ' + cls + '">';
    messageStr += '<i class="close icon"></i>';
    messageStr += '<div class="header">' + header + '</div></div>';

    var newMessage = $(messageStr);
    $('#message-field').append(newMessage);
    newMessage.click(function () {
      $(this).closest('.message').transition('fade');
    });
  }

  /**
   * Remove the message shown by generateMessage
   */
  function clearMessage() {
    $('#message-field').html('');
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
   * Reads data from the config to show the instructions & disclaimer
   */
  function populateMetadata() {
    $('.meta-title').html(CONFIG.title);
    $('.meta-desc').html(CONFIG.description);
    $('.instructions-simple').html(CONFIG.instructions);
    for (var i = 0; i < CONFIG.steps; i++) {
      $('.instructions-steps').append($('<li>' + CONFIG.steps[i] + '</li>'));
    }
    $('.disclaimer').html(CONFIG.disclaimer);
    if (CONFIG.images.length > 0) {
      $('#sample-task').css('display', 'block');
      var instructionsIndex = Math.floor(Math.random() * CONFIG.images.length);
      var imgEle = '<img class="instructions-img" src="';
      imgEle += CONFIG.images[instructionsIndex] + '"></img>';
      $('#instructions-demo').append($(imgEle));
    }
  }

  /**
   * Hide the instructions and start the task
   */
  function startTask() {
    $('#custom-experiment').show();
    $('#experiment').css('display', 'flex');
    $('#instructions').css('display', 'none');
    showTask(); // from custom.js
  }

  /**
   * Add click handlers to buttons, start and submit
   */
  function setupButtons() {
    $('#start-button').click(startTask);
    $('#submit-button').click(submitHIT);
    if (assignmentId == 'ASSIGNMENT_ID_NOT_AVAILABLE') {
      $('#submit-button').remove();
    }
  }

  /**
   * Submit the HIT to MTurk
   */
  function submitHIT() {
    clearMessage();
    $('#submit-button').addClass('loading');

    // MTurk ONLY accepts submits via form elements
    var form = $('#submit-form');
    addHiddenField(form, 'assignmentId', assignmentId);
    addHiddenField(form, 'workerId', workerId);
    $('#submit-form').attr('action', submitUrl);
    $('#submit-form').attr('method', 'POST');
    $('#submit-form').submit();

    $('#submit-button').removeClass('loading');
    generateMessage('positive', 'Thanks! Your task was submitted successfully.');
    $('#submit-button').addClass('disabled');
  }

  $(document).ready(function () {
    getURLParams();
    populateMetadata();
    demoSurvey.loadSurvey();
    setupButtons();
  });
})();
