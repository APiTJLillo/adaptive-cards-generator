const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.js$/,
        use: [
          'thread-loader',
          'babel-loader'
        ],
        include: path.resolve('src')
      }
    ]
  },
  externals: {
    'adaptivecards-designer': 'AdaptiveCardsDesigner',
    'monaco-editor': 'monaco'
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      parallel: true,
      terserOptions: {
        ecma: 6,
      },
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
  plugins: [
    new CopyWebpackPlugin([{
      from: 'node_modules/adaptivecards-designer/dist/containers/*',
      to: 'containers/',
      flatten: true
    },
    {
      from: 'node_modules/adaptivecards-designer/src/adaptivecards-designer.css',
      to: './',
      flatten: true
    }]),
    new MonacoWebpackPlugin({
      languages: ['json']
    }),
    new webpack.optimize.ModuleConcatenationPlugin(),
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
    new BundleAnalyzerPlugin()
  ]
};