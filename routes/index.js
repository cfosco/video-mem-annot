const express = require('express');
const { getVideos, saveResponses } = require('../database/dbops');
const { getSeqTemplate } = require('../utils/sequence');

const router = express.Router();

// TODO: add some input validation, rn the error message in the browser
// does not make sense
// TODO: if you request a file that does not exist, no 404 is thrown

router.post('/start', (req, res) => {
  getVideos(req.body.workerID, getSeqTemplate())
    .then(body => res.send(body))
    .catch((err) => res.send(400, err.message));
});

router.post('/end', (req, res) => {
  saveResponses(req.body.workerID, req.body.responses)
    .then(body => res.send(body))
    .catch((err) => res.send(400, err.message));
});

module.exports = router;
