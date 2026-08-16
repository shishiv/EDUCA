import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import {
  LEGACY_PILOT_APP_NAME,
  LEGACY_PILOT_EXCLUDED_FILES,
  LEGACY_PILOT_SETUP_FILE,
  LEGACY_PILOT_SPEC_FILES,
} from './tests/e2e/pilot/legacy-pilot-manifest'

const legacyAppName = process.env.PILOT_LEGACY_APP_NAME || LEGACY_PILOT_APP_NAME
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `https://${legacyAppName}.localhost`
const executablePath = process.env.PILOT_PLAYWRIGHT_EXECUTABLE_PATH
const authStatePath = process.env.PILOT_AUTH_STATE_PATH || path.join(process.cwd(), '.pilot-e2e/auth/user.json')
const excludedTestFiles = LEGACY_PILOT_EXCLUDED_FILES
  .filter(file => file.endsWith('.spec.ts') || file.endsWith('.setup.ts'))
  .map(file => `**/${file}`)

export default defineConfig({
  testDir: './tests/e2e',
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
    ignoreHTTPSErrors: true,
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    {
      name: 'legacy-setup',
      testMatch: `**/${LEGACY_PILOT_SETUP_FILE}`,
      testIgnore: excludedTestFiles,
    },
    {
      name: 'chromium-legacy',
      testMatch: LEGACY_PILOT_SPEC_FILES.map(file => `**/${file}`),
      testIgnore: excludedTestFiles,
      use: {
        ...devices['Desktop Chrome'],
        storageState: authStatePath,
      },
      dependencies: ['legacy-setup'],
    },
  ],
  webServer: process.env.PILOT_LEGACY_SERVER_MANAGED === 'true'
    ? undefined
    : {
      command: process.env.PLAYWRIGHT_SERVER_COMMAND || `portless run --name ${legacyAppName} pnpm start`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        NEXT_PUBLIC_PILOT_MODE: 'true',
        PILOT_MODE: 'true',
        PILOT_SYNTHETIC_DATA_ONLY: 'true',
        PILOT_EXTERNAL_DEPLOY_APPROVED: 'false',
        PILOT_LEGAL_APPROVAL_STATUS: 'not_approved',
        EDUCA_E2E_MODE: 'true',
        NEXT_PUBLIC_EDUCA_E2E_MODE: 'true',
        NEXT_DISABLE_DEV_TOOLS: '1',
      },
    },
  outputDir: process.env.PILOT_LEGACY_OUTPUT_DIR || 'test-results/pilot-legacy',
})
