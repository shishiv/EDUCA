import { expect, test as setup } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import {
  PILOT_CAPACITY_AUTH_PASSWORD,
  PILOT_CAPACITY_DIRECTOR_EMAIL,
} from '../../../../supabase/seed-pilot-capacity/pilot-capacity-contract'

const AUTH_STATE_PATH = process.env.PILOT_CAPACITY_AUTH_STATE_PATH || path.join(process.cwd(), 'playwright/.pilot-capacity/director.json')

setup('authenticate isolated capacity director', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible({ timeout: 15_000 })
  await page.getByLabel('E-mail', { exact: true }).fill(PILOT_CAPACITY_DIRECTOR_EMAIL)
  await page.getByLabel('Senha', { exact: true }).fill(PILOT_CAPACITY_AUTH_PASSWORD)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 })
  mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true })
  await page.context().storageState({ path: AUTH_STATE_PATH })
})
