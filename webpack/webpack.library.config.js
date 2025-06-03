const { merge } = require("webpack-merge");
const baseConfig = require("./baseConfig");

const path = require('path');

const outputName = "wmvts"

const libraryConfig = {
  mode: "production",
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: outputName + '.js',
    globalObject: 'this',
    library: {
      name: outputName,
      type: 'umd',
    },
  },
  externals: [
    "pako",
    "twgl.js"
  ]
};

const outputConfig = merge(baseConfig, libraryConfig);
module.exports = outputConfig;