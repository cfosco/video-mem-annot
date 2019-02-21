// populated from query
var assignmentId;
var workerId;
var submitUrl;

// populated via request
var config = {};

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
    var messageStr = "<div class='ui message " + cls + "'>";
    messageStr += "<i class='close icon'></i>";
    messageStr += "<div class='header'>" + header + "</div></div>";

    var newMessage = $(messageStr);
    $("#message-field").append(newMessage);
    newMessage.click(function() {
        $(this).closest(".message").transition("fade");
    });
}

/**
 * Remove the message shown by generateMessage
 */
function clearMessage() {
    $("#message-field").html("");
}

/**
 * Adds a hidden input to a form
 * Exists because we need to submit via a form element
 */
function addHiddenField(form, name, value) {
    // form is a jQuery object, name and value are strings
    var input = $("<input type='hidden' name='" + name + "' value=''>");
    input.val(value);
    form.append(input);
}

/**
 * Reads data from the config to show the instructions & disclaimer
 * @param {object} config 
 */
function populateMetadata(config) {
    $(".meta-title").html(config.meta.title);
    $(".meta-desc").html(config.meta.description);
    $(".instructions-simple").html(config.instructions.simple);
    for (var i = 0; i < config.instructions.steps.length; i++) {
        $(".instructions-steps").append($("<li>" + config.instructions.steps[i] + "</li>"));
    }
    $(".disclaimer").html(config.meta.disclaimer);
    if (config.instructions.images.length > 0) {
        $("#sample-task").css("display", "block");
        var instructionsIndex = Math.floor(Math.random() * config.instructions.images.length);
        var imgEle = "<img class='instructions-img' src='";
        imgEle += config.instructions.images[instructionsIndex] + "'></img>";
        $("#instructions-demo").append($(imgEle));

    }
}

/**
 * Hide the instructions and start the task
 */
function startTask() {
    $('#custom-experiment').show();
    $("#experiment").css("display", "flex");
    $("#instructions").css("display", "none");
    showTask(); // from custom.js
}

/**
 * Add click handlers to buttons, start and submit
 */
function setupButtons() {
    $("#start-button").click(startTask);
    $("#submit-button").click(submitHIT);
    if (assignmentId == "ASSIGNMENT_ID_NOT_AVAILABLE") {
        $("#submit-button").remove();
    }
}

/**
 * Submit the HIT to MTurk
 */
function submitHIT() {
    clearMessage();
    $("#submit-button").addClass("loading");

    // MTurk ONLY accepts submits via form elements
    var form = $("#submit-form");
    addHiddenField(form, 'assignmentId', assignmentId);
    addHiddenField(form, 'workerId', workerId);
    $("#submit-form").attr("action", submitUrl);
    $("#submit-form").attr("method", "POST");
    $("#submit-form").submit();

    $("#submit-button").removeClass("loading");
    generateMessage("positive", "Thanks! Your task was submitted successfully.");
    $("#submit-button").addClass("disabled");
}

$(document).ready(function() {
    getURLParams();

    $.getJSON("config.json").done(function(data) {
        config = data;
        populateMetadata(config);
        demoSurvey.maybeLoadSurvey(config);
        setupButtons(config);
    }).catch(function(error) {
        console.log("ERROR AT DOCUMENT.READY");
        console.log(error);
    });
});
