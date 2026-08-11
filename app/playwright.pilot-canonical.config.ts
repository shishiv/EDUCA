import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://educa-r1-canonical.localhost'
const authStatePath = process.env.PILOT_CANONICAL_AUTH_STATE_PATH || path.join(process.cwd(), 'playwright/.pilot-canonical/teacher.json')

export default defineConfig({
  testDir: './tests/e2e/pilot',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/canonical-auth.setup.ts',
    },
    {
      name: 'chromium-canonical-pilot',
      testMatch: '**/canonical-pilot.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authStatePath,
      },
      dependencies: ['setup'],
    },
  ],
  webServer: process.env.PILOT_CANONICAL_SERVER_MANAGED === 'true'
    ? undefined
    : {
      command: process.env.PLAYWRIGHT_SERVER_COMMAND || 'portless run --name educa-r1-canonical pnpm start',
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
        EDUCA_E2E_MODE: 'true',
        NEXT_PUBLIC_EDUCA_E2E_MODE: 'true',
        NEXT_PUBLIC_DEMO_SANDBOX: 'false',
        DEMO_SANDBOX: 'false',
        NEXT_DISABLE_DEV_TOOLS: '1',
      },
    },
  outputDir: process.env.PILOT_CANONICAL_OUTPUT_DIR || 'test-results/pilot-canonical',
})
