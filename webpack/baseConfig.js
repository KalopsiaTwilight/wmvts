const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
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
};