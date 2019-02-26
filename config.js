const debug = require('debug')('memento:server');

const dbConfigBase = {
  connectionLimit: 100,
  multipleStatements: true,
};

const dev = {
  dbConfig: {
    ...dbConfigBase,
    host            : process.env.MYSQL_HOST,
    user            : process.env.MYSQL_USER,
    password        : process.env.MYSQL_PASS,
    database        : 'memento_dev',
  },
  enableBlockUsers    : false,
  errorOnFastSubmit   : false,
  enforceSameInputs   : false,
  rewardAmount        : 1,
}

const test = {
  dbConfig: {
    ...dbConfigBase,
    host            : process.env.MYSQL_HOST,
    user            : process.env.MYSQL_USER,
    password        : process.env.MYSQL_PASS,
    database        : 'memento_test',
  },
  enableBlockUsers    : true,
  errorOnFastSubmit   : false,
  enforceSameInputs   : true,
  rewardAmount        : 1,
}

const prod = {
  dbConfig: {
    ...dbConfigBase,
    host            : process.env.MYSQL_HOST,
    user            : process.env.MYSQL_USER,
    password        : process.env.MYSQL_PASS,
    database        : 'memento_prod'
  },
  enableBlockUsers    : true,
  errorOnFastSubmit   : true,
  enforceSameInputs   : true,
  rewardAmount        : 1,
}

const configs = { prod, dev, test }

// NODE_ENV is set by jest to 'test' iff null at start. As such, it cannot be
// set by us to specify dev vs prod.
const node_env = process.env.NODE_ENV;
// set MEMENTO_ENV to prod, dev, or test
let memento_env = process.env.MEMENTO_ENV;

// node_env overrides memento_env, for use with jest
if (node_env) {
    memento_env = node_env;
}

if (!(memento_env in configs)) {
    throw new Error("Please set env var MEMENTO_ENV to one of: prod, dev, test");
}

debug("Using env", memento_env);

module.exports = configs[memento_env];
