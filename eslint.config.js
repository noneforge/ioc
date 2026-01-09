import config from '@noneforge/eslint-config';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  ...config,

  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-await-in-loop': 'off',

      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
    },
  },

  {
    files: ['tests/**/*.ts'],
    rules: {
      'no-console': 'off',

      'jsdoc/require-jsdoc': 'off',

      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-useless-constructor': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/promise-function-async': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
    },
  },
);