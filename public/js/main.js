// references showTask from custom.js

(function () {
  // populated from query
  var assignmentId;
  var workerId;
  var submitUrl;

  // populated from server
  var data;

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
    assignmentId = urlParams.get('assignmentId') || '?';
    workerId = urlParams.get('workerId') || '?';
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
    showTask(data); // from custom.js
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

  $(document).ready(function () {
    getURLParams();
    // get videos and start game
    $.post({
      "url": "api/start/",
      "data": {
        workerID: workerId
      }
    }).done(function (res) {
      data = res;
      data.workerId = workerId;
      $('.level-num').html(res.level);
      setupButtons();
    });
  });

})();
