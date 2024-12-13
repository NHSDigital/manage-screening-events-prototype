module.exports = {
  extends: [
    'standard',
  ],
  rules: {
    'comma-dangle': ['error', {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'never',
    }],
  },
  ignorePatterns: [
    'app/assets/javascript/auto-store-data.js',
    'app/assets/javascript/jquery-3.5.1.min.js',
  ],
}
