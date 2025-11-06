module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env.production',
      fallback: '.env',
      safe: false,
      allowUndefined: true,
      verbose: false
    }]
  ]
};