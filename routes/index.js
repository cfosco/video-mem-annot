const express = require('express');
const { getVideos, saveAnswers } = require('../database/dbops');
const { getSequence } = require('../utils/sequence');

const router = express.Router();

router.post('/start', (req, res) => {
  getVideos(req.body.workerID, getSequence(100, 5, 20))
    .then(body => res.send(body))
    .catch((err) => res.send(400, err.message));
});

router.post('/end', (req, res) => {
  saveAnswers(req.body.workerID, req.body.responses)
    .then(body => res.send(body))
    .catch((err) => res.send(400, err.message));
});

module.exports = router;
