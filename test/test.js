const request = require('supertest');
const app = require('../app');
const debug = require('debug')('memento:server');
const { pool, initDB } = require('../database/database');
const { getSeqTemplate } = require('../utils/sequence');
const { 
    getVideos, 
    saveResponses, 
    BlockedError,
    UnauthenticatedError,
    OutOfVidsError
} = require('../database/dbops');
const assert = require('assert');
// helper functions for use in tests

function calcAnswers(videos, correct) {
  const urls = new Set();
  const answers = videos.map(vid => {
    const answer = urls.has(vid.url);
    urls.add(vid.url);
    if (!correct) {
      return !answer;
    }
    return answer;
  });
  return answers.map((response) => ({
    response,
    time: Math.random() * 3
  }));
}

async function getVidsAndMakeAnswers(user, correct=true) {
    const template = getSeqTemplate();
    const urls = new Set();
    const {videos, level} = await getVideos(user, template);
    return calcAnswers(videos, correct);
}

async function checkThrowsError(asyncFunc, errorClass) {
    let error;
    try {
        await asyncFunc();
    } catch (e) {
        error = e;
    }
    expect(error).toBeInstanceOf(errorClass);
}

beforeAll(async (done) => {
  // clears all the tables before running tests
  for (let table of ['presentations', 'levels', 'users']) {
    await pool.query('DROP TABLE ' + table)
      .catch((e) => {
        debug("error dropping table", e);
      }) // don't care
  }
  await initDB();
  done();
}, 10000);


// tests
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
    const {videos, level} = await getVideos('test1', template);
    
    expect(videos.length).toBe(ordering.length);
    expect(level).toBe(1);
    
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
      const {videos, level} = await getVideos('test2', getSeqTemplate());
      expect(level).toBe(1);
      const sequenceURLs = new Set(videos.map((elt) => elt.url));
      sequenceURLs.forEach(url => {
        expect(urls.has(url)).toBe(false);
        urls.add(url);
      });
    }
    done();
  }, 30000);
});

describe('Test increasing levels', () => {
  test('Levels should increase', async (done) => {
    const username = 'testIncLevel';
    for (let i = 1; i <=3; i++) {
      const {videos, level} = await getVideos(username, getSeqTemplate());
      expect(level).toBe(i);
      const answers = calcAnswers(videos, correct=true); 
      await saveResponses(username, answers);
    }
    done();
  });
});

describe('Test dbOps with invalid user', () => {
    const badUser = "";
    test('getVideos should throw error', async (done) => {
        await checkThrowsError(async() => {
            await getVideos(badUser, getSeqTemplate());
        }, UnauthenticatedError);
        done();
    });

    test('saveResponses should throw error', async (done) => {
        await checkThrowsError(async() => {
            await saveResponses(badUser, []);
        }, UnauthenticatedError);
        done();
    });
});

describe('Test save answers', () => {
  test('It should save the answers', async (done) => {
    const username = 'test3';
    const answers = await getVidsAndMakeAnswers(username);
    const {
      overallScore,
      vigilanceScore,
      numLives,
      passed,
      completedLevels
    } = await saveResponses(username, answers);
    expect(overallScore).toEqual(1);
    expect(numLives).toEqual(2);
    expect(vigilanceScore).toEqual(1);
    expect(passed).toBe(true);
    expect(completedLevels).toHaveLength(1);
    expect(completedLevels[0].score).toEqual(1);
    done();
  });
});

describe('Test lives increment when correct', () => {
  test('Lives should increment at levelsPerLife', async (done) => {
    const username = 'testLivesInc';
    for (let i = 1; i <= 5; i++) {
        const answers = await getVidsAndMakeAnswers(username);
        const {
          overallScore,
          vigilanceScore,
          numLives,
          passed,
          completedLevels
        } = await saveResponses(username, answers, levelsPerLife=3);
        if (i >= 3) {
            expect(numLives).toEqual(3);
        } else {
            expect(numLives).toEqual(2);
        }
    }
    done();
  });
});

describe('Test failure on first round', () => {
  test('Failure on first round should produce 0 lives', async (done) => {
    const username = 'testFailFirst';
    wrongAnswers = await getVidsAndMakeAnswers(username, correct=false);
    const {
      overallScore,
      vigilanceScore,
      numLives,
      passed,
      completedLevels
    } = await saveResponses(username, wrongAnswers);
    expect(numLives).toEqual(0);
    expect(passed).toBe(false);

    await checkThrowsError(async () => {
        await getVideos(username, getSeqTemplate());
    }, BlockedError);

    await checkThrowsError(async() => {
        await saveResponses(username, []);
    }, BlockedError);

    done();
  })
});

describe('Test failure on later rounds', () => {
  test('Failure on later rounds should decrement lives', async (done) => {
    const username = 'testFailLater';
    const rightAnswers = await getVidsAndMakeAnswers(username);
    const {
      overallScore,
      vigilanceScore,
      numLives,
      completedLevels
    } = await saveResponses(username, rightAnswers);
    expect(numLives).toEqual(2);
    var finalLives;
    for (let i = 0; i < 2; i++) {
      const wrongAnswers = await getVidsAndMakeAnswers(username, correct=false);
      const {
        overallScore,
        vigilanceScore,
        numLives,
        passed,
        completedLevels
      } = await saveResponses(username, wrongAnswers);
      expect(passed).toBe(false);
      finalLives = numLives;
    }
    expect(finalLives).toEqual(0);
    await checkThrowsError(async () => {
        await getVideos(username, getSeqTemplate());
    }, BlockedError);
    
    await checkThrowsError(async() => {
        await saveResponses(username, []);
    }, BlockedError);

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
        const { videos, level } = res.body;
        // check it returns some vids
        assert(videos.length > 1);
        expect(level).toBe(1);
        done();
      });
  });
});

describe('Test game start blocked user', () => {
  test('start should throw 403', async (done) => {
    const username = 'startBlocked';
    // block the user
    const wrongAnswers = await getVidsAndMakeAnswers(username, correct=false);
    const {
      overallScore,
      vigilanceScore,
      numLives,
      passed,
      completedLevels
    } = await saveResponses(username, wrongAnswers);
    expect(numLives).toBe(0);
    request(app)
      .post('/api/start')
      .send({ workerID: username})
      .expect(403)
      .end((err, res) => {
        if (err) return done(err); 
        done();
      });
  });
});

describe('Test game end', () => {
  test('It should return the scores', async (done) => {
    const template = getSeqTemplate();
    const {videos, level} = await getVideos('test5', template);
    const answers = calcAnswers(videos, correct=true);
    request(app)
      .post('/api/end')
      .send({ workerID: 'test5', responses: answers})
      .expect(200)
      .end((err, res) => {
        if (err) return done(err); 
        const {
            overallScore,
            vigilanceScore,
            passed,
            numLives,
            completedLevels
        } = res.body;
        expect(overallScore).toBe(1);
        expect(vigilanceScore).toBe(1);
        expect(passed).toBe(true);
        expect(numLives).toBe(2);
        expect(completedLevels.length).toBe(1);
        done();
      })
  });
});

describe('Test game end blocked user', () => {
  test('Game end should return 403', async (done) => {
    const username = 'endBlocked';
    // block the user
    const wrongAnswers = await getVidsAndMakeAnswers(username, correct=false);
    const {
      overallScore,
      vigilanceScore,
      numLives,
      passed,
      completedLevels
    } = await saveResponses(username, wrongAnswers);
    expect(numLives).toBe(0);
 
    request(app)
      .post('/api/end')
      .send({ workerID: username, responses: []})
      .expect(403)
      .end((err, res) => {
        if (err) return done(err); 
        done();
      });
  });
});

describe('Test API invalid user', () => {
  test('Game start with invalid user should return 401', async (done) => {
    request(app)
      .post('/api/start')
      .send({ workerID: ""})
      .expect(401)
      .end((err, res) => {
        if (err) return done(err); 
        done();
      });
    });

    test('Game end with invalid user should return 401', async (done) => {
      request(app)
        .post('/api/end')
        .send({ workerID: "", responses: []})
        .expect(401)
        .end((err, res) => {
          if (err) return done(err); 
          done();
        });
    });
});
