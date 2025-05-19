export default [
  {
    ignores: ['node_modules/**', 'lib/**', 'dist/**', '.eslintrc.js', 'eslint.config.js'],
  },
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    rules: {
      eqeqeq: ['error', 'smart'],
      curly: 'error',
      'no-console': 'error'
    }
  }
];
