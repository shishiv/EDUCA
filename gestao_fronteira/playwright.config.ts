import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration for UI/UX Design System Enhancement
 * Optimized for Brazilian Portuguese educational interfaces
 * Designed for MCP (Model Context Protocol) automation
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Global test timeout
  timeout: 30000,

  // Expect timeout for assertions
  expect: {
    timeout: 5000,
  },

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL for tests (Next.js dev server)
    baseURL: 'http://localhost:3000',

    // Brazilian Portuguese locale for educational context
    locale: 'pt-BR',
    timezone: 'America/Sao_Paulo',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot settings for visual regression testing
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Reduced motion for accessibility testing
    reducedMotion: 'reduce',

    // Force colors to be disabled in headless mode for consistent screenshots
    colorScheme: 'light',
  },

  // Configure projects for major Brazilian mobile devices and tablets
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
      },
    },

    {
      name: 'Mobile - iPhone 12 (Teachers)',
      use: {
        ...devices['iPhone 12'],
        // Common device for Brazilian teachers
        isMobile: true,
      },
    },

    {
      name: 'Mobile - Galaxy S9+ (Android)',
      use: {
        ...devices['Galaxy S9+'],
        // Popular Android device in Brazilian educational sector
        isMobile: true,
      },
    },

    {
      name: 'Tablet - iPad (Portrait)',
      use: {
        ...devices['iPad'],
        // Primary tablet for classroom use
        viewport: { width: 768, height: 1024 },
        isMobile: true,
      },
    },

    {
      name: 'Tablet - iPad (Landscape)',
      use: {
        ...devices['iPad'],
        // Landscape mode for attendance marking
        viewport: { width: 1024, height: 768 },
        isMobile: true,
      },
    },

    {
      name: 'Custom Educational Tablet',
      use: {
        // Custom breakpoint for Brazilian educational tablets
        viewport: { width: 768, height: 1024 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      },
    }
  ],

  // Global setup for MCP integration
  globalSetup: require.resolve('./tests/global-setup.ts'),

  // Global teardown
  globalTeardown: require.resolve('./tests/global-teardown.ts'),

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Test output directory
  outputDir: 'test-results/',

  // Preserve test artifacts
  preserveOutput: 'failures-only',

  // Fullfilled expect timeout
  fullyParallel: true,

  // Maximum number of test failures before stopping
  maxFailures: process.env.CI ? 10 : undefined,
})