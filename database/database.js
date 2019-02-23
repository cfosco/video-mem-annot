const mysql = require('promise-mysql');
const fs = require('fs');
const path = require('path');
const debug = require('debug')('memento:server');
const config = require('../config');

const pool = mysql.createPool(config.dbConfig);

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

      // order matters here so we can't use Promise.all
      for (let query of createTableQueries) {
        await pool.query(query);
      }
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

async function withinTX(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    await callback(connection);
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  }
  await connection.release();
}

module.exports = {
  pool,
  initDB,
  withinTX
};
