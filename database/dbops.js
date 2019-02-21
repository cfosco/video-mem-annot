const { pool, withinTX } = require('./database');

const VID_TYPES = {
    TARGET_REPEAT: "target_repeat",
    VIG_REPEAT: "vig_repeat",
    VIG: "vig",
    TARGET: "target",
    FILLER: "filler",
}

/**
 * @param {string} workerID
 * @return {Promise<number>} userID
 */
async function getUser(workerID) {
  let userID;
  const users = await pool.query('SELECT id FROM users WHERE worker_id = ?', workerID);
  if (users.length === 0) {
    const result = await pool.query('INSERT INTO users (worker_id) VALUES (?)', workerID);
    userID = result.insertId;
  } else {
    userID = users[0].id;
  }
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

  // numVideos = largest index in sequence + 1 (since 0 is the first index)
  //const numVideos = Math.max(...sequence.map(([i]) => i)) + 1;

  const userID = await getUser(workerID);

  // get N least-seen videos user hasn't seen yet
  const videos = await pool.query('SELECT id, uri'
    + ' FROM videos WHERE id NOT IN'
    + ' (SELECT id_video FROM presentations, levels WHERE id_user = ?)'
    + ' ORDER BY labels ASC LIMIT ?',
    [userID, numVideos]
  );
  if (videos.length < numVideos) {
    throw new Error('No more videos for user.');
  }

  // create a level
  await withinTX(async (connection) => {
    const result = await connection.query('INSERT INTO levels (id_user) VALUES (?)', userID);
    const levelID = result.insertId;

    addedIndexes = new Set(); // mark duplicate when we add the same index a second time
    const presentationInserts = ordering.map(([index, type], position) => {
      const vigilance = type == VID_TYPES.VIG || type == VID_TYPES.VIG_REPEAT;
      const duplicate = type == VID_TYPES.VIG_REPEAT || type == VID_TYPES.TARGET_REPEAT;
      const targeted = type == VID_TYPES.TARGET || type == VID_TYPES.TARGET_REPEAT;
      return [levelID, videos[index].id, position, vigilance, duplicate, targeted];
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
        + ' WHERE id = ?', videos[index].id)
      );

    promises.push(bulkInsertPromise);
    await Promise.all(promises);
  });
  
  const vidData = ordering.map(([index, type]) => {
    return {
        "url": videos[index].uri,
        "type": type
    }
  });
  return {"videos": vidData};
}

/**
 * @param {string} workerID
 * @param {boolean[]} responses list of repeat or not TODO: needs times
 * @param {Promise<{overallScore: number, vigilanceScore: number, completedLevels: {score: number, reward: number}[]}>}
 * scores are between 0 and 1; reward is (TODO) a dollar value
 */
async function saveResponses(workerID, responses) {
  // get the most recent level (TODO: validate we should do this)
  const userID = await getUser(workerID);
  const levels = await pool.query('SELECT id FROM levels'
    + ' WHERE id_user = ? ORDER BY id DESC LIMIT 1', userID);
  if (levels.length === 0) {
    throw new Error('User has no level in progress');
  }

  // check that answers have not already been given
  levelID = levels[0].id;
  const pastResponses = await pool.query('SELECT response FROM presentations'
    + ' WHERE id_level = ? AND response IS NOT NULL', levelID);
  if (pastResponses.length !== 0) {
    throw new Error('User has no level in progress');
  }

  // update db with answers
  await withinTX(async (connection) => {
    const updates = responses.map((response, position) =>
      connection.query(
        'UPDATE presentations SET response = ? WHERE position = ? AND id_level = ?',
        [response, position, levelID]
      )
    );
    await Promise.all(updates);
  });

  // calculate score
  const presentations = await pool.query('SELECT response, duplicate, vigilance'
    + ' FROM presentations WHERE id_level = ? ORDER BY position', levelID);
  const right = (p) => p.response === p.duplicate;
  const numAll = presentations.length;
  const numRight = presentations.filter(right).length;
  const vigilancePresentations = presentations.filter(p => p.vigilance);
  const numVig = vigilancePresentations.length;
  const numVigRight = vigilancePresentations.filter(right).length;
  const overallScore = numRight / numAll;
  const vigilanceScore = numVigRight / numVig;
  await pool.query('UPDATE levels SET score = ? WHERE id = ?', [overallScore, levelID]);
  // TODO: add reward

  const completedLevels = await pool.query('SELECT score, reward FROM levels'
    + ' WHERE id_user = ? AND score IS NOT NULL ORDER BY id ASC', userID);

  return {
    overallScore,
    vigilanceScore,
    completedLevels,
  }
}

module.exports = {
  getVideos,
  saveResponses
};
