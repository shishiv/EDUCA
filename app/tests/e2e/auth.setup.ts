import { test as setup, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'path'

const authFile = process.env.PILOT_AUTH_STATE_PATH || path.join(process.cwd(), 'playwright/.auth/user.json')

/**
 * Authentication Setup for E2E Tests
 * Runs once before all tests to authenticate and save session
 */
setup('authenticate', async ({ page }) => {
  // Navigate to login
  await page.goto('/login')

  // Fill login form with test admin credentials
  // These should match seed data from pnpm seed:dev
  const emailInput = page.getByLabel('E-mail', { exact: true })
  await expect(emailInput).toBeVisible({ timeout: 15_000 })
  await emailInput.fill('secretaria@synthetic.invalid')
  await page.getByLabel('Senha', { exact: true }).fill('Synthetic-Only-2026!')

  // Submit login
  await page.getByRole('button', { name: /entrar/i }).click()

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/dashboard/, { timeout: 30000 })

  // Verify we're logged in
  await expect(page.getByRole('heading', { name: /bom dia|boa tarde|boa noite/i })).toBeVisible()

  // Save authentication state
  mkdirSync(path.dirname(authFile), { recursive: true })
  await page.context().storageState({ path: authFile })
})

/**
 * Alternative setup for different user roles
 * Uncomment and modify as needed for role-specific tests
 */

// setup('authenticate as professor', async ({ page }) => {
//   await page.goto('/login')
//   await page.getByLabel(/email/i).fill('professor@test.com')
//   await page.getByLabel(/senha/i).fill('test123456')
//   await page.getByRole('button', { name: /entrar/i }).click()
//   await expect(page).toHaveURL(/dashboard/, { timeout: 30000 })
//   await page.context().storageState({ 
//     path: path.join(__dirname, '../playwright/.auth/professor.json')
//   })
// })

// setup('authenticate as diretor', async ({ page }) => {
//   await page.goto('/login')
//   await page.getByLabel(/email/i).fill('diretor@test.com')
//   await page.getByLabel(/senha/i).fill('test123456')
//   await page.getByRole('button', { name: /entrar/i }).click()
//   await expect(page).toHaveURL(/dashboard/, { timeout: 30000 })
//   await page.context().storageState({ 
//     path: path.join(__dirname, '../playwright/.auth/diretor.json')
//   })
// })
