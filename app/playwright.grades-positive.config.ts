import { defineConfig, devices } from '@playwright/test'
import config from './playwright.config'

// Preserved positive contracts, not a green gate: canonical notas currently has
// no browser RLS policies. Re-enabling access requires separate authorization.
export default defineConfig({
  ...config,
  projects: [
    { name: 'setup', testMatch: '**/auth.setup.ts' },
    {
      name: 'chromium-grades-positive',
      testMatch: ['**/grades/entry.spec.ts', '**/grades/report-card.spec.ts'],
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
})
