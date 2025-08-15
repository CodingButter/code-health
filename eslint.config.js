import typescriptEslint from '@typescript-eslint/eslint-plugin';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import regexp from 'eslint-plugin-regexp';
import typescriptParser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.{js,ts,tsx}'],
    ignores: ['**/node_modules/**', '**/dist/**', '**/ui/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'sonarjs': sonarjs,
      'unicorn': unicorn,
      'regexp': regexp
    },
    rules: {
      'max-lines': ['warn', {
        max: 400,
        skipBlankLines: true,
        skipComments: true
      }],
      'max-lines-per-function': ['warn', {
        max: 80,
        skipBlankLines: true,
        skipComments: true
      }],
      'sonarjs/cognitive-complexity': ['warn', 15],
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
];