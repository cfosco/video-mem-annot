const request = require('supertest');
const app = require('../app');
const { pool, initDB } = require('../database/database');
const { getSequence } = require('../utils/sequence');
const { getVideos, saveResponses } = require('../database/dbops');

beforeAll(async (done) => {
  await Promise.all(['users', 'presentations', 'levels'].map(table =>
    pool.query('DROP TABLE ' + table)
      .catch(() => {}) // don't care
  ));
  await initDB();
  done();
}, 10000);

describe('Test generate sequence', () => {
  test('It should have right length and form', () => {
    const sequence = getSequence(100, 5, 20);
    expect(sequence.length).toBe(100);
    expect((new Set(sequence.map(([i]) => i))).size).toBe(75);
    expect(sequence.filter(([i, v]) => v).length).toBe(10);
  });
});

describe('Test get videos', () => {
  test('It should return a list of urls', async (done) => {
    sequence = await getVideos('test1', getSequence(100, 5, 20));
    expect(sequence.length).toBe(100);
    expect((new Set(sequence)).size).toBe(75);
    sequence
    done();
  });

  // Tested with 100 iterations but that takes a while
  test('It should never repeat urls', async (done) => {
    const urls = new Set();
    for (let i = 1; i < 10; i += 1) {
      sequence = await getVideos('test2', getSequence(100, 5, 20));
      const sequenceURLs = new Set(sequence);
      sequenceURLs.forEach(url => {
        expect(urls.has(url)).toBe(false);
        urls.add(url);
      });
    }
    done();
  }, 30000);
});

describe('Test save answers', () => {
  test('It should save the answers', async (done) => {
    const urls = new Set();
    const videos = await getVideos('test3', getSequence(100, 5, 20));
    const answers = videos.map(url => {
      const answer = urls.has(url);
      urls.add(url);
      return answer;
    })
    const {
      overallScore,
      vigilanceScore,
      completedLevels
    } = await saveResponses('test3', answers);
    expect(overallScore).toEqual(1);
    expect(vigilanceScore).toEqual(1);
    expect(completedLevels).toHaveLength(1);
    expect(completedLevels[0].score).toEqual(1);
    done();
  });
});

describe('Test game start', () => {
  test('It should return a list of urls', (done) => {
    request(app)
      .post('/api/start')
      .send({ workerID: 'test4'})
      .expect(200)
      .end((err, res) => {
        const { body: sequence } = res;
        expect(sequence.length).toBe(100);
        expect((new Set(sequence)).size).toBe(75);
        done();
      });
  });
});

describe('Test game end', () => {
  test('It should return the scores', async (done) => {
    const urls = new Set();
    const videos = await getVideos('test5', getSequence(100, 5, 20));
    const answers = videos.map(url => {
      const answer = urls.has(url);
      urls.add(url);
      return answer;
    });

    request(app)
      .post('/api/start')
      .send({ workerID: 'test5', responses: answers})
      .expect(200, {
        overallScore: 1,
        vigilanceScore: 1,
      })
      .end((err, res) => {
        done();
      });
  });
});