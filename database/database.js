const mysql = require('promise-mysql');
const fs = require('fs');
const path = require('path');
const debug = require('debug')('memento:server');
const config = require('./databaseConfig');

const pool = mysql.createPool(config);

async function initDB() {
  // read files for database schema and list of video urls
  let createTableSQL;
  let videoURLs;

  try {
    createTableSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  } catch (e) {
    debug(e);
    debug('Could not read schema file. Tables may not be created.');
  }

  try {
    videoURLs = JSON.parse(fs.readFileSync(path.join(__dirname, 'clean_10k.json'), 'utf8'));
  } catch (e) {
    debug(e);
    debug('Could not read videos file. Database may not contain videos.');
  }

  // create the database tables if they don't exist
  if (createTableSQL) {
    try {
      const createTableQueries = createTableSQL
        .replace(/\r?\n|\r/g, ' ') // remove all newlines
        .replace(/\s\s+/g, ' ') // remove unnecessary spaces
        .split(';') // one string per query
        .map(s => s.trim())
        .filter(s => s.length > 0); // trim surrounding whitespace
      await Promise.all(createTableQueries.map(q => pool.query(q)));
    } catch (e) {
      debug(e);
      debug('Error executing SQL. Tables may not be created.');
    }
  }

  // populate the videos table if it is empty
  if (videoURLs) {
    try {
      const videos = await pool.query('SELECT * FROM videos LIMIT 1');
      if (videos.length === 0) {
        await pool.query(
          'INSERT INTO videos (uri) VALUES ?',
          [videoURLs.map(url => [url])]
        );
      }
    } catch (e) {
      debug(e);
      debug('Error executing SQL. Database may not contain videos.');
    }
  }
}

module.exports = {
  pool,
  initDB,
};
