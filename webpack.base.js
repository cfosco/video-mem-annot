const path = require('path');

const config = {
  // what file (and all of its dependencies to bundle)
  entry: './ui-js-src/index.js',
  // where to save the output
  output: {
    path: path.resolve(__dirname, 'public/js'),
    filename: 'bundle.js',
  },
  // tell webpack how to handle each type of file
  // we are only using webpack for js files
  module: {
    // allows us to write modern js
    // babel converts it to old js that IE can run
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ],
  },
  // semantic ui expects a global jquery so we import jquery with a script tag
  // this tells webpack to ignore jquery imports
  externals: {
    "jquery": "jQuery",
  }
};

module.exports = config;
