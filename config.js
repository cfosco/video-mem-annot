const debug = require('debug')('memento:server');

const dev = {
  dbConfig: {
      connectionLimit : 100,
      host            : process.env.MYSQL_HOST,
      user            : process.env.MYSQL_USER,
      password        : process.env.MYSQL_PASS,
      database        : 'memento'
  }, 
  enableBlockUsers    : false,
  errorOnFastSubmit   : false,
} 

const test = {
  dbConfig: {
      connectionLimit : 100,
      host            : process.env.MYSQL_HOST,
      user            : process.env.MYSQL_USER,
      password        : process.env.MYSQL_PASS,
      database        : 'memento'  // TODO: separate test db!!!
  }, 
  enableBlockUsers    : true,
  errorOnFastSubmit   : true,
}

// TODO: specify a prod config
const prod = dev;

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
