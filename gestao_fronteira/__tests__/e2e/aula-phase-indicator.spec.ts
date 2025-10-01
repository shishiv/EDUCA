/**
 * Playwright E2E Tests - Aula Phase Indicator Component
 *
 * Tests the three-phase workflow visualization:
 * - Planejamento (Planning): Yellow badge
 * - Marcando (Attendance): Green badge
 * - Finalizada (Completed): Gray badge with lock icon
 *
 * Validates visual feedback and Brazilian compliance messaging
 */

import { test, expect } from '@playwright/test'

test.describe('AulaPhaseIndicator - Three-Phase Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to attendance page (adjust URL as needed)
    await page.goto('/dashboard/frequencia')
  })

  test('should display planning phase with yellow badge', async ({ page }) => {
    // Wait for phase indicator to load
    await page.waitForSelector('[data-testid="phase-indicator"]', { timeout: 5000 })

    // Check for "Planejamento" badge
    const planningBadge = page.locator('text=Planejamento')
    await expect(planningBadge).toBeVisible()

    // Verify yellow color styling (approximate check via class)
    const badge = page.locator('[data-testid="phase-badge-planning"]')
    await expect(badge).toHaveClass(/yellow/)
  })

  test('should display attendance phase with green badge when session is open', async ({
    page,
  }) => {
    // Open a session first
    const abrirAulaButton = page.locator('button:has-text("Abrir Aula")')
    await abrirAulaButton.click()

    // Wait for success toast
    await page.waitForSelector('text=/Aula aberta/i', { timeout: 3000 })

    // Phase should transition to "Marcando Frequência"
    const attendanceBadge = page.locator('text=Marcando Frequência')
    await expect(attendanceBadge).toBeVisible()

    // Verify green color (active phase)
    const badge = page.locator('[data-testid="phase-badge-attendance"]')
    await expect(badge).toHaveClass(/green/)
  })

  test('should display completion phase when preparing to close session', async ({ page }) => {
    // Open session
    await page.locator('button:has-text("Abrir Aula")').click()
    await page.waitForTimeout(1000)

    // Mark some attendance
    const presentButton = page.locator('[data-testid="mark-present"]').first()
    await presentButton.click()

    // Click "Encerrar Aula" button
    const closeButton = page.locator('button:has-text("Encerrar Aula")')
    await closeButton.click()

    // Phase should show "Encerrando"
    const completionBadge = page.locator('text=Encerrando')
    await expect(completionBadge).toBeVisible()
  })

  test('should display locked phase with gray badge after session close', async ({ page }) => {
    // Open and immediately close session
    await page.locator('button:has-text("Abrir Aula")').click()
    await page.waitForTimeout(500)

    const closeButton = page.locator('button:has-text("Encerrar Aula")')
    await closeButton.click()

    // Confirm in dialog
    const confirmButton = page.locator('button:has-text("Confirmar")')
    await confirmButton.click()

    // Wait for completion
    await page.waitForSelector('text=/Finalizada/i', { timeout: 3000 })

    // Phase should be "Finalizada" with lock icon
    const lockedBadge = page.locator('text=Finalizada')
    await expect(lockedBadge).toBeVisible()

    const lockIcon = page.locator('[data-testid="lock-icon"]')
    await expect(lockIcon).toBeVisible()

    // Verify gray styling
    const badge = page.locator('[data-testid="phase-badge-locked"]')
    await expect(badge).toHaveClass(/gray/)
  })

  test('should show legal compliance message when session is locked', async ({ page }) => {
    // Navigate to a previously closed session
    await page.goto('/dashboard/frequencia?session=closed-example')

    // Wait for lock message
    const legalMessage = page.locator(
      'text=/Documento Legal Oficial.*não existe o esquecer/i'
    )
    await expect(legalMessage).toBeVisible()

    // Verify red alert styling
    await expect(legalMessage.locator('xpath=ancestor::div[contains(@class, "alert")]')).toHaveClass(
      /red/
    )
  })

  test('should display session timestamps in phase description', async ({ page }) => {
    // Open session
    await page.locator('button:has-text("Abrir Aula")').click()
    await page.waitForTimeout(500)

    // Check for "Aberta às HH:MM" text
    const timestampText = page.locator('text=/Aberta às \\d{2}:\\d{2}/i')
    await expect(timestampText).toBeVisible()

    // Verify timestamp format (HH:MM)
    const timestamp = await timestampText.textContent()
    expect(timestamp).toMatch(/\d{2}:\d{2}/)
  })

  test('should show phase progression visually with connectors', async ({ page }) => {
    // Check for phase progress bar
    const progressBar = page.locator('[data-testid="phase-progress"]')
    await expect(progressBar).toBeVisible()

    // Verify all 4 phases are displayed
    await expect(page.locator('text=Planejamento')).toBeVisible()
    await expect(page.locator('text=Marcando')).toBeVisible()
    await expect(page.locator('text=Encerrando')).toBeVisible()
    await expect(page.locator('text=Finalizada')).toBeVisible()

    // Verify connector lines between phases (visual check)
    const connectors = page.locator('[data-testid="phase-connector"]')
    await expect(connectors).toHaveCount(3) // 3 connectors for 4 phases
  })

  test('should display compact mode badge only', async ({ page }) => {
    // Navigate to page with compact indicator
    await page.goto('/dashboard/frequencia?compact=true')

    // Should show badge without full description
    const compactBadge = page.locator('[data-testid="phase-badge-compact"]')
    await expect(compactBadge).toBeVisible()

    // Should NOT show full phase description
    const description = page.locator('text=/Preparando aula/i')
    await expect(description).not.toBeVisible()
  })

  test('should handle error state with alert message', async ({ page }) => {
    // Simulate API error (mock network failure)
    await page.route('**/api/sessoes/**', (route) =>
      route.abort('failed')
    )

    await page.reload()

    // Should show error alert
    const errorAlert = page.locator('text=/Erro:/i')
    await expect(errorAlert).toBeVisible()

    // Verify destructive/red styling
    await expect(errorAlert.locator('xpath=ancestor::div[contains(@class, "destructive")]')).toBeVisible()
  })

  test('should be responsive on mobile viewport (375x667)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.reload()

    // Phase indicator should still be visible
    const indicator = page.locator('[data-testid="phase-indicator"]')
    await expect(indicator).toBeVisible()

    // Badge text should not overflow
    const badge = page.locator('[data-testid="phase-badge"]')
    const boundingBox = await badge.boundingBox()

    expect(boundingBox).not.toBeNull()
    expect(boundingBox!.width).toBeLessThan(375) // Fits within viewport
  })

  test('should be responsive on tablet viewport (768x1024)', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })

    await page.reload()

    // Full phase progression should be visible
    const progressBar = page.locator('[data-testid="phase-progress"]')
    await expect(progressBar).toBeVisible()

    // All phase labels should be readable
    await expect(page.locator('text=Planejamento')).toBeVisible()
    await expect(page.locator('text=Marcando Frequência')).toBeVisible()
  })

  test('should update phase in real-time when session state changes', async ({ page }) => {
    // Start in planning phase
    await expect(page.locator('text=Planejamento')).toBeVisible()

    // Open session via API or UI action
    await page.locator('button:has-text("Abrir Aula")').click()

    // Phase should transition without page reload
    await expect(page.locator('text=Marcando Frequência')).toBeVisible({ timeout: 2000 })

    // Verify no full page reload occurred (check for element persistence)
    const header = page.locator('h1')
    await expect(header).toBeVisible() // Header still present = no reload
  })

  test('should prevent backwards phase transition (locked → attendance)', async ({ page }) => {
    // Navigate to locked session
    await page.goto('/dashboard/frequencia?session=locked-example')

    // Phase should be "Finalizada"
    await expect(page.locator('text=Finalizada')).toBeVisible()

    // Attempt to modify attendance (should be disabled)
    const attendanceButton = page.locator('[data-testid="mark-present"]').first()

    // Button should be disabled or not exist
    const isEnabled = await attendanceButton.isEnabled().catch(() => false)
    expect(isEnabled).toBe(false)

    // Phase should remain locked
    await expect(page.locator('text=Finalizada')).toBeVisible()
  })
})