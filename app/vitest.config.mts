import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/vitest.setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    exclude: [
      'node_modules',
      'tests/e2e',
      // These suites cover modules explicitly disabled by the confirmed pilot.
      // Keep the files for a future reactivation gate, but do not treat them as
      // evidence for the core-only municipal pilot.
      'tests/unit/components/diary/**',
      'tests/unit/components/reports/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/services/**', 'lib/validation/**'],
      exclude: ['**/*.d.ts', '**/*.test.ts'],
    },
  },
})
