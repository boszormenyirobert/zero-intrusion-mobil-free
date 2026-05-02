module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'App.tsx',
    'src/**/*.{ts,tsx}',
    '!src/**/*.style.{ts,tsx}',
    '!src/**/Main.styles.tsx',
    '!src/**/Interfaces/**',
    '!src/services/Icons.tsx',
    '!src/i18n/**',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
  ],
};
