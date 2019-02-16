const express = require('express');
const { getVideos } = require('../database/dbops');
const { getSequence } = require('../utils/sequence');

const router = express.Router();

router.post('/start', (req, res) => {
  getVideos(req.body.workerID, getSequence(100, 5, 20))
    .then(body => res.send(body))
    .catch((err) => res.send(400, err.message));
});

module.exports = router;
