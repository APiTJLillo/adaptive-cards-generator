const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    globalObject: 'self',
    publicPath: '/'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
      },
      {
        test: /\.ttf$/,
        use: ['file-loader']
      }
    ]
  },
  plugins: [
    new MonacoWebpackPlugin({
      languages: ['json', 'javascript'],
      filename: '[name].worker.js',
      customLanguages: [{
        label: 'json',
        entry: 'monaco-editor/esm/vs/language/json/json.worker',
        worker: {
          id: 'vs/language/json/json.worker'
        }
      }]
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development')
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
      publicPath: '/'
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    },
    compress: true,
    hot: true,
    port: 8081,
    host: '127.0.0.1'
  },
  resolve: {
    extensions: ['.js', '.json'],
    alias: {
      'monaco-editor': path.resolve(__dirname, 'node_modules/monaco-editor')
    }
  },
  optimization: {
    minimize: false,
    splitChunks: {
      cacheGroups: {
        monaco: {
          test: /[\\/]node_modules[\\/]monaco-editor[\\/]/,
          name: 'monaco',
          chunks: 'all'
        }
      }
    }
  }
}; 