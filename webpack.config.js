const path = require('path');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TerserPlugin = require('terser-webpack-plugin');

// ServiceNow environment fix
window = self;

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
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: false,
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
      },
      {
        test: /\.ttf$/,
        use: ['file-loader']
      }
      ,
      {
        test: /\.woff2?$/,
        use: ['file-loader']
      }
    ]
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
      publicPath: '/',
      serveIndex: true,
    },
    devMiddleware: {
      writeToDisk: true
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Service-Worker-Allowed': '/',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    },
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      middlewares.push((req, res, next) => {
        if (req.url.includes('/monaco-editor/')) {
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        } else if (req.url.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        }
        next();
      });

      return middlewares;
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
        new webpack.optimize.ModuleConcatenationPlugin(),
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
    new BundleAnalyzerPlugin(),
    new webpack.SourceMapDevToolPlugin({
      include: ['src/x-apig-adaptive-cards-designer/**/*.js'],
      exclude: [/node_modules/]
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.WEBPACK_PUBLIC_PATH': JSON.stringify('./')
    })
  ]
};
