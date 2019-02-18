const express = require('express');
const { getVideos, saveAnswers } = require('../database/dbops');
const { getSeqTemplate } = require('../utils/sequence');

const router = express.Router();

router.post('/start', (req, res) => {
  getVideos(req.body.workerID, getSeqTemplate())
    .then(body => res.send(body))
    .catch((err) => res.send(400, err.message));
});

router.post('/end', (req, res) => {
  saveAnswers(req.body.workerID, req.body.responses)
    .then(body => res.send(body))
    .catch((err) => res.send(400, err.message));
});

module.exports = router;
