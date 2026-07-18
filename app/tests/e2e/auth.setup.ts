import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

/**
 * Authentication Setup for E2E Tests
 * Runs once before all tests to authenticate and save session
 */
setup('authenticate', async ({ page }) => {
  // Navigate to login
  await page.goto('/login')

  // Fill login form with test admin credentials
  // These should match seed data from pnpm seed:dev
  await page.getByLabel(/email/i).fill('admin@test.com')
  await page.getByLabel(/senha/i).fill('test123456')

  // Submit login
  await page.getByRole('button', { name: /entrar/i }).click()

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/dashboard/, { timeout: 30000 })

  // Verify we're logged in
  await expect(page.getByRole('heading', { name: /dashboard|painel/i })).toBeVisible()

  // Save authentication state
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
