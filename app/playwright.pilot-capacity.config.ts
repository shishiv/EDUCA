import { defineConfig, devices } from '@playwright/test'
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://educa-pilot-capacity.localhost'
export default defineConfig({
  testDir: './tests/e2e/pilot',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL,
    serviceWorkers: 'block',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/capacity-auth.setup.ts',
    },
    {
      name: 'chromium-capacity',
      testMatch: '**/capacity-contract.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: process.env.PILOT_CAPACITY_SERVER_MANAGED === 'true'
    ? undefined
    : {
      command: process.env.PLAYWRIGHT_SERVER_COMMAND || 'portless run --name educa-pilot-capacity pnpm start',
      url: baseURL,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        NEXT_PUBLIC_PILOT_MODE: 'true',
        PILOT_MODE: 'true',
        PILOT_SYNTHETIC_DATA_ONLY: 'true',
        NEXT_DISABLE_DEV_TOOLS: '1',
      },
    },
  outputDir: 'test-results/pilot-capacity',
})
