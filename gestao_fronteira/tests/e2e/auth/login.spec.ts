import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Login Flow
 * Tests authentication for all user roles
 */

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /entrar|login/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/senha/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()
  })

  test('should show validation errors for empty form', async ({ page }) => {
    await page.getByRole('button', { name: /entrar/i }).click()
    
    // Should show validation messages
    await expect(page.getByText(/email.*obrigatório|informe.*email/i)).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('invalid@test.com')
    await page.getByLabel(/senha/i).fill('wrongpassword')
    await page.getByRole('button', { name: /entrar/i }).click()
    
    // Should show authentication error
    await expect(page.getByText(/credenciais|inválid|erro/i)).toBeVisible({ timeout: 10000 })
  })

  test('should validate email format', async ({ page }) => {
    await page.getByLabel(/email/i).fill('notanemail')
    await page.getByLabel(/senha/i).fill('password123')
    await page.getByRole('button', { name: /entrar/i }).click()
    
    // Should show email format error
    await expect(page.getByText(/email.*válido|formato.*inválido/i)).toBeVisible()
  })
})

test.describe('Authentication Flows', () => {
  // These tests require seeded test users
  // Run: pnpm seed:dev before testing

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.goto('/login')
    
    // Use test credentials (from seed data)
    await page.getByLabel(/email/i).fill('admin@test.com')
    await page.getByLabel(/senha/i).fill('test123456')
    await page.getByRole('button', { name: /entrar/i }).click()
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })
  })

  test('should protect dashboard route without auth', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should redirect to login
    await expect(page).toHaveURL(/login/)
  })

  test('should persist session after page reload', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('admin@test.com')
    await page.getByLabel(/senha/i).fill('test123456')
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })
    
    // Reload page
    await page.reload()
    
    // Should still be on dashboard
    await expect(page).toHaveURL(/dashboard/)
  })
})
