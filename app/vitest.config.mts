import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    // Explicit alias keeps Vitest stable even though tsconfig excludes test files.
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/vitest.setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    exclude: ['node_modules', 'tests/e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/services/**', 'lib/validation/**'],
      exclude: ['**/*.d.ts', '**/*.test.ts'],
    },
  },
})
