const crypto = require('crypto');
const debug = require('debug')('memento:server');
const assert = require('assert');

const { pool, withinTX } = require('./database');
const config = require('../config');
const { secToHMS } = require('../utils/utils');

const VID_TYPES = {
  TARGET_REPEAT: "target_repeat",
  VIG_REPEAT: "vig_repeat",
  VIG: "vig",
  TARGET: "target",
  FILLER: "filler",
}

const N_LEVELS_PER_NEW_LIFE = 50;

const didPassLevel = function (overallScore, vigilanceScore, falsePositiveRate) {
  return overallScore > .7 && vigilanceScore > .8 && falsePositiveRate < .5;
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
  constructor(message = "Invalid results") {
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
 * @param {number} userID
 * @return {Promise<number>} next level number (1 = first level)
 */
async function getNextLevelNum(userID) {
  await assertNotBlocked(userID, false);
  // figure out the level num
  const levels = await pool.query('SELECT COUNT(*) AS levelsCount FROM levels '
  + 'WHERE id_user = ? AND score IS NOT NULL'
  , userID);
  return levels[0].levelsCount + 1;
}

/**
 * We increment label counts as we create levels
 *   because label counts are used as priorities
 * However sometimes levels never get completed
 *   so label counts end up larger than they should be
 * This sets all label counts to a number reflecting only
 *   completed and pending (within the time limit) levels
 */
async function fixLabelCounts() {
  const durHMS = secToHMS(config.maxLevelTimeSec);
  const labelCountsQuery = `SELECT videos.id, count(T.id_video) as real_labels
FROM videos
LEFT JOIN (
    SELECT presentations.id_video
    FROM levels JOIN presentations
    ON levels.id = presentations.id_level
    WHERE (
        levels.score IS NOT NULL
    	OR TIMEDIFF(CURRENT_TIMESTAMP, levels.insert_time) < "${durHMS}"
    ) AND presentations.targeted = 1 AND presentations.duplicate = 1
) as T
ON videos.id = T.id_video
GROUP BY videos.id;`;

  await withinTX(async (connection) => {
    const result = await connection.query(labelCountsQuery);
    const targetUpdatesQuery = 'UPDATE videos SET labels = ? WHERE id = ?;'
      .repeat(result.length);
    const args = [].concat(...result.map((row) => [row.real_labels, row.id]));
    await connection.query(targetUpdatesQuery, args);
  });
}

/**
 * @param {string} workerID
 * @return {{ level: number }}
 */
async function getUserInfo(workerID) {
  const userID = await getUser(workerID);
  const level = await getNextLevelNum(userID);
  return { level };
}

/**
 * @param {number | string} id unique identifier for user
 * @param {boolean} useWorkerId search on worker_id rather than id
 * @throws {BlockedError} if blocking is enabled and the user has no lives
 */
async function assertNotBlocked(id, useWorkerId) {
  const searchOn = useWorkerId ? 'worker_id' : 'id';
  const result = await pool.query(`SELECT * FROM users WHERE ${searchOn} = ?`, id);
  if (result.length > 0) {
    const user = result[0];
    if (user.num_lives < 1 && config.enableBlockUsers) {
      throw new BlockedError(user.worker_id);
    }
  }
}

/**
 * @param {{workerId: string, assignmentId: string, hitId: string}} data
 * @param {[ nTargets: number, nFillers:number, [index: number, type: string][] ]} seqTemplate
 * @return {Promise<{ level: number, levelID: number, videos: { url: string, type: string}[] }>}
 */
async function getVideos(data, seqTemplate) {
  const workerID = data.workerID;

  const [nTargets, nFillers, ordering] = seqTemplate;
  const numVideos = nTargets + nFillers;

  await assertNotBlocked(workerID, true);
  const userID = await getUser(workerID);

  // select nTargets least-seen videos user hasn't seen yet
  const targetVids = await pool.query('SELECT id, uri'
    + ' FROM videos WHERE id NOT IN'
    + ' (SELECT id_video FROM levels '
    + 'JOIN presentations ON levels.id = presentations.id_level '
    + 'WHERE id_user = ?)'
    + ' ORDER BY labels ASC LIMIT ?',
    [userID, nTargets]
  );

  // select numVideos vids that user hasn't seen yet randomly
  const randomVids = await pool.query('SELECT id, uri'
    + ' FROM videos WHERE id NOT IN'
    + ' (SELECT id_video FROM levels '
    + 'JOIN presentations ON levels.id = presentations.id_level '
    + 'WHERE id_user = ?)'
    + ' ORDER BY RAND() LIMIT ?',
    [userID, numVideos]
  );

  // select fillers by taking the first nFillers vids from the set difference
  // targetVids - randomVids
  const targetsSet = new Set(targetVids.map(({ id, uri }) => id));
  const potentialFillers = randomVids.filter(({ id, uri }) => !targetsSet.has(id));

  if (potentialFillers.length < nFillers || targetVids.length < nTargets) {
    throw new OutOfVidsError(workerID);
  }
  const fillerVids = potentialFillers.slice(0, nFillers);
  const vidsToShow = targetVids.concat(fillerVids);

  // prepare SQL to insert level
  let sqlFields = "id_user";
  let sqlQuestionmarks = "?";
  let sqlValues = [userID];
  if (data.assignmentID) {
    sqlFields += ", assignment_id";
    sqlQuestionmarks += ", ?";
    sqlValues.push(data.assignmentID);
  }
  if (data.hitID) {
    sqlFields += ", hit_id";
    sqlQuestionmarks += ", ?";
    sqlValues.push(data.hitID);
  }

  let taskInputs;
  const level = await getNextLevelNum(userID);
  await withinTX(async (connection) => {
    // create a level
    const result = await connection.query('INSERT INTO levels '
      + '(' + sqlFields + ') VALUES (' + sqlQuestionmarks + ')', sqlValues);
    const levelID = result.insertId;

    // compose and hash the client-side inputs to the level
    const videos = ordering.map(([index, type]) => {
      return {
        url: vidsToShow[index].uri,
        type: type
      }
    });
    taskInputs = { level, videos, levelID };
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(taskInputs));
    const hashVal = hash.digest('hex');

    // insert the hash
    connection.query('UPDATE levels SET inputs_hash = ? WHERE id = ?',
      [hashVal, levelID]);

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
    const promises = [connection.query('INSERT INTO presentations'
      + ' (id_level, id_video, position, vigilance, duplicate, targeted)'
      + ' VALUES ?',
      [presentationInserts]
    )];

    const targetIds = ordering
      .filter(([index, type]) => type === VID_TYPES.TARGET)
      .map(([index]) => vidsToShow[index].id);
    if (targetIds.length > 0) {
      const targetUpdatesQuery = 'UPDATE videos SET labels = labels + 1  WHERE id = ?;'
        .repeat(targetIds.length);
      promises.push(connection.query(targetUpdatesQuery, targetIds));
    }
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

function calcScores(presentations) {

  // calculate score
  const right = (p) => p.response === p.duplicate;
  const falsePositive = (p) => (p.response && !p.duplicate);
  const nonDuplicate = (p) => (!p.duplicate);
  const numAll = presentations.length;
  const numRight = presentations.filter(right).length;
  const vigilancePresentations = presentations.filter(p => (p.vigilance && p.duplicate));
  const numVig = vigilancePresentations.length;
  const numVigRight = vigilancePresentations.filter(right).length;
  const numNonDuplicate = presentations.filter(nonDuplicate).length;

  falsePositiveRate = numNonDuplicate == 0
    ? 0
    : presentations.filter(falsePositive).length / numNonDuplicate;
  overallScore = numAll == 0
    ? 1
    : numRight / numAll;
  vigilanceScore = numVig == 0
    ? 1
    : numVigRight / numVig;

  passed = didPassLevel(overallScore, vigilanceScore, falsePositiveRate);

  return { passed, overallScore, vigilanceScore, falsePositiveRate }

}

async function saveResponses(
  workerID,
  levelID,
  responses,
  levelInputs,
  reward = config.rewardAmount,
  levelsPerLife = N_LEVELS_PER_NEW_LIFE,
  errorOnFastSubmit = config.errorOnFastSubmit) {

  await assertNotBlocked(workerID, true);
  const userID = await getUser(workerID);

  const levels = await pool.query('SELECT * FROM levels'
    + ' WHERE id = ? AND id_user = ?', [levelID, userID]);
  if (levels.length === 0) {
    throw new InvalidResultsError('Invalid level id');
  }

  // check that answers have not already been given
  const pastResponses = await pool.query('SELECT response FROM presentations'
    + ' WHERE id_level = ? AND response IS NOT NULL LIMIT 1', levelID);
  if (pastResponses.length > 0) {
    throw new InvalidResultsError('This level has already been submitted');
  }

  // number of presentations in the level
  const presentations = await pool.query('SELECT COUNT(*) AS presentationsCount '
    + 'FROM presentations WHERE id_level = ?', levelID);
  const levelLen = presentations[0].presentationsCount;

  // number of true / false (not null/ undefined) responses
  // (!= rather than !== is deliberate here)
  const numBoolResponses = responses.filter(({ response }) => response != null).length;

  // get time elapsed from db (not node server to avoid timezone issues)
  const { nowTS } = (await pool.query('SELECT CURRENT_TIMESTAMP as nowTS;'))[0];
  const timeDiffMsec = new Date(nowTS).getTime() - new Date(levels[0].insert_time).getTime();

  // check that the submission is neither too fast nor too slow
  if (errorOnFastSubmit) {
    // set the minTime to about 1s per video, which should be plenty
    const minTimeMsec = numBoolResponses * 1 * 1000;
    if (timeDiffMsec < minTimeMsec) {
      throw new InvalidResultsError('Responses were submitted too quickly to complete the level');
    }
  }
  if (timeDiffMsec > config.maxLevelTimeSec * 1000) {
    throw new InvalidResultsError('Responses were submitted too slowly to complete the level');
  }

  // check that answers have the correct format (roughly)
  // calculate the hash of the inputs
  try {
    // require them to send back the inputs
    if (config.enforceSameInputs) {
      const hash = crypto.createHash('sha256');
      hash.update(JSON.stringify(levelInputs));
      const hashVal = hash.digest('hex');
      const savedHashVal = levels[0].inputs_hash;
      assert(savedHashVal === hashVal, "Inputs hash does not match");
    }

    // check the number of responses (less is ok since they can fail early)
    assert(responses.length <= levelLen, "Too many responses given");

    // check that the individual responses have valid forms
    responses.forEach((elt) => {
      const { response, startMsec, durationMsec, mediaErrorCode } = elt;
      // you give a response or an error, not both
      // == is deliberate since null or undefined is fine
      assert(
        (typeof (response) === "boolean" && mediaErrorCode == null)
        || (response == null && typeof (mediaErrorCode) === "number"),
        "a valid response should be a boolean with a null/undefined error\n"
        + "a valid error should be a null response with a numeric error code"
      );
      assert(typeof (startMsec) === "number", "start time should be a number");
      assert(typeof (durationMsec) === "number", "duration should be a number");
    });
  } catch (error) {
    debug("Error while checking validity of inputs:", error);
    throw new InvalidResultsError('Invalid responses.');
  }

  // save the responses
  await withinTX(async (connection) => {
    // update db with answers
    const values = [];
    responses.forEach(({ response, startMsec, durationMsec, mediaErrorCode }, position) => {
      values.push.apply(values, [response, startMsec, durationMsec, mediaErrorCode, position, levelID]); // append all
    });
    const query = 'UPDATE presentations SET response = ?, start_msec = ?, duration_msec = ?, media_error_code = ? WHERE position = ? AND id_level = ?; '
      .repeat(responses.length);
    await connection.query(query, values);

    // calcualate level number (before setting the score since that changes it)
    const levels = await pool.query('SELECT COUNT(*) AS levelsCount FROM levels '
      + 'WHERE id_user = ? AND score IS NOT NULL'
      , userID);
    const levelNum = levels[0].levelsCount + 1;

    // calculate and set score
    const presentations = await connection.query('SELECT response, duplicate, vigilance'
      + ' FROM presentations WHERE id_level = ? ORDER BY position', levelID);
    const { passed, overallScore, vigilanceScore, falsePositiveRate } = calcScores(presentations);
    await connection.query('UPDATE levels SET score = ?, vig_score = ?, false_pos_rate = ?, reward = ? WHERE id = ?', [overallScore, vigilanceScore, falsePositiveRate, reward, levelID]);

    // update num lives
    const livesQuery = await connection.query('SELECT num_lives FROM users WHERE id = ?', userID);
    const oldLives = livesQuery[0].num_lives;
    numLives = oldLives;
    if (levelNum == 1) {
      if (passed) {
        numLives++;
      } else {
        numLives--;
      }
    } else {
      if (levelNum % levelsPerLife == 0) {
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

/**
 * @param {number} levelID
 * @param {string} feedback
 * @return {Promise<void>}
 */
async function submitLevel(levelID, taskTimeMsec, feedback) {
  await pool.query(
    'UPDATE levels SET duration_msec = ?, feedback = ? WHERE id = ?',
    [taskTimeMsec, feedback, levelID]
  );
}

module.exports = {
  getUserInfo,
  getVideos,
  saveResponses,
  calcScores,
  BlockedError,
  UnauthenticatedError,
  OutOfVidsError,
  InvalidResultsError,
  submitLevel,
  fixLabelCounts
};
