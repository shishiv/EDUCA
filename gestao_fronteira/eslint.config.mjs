import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Educational domain specific rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',

      // Brazilian data validation requirements
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],

      // Security rules for educational data
      'no-eval': 'error',
      'no-implied-eval': 'error',

      // Performance rules for mobile-first design
      '@next/next/no-img-element': 'error',

      // React 19 specific rules
      'react/no-unknown-property': 'off',
      'react/prop-types': 'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'node_modules/**',
      'next-env.d.ts',
    ],
  },
]

export default eslintConfig
