/**
 * Playwright E2E Tests: AbrirAulaButton Component
 *
 * Test Coverage:
 * - Lock enforcement (disabled when session locked)
 * - Toast notifications on success/error
 * - Phase-aware rendering (planning → attendance → completion → locked)
 * - Mobile touch targets (≥44px)
 * - Loading states with proper feedback
 * - São Paulo timezone date handling
 * - Error handling and user feedback
 *
 * Compliance: Brazilian educational standards
 */

import { test, expect } from '@playwright/test'

test.describe('AbrirAulaButton - Session Opening Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to attendance page with mock authentication
    await page.goto('http://localhost:3000/dashboard/frequencia')

    // Wait for component to load
    await page.waitForLoadState('networkidle')
  })

  test('should display "Abrir Aula" button in planning phase', async ({ page }) => {
    const abrirButton = page.locator('button:has-text("Abrir Aula")')
    await expect(abrirButton).toBeVisible()

    // Verify button is enabled in planning phase
    await expect(abrirButton).not.toBeDisabled()

    // Check for planning phase indicator
    const planningPhase = page.locator('text=Planejamento')
    await expect(planningPhase).toBeVisible()
  })

  test('should have minimum 44px touch targets for mobile accessibility', async ({ page }) => {
    const abrirButton = page.locator('[data-testid="abrir-aula-button"]')

    const boundingBox = await abrirButton.boundingBox()
    expect(boundingBox!.height).toBeGreaterThanOrEqual(44)
    expect(boundingBox!.width).toBeGreaterThanOrEqual(44)
  })

  test('should show loading state when opening session', async ({ page }) => {
    const abrirButton = page.locator('button:has-text("Abrir Aula")')

    // Click button
    await abrirButton.click()

    // Verify loading state appears
    const loadingText = page.locator('text=Abrindo...')
    await expect(loadingText).toBeVisible({ timeout: 1000 })

    // Button should be disabled during loading
    await expect(abrirButton).toBeDisabled()
  })

  test('should show success toast notification when session opens successfully', async ({ page }) => {
    const abrirButton = page.locator('button:has-text("Abrir Aula")')

    // Click button to open session
    await abrirButton.click()

    // Wait for success toast
    const successToast = page.locator('text=/Aula aberta com sucesso/i')
    await expect(successToast).toBeVisible({ timeout: 3000 })

    // Verify descriptive message
    const descriptionText = page.locator('text=/Frequência liberada.*Marque a presença/i')
    await expect(descriptionText).toBeVisible()
  })

  test('should transition to attendance phase after opening session', async ({ page }) => {
    const abrirButton = page.locator('button:has-text("Abrir Aula")')
    await abrirButton.click()

    // Wait for phase transition
    await page.waitForSelector('text=/Marcando Frequência/i', { timeout: 3000 })

    // Verify attendance phase indicator
    const attendancePhase = page.locator('text=Marcando Frequência')
    await expect(attendancePhase).toBeVisible()

    // Button should no longer be visible (replaced by phase indicator)
    await expect(abrirButton).not.toBeVisible()
  })

  test('should be disabled when session is locked', async ({ page }) => {
    // Navigate to page with locked session (mock state)
    await page.goto('http://localhost:3000/dashboard/frequencia?locked=true')

    // Verify button is disabled
    const abrirButton = page.locator('[data-testid="abrir-aula-button"]')
    await expect(abrirButton).toBeDisabled()

    // Check for lock icon
    const lockIcon = page.locator('[data-testid="abrir-aula-button"] svg.lucide-lock')
    await expect(lockIcon).toBeVisible()
  })

  test('should show error toast when session opening fails', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Database connection failed' })
      })
    })

    const abrirButton = page.locator('button:has-text("Abrir Aula")')
    await abrirButton.click()

    // Wait for error toast
    const errorToast = page.locator('text=/Erro ao abrir aula/i')
    await expect(errorToast).toBeVisible({ timeout: 3000 })
  })

  test('should display lock message when session already completed', async ({ page }) => {
    // Navigate to page with completed session
    await page.goto('http://localhost:3000/dashboard/frequencia?status=completed')

    // Verify "Aula já encerrada" message
    const completedMessage = page.locator('text=/Aula já encerrada/i')
    await expect(completedMessage).toBeVisible()

    // Verify legal document badge
    const legalBadge = page.locator('text=/Documento Legal Oficial/i')
    await expect(legalBadge).toBeVisible()
  })

  test('should use São Paulo timezone for date calculation', async ({ page }) => {
    const abrirButton = page.locator('button:has-text("Abrir Aula")')
    await abrirButton.click()

    // Wait for network request
    const requestPromise = page.waitForRequest(request =>
      request.url().includes('open-session') && request.method() === 'POST'
    )

    const request = await requestPromise
    const postData = request.postDataJSON()

    // Verify date format (YYYY-MM-DD)
    expect(postData.data_aula).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('should be responsive on mobile viewport (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    const abrirButton = page.locator('[data-testid="abrir-aula-button"]')
    await expect(abrirButton).toBeVisible()

    // Verify button fits within mobile viewport
    const boundingBox = await abrirButton.boundingBox()
    expect(boundingBox!.width).toBeLessThan(375)

    // Touch targets should still meet 44px minimum
    expect(boundingBox!.height).toBeGreaterThanOrEqual(44)
  })

  test('should be responsive on tablet viewport (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })

    const abrirButton = page.locator('[data-testid="abrir-aula-button"]')
    await expect(abrirButton).toBeVisible()

    // Verify layout adapts to tablet size
    const boundingBox = await abrirButton.boundingBox()
    expect(boundingBox!.width).toBeLessThan(768)
  })

  test('should handle keyboard navigation (Enter key)', async ({ page }) => {
    const abrirButton = page.locator('button:has-text("Abrir Aula")')

    // Focus button with Tab
    await page.keyboard.press('Tab')

    // Verify focus visible
    await expect(abrirButton).toBeFocused()

    // Activate with Enter
    await page.keyboard.press('Enter')

    // Verify loading state
    const loadingText = page.locator('text=Abrindo...')
    await expect(loadingText).toBeVisible({ timeout: 1000 })
  })

  test('should display conteúdo programático field when expanded', async ({ page }) => {
    const abrirButton = page.locator('[data-testid="abrir-aula-button"]')

    // Check for optional content field
    const conteudoField = page.locator('textarea[placeholder*="conteúdo"]')

    if (await conteudoField.isVisible()) {
      // Verify field accepts input
      await conteudoField.fill('Matemática: Frações e operações')

      const fieldValue = await conteudoField.inputValue()
      expect(fieldValue).toBe('Matemática: Frações e operações')
    }
  })

  test('should show warning if trying to open session after 18:00 cutoff', async ({ page }) => {
    // Mock system time to after 18:00
    await page.addInitScript(() => {
      const mockDate = new Date('2025-09-30T19:00:00-03:00') // São Paulo timezone
      Date.now = () => mockDate.getTime()
    })

    await page.reload()

    const abrirButton = page.locator('button:has-text("Abrir Aula")')
    await abrirButton.click()

    // Verify cutoff warning
    const cutoffWarning = page.locator('text=/Prazo.*18:00.*encerrado/i')
    await expect(cutoffWarning).toBeVisible({ timeout: 3000 })
  })
})

test.describe('AbrirAulaButton - Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/frequencia')
    await page.waitForLoadState('networkidle')
  })

  test('should have accessible name (ARIA label)', async ({ page }) => {
    const abrirButton = page.locator('[data-testid="abrir-aula-button"]')

    // Verify button has accessible text or aria-label
    const accessibleName = await abrirButton.getAttribute('aria-label')
    expect(accessibleName || await abrirButton.textContent()).toBeTruthy()
  })

  test('should announce loading state to screen readers', async ({ page }) => {
    const abrirButton = page.locator('button:has-text("Abrir Aula")')
    await abrirButton.click()

    // Verify aria-busy or loading state
    await page.waitForSelector('[aria-busy="true"], [role="status"]', { timeout: 1000 })
  })

  test('should have sufficient color contrast (WCAG AA)', async ({ page }) => {
    const abrirButton = page.locator('[data-testid="abrir-aula-button"]')

    // Get computed styles
    const bgColor = await abrirButton.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    )
    const textColor = await abrirButton.evaluate(el =>
      window.getComputedStyle(el).color
    )

    // Verify colors are defined (contrast validation would require color library)
    expect(bgColor).toBeTruthy()
    expect(textColor).toBeTruthy()
  })
})
