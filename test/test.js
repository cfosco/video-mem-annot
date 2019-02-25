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
    OutOfVidsError,
    InvalidResultsError
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
    const inputs = await getVideos(user, template);
    const {videos, level} = inputs;
    const answers = calcAnswers(videos, correct);
    return { answers, inputs };
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
  for (let table of ['presentations', 'levels', 'users', 'videos']) {
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
      const inputs = await getVideos(username, getSeqTemplate());
      const {videos, level, levelID} = inputs;
      expect(level).toBe(i);
      const answers = calcAnswers(videos, correct=true);
      await saveResponses(username, levelID, answers, inputs);
    }
    done();
  });
});

describe('Test dbops with invalid user', () => {
    const badUser = "";
    test('getVideos should throw error', async (done) => {
        await checkThrowsError(async() => {
            await getVideos(badUser, getSeqTemplate());
        }, UnauthenticatedError);
        done();
    });

    test('saveResponses should throw error', async (done) => {
        await checkThrowsError(async() => {
            await saveResponses(badUser, -1, [], {});
        }, UnauthenticatedError);
        done();
    });
});

describe('Test saveResponses invalid input', () => {
    const user = "badInpSaveResp";
    test('Submit without starting level should throw error', async (done) => {
        await checkThrowsError(async() => {
            await saveResponses(user, -1, [], {});
        }, InvalidResultsError);
        done();
    });

    test('Submit empty results should throw error', async (done) => {
        const { answers, inputs } = await getVidsAndMakeAnswers(user); // start level
        await checkThrowsError(async() => {
            await saveResponses(user, -1, [], inputs);
        }, InvalidResultsError);
        done();
    });

    test('Invalidly formatted results should throw error', async (done) => {
        const { answers, inputs } = await getVidsAndMakeAnswers(user);
        await checkThrowsError(async() => {
            const invalidResponses = ["some", "random", "words"];
            await saveResponses(user, inputs.levelID, invalidResponses, inputs);
        }, InvalidResultsError);
        done();
    });

    test('Inconsistent inputs', async (done) => {
        const { answers, inputs } = await getVidsAndMakeAnswers(user);
        await checkThrowsError(async() => {
            // modify inputs in some way
            inputs.videos[0] = {
                url: "http://some-random-url.com/some-random-vid",
                type: "filler"
            };
            await saveResponses(user, inputs.levelID, answers, inputs);
        }, InvalidResultsError);
        done();
    });
});

describe('Test errorOnFastSubmit', () => {
    test('Answers submitted too quickly should throw error', async (done) => {
        await checkThrowsError(async() => {
            const user = "errFastSubmit";
            const { answers, inputs } = await getVidsAndMakeAnswers(user);
            await saveResponses(
                user, 
                inputs.levelID,
                answers, 
                inputs, 
                levelsPerLife=50,
                errorOnFastSubmit=true
            );
        }, InvalidResultsError);
        done();
    });

    test('Answers submitted after a reasonable delay should be accepted', async (done) => {
        const user = "accSlowSubmit";
        const shortTemplate = [0, 1, [[0, "filler"]]];
        const inputs = await getVideos(user, shortTemplate);
        const {videos, level, levelID} = inputs;
        const correctResponses = calcAnswers(videos, true);
        // wait a couple secs to submit
        const msecToWait = 2000;
        const {
          overallScore,
          vigilanceScore,
          numLives,
          passed,
          completedLevels
        } = await new Promise(resolve => {
            setTimeout(() => {
                resolve(saveResponses(
                    user,   
                    levelID,
                    correctResponses,
                    inputs, 
                    levelsPerLife=50,
                    errorOnFastSubmit=true
                ));
            }, msecToWait);
        }); 
        expect(overallScore).toBe(1);
        done();
    }, 3000);
});

describe('Test save answers', () => {
  test('It should save the answers', async (done) => {
    const username = 'test3';
    const { answers, inputs } = await getVidsAndMakeAnswers(username);
    const {
      overallScore,
      vigilanceScore,
      numLives,
      passed,
      completedLevels
    } = await saveResponses(username, inputs.levelID, answers, inputs);
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
        const { answers, inputs } = await getVidsAndMakeAnswers(username);
        const {
          overallScore,
          vigilanceScore,
          numLives,
          passed,
          completedLevels
        } = await saveResponses(
            username, 
            inputs.levelID, 
            answers, 
            inputs, 
            levelsPerLife=3
        );
        expect(completedLevels.length).toEqual(i);
        if (i >= 3) {
            expect(numLives).toEqual(3);
        } else {
            expect(numLives).toEqual(2);
        }
    }
    done();
  });
});

describe('Test level concurrency', () => {
    test('Level results should be properly matched when multiple levels are open', async (done) => {
        const username = "multipleLevels";
        const openLevelsData = [];
        const levelsPerLife = 100;
        for (let i = 0; i < 2; i++) {
            let startData = await getVidsAndMakeAnswers(username);
            openLevelsData.push(startData);
        }
        var expectedLevel = 1;
        var expectedLives = 2;
        for (let i = 0; i < openLevelsData.length; i++) {
            // submit the data in the same order
            let { answers, inputs } = openLevelsData[i];
            let {
              overallScore,
              vigilanceScore,
              numLives,
              passed,
              completedLevels
            } = await saveResponses(
                username, 
                inputs.levelID, 
                answers, 
                inputs, 
                levelsPerLife
            );
            expect(overallScore).toBe(1);
            expect(vigilanceScore).toBe(1);
            expect(numLives).toBe(2);
            expect(passed).toBe(true);
            expect(completedLevels.length).toBe(i+1);
        }
        done();
    });

    test('Level num should only increment on submit', async (done) => {
        const username = "lotsOLevels";
        const openLevelsData = [];
        for (let i = 0; i < 3; i++) {
            const startData = await getVidsAndMakeAnswers(username);
            openLevelsData.push(startData);
            expect(startData.inputs.level).toBe(1);
        }
        for (let i = 0; i < openLevelsData.length; i++) {
            const levelToSubmit = openLevelsData.length -i -1;
            let { answers, inputs } = openLevelsData[i];
            let {
              overallScore,
              vigilanceScore,
              numLives,
              passed,
              completedLevels
            } = await saveResponses(username, inputs.levelID, answers, inputs);
            expect(completedLevels.length).toBe(i+1);
        }
        done();
    });
});

describe('Test failure on first round', () => {
  test('Failure on first round should produce 0 lives', async (done) => {
    const username = 'testFailFirst';
    const { answers, inputs } = await getVidsAndMakeAnswers(
        username, 
        correct=false
    );
    const {
      overallScore,
      vigilanceScore,
      numLives,
      passed,
      completedLevels
    } = await saveResponses(username, inputs.levelID, answers, inputs);
    expect(numLives).toEqual(0);
    expect(passed).toBe(false);

    await checkThrowsError(async () => {
        await getVideos(username, getSeqTemplate());
    }, BlockedError);

    await checkThrowsError(async() => {
        await saveResponses(username, -1, [], {});
    }, BlockedError);

    done();
  })
});

describe('Test failure on later rounds', () => {
  test('Failure on later rounds should decrement lives', async (done) => {
    const username = 'testFailLater';
    const { answers: rightAnswers, inputs: rightInputs } = await getVidsAndMakeAnswers(username);
    const {
      overallScore,
      vigilanceScore,
      numLives,
      completedLevels
    } = await saveResponses(username, rightInputs.levelID, rightAnswers, rightInputs);
    expect(numLives).toEqual(2);

    var finalLives;
    for (let i = 0; i < 2; i++) {
      let { answers: wrongAnswers, inputs: wrongInputs } = await getVidsAndMakeAnswers(
        username, 
        correct=false  
      );
      const {
        overallScore,
        vigilanceScore,
        numLives,
        passed,
        completedLevels
      } = await saveResponses(username, wrongInputs.levelID, wrongAnswers, wrongInputs);
      expect(passed).toBe(false);
      finalLives = numLives;
    }
    expect(finalLives).toEqual(0);
    await checkThrowsError(async () => {
        await getVideos(username, getSeqTemplate());
    }, BlockedError);

    await checkThrowsError(async() => {
        await saveResponses(username, -1, [], {});
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
    const { answers, inputs }  = await getVidsAndMakeAnswers(
        username, 
        correct=false
    );
    const {
      overallScore,
      vigilanceScore,
      numLives,
      passed,
      completedLevels
    } = await saveResponses(username, inputs.levelID, answers, inputs);
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
    const user = 'test5'
    const { answers, inputs } = await getVidsAndMakeAnswers(user);
    request(app)
      .post('/api/end')
      .send({ workerID: user, levelID: inputs.levelID, responses: answers, inputs })
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
    const { answers: wrongAnswers, inputs: wrongInputs } = await getVidsAndMakeAnswers(
        username, 
        correct=false
    );
    const {
      overallScore,
      vigilanceScore,
      numLives,
      passed,
      completedLevels
    } = await saveResponses(username, wrongInputs.levelID, wrongAnswers, wrongInputs);
    expect(numLives).toBe(0);

    request(app)
      .post('/api/end')
      .send({ workerID: username, levelID: -1, responses: [], inputs: {}})
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
