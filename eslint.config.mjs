import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import angular from 'angular-eslint';
const scope = JSON.parse(readFileSync(new URL('./quality-scope.json', import.meta.url), 'utf8'));
export default defineConfig([
  { ignores: ['node_modules/**', 'dist/**', '.artifacts/**', 'out-tsc/**'] },
  {
    files: scope.typescript,
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: fileURLToPath(new URL('./', import.meta.url)),
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    },
    processor: angular.processInlineTemplates,
  },
  {
    files: [...scope.templates, ...scope.typescript.map((pattern) => pattern + '/**/*.html')],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
  },
  {
    files: scope.javascript,
    extends: [js.configs.recommended],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        structuredClone: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
]);
