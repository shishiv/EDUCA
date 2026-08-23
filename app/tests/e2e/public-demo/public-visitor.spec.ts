/**
 * J1 — Visitante público (non-destructive smoke)
 *
 * This spec runs against the public demo OR local stack.
 * It performs NO mutations — read-only assertions only.
 * Safe to run against the shared sandbox.
 */
import { expect, test } from '@playwright/test'

test.describe('J1: public visitor journey', () => {
  test('root URL redirects to /login', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveURL(/\/login/)
  })

  test('/login renders without errors', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Senha', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()
  })

  test('privacy policy page is accessible without auth', async ({ page }) => {
    await page.goto('/politica-privacidade')
    await expect(page.locator('h1, h2').first()).toBeVisible()
    // Non-destructive: we only assert the page loads
    expect(await page.title()).toBeTruthy()
  })

  test('/reset-password is accessible without auth', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.getByLabel(/e-mail/i)).toBeVisible()
  })

  test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
