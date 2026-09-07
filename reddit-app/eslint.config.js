import { defineConfig } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default defineConfig([
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/server/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.node, parserOptions: { project: ['./tools/tsconfig.server.json'], tsconfigRootDir: import.meta.dirname } }
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/shared/**/*.{ts,tsx}'],
    languageOptions: { parserOptions: { project: ['./tools/tsconfig.shared.json'], tsconfigRootDir: import.meta.dirname } }
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/client/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser, parserOptions: { project: ['./tools/tsconfig.client.json'], tsconfigRootDir: import.meta.dirname } },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules }
  },
  { files: ['**/*.{js,ts,tsx}'], ignores: ['**/node_modules/**', '**/dist/**', 'eslint.config.js', 'vite.config.ts'], rules: { '@typescript-eslint/no-unused-vars': 'off', 'no-unused-vars': 'off' } }
]);
