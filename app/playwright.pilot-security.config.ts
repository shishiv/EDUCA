import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { LEGACY_PILOT_APP_NAME } from './tests/e2e/pilot/legacy-pilot-manifest'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || `https://${LEGACY_PILOT_APP_NAME}.localhost`
const authStatePath = process.env.PILOT_AUTH_STATE_PATH || path.join(process.cwd(), '.pilot-e2e/auth/user.json')

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
    serviceWorkers: 'block',
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      name: 'chromium-pilot-security',
      testMatch: '**/pilot/security-hardening.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authStatePath,
      },
      dependencies: ['setup'],
    },
  ],
  webServer: process.env.PILOT_LEGACY_SERVER_MANAGED === 'true'
    ? undefined
    : {
      command: process.env.PLAYWRIGHT_SERVER_COMMAND || 'pnpm build && pnpm start',
      url: baseURL,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      EDUCA_E2E_MODE: process.env.EDUCA_E2E_MODE || 'false',
      NEXT_PUBLIC_EDUCA_E2E_MODE: process.env.NEXT_PUBLIC_EDUCA_E2E_MODE || 'false',
      NEXT_PUBLIC_PILOT_MODE: 'true',
      PILOT_MODE: 'true',
      PILOT_SYNTHETIC_DATA_ONLY: 'true',
      NEXT_DISABLE_DEV_TOOLS: '1',
    },
  },
  outputDir: 'test-results/pilot-security',
})
