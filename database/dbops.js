const crypto = require('crypto');
const { pool, withinTX } = require('./database');
const debug = require('debug')('memento:server');
const assert = require('assert');
const config = require('../config');

const VID_TYPES = {
    TARGET_REPEAT: "target_repeat",
    VIG_REPEAT: "vig_repeat",
    VIG: "vig",
    TARGET: "target",
    FILLER: "filler",
}

const N_LEVELS_PER_NEW_LIFE = 50;

const didPassLevel = function(overallScore, vigilanceScore) {
   return overallScore > .75 && vigilanceScore > .9; 
}

// Errors to be used in the API
class BlockedError extends Error { 
    constructor(username) {
        const message = "User " + username + " has been blocked."
        super(message);
        this.name = "BlockedError";
    }
}

class UnauthenticatedError extends Error {
    constructor(message) {
        super(message);
        this.name = "UnauthenticatedError";
    }
}

class OutOfVidsError extends Error {
    constructor(username) {
        const message = "User " + username + " is out of videos.";
        super(message);
        this.name = "OutOfVidsError";
    }
}

class InvalidResultsError extends Error {
    constructor(message="Invalid results") {
        super(message);
        this.name = "InvalidResultsError";
    }
}

/**
 * @param {string} workerID
 * @return {Promise<number>} userID
 */
async function getUser(workerID) {
  // this returns just the id bc an INSERT does not return the whole user
  if (!workerID) {
    throw new UnauthenticatedError("workerId '" + workerID + "' is not valid");
  }

  let userID;
  
  await withinTX(async (connection) => {
      const users = await connection.query('SELECT id FROM users WHERE worker_id = ?', workerID);
      if (users.length === 0) {
        const result = await connection.query('INSERT INTO users (worker_id) VALUES (?)', workerID);
        userID = result.insertId;
      } else {
        userID = users[0].id;
      }
  });
  return userID;
}

/**
 * @param {string} workerID
 * @param {[number, boolean][]} sequence index, vigilance
 * @return {Promise<string[]>} list of video urls
 */
async function getVideos(workerID, seqTemplate) {
  const [nTargets, nFillers, ordering] = seqTemplate;
  const numVideos = nTargets + nFillers;

  const userID = await getUser(workerID);
  const result = await pool.query('SELECT * FROM users WHERE id = ?', userID);
  const user = result[0];
  if (user.num_lives < 1 && config.enableBlockUsers) {
    throw new BlockedError(user.worker_id);
  }

  // select nTargets least-seen videos user hasn't seen yet
  const targetVids = await pool.query('SELECT id, uri'
    + ' FROM videos WHERE id NOT IN'
    + ' (SELECT id_video FROM presentations, levels WHERE id_user = ?)'
    + ' ORDER BY labels ASC LIMIT ?',
    [userID, nTargets]
  );

  // select numVideos vids that user hasn't seen yet randomly 
  const randomVids = await pool.query('SELECT id, uri'
    + ' FROM videos WHERE id NOT IN'
    + ' (SELECT id_video FROM presentations, levels WHERE id_user = ?)'
    + ' ORDER BY RAND() LIMIT ?',
    [userID, numVideos]
  );

  // select fillers by taking the first nFillers vids from the set difference
  // targetVids - randomVids
  const targetsSet = new Set(targetVids.map(({id, uri}) => id));
  const potentialFillers = randomVids.filter(({id, uri}) => !targetsSet.has(id));

  if (potentialFillers.length < nFillers) {
    throw new OutOfVidsError(user.worker_id);
  }
  const fillerVids = potentialFillers.slice(0, nFillers);
  const vidsToShow = targetVids.concat(fillerVids);
 
  const levels = await pool.query('SELECT COUNT(*) AS levelsCount FROM levels '
    + 'WHERE id_user = ? AND score IS NOT NULL'
  , userID);
  const level = levels[0].levelsCount + 1;

  const videos = ordering.map(([index, type]) => {
    return {
        url: vidsToShow[index].uri,
        type: type
    }
  });
  taskInputs = {level, videos};
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(taskInputs));
  const hashVal = hash.digest('hex');    

  await withinTX(async (connection) => {
    // create a level
    const result = await connection.query('INSERT INTO levels '
        + '(id_user, inputs_hash) VALUES (?, ?)', [userID, hashVal]);
    const levelID = result.insertId;

    const presentationInserts = ordering.map(([index, type], position) => {
      const vigilance = type == VID_TYPES.VIG || type == VID_TYPES.VIG_REPEAT;
      const duplicate = type == VID_TYPES.VIG_REPEAT || type == VID_TYPES.TARGET_REPEAT;
      const targeted = type == VID_TYPES.TARGET || type == VID_TYPES.TARGET_REPEAT;
      return [levelID, vidsToShow[index].id, position, vigilance, duplicate, targeted];
    })
    // position: index into the vid seq shown to user
    // vigilance: was this a 1st or 2nd repeat of a vig video? 
    // duplicate: was this the second presentation of a video? 
    // targeted: was this 1st or 2nd repeat of a target video? 
    const bulkInsertPromise = connection.query('INSERT INTO presentations'
      + ' (id_level, id_video, position, vigilance, duplicate, targeted)'
      + ' VALUES ?',
      [presentationInserts]
    );

    const promises = ordering
      .filter(([index, type]) => type === VID_TYPES.TARGET)
      .map(([index]) => connection.query('UPDATE videos SET labels = labels + 1'
        + ' WHERE id = ?', vidsToShow[index].id)
      );

    promises.push(bulkInsertPromise);
    await Promise.all(promises);
  });
  
 return taskInputs;
}

/**
 * @param {string} workerID
 * @param {boolean[]} responses list of repeat or not TODO: needs times
 * @param {Promise<{overallScore: number, vigilanceScore: number, completedLevels: {score: number, reward: number}[]}>}
 * scores are between 0 and 1; reward is (TODO) a dollar value
 */
async function saveResponses(workerID, responses, levelInputs, levelsPerLife=N_LEVELS_PER_NEW_LIFE, errorOnFastSubmit=config.errorOnFastSubmit) {
  // get the most recent level (TODO: validate we should do this)
  const userID = await getUser(workerID);
  const result = await pool.query('SELECT * FROM users WHERE id = ?', userID);
  const user = result[0];
  if (user.num_lives < 1 && config.enableBlockUsers) {
    throw new BlockedError(user.worker_id);
  }

  const levels = await pool.query('SELECT * FROM levels'
    + ' WHERE id_user = ? ORDER BY id DESC', userID);
  if (levels.length === 0) {
    throw new InvalidResultsError('User has no level in progress');
  }
  levelID = levels[0].id;

  // check that answers have not already been given
  const pastResponses = await pool.query('SELECT response FROM presentations'
    + ' WHERE id_level = ? AND response IS NOT NULL LIMIT 1', levelID);
  if (pastResponses.length > 0) {
    throw new InvalidResultsError('User has no level in progress');
  }

  const presentations = await pool.query('SELECT COUNT(*) AS presentationsCount '
    + 'FROM presentations WHERE id_level = ?', levelID);
  const levelLen = presentations[0].presentationsCount;
 
  // check that the time elapsed has not been too short 
  if (errorOnFastSubmit) {
    // set the minTime to about 1s per video, which should be plenty
    const minTimeMsec = levelLen*1*1000;
    const startTimeMsec = new Date(levels[0].insert_time).getTime();
    const curTimeMsec = new Date().getTime();
    const timeDiffMsec = curTimeMsec-startTimeMsec;
    if (timeDiffMsec < minTimeMsec) {
        throw new InvalidResultsError('Responses were submitted too quickly to complete the level');
    }
  }

  // check that answers have the correct format (roughly)
  // calculate the hash of the inputs
  try {
      if (config.enforceSameInputs) {
        const hash = crypto.createHash('sha256');
        hash.update(JSON.stringify(levelInputs));
        const hashVal = hash.digest('hex');    
        const savedHashVal = levels[0].inputs_hash;
        assert(savedHashVal === hashVal, "Inputs hash does not match");
      }
      assert(responses.length == levelLen, "responses.length does not match the length of the level ");
      responses.forEach((elt) => {
        const { response, time } = elt;
        assert(typeof(response) == "boolean", "responses should be a boolean");
        assert(typeof(time) == "number", "time should be a number");
      });
  } catch(error) {
    debug("Error while checking validity of inputs:", error);
    throw new InvalidResultsError('Invalid responses.');
  }

  var numLives;
  var overallScore;
  var vigilanceScore;
  var passed;
  await withinTX(async (connection) => {
    // update db with answers
    const updates = responses.map(({ response, time }, position) =>
      connection.query(
        'UPDATE presentations SET response = ?, seconds = ? WHERE position = ? AND id_level = ?',
        [response, time, position, levelID]
      )
    );

    await Promise.all(updates);

    // calculate score
    const presentations = await connection.query('SELECT response, duplicate, vigilance'
      + ' FROM presentations WHERE id_level = ? ORDER BY position', levelID);
    const right = (p) => p.response === p.duplicate;
    const numAll = presentations.length;
    const numRight = presentations.filter(right).length;
    const vigilancePresentations = presentations.filter(p => p.vigilance);
    const numVig = vigilancePresentations.length;
    const numVigRight = vigilancePresentations.filter(right).length;
    overallScore = numRight / numAll;
    vigilanceScore = numVigRight / numVig;
    passed = didPassLevel(overallScore, vigilanceScore);
    await connection.query('UPDATE levels SET score = ? WHERE id = ?', [overallScore, levelID]);
    // TODO: add reward

    // check num lives
    const livesQuery = await connection.query('SELECT num_lives FROM users WHERE id = ?', userID);
    const oldLives = livesQuery[0].num_lives;
    numLives = oldLives;
    if (levels.length == 1) { 
        if (passed) {
            numLives++;
        } else {
            numLives--;
        }
    } else {
        if (levels.length % levelsPerLife == 0) {
            numLives++;
        }
        if (!passed) {
            numLives--;
        }
    }
    if (numLives != oldLives) {
        await connection.query('UPDATE users SET num_lives = ? WHERE id = ?', [numLives, userID]);
    }
  });

  const completedLevels = await pool.query('SELECT score, reward FROM levels'
    + ' WHERE id_user = ? AND score IS NOT NULL ORDER BY id ASC', userID);

  return {
    overallScore,
    vigilanceScore,
    numLives,
    passed,
    completedLevels,
  }
}

module.exports = {
  getVideos,
  saveResponses, 
  BlockedError,
  UnauthenticatedError,
  OutOfVidsError,
  InvalidResultsError
};
