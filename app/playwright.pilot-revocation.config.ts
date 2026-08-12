import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://educa-wayfinder-t07-g2-auth-revocation.educa-t07-auth-revocation.localhost'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    serviceWorkers: 'block',
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{
    name: 'chromium-pilot-revocation',
    testMatch: '**/pilot/auth-revocation.spec.ts',
  }],
  webServer: process.env.PILOT_REVOCATION_SERVER_MANAGED === 'true'
    ? undefined
    : {
        command: 'pnpm build && portless run --name educa-t07-auth-revocation pnpm start',
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
})
