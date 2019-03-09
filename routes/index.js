const express = require('express');
const debug = require('debug')('memento:server');

const {
  getUserInfo,
  getVideos,
  saveResponses,
  BlockedError,
  UnauthenticatedError,
  OutOfVidsError,
  InvalidResultsError,
  submitLevel
} = require('../database/dbops');
const { getSeqTemplate } = require('../utils/sequence');
const { writeUILog } = require('../utils/log.js');

const router = express.Router();

// TODO: add some input validation, rn the error message in the browser
// does not make sense
// TODO: if you request a file that does not exist, no 404 is thrown

function respondToError(err, res) {
  if (err instanceof BlockedError) {
    res.send(403, err.message);
  } else if (err instanceof UnauthenticatedError) {
    res.send(401, err.message);
  } else if (err instanceof OutOfVidsError) {
    res.send(400, err.message);
  } else if (err instanceof InvalidResultsError) {
    res.send(400, err.message);
  } else {
    debug("500 error", err);
    res.send(500);
  }
}

/**
 * Get the level that a user is on and whether or not they are blocked
 */
router.get('/users/:id', (req, res) => {
  getUserInfo(req.params.id)
    .then(body => {
      console.log('body', body);
      res.send(body);
    })
    .catch((err) => {
      respondToError(err, res);
    });
});

/**
 * Request a new level
 * Gets a sequence of video urls + type
 * This invalidates any pending level the user has
 */
router.post('/start', (req, res) => {
  getVideos(req.body, getSeqTemplate(process.env.USE_SHORT_SEQUENCE === 'true'))
    .then(body => res.send(body))
    .catch((err) => {
      respondToError(err, res);
    });
});

/**
 * Send all of the responses for a level
 * Get whether or not you passed,
 *    scores and earnings on all past levels,
 *    and number of lives left
 */
router.post('/end', (req, res) => {
  saveResponses(
    req.body.workerID,
    req.body.levelID,
    req.body.responses,
    req.body.inputs
  )
    .then(body => res.send(body))
    .catch((err) => {
      respondToError(err, res);
    });
});

/**
 * Save total task time and feedback right before HIT is submitted
 */
router.post('/submit', (req, res) => {
  submitLevel(
    req.body.levelID,
    req.body.taskTimeMsec,
    req.body.feedback
  )
    .then(() => res.send())
    .catch((err) => {
      respondToError(err, res);
    });
});

/**
 * Writes a message to a log file
 */
router.post('/log', (req, res) => {
  try {
    writeUILog(req.body.message);
    res.status(200).send();
  } catch (err) {
    respondToError(err, res);
  }
});

module.exports = router;
