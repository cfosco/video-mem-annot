const express = require('express');

const router = express.Router();

/* GET foo */
router.get('/', (req, res) => {
  res.status(200).json('foo').end();
});

module.exports = router;
