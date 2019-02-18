const request = require('supertest');
const app = require('../app');
const debug = require('debug')('memento:server');
const { pool, initDB } = require('../database/database');
const { getSeqTemplate } = require('../utils/sequence');
const { getVideos, saveResponses } = require('../database/dbops');
const assert = require('assert');

beforeAll(async (done) => {
  await Promise.all(['users', 'presentations', 'levels'].map(table =>
    pool.query('DROP TABLE ' + table)
      .catch(() => {}) // don't care
  ));
  await initDB();
  done();
}, 10000);

describe('Test get sequence template', () => {
  test('It should have correct form', () => {
    const [nTargets, nFillers, ordering] = getSeqTemplate();
    // test that the biggest elt in the seq is nTargets + nFillers - 1
    const indices = ordering.map(([i, type]) => i);
    expect(Math.max(...indices)).toBe(nTargets + nFillers - 1);
  });
});

describe('Test get videos', () => {
  test('It should return data in the correct format', async (done) => {
    const template = getSeqTemplate(); // TODO: use a custom template
    const [nTargets, nFillers, ordering] = template;
    const vidData = await getVideos('test1', template);
    
    const vids = vidData["videos"];
    expect(vids.length).toBe(ordering.length);
    
    // check n targets is correct
    const targets = new Set(ordering.filter(([url, type]) => type == "target" || type == "target_repeat").map(([url, type]) => url));
    expect(targets.size).toBe(nTargets);
    // check n fillers is correct 
    const allUrls = new Set(ordering.map(([url, type]) => url));
    expect(allUrls.size).toBe(nTargets + nFillers);
  
    done();
  });

  // Tested with 100 iterations but that takes a while
  test('It should never repeat urls', async (done) => {
    const urls = new Set();
    for (let i = 1; i < 10; i += 1) {
      vidData = await getVideos('test2', getSeqTemplate());
      const sequenceURLs = new Set(vidData.videos.map((elt) => elt.url));
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
    const template = getSeqTemplate();
    const videos = await getVideos('test3', template);
    const answers = videos["videos"].map(vid => {
      const answer = urls.has(vid.url);
      urls.add(vid.url);
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
        const { body: vidData } = res;
        // check it returns some vids
        assert(vidData.videos.length > 1);
        //expect(vidData.videos.length).toBe.greaterThan(1);
        //expect(sequence.length).toBe(100);
        //expect((new Set(sequence)).size).toBe(75);
        done();
      });
  });
});

describe('Test game end', () => {
  test('It should return the scores', async (done) => {
    const urls = new Set();
    const template = getSeqTemplate();
    const videoData = await getVideos('test5', template);
    const answers = videoData.videos.map(vid => {
      const answer = urls.has(vid.url);
      urls.add(vid.url);
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
