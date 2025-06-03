const { merge } = require("webpack-merge");
const baseConfig = require("./baseConfig");

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const devConfig = {
    mode: 'development',
    entry: {
        index: './demo/index.ts',
    },
    devtool: 'inline-source-map',
    devServer: {
      static: './dist',
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'Development',
        }),
    ],
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, '../dist'),
        clean: true,
    },
    optimization: {
      runtimeChunk: 'single',
    },
};

const outputConfig = merge(baseConfig, devConfig);
module.exports = outputConfig;