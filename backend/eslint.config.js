const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^(next|req|res|_)',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-console': 'off',
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
      'semi': ['error', 'always'],
      'quotes': ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
    },
  },
  {
    ignores: [
      'node_modules/**',
      'public/media/**',
      'coverage/**',
    ],
  },
];
