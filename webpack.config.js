/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const path = require('path');
const getReleaseNotesDate = require('./getReleaseNotesDate.js');
const ENV = process.env;
const isProd = ENV.NODE_ENV === 'production';
const isCoverage = ENV.COVERAGE === 'true';

const contextDir = path.resolve(__dirname, 'src', 'ggrc-client');
const imagesDir = path.resolve(contextDir, 'images');
const vendorDir = path.resolve(contextDir, 'vendor');
const nodeModulesDir = path.resolve(__dirname, 'node_modules');

const STATIC_FOLDER = '/static/';

module.exports = function (env) {
  const config = {
    mode: isProd ? 'production' : 'development',
    context: contextDir,
    entry: {
      styles: 'entrypoints/styles',
      dashboard: getEntryModules('dashboard'),
      'import': getEntryModules('import'),
      'export': getEntryModules('export'),
      admin: getEntryModules('admin'),
      login: ['entrypoints/vendor', 'entrypoints/login'],
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
      new MiniCssExtractPlugin({
        filename: isProd ? '[name].[chunkhash].css' : '[name].css',
      }),
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
      new FileManagerPlugin({
        onEnd: {
          copy: [{
            source: './src/ggrc/static/manifest.json',
            destination: './src/ggrc/manifest.json',
          }],
        },
      }),
    ],
    stats: {
      errorDetails: true,
    },
  };

  if (isProd) {
    config.plugins = [
      ...config.plugins,
      new FileManagerPlugin({
        onStart: {
          'delete': [
            './src/ggrc/static/',
          ],
        },
      }),
    ];
  }

  if (isCoverage) {
    config.module.rules.push({
      test: /\.js$/,
      use: {
        loader: 'istanbul-instrumenter-loader',
        options: {esModules: true},
      },
    });
  }

  if (!env || (env && !env.test)) {
    config.optimization = {
      splitChunks: {
        cacheGroups: {
          common: {
            name: 'common',
            test: /\.js$/,
            chunks: (chunk) =>
              ['dashboard', 'import', 'export', 'admin'].includes(chunk.name),
          },
          vendor: {
            name: 'vendor',
            chunks: 'initial',
            test: /node_modules|vendor/,
            enforce: true,
          },
        },
      },
    };
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
  return [
    'entrypoints/vendor',
    `entrypoints/${entryName}`,
    `entrypoints/${entryName}/bootstrap`,
  ];
}
