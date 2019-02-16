const request = require('supertest');
const app = require('../app');
const { pool, initDB } = require('../database/database');
const { getSequence } = require('../utils/sequence');
const { getVideos } = require('../database/dbops');

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
    sequence = await getVideos('foo', getSequence(100, 5, 20));
    expect(sequence.length).toBe(100);
    expect((new Set(sequence)).size).toBe(75);
    sequence
    done();
  });

  test('It should never repeat urls', async (done) => {
    const urls = new Set();
    for (let i = 1; i < 100; i += 1) {
      sequence = await getVideos('foo', getSequence(100, 5, 20));
      const sequenceURLs = new Set(sequence);
      sequenceURLs.forEach(url => {
        expect(urls.has(url)).toBe(false);
        urls.add(url);
      });
    }
    done();
  }, 30000);
});

describe('Test game start', () => {
  test('It should return a list of urls', (done) => {
    request(app)
      .post('/api/start')
      .send({ workerID: 'ATJIOPKIM12J8'})
      .expect(200)
      .end((err, res) => {
        const { body: sequence } = res;
        expect(sequence.length).toBe(100);
        expect((new Set(sequence)).size).toBe(75);
        done();
      });
  })
})