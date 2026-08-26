import { expect, test as setup } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const AUTH_STATE_PATH = process.env.PILOT_CANONICAL_AUTH_STATE_PATH
const AUTH_RECEIPT_PATH = process.env.PILOT_CANONICAL_AUTH_RECEIPT_PATH
const SYNTHETIC_EMAIL = 'professora.a@synthetic.invalid'
const SCHOOL_ID = '10000000-0000-0000-0000-000000000001'

setup('authenticate the canonical synthetic teacher', async ({ page }) => {
  if (!AUTH_STATE_PATH) {
    throw new Error('PILOT_CANONICAL_AUTH_STATE_PATH_REQUIRED: isolated auth artifact path is required')
  }

  await page.goto('/login')
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible({ timeout: 15_000 })
  await page.getByLabel('E-mail', { exact: true }).fill(SYNTHETIC_EMAIL)
  await page.getByLabel('Senha', { exact: true }).fill('Synthetic-Only-2026!')
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Painel do Professor', exact: true })).toBeVisible({ timeout: 15_000 })

  mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true })
  await page.context().storageState({ path: AUTH_STATE_PATH })

  if (AUTH_RECEIPT_PATH) {
    mkdirSync(path.dirname(AUTH_RECEIPT_PATH), { recursive: true })
    writeFileSync(AUTH_RECEIPT_PATH, `${JSON.stringify({
      identity: SYNTHETIC_EMAIL,
      role: 'professor',
      schoolId: SCHOOL_ID,
      domain: 'synthetic.invalid',
      login: 'ui',
    }, null, 2)}\n`, 'utf8')
  }

  console.info(`PILOT_CANONICAL_AUTH_RECEIPT: identity=${SYNTHETIC_EMAIL} role=professor school=00000001 login=ui`)
})
