export default [
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        structuredClone: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      complexity: ['error', 10],
      'max-depth': ['error', 2],
      'no-else-return': ['error', { allowElseIf: false }],
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'IfStatement[alternate!=null]',
          message: 'Use guard clauses and early returns instead of else.',
        },
        { selector: 'ExportDefaultDeclaration', message: 'Use named exports.' },
      ],
    },
  },
  { files: ['**/*config.mjs'], rules: { 'no-restricted-syntax': 'off' } },
];
