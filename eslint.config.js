import globals from 'globals'
import js from '@eslint/js'
import pluginNextModule from '@next/eslint-plugin-next'
import pluginQuery from '@tanstack/eslint-plugin-query'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

// The Next 15 package is CommonJS-wrapped when loaded from this ESM config.
const pluginNext = pluginNextModule.default ?? pluginNextModule

export default defineConfig(
  {
    ignores: [
      '.next/**',
      'dist/**',
      'node_modules/**',
      'public/**',
      'src/components/ui/**',
    ],
  },
  {
    // Register Next globally so both ESLint and Next's build-time detector see it.
    plugins: {
      '@next/next': pluginNext,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
    },
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...pluginQuery.configs['flat/recommended'],
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-console': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // Enforce type-only imports for TypeScript types
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
          disallowTypeAnnotations: false,
        },
      ],
      // Prevent duplicate imports from the same module
      'no-duplicate-imports': 'error',
    },
  },
  {
    files: [
      'src/modules/categories/components/admin/CategoryManagement.tsx',
      'src/modules/posts/components/admin/PostManagement.tsx',
      'src/modules/users/components/history/InquiryDataTable.tsx',
    ],
    rules: {
      // TanStack Table deliberately returns non-memoizable functions. React Compiler
      // safely skips these callers, so suppress only its known integration diagnostic.
      'react-hooks/incompatible-library': 'off',
    },
  },
  {
    files: [
      'src/app/**/layout.tsx',
      'src/lib/router.tsx',
      'src/modules/gallery/components/admin/galleryManageContext.tsx',
      'src/shared/i18n/I18nProvider.tsx',
    ],
    rules: {
      // These modules intentionally mix components with Next metadata, route/context
      // helpers, or component-only proxy exports; keep Fast Refresh checks elsewhere.
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['src/modules/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app', '@/app/**', '@/features', '@/features/**'],
              message:
                'Domain modules must not depend on app routes or feature orchestration.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/shared/**/*.{ts,tsx}',
      'src/components/**/*.{ts,tsx}',
      'src/config/**/*.{ts,tsx}',
      'src/lib/**/*.{ts,tsx}',
    ],
    ignores: ['src/components/ui/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/app',
                '@/app/**',
                '@/features',
                '@/features/**',
                '@/modules',
                '@/modules/**',
              ],
              message:
                'Shared infrastructure must not depend on application or domain layers.',
            },
          ],
        },
      ],
    },
  }
)
