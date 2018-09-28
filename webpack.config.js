/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const WebpackShellPlugin = require('webpack-shell-plugin');
const path = require('path');
const getReleaseNotesDate = require('./getReleaseNotesDate.js');
const ENV = process.env;
const isProd = ENV.NODE_ENV === 'production';

const contextDir = path.resolve(__dirname, 'src', 'ggrc-client');
const imagesDir = path.resolve(contextDir, 'images');
const vendorDir = path.resolve(contextDir, 'vendor');
const nodeModulesDir = path.resolve(__dirname, 'node_modules');

const STATIC_FOLDER = '/static/';

module.exports = function (env) {
  const extractSass = new ExtractTextPlugin({
    filename: isProd ? '[name].[chunkhash].css' : '[name].css',
    allChunks: true,
    // disable: isDev
  });
  const config = {
    context: contextDir,
    entry: {
      vendor: 'entrypoints/vendor',
      styles: 'entrypoints/styles',
      dashboard: getEntryModules('dashboard'),
      'import': getEntryModules('import'),
      'export': getEntryModules('export'),
      admin: getEntryModules('admin'),
      login: 'entrypoints/login',
    },
    output: {
      filename: isProd ? '[name].[chunkhash].js' : '[name].js?[hash]',
      chunkFilename: isProd ? 'chunk.[name].[chunkhash].js' :'chunk.[name].js?[hash]',
      sourceMapFilename: '[file].map',
      path: path.join(__dirname, './src/ggrc/static/'),
      publicPath: STATIC_FOLDER,
    },
    module: {
      rules: [{
        test: /.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
        include: /node_modules/,
        use: [{
          loader: 'file-loader',
          options: {
            name: 'fonts/[name].[hash:8].[ext]',
          },
        }],
      }, {
        test: /\.css$/,
        use: extractSass.extract({
          fallback: 'style-loader',
          use: {
            loader: 'css-loader',
          },
        }),
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
        test: /\.scss$/,
        use: extractSass.extract({
          use: [{
            loader: 'css-loader',
          }, {
            loader: 'sass-loader',
          }],
          fallback: 'style-loader',
        }),
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
        exclude: /(node_modules)/,
        loader: 'babel-loader',
        query: {
          cacheDirectory: true,
        },
      }, {
        test: /\.md/,
        use: [
          {loader: 'raw-loader'},
          {loader: 'parse-inner-links'},
          {loader: 'md-to-html'},
        ],
      }],
    },
    devtool: isProd ? 'source-map' : 'cheap-module-eval-source-map',
    resolveLoader: {
      modules: [nodeModulesDir, path.resolve(__dirname, 'loaders')],
    },
    resolve: {
      modules: [nodeModulesDir, vendorDir],
      alias: {
        can: 'canjs/amd/can/',
        entrypoints: './js/entrypoints',
      },
    },
    plugins: [
      extractSass,
      new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery',
        'window.jQuery': 'jquery',
        _: 'lodash',
        moment: 'moment',
      }),
      new webpack.DefinePlugin({
        GOOGLE_ANALYTICS_ID: JSON.stringify(ENV.GOOGLE_ANALYTICS_ID),
        DEV_MODE: JSON.stringify(!isProd),
        RELEASE_NOTES_DATE: JSON.stringify(
          getReleaseNotesDate(`${contextDir}/js/components/release-notes-list/release-notes.md`)
        ),
      }),
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      new ManifestPlugin({
        publicPath: STATIC_FOLDER,
      }),
      new WebpackShellPlugin({
        onBuildEnd: ['cp src/ggrc/static/manifest.json src/ggrc/manifest.json'],
      }),
    ],
    stats: {
      errorDetails: true,
    },
  };

  if (isProd) {
    config.plugins = [
      ...config.plugins,
      new UglifyJSPlugin({
        sourceMap: true,
        uglifyOptions: {
          output: {
            comments: false,
            beautify: false,
          },
        },
      }),
      new CleanWebpackPlugin(['./src/ggrc/static/']),
    ];
  }

  if (!env || (env && !env.test)) {
    config.plugins = [
      ...config.plugins,
      new webpack.optimize.CommonsChunkPlugin({
        name: 'common',
        chunks: ['dashboard', 'import', 'export', 'admin'],
      }),
      new webpack.optimize.CommonsChunkPlugin({
        name: 'vendor',
      }),
    ];
  }

  if (env && env.debug) {
    let BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

    config.plugins = [
      ...config.plugins,
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        generateStatsFile: true,
      }),
    ];
  }

  return config;
};

function getEntryModules(entryName) {
  return [`entrypoints/${entryName}`, `entrypoints/${entryName}/bootstrap`];
}
