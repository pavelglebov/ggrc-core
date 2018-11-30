/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

const devConfig = require('./webpack.config')({test: true});
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const contextDir = path.resolve(__dirname, 'src', 'ggrc-client');
const imagesDir = path.resolve(contextDir, 'images');
const vendorDir = path.resolve(contextDir, 'vendor');
const coverageRules = [{
  test: /.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
  include: /node_modules/,
  use: [{
    loader: 'file-loader',
    options: {
      name: 'fonts/[name].[hash:8].[ext]',
    },
  }],
}, {
  test: /\.(sa|sc|c)ss$/,
  use: [
    MiniCssExtractPlugin.loader,
    {loader: 'css-loader', options: {sourceMap: true, importLoaders: 1}},
    {loader: 'sass-loader', options: {sourceMap: true}},
  ],
}, {
  test: /\.(png|jpe?g|gif)$/,
  exclude: /node_modules/,
  include: [imagesDir, vendorDir],
  use: [{
    loader: 'url-loader',
    options: {
      limit: 10000,
    },
  }],
}, {
  test: /\.svg$/,
  include: [imagesDir],
  use: [{
    loader: 'file-loader',
    options: {
      name: 'images/[name].[ext]?[hash:8]',
    },
  }],
}, {
  test: /\.ico$/,
  use: [{
    loader: 'file-loader',
    options: {
      name: '[name].[ext]',
    },
  }],
}, {
  test: require.resolve('jquery'),
  use: [{
    loader: 'expose-loader',
    options: 'jQuery',
  }, {
    loader: 'expose-loader',
    options: '$',
  }],
}, {
  test: /\.mustache/,
  loader: 'raw-loader',
}, {
  test: /\.js$/,
  exclude: /(node_modules)|[_]spec\.js/,
  loader: 'babel-loader',
  query: {
    cacheDirectory: true,
  },
}, {
  test: /[_]spec\.js$/,
  include: /(src)/,
  exclude: /(node_modules)/,
  loader: 'babel-loader',
}, {
  test: /\.js$/,
  use: {
    loader: 'istanbul-instrumenter-loader',
    options: {esModules: true},
  },
  enforce: 'post',
  exclude: /(node_modules)|[_]spec\.js/,
}, {
  test: /\.md/,
  use: [
    {loader: 'raw-loader'},
    {loader: 'parse-inner-links'},
    {loader: 'md-to-html'},
  ],
}];
devConfig.module.rules = coverageRules;
module.exports = devConfig;
