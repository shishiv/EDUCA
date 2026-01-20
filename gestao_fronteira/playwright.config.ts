import { defineConfig, devices } from '@playwright/test'
import path from 'path'

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
        storageState: path.join(__dirname, 'playwright/.auth/user.json'),
      },
      dependencies: ['setup'],
    },
  ],

  // Dev server configuration
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for Next.js to start
  },

  // Output directories
  outputDir: 'test-results',
})
