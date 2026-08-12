import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://educa-pilot-descriptive.localhost'
const authStatePath = process.env.PILOT_DESCRIPTIVE_AUTH_STATE_PATH || path.join(process.cwd(), 'playwright/.pilot-descriptive/teacher.json')

export default defineConfig({
  testDir: './tests/e2e/pilot-descriptive',
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
      testMatch: '**/descriptive-auth.setup.ts',
    },
    {
      name: 'chromium-descriptive',
      testMatch: '**/descriptive-emission.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authStatePath,
      },
      dependencies: ['setup'],
    },
  ],
  webServer: process.env.PILOT_DESCRIPTIVE_SERVER_MANAGED === 'true'
    ? undefined
    : {
      command: process.env.PLAYWRIGHT_SERVER_COMMAND || 'portless run --name educa-pilot-descriptive pnpm start',
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
        NEXT_PUBLIC_PILOT_DESCRIPTIVE_REPORT_DEMO: 'true',
        PILOT_DESCRIPTIVE_REPORT_DEMO: 'true',
        EDUCA_RELEASE_REVISION: process.env.EDUCA_RELEASE_REVISION || '',
        NEXT_DISABLE_DEV_TOOLS: '1',
      },
    },
  outputDir: 'test-results/pilot-descriptive',
})
