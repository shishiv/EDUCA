import { test, expect } from '../support/diagnostics'

/**
 * E2E Tests: Login Flow
 * Runs in `chromium-unauth` project (no storageState) so the login page
 * is always reachable without an existing session.
 */

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    // Wait for the client component to hydrate
    await page.locator('#email').waitFor({ state: 'visible', timeout: 10000 })
  })

  test('should display login form', async ({ page }) => {
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()
    // Brand heading
    await expect(page.getByText('Entrar no sistema')).toBeVisible()
  })

  test('should show HTML5 validation for empty email', async ({ page }) => {
    // Submit without filling - browser native validation fires
    await page.getByRole('button', { name: /entrar/i }).click()
    // The email input should be invalid (HTML5 required)
    const emailInput = page.locator('#email')
    const valid = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validity.valid
    )
    expect(valid).toBe(false)
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.locator('#email').fill('invalid@test.com')
    await page.locator('#password').fill('wrongpassword')
    await page.getByRole('button', { name: /entrar/i }).click()
    // Alert or error text should appear
    await expect(
      page.getByText(/credenciais|inválid|erro|email.*senha/i)
    ).toBeVisible({ timeout: 15000 })
    // URL should still be /login
    await expect(page).toHaveURL(/login/)
  })

  test('should show HTML5 validation for invalid email format', async ({ page }) => {
    await page.locator('#email').fill('notanemail')
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: /entrar/i }).click()
    const emailInput = page.locator('#email')
    const valid = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validity.valid
    )
    expect(valid).toBe(false)
  })
})

test.describe('Authentication Flows', () => {
  test('should protect dashboard route - redirect unauthenticated to login', async ({ page }) => {
    // No session, so /dashboard should redirect to /login
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/, { timeout: 10000 })
  })

  test('login page shows forgot-password link', async ({ page }) => {
    await page.goto('/login')
    await expect(
      page.getByRole('link', { name: /esqueci.*senha/i })
    ).toBeVisible()
  })

  test('root / redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/login/, { timeout: 10000 })
  })

  test('reset-password form sends instructions and shows confirmation', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.getByRole('heading', { name: /redefinir senha/i })).toBeVisible()
    await page.getByLabel(/e-mail/i).fill('admin@test.com')
    await page.getByRole('button', { name: /enviar link/i }).click()
    await expect(page.getByRole('heading', { name: /confira seu e-mail/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: /voltar ao login/i }).last()).toBeVisible()
  })

  test('privacy and offline pages are public', async ({ page }) => {
    await page.goto('/politica-privacidade')
    await expect(page.getByRole('heading', { name: 'Política de Privacidade', exact: true })).toBeVisible()
    await page.goto('/offline')
    await expect(page.getByRole('heading', { name: /você está offline/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /tentar novamente/i })).toBeVisible()
  })

  test('login controls remain usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 })
    await page.goto('/login')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    const box = await page.getByRole('button', { name: /entrar/i }).boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })
})
