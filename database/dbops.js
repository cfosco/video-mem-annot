const { pool } = require('./database');

/**
 * @param {string} workerID
 * @param {[number, boolean][]} sequence index, vigilance
 * @return {Promise<string[]>} list of video urls
 */
async function getVideos(workerID, sequence) {
  // numVideos = largest index in sequence + 1 (since 0 is the first index)
  const numVideos = Math.max(...sequence.map(([i]) => i)) + 1;
  const connection = await pool.getConnection();

  let userID;
  const users = await connection.query('SELECT id FROM users WHERE worker_id = ?', workerID);
  if (users.length === 0) {
    userID = (await connection.query('INSERT INTO users (worker_id) VALUES (?)', workerID)).insertId;
  } else {
    userID = users[0].id;
  }

  // get N least-seen videos user hasn't seen yet
  const videos = await connection.query('SELECT videos.id, uri'
    + ' FROM videos LEFT JOIN presentations ON videos.id = presentations.id_video'
    + ' WHERE videos.id NOT IN'
    + ' (SELECT id_video FROM presentations, levels WHERE id_user = ?)'
    + ' GROUP BY videos.id ORDER BY COUNT(videos.id) ASC LIMIT ?',
    [userID, numVideos]
  );
  if (videos.length < numVideos) {
    throw new Error('No more videos for user.');
  }

  // create a level
  await connection.beginTransaction();
  try {  
    const levelID = (await connection.query('INSERT INTO levels (id_user) VALUES (?)', userID)).insertId;

    const presentationInserts = sequence.map(([index, vigilance], position) =>
      [levelID, videos[index].id, position, vigilance]
    );
    await connection.query('INSERT INTO presentations'
      + ' (id_level, id_video, position, vigilance)'
      + ' VALUES ?',
      [presentationInserts]
    );
    await connection.commit();
    await connection.release();

    // return the ordered list of URLs
    return sequence.map(([index]) => videos[index].uri);
  } catch (e) {
    await connection.rollback();
    throw e;
  }
}

module.exports = {
  getVideos,
};
