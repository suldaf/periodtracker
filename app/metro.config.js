const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
  // Fix for axios trying to use Node.js modules (crypto, http, etc.)
  // This tells Metro to prefer the 'browser' field in package.json
  resolverMainFields: ['browser', 'react-native', 'module', 'main'],
};

module.exports = config;
