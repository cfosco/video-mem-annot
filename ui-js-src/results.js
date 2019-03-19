import $ from 'jquery';
import { showRadialPercentage, showGraph } from './graph';

/**
 * Called when the level is over
 * @param {object} data the response body for /api/done
 */
export function showResultsPage(
  {
    passed,
    completedLevels,
    overallScore,
    numLives
  },
  earlyEnd
) {
  $('#custom-experiment').hide();
  $('#endGame').show();

  $("#score-verdict").text(passed ? "You passed!" : "You failed");
  $("#score-text").text("Level " + completedLevels.length + " Score:")
  let livesMessage = "";
  let iconElts = "";
  // early fail
  if (earlyEnd) {
    livesMessage += "The game ended early because you didn't seem to be paying attention.<br>"
    const $submitButton = $('#submit-button');
    $submitButton.text('Cannot Submit');
    $submitButton.prop('disabled', true);
    $submitButton.off(); // remove click handler
    $(".feedback-container").hide(); // won't be able to submit feedback
  }
  if (numLives <= 0) {
    livesMessage += "You have no lives left. You can no longer play the game."
    iconElts += '<i class="frown outline icon"></i>'; // put a sad face emoji
  } else {
    const livesWord = numLives > 1 ? "lives" : "life";
    livesMessage = "You have " + numLives + " " + livesWord + " left";
    for (let i = 0; i < numLives; i++) {
      iconElts += '<i class="heart icon"></i>';
    }
  }
  $("#lives-message").html(livesMessage);
  $("#lives-left").append(iconElts);

  const pastScores = completedLevels.map(d => Math.floor(d.score * 100));

  const earnings = [];
  completedLevels.reduce((a,b,i) => earnings[i] = a+b.reward, 0);
  showRadialPercentage(overallScore, passed);
  showGraph(pastScores, [0,100], '#graph-accuracy', 'scores', 'Your scores');
  showGraph(earnings, [0,earnings[earnings.length-1]+1], '#graph-earnings', 'earnings', 'Your earnings ($)');
  $('#submit-button').show();
}
