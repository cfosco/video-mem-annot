const express = require('express');
const { 
    getVideos, 
    saveResponses, 
    BlockedError, 
    UnauthenticatedError,
    OutOfVidsError
} = require('../database/dbops');
const { getSeqTemplate } = require('../utils/sequence');

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
    } else {
        res.send(500);
    }
}

router.post('/start', (req, res) => {
  getVideos(req.body.workerID, getSeqTemplate())
    .then(body => res.send(body))
    .catch((err) => {
        respondToError(err, res);
    });
});

router.post('/end', (req, res) => {
  saveResponses(req.body.workerID, req.body.responses)
    .then(body => res.send(body))
    .catch((err) => {
        respondToError(err, res);
    });
});

module.exports = router;
