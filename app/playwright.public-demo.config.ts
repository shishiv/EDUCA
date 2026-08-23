import { defineConfig, devices } from '@playwright/test'
import { assertPublicDemoBaseURL } from './scripts/public-demo-origin'

const baseURL = process.env.PUBLIC_DEMO_BASE_URL
if (!baseURL) {
  throw new Error('PUBLIC_DEMO_BASE_URL is required for the non-destructive public smoke')
}

assertPublicDemoBaseURL(baseURL)

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
