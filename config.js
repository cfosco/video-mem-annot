const env = process.env.NODE_ENV;

const dev = {
  dbConfig: {
      connectionLimit : 100,
      host            : process.env.MYSQL_HOST,
      user            : process.env.MYSQL_USER,
      password        : process.env.MYSQL_PASS,
      database        : 'memento'
  }, 
  enableblockUsers    : false,
  errorOnOutOfVideos  : false,
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
  enableblockUsers    : true,
  errorOnOutOfVideos  : true,
  errorOnFastSubmit   : true,
}

const configs = { dev, test }

module.exports = configs[env];
