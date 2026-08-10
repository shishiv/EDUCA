import { expect, test as setup } from '@playwright/test'
import {
  PILOT_DESCRIPTIVE_AUTH_EMAIL,
  PILOT_DESCRIPTIVE_AUTH_PASSWORD,
} from '../../../../supabase/seed-pilot-descriptive/pilot-descriptive-contract'

const authStatePath = process.env.PILOT_DESCRIPTIVE_AUTH_STATE_PATH

setup('authenticate the synthetic descriptive-report teacher', async ({ page }) => {
  if (!authStatePath) {
    throw new Error('PILOT_DESCRIPTIVE_AUTH_STATE_PATH_REQUIRED: isolated auth artifact path is required')
  }

  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill(PILOT_DESCRIPTIVE_AUTH_EMAIL)
  await page.getByLabel('Senha', { exact: true }).fill(PILOT_DESCRIPTIVE_AUTH_PASSWORD)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/dashboard/)
  await page.context().storageState({ path: authStatePath })
})
