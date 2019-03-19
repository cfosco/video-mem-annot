const merge = require('webpack-merge');
const base = require('./webpack.base.js');

module.exports = merge(base, {
  mode: 'development',
  // the bundled code is minified but this can make debugging difficult
  // so this adds a source map when webpack is in development mode
  // this makes the code show up as written in the browser dev tools
  devtool: 'inline-source-map'
});
