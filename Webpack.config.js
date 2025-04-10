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
  },
  mode: 'production',
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
          'babel-loader'
        ],
        include: path.resolve('src')
      }
    ]
  },
  externals: {
    'adaptivecards-designer': 'AdaptiveCardsDesigner'
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
