import uuidv4 from 'uuid/v4';
import './polyfills';
import $ from 'jquery';
import { showError } from './errors';
import showTask from './videos';
import { showResultsPage } from './results';

let taskStartMsec;
let payload;

// populated from query string
let assignmentId;
let workerId;
let hitId;
let submitUrl;

// populated from server
let inputData;
let levelID;

/**
 * Gets the values from the URL query string that we need
 */
function getURLParams() {
  // this is an advanced feature but it is polyfilled
  const urlParams = new URLSearchParams(window.location.search);
  let submitDomain = urlParams.get('turkSubmitTo') || 'https://www.mturk.com/';
  if (!submitDomain.endsWith('/')) {
    submitDomain += '/';
  }
  submitUrl = submitDomain + 'mturk/externalSubmit';
  assignmentId = urlParams.get('assignmentId') || '';
  workerId = urlParams.get('workerId') || localStorage['workerId'];
  if (!workerId) {
    workerId = 'NOAMT:' + uuidv4();
    localStorage['workerId'] = workerId;
  }
  hitId = urlParams.get('hitId') || '';
}

/**
 * Hide the instructions and start the task
 */
function startTask() {
  $('#experiment').show();
  $('#instructions').hide();
  $.post({
    "url": "api/start/",
    "data": {
      workerID: workerId,
      hitID: hitId,
      assignmentID: assignmentId
    }
  }).done((res) => {
    // freeze the input data so we can send this back to the server to ensure
    // that the data was not corrupted
    inputData = Object.freeze(res);
    levelID = inputData.levelID;
    //$('.level-num').html(res.level);
    showTask(inputData.videos, ({ responses, errorEnd }) => {
      payload = {
        responses,
        errorEnd,
        levelID,
        inputData,
        workerID: workerId,
      };
      $.post({
        url: "api/end/",
        data: JSON.stringify(payload),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json'
      }).done((data) => {
        if (!errorEnd) {
          showResultsPage(data, responses.length < inputData.videos.length);
        }
      })
      .catch((err) => {
        payload.err = err;
        showError(err.responseText, "Your answers could not be submitted.");
        $.post({
          "url": "api/log/",
          "data": {
            message: JSON.stringify(payload)
          }
        });
      });
    });
  })
  .catch((err) => {
    showError(err.responseText, "There was a problem loading the game.")
  });
}

/**
 * Adds a hidden input to a form
 * Exists because we need to submit via a form element
 */
function addHiddenField(form, name, value) {
  // form is a jQuery object, name and value are strings
  const input = $('<input type="hidden" name="' + name + '" value="">');
  input.val(value);
  form.append(input);
}

/**
 * Submit the HIT, sending data to the server and AMT
 */
function submitHIT() {
  $('#submit-button').addClass('loading');

  // MTurk ONLY accepts submits via form elements
  const form = $('#submit-form');
  const feedback = $(".feedback textarea").val();

  // send the feedback to the server
  $.post({
    url: 'api/submit',
    data: JSON.stringify({
      levelID: levelID,
      taskTimeMsec: (new Date()).getTime() - taskStartMsec,
      feedback: feedback
    }),
    contentType: 'application/json; charset=utf-8',
    dataType: 'json'
  }); // if it fails, oh well

  addHiddenField(form, 'assignmentId', assignmentId);
  addHiddenField(form, 'workerId', workerId);
  addHiddenField(form, 'results', JSON.stringify(payload));
  addHiddenField(form, 'feedback', feedback);
  $('#submit-form').attr('action', submitUrl);
  $('#submit-form').attr('method', 'POST');
  $('#submit-form').submit();

  $('#submit-button').removeClass('loading');
  $('#submit-button').addClass('disabled');
}

// show the instructions page
$(document).ready(function () {
  taskStartMsec = (new Date()).getTime();
  getURLParams();

  if (assignmentId == "ASSIGNMENT_ID_NOT_AVAILABLE") {
    $('#start-button').hide();
    $("#accept-hit-message").show();
    $('.level-num').parent().hide();
    return;
  } else {
    $.get({
      "url": "api/users/" + workerId
    }).done(function (res) {
      $('.level-num').text(res.level);
    }).catch((err) => {
      showError(err.responseText, "There was a problem loading the game.");
    });
    // set up buttons
    $('#start-button').show();
    $('#start-button').click(startTask);
    $('#submit-button').click(submitHIT);
  }
});
