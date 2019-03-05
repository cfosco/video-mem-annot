const express = require('express');
const debug = require('debug')('memento:server');
const { 
    getVideos, 
    saveResponses, 
    BlockedError, 
    UnauthenticatedError,
    OutOfVidsError,
    InvalidResultsError
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

router.post('/start', (req, res) => {
  getVideos(req.body, getSeqTemplate())
    .then(body => res.send(body))
    .catch((err) => {
        respondToError(err, res);
    });
});

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

router.post('/log', (req, res) => {
    // append to the log file
    try {
        writeUILog(req.body.message);
        res.status(200).send();
    } catch (err) {
        respondToError(err, res);
    }
});

module.exports = router;
