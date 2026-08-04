import { defineConfig, devices } from '@playwright/test'
import path from 'path'

const AUTH_DIR = path.join(__dirname, 'playwright/.auth')
// Pilot mode redirects the authenticated chromium storageState to the
// deterministic synthetic identity produced by run-pilot-e2e.sh.
const syntheticAuthStateFile =
  process.env.PILOT_AUTH_STATE_PATH || path.join(AUTH_DIR, 'user.json')

/**
 * Playwright configuration for EDUCA E2E tests
 */
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30_000,   // Keep failures bounded; slow flows use explicit timeouts
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    // ─── Setup ───────────────────────────────────────────────────────────────
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // ─── Unauthenticated tests (login page, route-protection checks) ─────────
    {
      name: 'chromium-unauth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
      testMatch: /.*\/(auth)\/.*/,
      dependencies: ['setup'],
    },

    // ─── Admin (default authenticated role) ─────────────────────────────────
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: syntheticAuthStateFile,
      },
      // Pilot-only specs require the explicit pilot provisioner and are run by
      // scripts/run-pilot-e2e.sh with PILOT_MODE=true.
      testIgnore: process.env.PILOT_MODE === 'true'
        ? /.*\/(auth)\/.*/
        : /.*\/(auth|pilot)\/.*/,
      dependencies: ['setup'],
    },

    // ─── Role-specific projects (opt-in via grep or explicit run) ────────────
    {
      name: 'diretor',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'diretor.json'),
      },
      testMatch: /.*roles\.spec\.ts/,
      dependencies: ['setup'],
    },
    {
      name: 'professor',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'professor.json'),
      },
      testMatch: /.*roles\.spec\.ts/,
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: process.env.PLAYWRIGHT_SERVER_COMMAND || 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI && process.env.PILOT_MODE !== 'true',
    timeout: 180 * 1000, // Own bounded cold-start/prewarm readiness here, not in auth assertions
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      EDUCA_E2E_MODE: process.env.EDUCA_E2E_MODE || 'false',
      NEXT_PUBLIC_EDUCA_E2E_MODE: process.env.NEXT_PUBLIC_EDUCA_E2E_MODE || 'false',
      // Disable the Next.js dev overlay so it does not intercept pointer events
      NEXT_DISABLE_DEV_TOOLS: '1',
    },
  },

  outputDir: 'test-results',
})
