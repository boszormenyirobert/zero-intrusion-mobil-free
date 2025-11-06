const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Ensure .env files are watched for changes
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'env']
  },
  watchFolders: [
    // Watch the project root for .env files
    path.resolve(__dirname)
  ]
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
