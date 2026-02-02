// ESLint 9 flat config - native format (no FlatCompat)
// Uses eslint-config-next which already exports flat config

import nextConfig from 'eslint-config-next'
import tseslint from 'typescript-eslint'

const eslintConfig = [
  // Spread the Next.js config (includes React, TypeScript, a11y, import plugins)
  ...nextConfig,

  // Project-specific TypeScript rule overrides
  {
    name: 'gestao-fronteira/typescript',
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Educational domain specific rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Project-specific general rules
  {
    name: 'gestao-fronteira/rules',
    rules: {
      // Brazilian data validation requirements
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],

      // Security rules for educational data
      'no-eval': 'error',
      'no-implied-eval': 'error',

      // Performance rules for mobile-first design
      '@next/next/no-img-element': 'error',

      // React 19 specific rules (already in next config, but explicit for clarity)
      'react/no-unknown-property': 'off',
      'react/prop-types': 'off',
    },
  },

  // Additional ignores (next config already ignores .next, out, build, next-env.d.ts)
  {
    ignores: ['node_modules/**'],
  },
]

export default eslintConfig
