import $ from 'jquery';

/**
 * Displays an error message received by an API endpoint to the user.
 * If you give err, it logs the err as JSON along with the user's progress
 */
export function showError(errorText, headerText) {
  $("#error-message").find(".header").text(headerText);
  $("#error-message").find("p").html(errorText);
  $("#main-interface").hide();
  $("#instructions").hide();
  $("#experiment").show();
  $("#error-message").show();
}

export function hideError() {
  $("#main-interface").show();
  $("#error-message").hide();
}
