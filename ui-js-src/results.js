import $ from 'jquery';
import { showRadialPercentage, showGraph } from './graph';

/**
 * Called when the level is over
 * @param {object} data the response body for /api/done
 * @param {'done' | 'error' | 'fail'} endReason
 * @param {() => void} submitHIT
 */
export function showResultsPage(
  {
    passed,
    completedLevels,
    overallScore,
    numLives
  },
  endReason,
  submitHIT
) {
  $('#custom-experiment').hide();
  $('#endGame').show();
  $('#submit-button').show();
  const $submitButton = $('#submit-button');

  let verdict = passed ? "You passed!" : 'You failed';
  if (endReason === 'error') {
    verdict = "Something went wrong";
  }
  $("#score-verdict").text(verdict);

  $("#score-text").text(`Level ${completedLevels.length} Score:`);

  let livesMessage = "";
  let iconElts = "";

  if (endReason === 'fail') {
    livesMessage += "The game ended early because you didn't seem to be paying attention.<br>";
    // block submitting
    $submitButton.text('Cannot Submit');
    $submitButton.prop('disabled', true);
    $(".feedback-container").hide(); // won't be able to submit feedback
  } else {
    $submitButton.click(submitHIT);
  }

  if (endReason === 'error') {
    livesMessage += "The game ended due to an error. Thank you for your participation. Your internet connection or device seems to be incompatible with the game, so you might not be allowed to accept another Memento HIT. We apologize for the inconvenience.<br>";
  }
  if (numLives <= 0) {
    livesMessage += "You have no lives left. You can no longer play the game.";
    iconElts += '<i class="frown outline icon"></i>'; // put a sad face emoji
  } else {
    const livesWord = numLives > 1 ? "lives" : "life";
    livesMessage = "You have " + numLives + " " + livesWord + " left";
    livesMessage+="<br><b>You can do more of these HITs!</b> Please accept a new HIT to go to the next level."
    for (let i = 0; i < numLives; i++) {
      iconElts += '<i class="heart icon"></i>';
    }
  }
  $("#lives-message").html(livesMessage);
  $("#lives-left").append(iconElts);

  // show graphs
  const pastScores = completedLevels.map(d => Math.floor(d.score * 100));
  const earnings = [];
  completedLevels.reduce((a,b,i) => earnings[i] = a+b.reward, 0);
  showRadialPercentage(overallScore, passed);
  showGraph(pastScores, [0,100], '#graph-accuracy', 'scores', 'Your scores');
  showGraph(earnings, [0,earnings[earnings.length-1]+1], '#graph-earnings', 'earnings', 'Your earnings ($)');
}
