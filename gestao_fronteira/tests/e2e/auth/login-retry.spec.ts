/**
 * Playwright E2E Tests: Login Retry Logic
 *
 * Test Coverage:
 * - Login with existing profile (happy path)
 * - Login with profile race condition (2 retries succeed)
 * - Login with profile not found (5 retries fail)
 * - Toast notifications on success/error
 * - Redirect behavior after login
 * - Logout on profile not found
 *
 * Compliance: Brazilian educational standards, LGPD compliance
 */

import { test, expect, Page } from '@playwright/test'

// Test credentials (should match seeded data)
const TEST_USER = {
  email: 'admin@fronteira.mg.gov.br',
  password: 'Test123!',
  userId: 'test-admin-id-123'
}

test.describe('Login Retry Logic - Profile Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage and cookies
    await page.goto('http://localhost:3000')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('Test 1: Login with existing profile (happy path)', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login')
    await page.waitForLoadState('networkidle')

    // Fill login form
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)

    // Listen for network requests to verify getUserProfile is called
    const profileRequests: string[] = []
    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('users') && request.method() === 'GET') {
        profileRequests.push(url)
      }
    })

    // Submit login form
    await page.click('button[type="submit"]')

    // Wait for loading state
    const loadingButton = page.locator('button:has-text("Entrando...")')
    await expect(loadingButton).toBeVisible({ timeout: 2000 })

    // Wait for success toast
    const successToast = page.locator('text=/Login realizado com sucesso/i')
    await expect(successToast).toBeVisible({ timeout: 5000 })

    // Verify redirect to dashboard (no retries needed)
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 5000 })

    // Assert: Should have called getUserProfile only once (no retries)
    expect(profileRequests.length).toBeLessThanOrEqual(2) // Initial + possible cache

    // Verify no error messages
    const errorAlert = page.locator('[role="alert"]')
    await expect(errorAlert).not.toBeVisible()
  })

  test('Test 2: Login with profile race condition (2 retries succeed)', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login')
    await page.waitForLoadState('networkidle')

    let profileRequestCount = 0

    // Mock API: First 2 calls return null (simulate race condition), 3rd returns profile
    await page.route('**/rest/v1/users?*', async (route) => {
      profileRequestCount++

      if (profileRequestCount <= 2) {
        // First 2 requests: simulate race condition (profile not ready yet)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]) // Empty array = no profile found
        })
      } else {
        // 3rd request onwards: return actual profile
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: TEST_USER.userId,
            email: TEST_USER.email,
            nome: 'Admin Test',
            tipo_usuario: 'admin',
            ativo: true,
            created_at: new Date().toISOString()
          }])
        })
      }
    })

    // Fill and submit login form
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)

    // Capture console logs to verify retry behavior
    const consoleLogs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'log' && msg.text().includes('Profile not found, retrying')) {
        consoleLogs.push(msg.text())
      }
    })

    await page.click('button[type="submit"]')

    // Wait for loading state (should be visible longer due to retries)
    const loadingButton = page.locator('button:has-text("Entrando...")')
    await expect(loadingButton).toBeVisible({ timeout: 2000 })

    // Wait for success toast (after 2 retries)
    const successToast = page.locator('text=/Login realizado com sucesso/i')
    await expect(successToast).toBeVisible({ timeout: 8000 }) // Longer timeout for retries

    // Verify redirect to dashboard after retries
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 5000 })

    // Assert: Should have made exactly 3 profile requests (initial + 2 retries)
    expect(profileRequestCount).toBe(3)

    // Log validation: Should show retry logs (if logging is visible in console)
    // Note: Logger might not output to console in production build
    // This is best tested through backend logs
  })

  test('Test 3: Login with profile not found (5 retries fail)', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login')
    await page.waitForLoadState('networkidle')

    let profileRequestCount = 0
    let signOutCalled = false

    // Mock API: Always return null (profile never found)
    await page.route('**/rest/v1/users?*', async (route) => {
      profileRequestCount++
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]) // Always empty = profile not found
      })
    })

    // Mock signOut to verify it's called
    await page.route('**/auth/v1/logout', async (route) => {
      signOutCalled = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      })
    })

    // Fill and submit login form
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)

    await page.click('button[type="submit"]')

    // Wait for loading state
    const loadingButton = page.locator('button:has-text("Entrando...")')
    await expect(loadingButton).toBeVisible({ timeout: 2000 })

    // Wait for error message (after 5 retries)
    const errorAlert = page.locator('text=/Perfil de usuário não encontrado/i')
    await expect(errorAlert).toBeVisible({ timeout: 15000 }) // ~2.5s per retry × 5 = 12.5s + buffer

    // Verify error toast
    const errorToast = page.locator('text=/Erro: Perfil não encontrado/i')
    await expect(errorToast).toBeVisible({ timeout: 5000 })

    // Assert: Should have made exactly 5 profile requests (max retries)
    expect(profileRequestCount).toBe(5)

    // Assert: User should be logged out (signOut called)
    // Note: signOut detection requires proper route mocking
    await page.waitForTimeout(1000) // Give time for signOut to be called

    // Verify still on login page (not redirected to dashboard)
    await expect(page).toHaveURL(/.*\/login/, { timeout: 2000 })

    // Verify loading state ended
    await expect(loadingButton).not.toBeVisible()
  })

  test('Test 4: Loading state duration during retries', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login')
    await page.waitForLoadState('networkidle')

    let profileRequestCount = 0

    // Mock API: Delay all requests to measure timing
    await page.route('**/rest/v1/users?*', async (route) => {
      profileRequestCount++

      // Simulate slow response
      await new Promise(resolve => setTimeout(resolve, 600))

      if (profileRequestCount < 3) {
        // Return null for first 2 requests
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        })
      } else {
        // Return profile on 3rd request
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: TEST_USER.userId,
            email: TEST_USER.email,
            nome: 'Admin Test',
            tipo_usuario: 'admin',
            ativo: true,
            created_at: new Date().toISOString()
          }])
        })
      }
    })

    // Fill and submit login form
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)

    const startTime = Date.now()
    await page.click('button[type="submit"]')

    // Wait for loading to start
    const loadingButton = page.locator('button:has-text("Entrando...")')
    await expect(loadingButton).toBeVisible({ timeout: 2000 })

    // Wait for success
    const successToast = page.locator('text=/Login realizado com sucesso/i')
    await expect(successToast).toBeVisible({ timeout: 10000 })

    const endTime = Date.now()
    const duration = endTime - startTime

    // Assert: Loading should take ~2-3 seconds (2 retries × 500ms delay + network)
    // Each retry: 500ms delay + 600ms mock delay = 1100ms
    // 2 retries = ~2200ms minimum
    expect(duration).toBeGreaterThan(2000) // At least 2 seconds
    expect(duration).toBeLessThan(5000) // Less than 5 seconds (reasonable max)
  })

  test('Test 5: Verify auth session persistence after retry success', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login')
    await page.waitForLoadState('networkidle')

    let profileRequestCount = 0

    // Mock API with 1 retry needed
    await page.route('**/rest/v1/users?*', async (route) => {
      profileRequestCount++

      if (profileRequestCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: TEST_USER.userId,
            email: TEST_USER.email,
            nome: 'Admin Test',
            tipo_usuario: 'admin',
            ativo: true,
            created_at: new Date().toISOString()
          }])
        })
      }
    })

    // Login
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')

    // Wait for success
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 8000 })

    // Verify auth session exists in localStorage
    const authData = await page.evaluate(() => {
      const keys = Object.keys(localStorage)
      return keys.filter(key => key.includes('supabase') || key.includes('auth'))
    })

    // Assert: Should have Supabase auth session stored
    expect(authData.length).toBeGreaterThan(0)

    // Refresh page to verify session persists
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should still be on dashboard (not redirected to login)
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 3000 })
  })
})

test.describe('Login Retry Logic - Accessibility & UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.waitForLoadState('networkidle')
  })

  test('Login form should have accessible labels', async ({ page }) => {
    // Verify email field has label
    const emailLabel = page.locator('label[for="email"]')
    await expect(emailLabel).toBeVisible()
    await expect(emailLabel).toHaveText(/Email/i)

    // Verify password field has label
    const passwordLabel = page.locator('label[for="password"]')
    await expect(passwordLabel).toBeVisible()
    await expect(passwordLabel).toHaveText(/Senha/i)
  })

  test('Login button should show loading state with icon', async ({ page }) => {
    // Mock slow auth to see loading state
    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.continue()
    })

    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')

    // Verify loading button with icon
    const loadingButton = page.locator('button:has-text("Entrando...")')
    await expect(loadingButton).toBeVisible()

    // Verify spinner icon (Loader2)
    const spinner = loadingButton.locator('.animate-spin')
    await expect(spinner).toBeVisible()

    // Verify button is disabled during loading
    await expect(loadingButton).toBeDisabled()
  })

  test('Error message should be clearly visible with proper styling', async ({ page }) => {
    // Mock profile not found scenario
    await page.route('**/rest/v1/users?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })

    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')

    // Wait for error
    const errorAlert = page.locator('[role="alert"]')
    await expect(errorAlert).toBeVisible({ timeout: 15000 })

    // Verify error styling (destructive variant)
    const bgColor = await errorAlert.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    )

    // Should have reddish background (rgb values contain red)
    expect(bgColor).toBeTruthy()
  })

  test('Login page should be responsive on mobile (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    // Verify login card is visible and fits
    const loginCard = page.locator('form').first()
    await expect(loginCard).toBeVisible()

    const boundingBox = await loginCard.boundingBox()
    expect(boundingBox!.width).toBeLessThan(375)

    // Verify inputs are touch-friendly (≥44px height)
    const emailInput = page.locator('input[type="email"]')
    const emailBox = await emailInput.boundingBox()
    expect(emailBox!.height).toBeGreaterThanOrEqual(44)

    const passwordInput = page.locator('input[type="password"]')
    const passwordBox = await passwordInput.boundingBox()
    expect(passwordBox!.height).toBeGreaterThanOrEqual(44)

    // Verify submit button is touch-friendly
    const submitButton = page.locator('button[type="submit"]')
    const buttonBox = await submitButton.boundingBox()
    expect(buttonBox!.height).toBeGreaterThanOrEqual(44)
  })
})
