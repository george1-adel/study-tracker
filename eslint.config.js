import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'node_modules', '.vite', 'playwright-report', 'test-results', 'scripts/check-rtl.mjs'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Date API bans (Rule 3a) & Hex color ban (Rule 3e)
      'no-restricted-syntax': [
        'error',
        {
          selector: `CallExpression[callee.property.name='toISOString']`,
          message: 'Date.prototype.toISOString() is banned. Use src/domain/time/dayKey.ts instead.',
        },
        {
          selector: `CallExpression[callee.property.name='toJSON']`,
          message: 'Date.prototype.toJSON() is banned. Use src/domain/time/dayKey.ts instead.',
        },
        {
          selector: `CallExpression[callee.object.name='Date'][callee.property.name='parse']`,
          message: 'Date.parse() is banned. Use src/domain/time/dayKey.ts instead.',
        },
        {
          selector: `NewExpression[callee.name='Date'][arguments.length=1][arguments.0.type='Literal'][arguments.0.raw=/^['"]/]`,
          message: 'new Date(string) is banned. Use src/domain/time/dayKey.ts instead.',
        },
        {
          selector: `NewExpression[callee.name='Date'][arguments.length=1][arguments.0.type='TemplateLiteral']`,
          message: 'new Date(string) is banned. Use src/domain/time/dayKey.ts instead.',
        },
        {
          selector: `Literal[value=/^#[0-9a-fA-F]{3,8}$/]`,
          message: 'Hex color literals are banned in TS/TSX. Use CSS variables from src/styles/tokens.css.',
        },
      ],

      // setInterval ban (Rule 3b)
      'no-restricted-globals': [
        'error',
        {
          name: 'setInterval',
          message: 'setInterval is banned everywhere except src/platform/ticker.ts.',
        },
      ],
    },
  },
  // Exemption for src/platform/ticker.ts (Rule 3b)
  {
    files: ['src/platform/ticker.ts', 'src/platform/ticker.tsx'],
    rules: {
      'no-restricted-globals': 'off',
    },
  },
  // Domain purity boundary (Rule 3c)
  {
    files: ['src/domain/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'src/domain is pure. Do not import react.' },
            { name: 'react-dom', message: 'src/domain is pure. Do not import react-dom.' },
            { name: 'zustand', message: 'src/domain is pure. Do not import zustand.' },
          ],
          patterns: [
            {
              group: ['**/platform/**', '**/store/**', '**/components/**', '**/features/**', 'src/platform/**', 'src/store/**', 'src/components/**', 'src/features/**'],
              message: 'src/domain is pure. Do not import from platform, store, components, or features.',
            },
          ],
        },
      ],
    },
  },
  // Dumb component boundary (Rule 3d)
  {
    files: ['src/components/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [],
          patterns: [
            {
              group: ['**/store/**', '**/features/**', 'src/store/**', 'src/features/**'],
              message: 'src/components must not import from store or features.',
            },
          ],
        },
      ],
    },
  }
);
