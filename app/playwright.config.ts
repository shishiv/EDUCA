import { defineConfig, devices } from '@playwright/test'
import path from 'path'

const syntheticAuthStateFile = process.env.PILOT_AUTH_STATE_PATH || path.join(__dirname, 'playwright/.auth/user.json')

/**
 * Playwright configuration for EDUCA E2E tests
 * MVP: Chromium only, sequential execution, dev server
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Sequential for MVP simplicity
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for MVP
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off', // No video per CONTEXT.md
  },

  projects: [
    // Setup project - runs authentication once
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Main tests - depend on setup
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: syntheticAuthStateFile,
      },
      dependencies: ['setup'],
    },
  ],

  // Dev server configuration
  webServer: {
    command: process.env.PLAYWRIGHT_SERVER_COMMAND || 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI && process.env.PILOT_MODE !== 'true',
    timeout: 180 * 1000, // Own bounded cold-start/prewarm readiness here, not in auth assertions
  },

  // Output directories
  outputDir: 'test-results',
})
