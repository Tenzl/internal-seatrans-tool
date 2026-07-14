import globals from 'globals'
import js from '@eslint/js'
import pluginQuery from '@tanstack/eslint-plugin-query'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

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
      'src/features/admin/components/ManagePorts.tsx',
      'src/features/admin/components/ManageUsers.tsx',
      'src/features/admin/components/PartnerImportDialog.tsx',
      'src/features/admin/components/PartnerManagementTab.tsx',
      'src/modules/categories/components/admin/CategoryManagement.tsx',
      'src/modules/gallery/components/admin/ImageManagement.tsx',
      'src/modules/posts/components/admin/PostManagement.tsx',
      'src/modules/users/components/history/InquiryDataTable.tsx',
      'src/shared/components/ui/data-table.tsx',
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
      'src/shared/components/ui/alert-dialog.tsx',
      'src/shared/components/ui/alert.tsx',
      'src/shared/components/ui/badge.tsx',
      'src/shared/components/ui/button.tsx',
      'src/shared/components/ui/calendar.tsx',
      'src/shared/components/ui/card.tsx',
      'src/shared/components/ui/checkbox.tsx',
      'src/shared/components/ui/command.tsx',
      'src/shared/components/ui/dialog.tsx',
      'src/shared/components/ui/dropdown-menu.tsx',
      'src/shared/components/ui/input.tsx',
      'src/shared/components/ui/label.tsx',
      'src/shared/components/ui/popover.tsx',
      'src/shared/components/ui/select.tsx',
      'src/shared/components/ui/separator.tsx',
      'src/shared/components/ui/sheet.tsx',
      'src/shared/components/ui/table.tsx',
      'src/shared/components/ui/textarea.tsx',
    ],
    rules: {
      // These modules intentionally mix components with Next metadata, route/context
      // helpers, or component-only proxy exports; keep Fast Refresh checks elsewhere.
      'react-refresh/only-export-components': 'off',
    },
  }
)
