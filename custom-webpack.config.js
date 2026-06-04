const MomentLocalesPlugin = require('moment-locales-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

module.exports = {
  infrastructureLogging: {
    level: 'error'
  },
  stats: {
    warnings: false
  },
  plugins: [
    new MomentLocalesPlugin({
      localesToKeep: ['en', 'fr', 'zh-cn']
    }),
    new webpack.IgnorePlugin({ resourceRegExp: /^vm$/ })
  ],
  ignoreWarnings: [
    /CommonJS or AMD dependencies can cause optimization bailouts/,
    /Critical dependency: the request of a dependency is an expression/,
    /Module not found: Error: Can't resolve/,
    (warning) => warning && warning.message && /Can't resolve 'vm'/.test(warning.message),
    (warning) => warning && warning.message && /depends on.*CommonJS or AMD dependencies/.test(warning.message)
  ],
  resolve: {
    // Solves "npm link" missing dependencies error using the connectivity SDK during development (missing web3-core, etc).
    modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
    fallback: {
      "vm": false
    }
  }
};