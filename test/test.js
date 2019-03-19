const request = require('supertest');
const debug = require('debug')('memento:server');
const assert = require('assert');
const app = require('../api/app');
const config = require('../api/config');
const { pool, initDB } = require('../api/database/database');
const { getSeqTemplate } = require('../api/utils/sequence');
const {
    getVideos,
    saveResponses,
    calcScores,
    BlockedError,
    UnauthenticatedError,
    OutOfVidsError,
    InvalidResultsError,
    getUserInfo,
    submitLevel,
    fixLabelCounts
} = require('../database/dbops');
// helper functions for use in tests

const userAgentData = {
  browser: 'jest',
  browserVersion: '1',
  os: 'jest',
  deviceType: 'jest'
};

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
  return answers.map((response, i) => ({
    response,
    startMsec: i * 3000,
    durationMsec: Math.random() * 3000
  }));
}

function createMockPresentations(n_pres, fail_vig, fail_targets, fail_others) {

    var n_vigs = n_pres*0.2
    var n_targets = n_pres*0.2

    var presentations = []

    for (const i of Array(n_pres).keys()) {
      if (i < n_vigs) {
          vigilance = true
          targeted = false
          duplicate = false
          response = fail_others
      } else if (i < n_vigs*2) {
          vigilance = true
          targeted = false
          duplicate = true
          response = !fail_vig
      } else if (i < n_vigs*2+n_targets) {
          vigilance = false
          targeted = true
          duplicate = false
          response = fail_others
      } else if (i < n_vigs*2+n_targets*2) {
          vigilance = false
          targeted = true
          duplicate = true
          response = !fail_targets
      } else {
          vigilance = false
          targeted = false
          duplicate = false
          response = fail_others
      }

      presentations.push({vigilance, targeted, duplicate, response})
    }

    return presentations
}


async function getVidsAndMakeAnswers(user, correct=true, shortSeq=false) {
    const template = getSeqTemplate(shortSeq);
    const inputs = await getVideos({
      workerID: user,
      ...userAgentData
    }, template);
    const { videos } = inputs;
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

async function wipeDB (populateVideos) {
  for (let table of ['errors', 'presentations', 'levels', 'users', 'videos']) {
    await pool.query('DROP TABLE ' + table)
      .catch((e) => {
        debug("error dropping table", e);
      }) // don't care
  }
  await initDB(populateVideos);
}

beforeAll(async (done) => {
    await wipeDB(populateVideos=true);
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

describe('Test get user info', () => {
  test('It should return level 1 on new user', async (done) => {
    const user = 'getuserinfotest1';
    const {level} = await getUserInfo(user);
    expect(level).toBe(1);
    done();
  });
});

describe('Test get videos', () => {
  test('It should return data in the correct format', async (done) => {
    const user = 'test1';
    const template = getSeqTemplate();
    const [nTargets, nFillers, ordering] = template;
    const {videos, level} = await getVideos({workerID: user, ...userAgentData}, template);

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
    const user = 'test2';
    const urls = new Set();
    for (let i = 1; i < 10; i += 1) {
      const {videos, level} = (await getVidsAndMakeAnswers(user)).inputs;
      expect(level).toBe(1);
      const sequenceURLs = new Set(videos.map((elt) => elt.url));
      sequenceURLs.forEach(url => {
        expect(urls.has(url)).toBe(false);
        urls.add(url);
      });
    }
    done();
  }, 30000);

  test('It should save assignment id and hit id if provided', async (done) => {
    const user = 'saveAid';
    const assignmentID = "aid";
    const hitID = "hid";
    const inputData = {
        workerID: user,
        assignmentID,
        hitID,
        ...userAgentData
    };
    const inputs = await getVideos(inputData, getSeqTemplate());
    // query the db and make sure stuff was saved
    const dbResult = await pool.query("SELECT * FROM levels WHERE id = ?", inputs.levelID);
    expect(dbResult[0].assignment_id).toEqual(assignmentID);
    expect(dbResult[0].hit_id).toEqual(hitID);
    done();
  });
});

describe('Test increasing levels', () => {
  test('Levels should increase', async (done) => {
    const username = 'testIncLevel';
    for (let i = 1; i <=3; i++) {
      const levelInputs = await getVideos({workerID: username, ...userAgentData}, getSeqTemplate());
      const {videos, level, levelID} = levelInputs;
      expect(level).toBe(i);
      const answers = calcAnswers(videos, correct=true);
      await saveResponses({
        workerID: username,
        levelID,
        responses: answers,
        levelInputs
      });
    }
    done();
  });
});

describe('Test dbops with invalid user', () => {
    const badUser = "";
    test('getVideos should throw error', async (done) => {
        await checkThrowsError(async() => {
            await getVideos({workerID: badUser, ...userAgentData}, getSeqTemplate());
        }, UnauthenticatedError);
        done();
    });

    test('saveResponses should throw error', async (done) => {
        await checkThrowsError(async() => {
            await saveResponses({
              workerID: badUser,
              levelID: -1,
              responses: [],
              levelInputs: {}
            });
        }, UnauthenticatedError);
        done();
    });
});

describe('Test saveResponses invalid input', () => {
    const user = "badInpSaveResp";
    test('Submit without starting level should throw error', async (done) => {
        await checkThrowsError(async() => {
            await saveResponses({
              workerID: 'badUser',
              levelID: -1,
              responses: [],
              levelInputs: {}
            });
        }, InvalidResultsError);
        done();
    });

    test('Submit empty results should throw error', async (done) => {
        const { answers, inputs } = await getVidsAndMakeAnswers(user); // start level
        await checkThrowsError(async() => {
            await saveResponses({
              workerID: user,
              levelID: -1,
              responses: [],
              levelInputs: inputs
            });
        }, InvalidResultsError);
        done();
    });

    test('Invalidly formatted results should throw error', async (done) => {
        const { answers, inputs } = await getVidsAndMakeAnswers(user);
        await checkThrowsError(async() => {
            const invalidResponses = ["some", "random", "words"];
            await saveResponses({
              workerID: user,
              levelID: inputs.levelID,
              responses: invalidResponses,
              levelInputs: inputs
            });
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
            await saveResponses({
              workerID: user,
              levelID: inputs.levelID,
              responses: answers,
              levelInputs: inputs
            });
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
              {
                workerID: user,
                levelID: inputs.levelID,
                responses: answers,
                levelInputs: inputs
              },
              1,
              50,
              true
            );
        }, InvalidResultsError);
        done();
    });

    test('Answers submitted after a reasonable delay should be accepted', async (done) => {
        const user = "accSlowSubmit";
        const shortTemplate = [0, 1, [[0, "filler"]]];
        const inputs = await getVideos({workerID: user, ...userAgentData}, shortTemplate);
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
                  {
                    workerID: user,
                    levelID,
                    responses: correctResponses,
                    levelInputs: inputs
                  },
                  1,
                  50,
                  true
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
    } = await saveResponses({
      workerID: username,
      levelID: inputs.levelID,
      responses: answers,
      levelInputs: inputs
    }, .5);
    expect(overallScore).toEqual(1);
    expect(numLives).toEqual(2);
    expect(vigilanceScore).toEqual(1);
    expect(passed).toBe(true);
    expect(completedLevels).toHaveLength(1);
    expect(completedLevels[0].score).toEqual(1);
    expect(completedLevels[0].reward).toEqual(.5);
    done();
  });

  test('It should let you submit early but fail you', async (done) => {
    const username = 'testEarlyFail';
    let { answers, inputs } = await getVidsAndMakeAnswers(username);
    answers = answers.slice(10);
    const {
      numLives,
      passed,
      completedLevels
    } = await saveResponses({
      workerID: username,
      levelID: inputs.levelID,
      responses: answers,
      levelInputs: inputs
    }, .5);
    expect(numLives).toEqual(0);
    expect(passed).toBe(false);
    expect(completedLevels).toHaveLength(1);
    done();
  });

  test('It should let you submit with errors', async (done) => {
    const username = 'testSubmitError';
    const { answers, inputs } = await getVidsAndMakeAnswers(username);
    answers[0].response = null;
    answers[0].error = {
      code: 1,
      text: 'foo',
      where: 'myFn'
    };
    const {
      numLives,
      passed,
      completedLevels
    } = await saveResponses({
      workerID: username,
      levelID: inputs.levelID,
      responses: answers,
      levelInputs: inputs
    }, .5);
    expect(numLives).toEqual(2);
    expect(passed).toBe(true);
    expect(completedLevels).toHaveLength(1);
    done();
  });

  test('It should let you submit with multiple errors', async (done) => {
    const username = 'testSubmitErrorMultiple';
    const { answers, inputs } = await getVidsAndMakeAnswers(username);
    answers[0].response = null;
    answers[0].error = {
      code: 1,
      text: 'foo',
      where: 'myFn'
    };
    answers[10].response = null;
    answers[10].error = {
      code: 1,
      text: 'foo',
      where: 'myFn'
    };
    answers[11].response = null;
    answers[11].error = {
      code: 1,
      text: 'foo',
      where: 'myFn'
    };
    const {
      numLives,
      passed,
      completedLevels
    } = await saveResponses({
      workerID: username,
      levelID: inputs.levelID,
      responses: answers,
      levelInputs: inputs
    }, .5);
    expect(numLives).toEqual(2);
    expect(passed).toBe(true);
    expect(completedLevels).toHaveLength(1);
    done();
  });

  test('It should let the error object be empty', async (done) => {
    const username = 'testSubmitErrorEmpty';
    const { answers, inputs } = await getVidsAndMakeAnswers(username);
    answers[0].response = null;
    answers[0].error = {};
    const {
      numLives,
      passed,
      completedLevels
    } = await saveResponses({
      workerID: username,
      levelID: inputs.levelID,
      responses: answers,
      levelInputs: inputs
    }, .5);
    expect(numLives).toEqual(2);
    expect(passed).toBe(true);
    expect(completedLevels).toHaveLength(1);
    done();
  });

  test('It should let you submit early with errors and not fail you', async (done) => {
    const username = 'testErrorEnd';
    let { answers, inputs } = await getVidsAndMakeAnswers(username);
    answers = answers.slice(10);
    answers[9].response = null;
    answers[9].error = {
      code: 1,
      text: 'foo',
      where: 'myFn'
    };
    const {
      numLives,
      passed,
      completedLevels
    } = await saveResponses({
      workerID: username,
      levelID: inputs.levelID,
      responses: answers,
      levelInputs: inputs,
      errorEnd: true
    }, .5);
    expect(numLives).toBe(undefined);
    expect(passed).toBe(undefined);
    expect(completedLevels).toHaveLength(0);
    done();
  });
});

describe('Test submit', () => {
  test('It should set the total time and feedback', async (done) => {
    const username = 'testSubmit';
    const { answers, inputs } = await getVidsAndMakeAnswers(username);
    await saveResponses({
      workerID: username,
      levelID: inputs.levelID,
      responses: answers,
      levelInputs: inputs
    }, reward=.5);
    const durationMsec = 10 * 60 * 1000;
    await submitLevel(inputs.levelID, durationMsec, 'Foo');
    const { feedback, duration_msec } = (await pool.query(
      'SELECT feedback, duration_msec FROM levels WHERE id = ?',
      inputs.levelID
    ))[0];
    expect(feedback).toEqual('Foo');
    expect(duration_msec).toEqual(durationMsec);
    done();
  });

  test('It should set the feedback via API', async (done) => {
    const username = 'testSubmitAPI'
    const { answers, inputs } = await getVidsAndMakeAnswers(username);
    await saveResponses({
      workerID: username,
      levelID: inputs.levelID,
      responses: answers,
      levelInputs: inputs
    });
    const durationMsec = 9 * 60 * 1000;
    request(app)
      .post(`/api/submit`)
      .send({
        levelID: inputs.levelID,
        taskTimeMsec: durationMsec,
        feedback: 'bar'
      })
      .expect(200)
      .end(async () => {
        const { feedback, duration_msec } = (await pool.query(
          'SELECT feedback, duration_msec FROM levels WHERE id = ?',
          inputs.levelID
        ))[0];
        expect(feedback).toEqual('bar');
        expect(duration_msec).toEqual(durationMsec);
        done();
      });
  });
});

describe('Test scoring functions', () => {
    test('Check that user doesnt pass when all vigilances failed (vigilance accuracy too low)', async (done) => {

        presentations = createMockPresentations(40, true, false, false);
        const {passed, overallScore, vigilanceScore, falsePositiveRate} = calcScores(presentations);
        debug('passed, overallScore, vigilanceScore, falsePositiveRate',passed, overallScore, vigilanceScore, falsePositiveRate)
        debug('falsePositiveRate', falsePositiveRate)
        expect(vigilanceScore).toEqual(0);
        expect(passed).toEqual(false);
        done();
    });

    test('Check that user doesnt pass when all non-duplicates failed (FPR too high)', async (done) => {

        presentations = createMockPresentations(40, false, false, true)
        const {passed, overallScore, vigilanceScore, falsePositiveRate} = calcScores(presentations);
        expect(falsePositiveRate).toEqual(1);
        expect(passed).toEqual(false);
        done();
    });

    test('Check that users can pass even with bad performance on targets', async (done) => {

        presentations = createMockPresentations(40, false, true, false)
        const {passed, overallScore, vigilanceScore, falsePositiveRate} = calcScores(presentations);
        debug('IN ACC TEST:',passed, overallScore, vigilanceScore, falsePositiveRate)
        expect(passed).toEqual(true);
        done();
    });

});

describe('Test that accuracy metrics are saved in the db', () => {
    test('Check vig and false positives on complete success', async(done) => {
        const username = "testFalsePosSuccess";
        const { answers, inputs } = await getVidsAndMakeAnswers(username);
        const {
          overallScore,
          vigilanceScore,
          numLives,
          passed,
          completedLevels
        } = await saveResponses({
          workerID: username,
          levelID: inputs.levelID,
          responses: answers,
          levelInputs: inputs
        });
        expect(overallScore).toBe(1);
        expect(vigilanceScore).toBe(1);
        expect(passed).toBe(true);
    
        // check the db 
        const res = await pool.query("SELECT * FROM levels WHERE id = ?", inputs.levelID);
        expect(res[0].vig_score).toBe(1);
        expect(res[0].false_pos_rate).toBe(0);
        done();
 
    });

    test('Check vig and false positives on complete failure', async(done) => {
        const username = "testFalsePosFailure";
        const { answers, inputs } = await getVidsAndMakeAnswers(username, correct=false);
        const {
          overallScore,
          vigilanceScore,
          numLives,
          passed,
          completedLevels
        } = await saveResponses({
          workerID: username,
          levelID: inputs.levelID,
          responses: answers,
          levelInputs: inputs
        });
        expect(overallScore).toBe(0);
        expect(vigilanceScore).toBe(0);
        expect(passed).toBe(false);
    
        // check the db 
        const res = await pool.query("SELECT * FROM levels WHERE id = ?", inputs.levelID);
        expect(res[0].vig_score).toBe(0);
        expect(res[0].false_pos_rate).toBe(1);
        done();
 
    });

    test('Check vig and false positives with mixed results', async(done) => {
        const username = "testFalsePosMixedResults";
        const shortTemplate = [1, 3, [
            [0, "filler"], 
            [1, "target"], 
            [1, "target_repeat"],
            [2, "vig"], 
            [2, "vig_repeat"], 
            [3, "vig"], 
            [3, "vig_repeat"]
        ]];
        const inputs = await getVideos({workerID: username, ...userAgentData}, shortTemplate);
        const boolAnswers = [true, false, true, false, true, false, false]
        const answers = boolAnswers.map((response, i) => {
          return {
            response,
            startMsec: i * 3000,
            durationMsec: 3000
          }
        });
        const {
          overallScore,
          vigilanceScore,
          numLives,
          passed,
          completedLevels
        } = await saveResponses({
          workerID: username,
          levelID: inputs.levelID,
          responses: answers,
          levelInputs: inputs
        });
        //expect(overallScore).toBe();
        expect(vigilanceScore).toBe(.5);
    
        // check the db 
        const res = await pool.query("SELECT * FROM levels WHERE id = ?", inputs.levelID);
        expect(res[0].vig_score).toBe(.5);
        // 1 false positive out of 4 true negatives
        expect(res[0].false_pos_rate).toBe(.25);
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
        } = await saveResponses({
          workerID: username,
          levelID: inputs.levelID,
          responses: answers,
          levelInputs: inputs
        }, 1, 3);
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

describe('Test rewards', () => {
  test('Rewards are stored per-level and should be consistent', async (done) => {
    const username = 'testRewards';
    var responses;
    for (let i = 0; i < 5; i++) {
        const { answers, inputs } = await getVidsAndMakeAnswers(username);
        responses = await saveResponses({
          workerID: username,
          levelID: inputs.levelID,
          responses: answers,
          levelInputs: inputs
        }, i);
        const levels = responses.completedLevels;
        expect(levels[levels.length-1].reward).toEqual(i);
    }
    const {
      overallScore,
      vigilanceScore,
      numLives,
      passed,
      completedLevels
    } = responses;
    responses.completedLevels.forEach(({ score, reward }, i) => {
        expect(reward).toEqual(i);
    });
    done();
  });

  test('Rewards should be assigned even when someone fails a level', async(done) => {
    const username = 'testRewardsFailed';
    const { answers, inputs } = await getVidsAndMakeAnswers(username, correct=false);
    const {
      overallScore,
      vigilanceScore,
      numLives,
      passed,
      completedLevels
    } = await saveResponses({
      workerID: username,
      levelID: inputs.levelID,
      responses: answers,
      levelInputs: inputs
    }, 1);
    expect(passed).toBe(false);
    expect(numLives).toBe(0);
    expect(completedLevels[completedLevels.length-1].reward).toEqual(1);
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
              {
                workerID: username,
                levelID: inputs.levelID,
                responses: answers,
                levelInputs: inputs
              },
              1,
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
            } = await saveResponses({
              workerID: username,
              levelID: inputs.levelID,
              responses: answers,
              levelInputs: inputs
            });
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
    } = await saveResponses({
      workerID: username,
      levelID: inputs.levelID,
      responses: answers,
      levelInputs: inputs
    });
    expect(numLives).toEqual(0);
    expect(passed).toBe(false);

    await checkThrowsError(async () => {
        await getVideos({workerID: username, ...userAgentData}, getSeqTemplate());
    }, BlockedError);

    await checkThrowsError(async() => {
        await saveResponses({
          workerID: username,
          levelID: -1,
          responses: [],
          levelInputs: {}
        });
    }, BlockedError);

    done();
  })
});

describe('Test failure on later rounds', () => {
  test('Failure on later rounds should decrement lives', async (done) => {
    const username = 'testFailLater';
    const { answers: rightAnswers, inputs: rightInputs } = await getVidsAndMakeAnswers(username);
    const {
      numLives,
    } = await saveResponses({
      workerID: username,
      levelID: rightInputs.levelID,
      responses: rightAnswers,
      levelInputs: rightInputs
    });
    expect(numLives).toEqual(2);

    var finalLives;
    for (let i = 0; i < 2; i++) {
      let { answers: wrongAnswers, inputs: wrongInputs } = await getVidsAndMakeAnswers(
        username,
        correct=false
      );
      const {
        numLives,
        passed,
      } = await saveResponses({
        workerID: username,
        levelID: wrongInputs.levelID,
        responses: wrongAnswers,
        levelInputs: wrongInputs
      });
      expect(passed).toBe(false);
      finalLives = numLives;
    }
    expect(finalLives).toEqual(0);
    await checkThrowsError(async () => {
        await getVideos({workerID: username, ...userAgentData}, getSeqTemplate());
    }, BlockedError);

    await checkThrowsError(async() => {
        await saveResponses({
          workerID: username,
          levelID: -1,
          responses: [],
          levelInputs: {}
        });
    }, BlockedError);

    done();
  });
});

describe('Test get user', () => {
  test('It should return level 1 for new user', (done) => {
    request(app)
      .get('/api/users/testgetuser2')
      .expect(200)
      .end((err, res) => {
        const { level } = res.body;
        expect(level).toBe(1);
        done();
      });
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
    } = await saveResponses({
      workerID: username,
      levelID: inputs.levelID,
      responses: answers,
      levelInputs: inputs
    });
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
        const { score, reward } = completedLevels[0];
        expect(score).toEqual(1);
        expect(reward).toEqual(config.rewardAmount);
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
    } = await saveResponses({
      workerID: username,
      levelID: wrongInputs.levelID,
      responses: wrongAnswers,
      levelInputs: wrongInputs
    });
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

describe('Test concurrency', () => {
    const playLevel = function(i) {
        const username = "testConcur" + i;
        return new Promise( (resolve, reject) => {
          var agent = request(app);
          // start the game
          agent.post('/api/start')
          .send({ workerID: username})
          .expect(200)
          .end((err, res) => {
            if (err) return reject(err);
            const inputs = res.body;
            const { videos, level, levelID } = inputs;
            assert(videos.length > 1);
            expect(level).toBe(1);
            // end the game
            const answers = calcAnswers(videos, correct=true);
            agent.post('/api/end')
              .send({
                workerID: username,
                levelID: levelID,
                responses: answers,
                inputs
              })
              .expect(200)
              .end((err, res) => {
                  if (err) return reject(err);
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
                   const { score, reward } = completedLevels[0];
                   expect(score).toEqual(1);
                   expect(reward).toEqual(config.rewardAmount);
                   resolve(true);
              });
          });
        });
    }

    test('Concurrent requests should complete succesfully', async (done) => {
        const username = "testConcur";
        // make a bunch of promises
        const promises = [];
        for (let i = 0; i < 20; i++) {
            promises.push(playLevel(i));
        }
        await Promise.all(promises);
        done();
    });
});

describe('Test video prioritization', () => {
    const nHighPri = 10;
    const nLowPri = 10;

    beforeEach(async (done) => {
      await wipeDB(populateVideos=false);
      // add high and low pri vids to the db
      for (let i = 0; i < nHighPri; i++) {
          await pool.query("INSERT INTO videos (uri) VALUES (?)", i);
      }
      for (let i = nHighPri; i < nLowPri+nHighPri; i++) {
          await pool.query("INSERT INTO videos (uri, labels) VALUES (?, ?)", [i, 10]);
      }
      done();
    }, 10000);

    afterEach(async (done) => {
        await wipeDB(populateVideos=true);
        done();
    }, 10000);

    test('Targets should be chosen based on priority', async (done) => {
      const username = "testTargetPriority";
      const nTarget = 3;
      const nFiller = 5;
      const order = [];
      for (let i = 0; i < nTarget; i++) {
          order.push([i, "target"]);
      }
      for (let i = 0; i < nFiller; i++) {
          order.push([i, "filler"]);
      }
      const template = [nTarget, nFiller, order];
      const {videos} = await getVideos({workerID: username, ...userAgentData}, template);

      // check that the first several are all high-pri videos
      for (let i = 0; i < nTarget; i++) {
          const vidid = parseInt(videos[i].url);
          assert(parseInt(videos[i].url) < nHighPri, "target should be a high-pri video");
      }
      done();
    }, 10000);

    test('Fillers should be chosen randomly', async (done) => {
      const username = "testFillerPriority";
      // make sure it is possible that all vids come from one category
      const nVids = Math.min(nHighPri, nLowPri);
      const order = [];
      for (let i = 0; i < nVids; i++) {
          order.push([i, "filler"]);
      }
      const template = [0, nVids, order];
      const { videos } = await getVideos({workerID: username, ...userAgentData}, template);
      // check that there is a mix of vid types
      var nActualHigh = 0;
      var nActualLow = 0;
      videos.map(({ url }) => {
          const vidid = parseInt(url);
          return parseInt(url) < nHighPri ? nActualHigh++ : nActualLow++;
      });
      assert (nActualHigh > 0, "Warning; fillers were all low-pri");
      assert (nActualLow > 0, "Warning: fillers were all high-pri");
      done();
    }, 10000);

    test('Videos served to users should not conflict with each other', async(done) => {
        const lenTemplate = 5;
        const order = []; 
        for (let i = 0; i < lenTemplate; i++) {
            order.push([i, "filler"]);
        }
        const template = [0, lenTemplate, order];
        const user1 = "user1";
        const user2 = "user2";
        const expectedNumLevels = Math.floor((nHighPri + nLowPri)/lenTemplate);
        // user 1 goes first
        for (let user of [user1, user2]) {
            const seen = new Set();
            for (let i = 0; i < expectedNumLevels; i++) {
                debug("User " + user + " i " + i);
                const { videos } = await getVideos({workerID: user, ...userAgentData}, template);
                videos.map(({ url }) => {
                    expect(seen.has(url)).toBe(false);
                    seen.add(url);
                });
            }
            debug("User " + user + " last one");
            await checkThrowsError(async() => {
                const vids = await getVideos({workerID: user, ...userAgentData}, template);
            }, OutOfVidsError);
        };
        
        done();
    }, 10000);
});

describe('Test update label counts', () => {
  beforeEach(async (done) => {
    await wipeDB(populateVideos=false);
    done();
  }, 10000);

  afterEach(async (done) => {
      await wipeDB(populateVideos=true);
      done();
  }, 10000);

  test('Should reset all label counts to zero when there are no presentations', async (done) => {
    for (let i = 0; i < 5; i += 1) {
      await pool.query("INSERT INTO videos (uri, labels) VALUES (?, ?)", [i, i]);
    }
    await fixLabelCounts();
    const labelCounts = await pool.query('SELECT labels FROM videos;');
    labelCounts.forEach(({ labels }) => expect(labels).toBe(0));
    done();
  });

  // the short sequence contains five videos:
  // one target (duplicated), one vigilance (dup.), and one filler (not dup.)

  test('Should set correct label counts when a game is completed', async (done) => {
    for (let i = 0; i < 3; i += 1) {
      await pool.query("INSERT INTO videos (uri, labels) VALUES (?, ?)", [i, 5]);
    }
    const username = "testFixLabelCountsCompletedGame";
    const { answers, inputs } = await getVidsAndMakeAnswers(username, true, true);
    await saveResponses({
      workerID: username,
      levelID: inputs.levelID,
      responses: answers,
      levelInputs: inputs
    });
    await fixLabelCounts();
    const labelCounts = await pool.query('SELECT labels FROM videos;');
    expect(labelCounts.filter(({ labels }) => labels === 0)).toHaveLength(2);
    expect(labelCounts.filter(({ labels }) => labels === 1)).toHaveLength(1);
    done();
  });

  test('Should set correct label counts when a game is pending', async (done) => {
    for (let i = 0; i < 3; i += 1) {
      await pool.query("INSERT INTO videos (uri, labels) VALUES (?, ?)", [i, 5]);
    }
    const username = "testFixLabelCountsPendingGame";
    await getVidsAndMakeAnswers(username, true, true);
    await fixLabelCounts();
    const labelCounts = await pool.query('SELECT labels FROM videos;');
    expect(labelCounts.filter(({ labels }) => labels === 0)).toHaveLength(2);
    expect(labelCounts.filter(({ labels }) => labels === 1)).toHaveLength(1);
    done();
  });

  test('Should set correct label counts when a game is expired', async (done) => {
    const orig = config.maxLevelTimeSec;
    config.maxLevelTimeSec = 0;

    for (let i = 0; i < 3; i += 1) {
      await pool.query("INSERT INTO videos (uri, labels) VALUES (?, ?)", [i, 5]);
    }
    const username = "testFixLabelCountsPendingGame";
    await getVidsAndMakeAnswers(username, true, true);
    await fixLabelCounts();
    const labelCounts = await pool.query('SELECT labels FROM videos;');
    expect(labelCounts.filter(({ labels }) => labels === 0)).toHaveLength(3);

    config.maxLevelTimeSec = orig;
    done();
  });
});
