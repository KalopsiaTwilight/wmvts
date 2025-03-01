const path = require('path');
const outputName = "wmvts"
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(frag|vert)$/,
        use: [
          {
            loader: "raw-loader",
          }
        ]
      }
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [
      new TsconfigPathsPlugin()
    ]
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: outputName + '.js',
    globalObject: 'this',
    library: {
      name: outputName,
      type: 'umd',
    },
  },
};