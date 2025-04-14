const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TerserPlugin = require('terser-webpack-plugin');

// Function to check if module is from adaptive-expressions
const isAdaptiveExpressionsModule = (module) => {
  return module.nameForCondition && module.nameForCondition().includes('adaptive-expressions');
};

module.exports = {
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    modules: ['node_modules', path.resolve(__dirname, 'src')],
    alias: {
      'monaco-editor': path.resolve(__dirname, 'node_modules/monaco-editor'),
      'vs': path.resolve(__dirname, 'node_modules/monaco-editor/esm/vs')
    }
  },
  module: {
    rules: [
      {
        test: /\.json$/,
        type: 'json',
        include: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, 'node_modules')
        ]
      },
      {
        test: /\.tsx?$/,
        use: [
          'thread-loader',
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                resolveJsonModule: true,
                module: 'commonjs',
                esModuleInterop: true,
                allowSyntheticDefaultImports: true
              },
              transpileOnly: true
            }
          }
        ],
        include: path.resolve('src')
      },
      {
        test: /\.js$/,
        use: [
          'thread-loader',
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  useBuiltIns: 'usage',
                  corejs: 3
                }]
              ],
              plugins: ['@babel/plugin-transform-runtime']
            }
          }
        ],
        include: path.resolve('src')
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.ttf$/,
        use: ['file-loader']
      }
    ]
  },
  externals: {
    'adaptivecards-designer': {
      root: 'AdaptiveCardsDesigner',
      commonjs2: 'adaptivecards-designer',
      commonjs: 'adaptivecards-designer',
      amd: 'adaptivecards-designer'
    }
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      parallel: true,
      terserOptions: {
        ecma: 6,
      },
      sourceMap: {
        filename: (info) => {
          if (info.filename.includes('node_modules')) {
            return false;
          }
          return info.filename + '.map';
        }
      }
    })],
    splitChunks: {
      chunks: 'all',
      minSize: 30000,
      maxSize: 0,
      minChunks: 1,
      maxAsyncRequests: 5,
      maxInitialRequests: 3,
      automaticNameDelimiter: '~',
      name: true,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  },
  devtool: false,
  plugins: [
    new webpack.DefinePlugin({
      'process.browser': true
    }),
    new CopyWebpackPlugin([
      {
        from: 'node_modules/monaco-editor/min/vs',
        to: 'vs',
      },
      {
        from: 'node_modules/monaco-editor/min-maps/vs',
        to: 'vs',
        ignore: ['**/basic-languages/**', '**/language/**']
      },
      {
        from: 'node_modules/monaco-editor/min/vs/language/json/json.worker.js',
        to: 'vs/language/json/'
      },
      {
        from: 'node_modules/monaco-editor/min/vs/editor/editor.worker.js',
        to: 'vs/editor/'
      },
      {
        from: 'node_modules/adaptivecards-designer/dist/containers/*',
        to: 'containers/',
        flatten: true
      },
      {
        from: 'node_modules/adaptivecards-designer/src/adaptivecards-designer.css',
        to: './',
        flatten: true
      }]),
    new webpack.optimize.ModuleConcatenationPlugin(),
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
    new BundleAnalyzerPlugin(),
    new webpack.SourceMapDevToolPlugin({
      include: ['src/x-apig-adaptive-cards-designer/**/*.js'],
      exclude: [/node_modules/]
    })
  ]
};
