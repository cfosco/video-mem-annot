module.exports = {
  connectionLimit : 100,
  host            : process.env.MYSQL_HOST,
  user            : process.env.MYSQL_USER,
  password        : process.env.MYSQL_PASS,
  database        : 'memento'
};
