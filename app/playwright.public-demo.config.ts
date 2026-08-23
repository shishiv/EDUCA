import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PUBLIC_DEMO_BASE_URL
if (!baseURL) {
  throw new Error('PUBLIC_DEMO_BASE_URL is required for the non-destructive public smoke')
}

const parsedURL = new URL(baseURL)
if (parsedURL.protocol !== 'https:' || parsedURL.hostname.endsWith('.localhost')) {
  throw new Error('PUBLIC_DEMO_BASE_URL must be an HTTPS public origin')
}

export default defineConfig({
  testDir: './tests/e2e/public-demo',
  testMatch: /public-visitor\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    storageState: { cookies: [], origins: [] },
    serviceWorkers: 'block',
    ignoreHTTPSErrors: false,
  },
  webServer: undefined,
})
