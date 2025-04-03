// eslint.config.js
import { defineConfig } from 'eslint/config';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: globals.node, // Node.js environment
      ecmaVersion: 'latest',
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error', // Enforce Prettier formatting
      'no-console': 'warn',
      'no-unused-vars': 'warn',
    },
  },
  prettierConfig, // Ensure Prettier rules are applied
]);
