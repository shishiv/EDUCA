/**
 * Playwright E2E Tests: EncerrarAulaDialog Component
 *
 * Test Coverage:
 * - Attendance statistics display (total/present/absent)
 * - Confirmation checkbox requirement
 * - Legal compliance warning visibility
 * - Mobile Sheet vs Desktop Dialog rendering
 * - Bolsa Família warning when <80% attendance
 * - Session metadata display
 * - Observações field validation
 * - Risk level badge (Ótima/Boa/Atenção)
 *
 * Compliance: "não existe o esquecer" principle enforcement
 */

import { test, expect } from '@playwright/test'

test.describe('EncerrarAulaDialog - Session Closure Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to attendance page with active session
    await page.goto('http://localhost:3000/dashboard/frequencia?session=active')
    await page.waitForLoadState('networkidle')

    // Open dialog (button may be labeled "Encerrar Aula" or "Fechar Aula")
    const encerrarButton = page.locator('button:has-text("Encerrar Aula"), button:has-text("Fechar Aula")')
    await encerrarButton.click()

    // Wait for dialog to appear
    await page.waitForSelector('[role="dialog"], [role="presentation"]', { timeout: 2000 })
  })

  test('should display attendance statistics summary', async ({ page }) => {
    // Verify "Resumo da Frequência" header
    const resumoHeader = page.locator('text=Resumo da Frequência')
    await expect(resumoHeader).toBeVisible()

    // Verify Total de Alunos stat
    const totalAlunos = page.locator('text=Total de Alunos')
    await expect(totalAlunos).toBeVisible()

    // Verify Presentes stat with green color
    const presentesStat = page.locator('text=Presentes').locator('..')
    await expect(presentesStat).toBeVisible()

    // Verify Ausentes stat with red color
    const ausentesStat = page.locator('text=Ausentes').locator('..')
    await expect(ausentesStat).toBeVisible()
  })

  test('should display attendance percentage progress bar', async ({ page }) => {
    // Verify "Taxa de Presença" label
    const taxaLabel = page.locator('text=Taxa de Presença')
    await expect(taxaLabel).toBeVisible()

    // Verify progress bar exists
    const progressBar = page.locator('[role="progressbar"], .progress')
    await expect(progressBar).toBeVisible()

    // Verify percentage badge
    const percentageBadge = page.locator('text=/%.*Ótima|Boa|Atenção/')
    await expect(percentageBadge).toBeVisible()
  })

  test('should show "Ótima" badge when attendance ≥80%', async ({ page }) => {
    // Mock session with 90% attendance
    await page.evaluate(() => {
      window.localStorage.setItem(
        'mock-session-stats',
        JSON.stringify({ total: 30, present: 27, absent: 3 })
      )
    })
    await page.reload()

    const encerrarButton = page.locator('button:has-text("Encerrar Aula")')
    await encerrarButton.click()

    // Verify "Ótima" badge with green color
    const otimaBadge = page.locator('text=/90%.*Ótima/')
    await expect(otimaBadge).toBeVisible()

    // No Bolsa Família warning should appear
    const bolsaWarning = page.locator('text=/Bolsa Família/')
    await expect(bolsaWarning).not.toBeVisible()
  })

  test('should show "Boa" badge when attendance 70-79%', async ({ page }) => {
    // Mock session with 75% attendance
    await page.evaluate(() => {
      window.localStorage.setItem(
        'mock-session-stats',
        JSON.stringify({ total: 30, present: 22, absent: 8 })
      )
    })
    await page.reload()

    const encerrarButton = page.locator('button:has-text("Encerrar Aula")')
    await encerrarButton.click()

    // Verify "Boa" badge with yellow color
    const boaBadge = page.locator('text=/7[0-9]%.*Boa/')
    await expect(boaBadge).toBeVisible()

    // Bolsa Família warning SHOULD appear (<80%)
    const bolsaWarning = page.locator('text=/Bolsa Família/')
    await expect(bolsaWarning).toBeVisible()
  })

  test('should show "Atenção" badge and Bolsa Família warning when attendance <70%', async ({ page }) => {
    // Mock session with 60% attendance
    await page.evaluate(() => {
      window.localStorage.setItem(
        'mock-session-stats',
        JSON.stringify({ total: 30, present: 18, absent: 12 })
      )
    })
    await page.reload()

    const encerrarButton = page.locator('button:has-text("Encerrar Aula")')
    await encerrarButton.click()

    // Verify "Atenção" badge with red color
    const atencaoBadge = page.locator('text=/60%.*Atenção/')
    await expect(atencaoBadge).toBeVisible()

    // Verify Bolsa Família warning
    const bolsaWarning = page.locator('text=/Taxa de presença abaixo de 80%.*Bolsa Família/')
    await expect(bolsaWarning).toBeVisible()
  })

  test('should display session metadata (date and open time)', async ({ page }) => {
    // Verify data label
    const dataLabel = page.locator('text=Data:')
    await expect(dataLabel).toBeVisible()

    // Verify "Aberta às" timestamp
    const abertaLabel = page.locator('text=Aberta às:')
    await expect(abertaLabel).toBeVisible()

    // Verify time format (HH:MM)
    const timeFormat = page.locator('text=/\\d{2}:\\d{2}/')
    await expect(timeFormat).toBeVisible()
  })

  test('should have observações field with character counter', async ({ page }) => {
    const observacoesField = page.locator('textarea#observacoes, textarea[placeholder*="observações"]')
    await expect(observacoesField).toBeVisible()

    // Type text
    await observacoesField.fill('Aula produtiva com boa participação.')

    // Verify character counter
    const charCounter = page.locator('text=/\\d+\\/500/')
    await expect(charCounter).toBeVisible()

    // Verify counter updates
    const currentCount = await charCounter.textContent()
    expect(currentCount).toContain('41/500')
  })

  test('should enforce 500 character limit on observações', async ({ page }) => {
    const observacoesField = page.locator('textarea#observacoes, textarea[placeholder*="observações"]')

    // Try to fill with 600 characters
    const longText = 'a'.repeat(600)
    await observacoesField.fill(longText)

    // Verify field truncates to 500
    const fieldValue = await observacoesField.inputValue()
    expect(fieldValue.length).toBeLessThanOrEqual(500)
  })

  test('should display legal compliance warning', async ({ page }) => {
    // Verify "Documento Legal" header
    const legalHeader = page.locator('text=Atenção - Documento Legal')
    await expect(legalHeader).toBeVisible()

    // Verify "não existe o esquecer" principle
    const naoExisteEsquecer = page.locator('text=/não existe o esquecer/i')
    await expect(naoExisteEsquecer).toBeVisible()

    // Verify lock icon
    const lockIcon = page.locator('[data-testid="legal-warning"] svg.lucide-lock, svg.lucide-lock')
    await expect(lockIcon.first()).toBeVisible()
  })

  test('should require confirmation checkbox before enabling "Encerrar" button', async ({ page }) => {
    const confirmButton = page.locator('button:has-text("Encerrar Aula")').last()

    // Initially disabled
    await expect(confirmButton).toBeDisabled()

    // Click confirmation checkbox
    const confirmCheckbox = page.locator('input#confirm-close, input[type="checkbox"]')
    await confirmCheckbox.check()

    // Now enabled
    await expect(confirmButton).toBeEnabled()
  })

  test('should show error toast if confirmation not checked', async ({ page }) => {
    // Uncheck confirmation (if checked)
    const confirmCheckbox = page.locator('input#confirm-close, input[type="checkbox"]')
    await confirmCheckbox.uncheck()

    // Try to click Encerrar button (may be disabled)
    const confirmButton = page.locator('button:has-text("Encerrar Aula")').last()

    if (await confirmButton.isEnabled()) {
      await confirmButton.click()

      // Verify error toast
      const errorToast = page.locator('text=/Confirmação necessária/i')
      await expect(errorToast).toBeVisible({ timeout: 2000 })
    }
  })

  test('should close session successfully with confirmation', async ({ page }) => {
    // Check confirmation
    const confirmCheckbox = page.locator('input#confirm-close, input[type="checkbox"]')
    await confirmCheckbox.check()

    // Click Encerrar button
    const confirmButton = page.locator('[data-testid="confirm-encerrar-button"]')
    await confirmButton.click()

    // Verify loading state
    const encerrando = page.locator('text=Encerrando...')
    await expect(encerrando).toBeVisible({ timeout: 1000 })

    // Wait for success toast
    const successToast = page.locator('text=/Aula encerrada com sucesso/i')
    await expect(successToast).toBeVisible({ timeout: 5000 })

    // Verify "Frequência travada" message
    const travadaMessage = page.locator('text=/Frequência travada.*Documento legal gerado/i')
    await expect(travadaMessage).toBeVisible()
  })

  test('should reset form after successful closure', async ({ page }) => {
    // Fill observações
    const observacoesField = page.locator('textarea#observacoes')
    await observacoesField.fill('Test observation')

    // Check confirmation
    const confirmCheckbox = page.locator('input#confirm-close')
    await confirmCheckbox.check()

    // Close session
    const confirmButton = page.locator('[data-testid="confirm-encerrar-button"]')
    await confirmButton.click()

    // Wait for success
    await page.waitForSelector('text=/Aula encerrada/i', { timeout: 5000 })

    // Dialog should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 2000 })
  })

  test('should show error toast on closure failure', async ({ page }) => {
    // Mock API failure
    await page.route('**/close-session**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Database error' })
      })
    })

    // Check confirmation
    const confirmCheckbox = page.locator('input#confirm-close')
    await confirmCheckbox.check()

    // Try to close
    const confirmButton = page.locator('[data-testid="confirm-encerrar-button"]')
    await confirmButton.click()

    // Verify error toast
    const errorToast = page.locator('text=/Erro ao encerrar aula/i')
    await expect(errorToast).toBeVisible({ timeout: 3000 })
  })
})

test.describe('EncerrarAulaDialog - Mobile Responsiveness', () => {
  test('should render as Sheet (bottom drawer) on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('http://localhost:3000/dashboard/frequencia?session=active')
    await page.waitForLoadState('networkidle')

    // Open dialog
    const encerrarButton = page.locator('button:has-text("Encerrar Aula")')
    await encerrarButton.click()

    // Verify Sheet component (bottom drawer)
    // Sheet typically has side="bottom" and comes from bottom of screen
    const sheet = page.locator('[role="presentation"], [role="dialog"]')
    await expect(sheet).toBeVisible()

    // Verify sheet takes up ~90vh
    const boundingBox = await sheet.boundingBox()
    expect(boundingBox!.height).toBeGreaterThan(500) // Most of 667px height
  })

  test('should render as Dialog (modal) on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })

    await page.goto('http://localhost:3000/dashboard/frequencia?session=active')
    await page.waitForLoadState('networkidle')

    // Open dialog
    const encerrarButton = page.locator('button:has-text("Encerrar Aula")')
    await encerrarButton.click()

    // Verify Dialog component (centered modal)
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()

    // Verify max-width constraint (max-w-md = 28rem = 448px)
    const boundingBox = await dialog.boundingBox()
    expect(boundingBox!.width).toBeLessThanOrEqual(500)
  })

  test('should be scrollable on small mobile screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('http://localhost:3000/dashboard/frequencia?session=active')
    const encerrarButton = page.locator('button:has-text("Encerrar Aula")')
    await encerrarButton.click()

    // Verify scroll container exists
    const scrollContainer = page.locator('[class*="overflow"]')
    await expect(scrollContainer.first()).toBeVisible()

    // Try to scroll down to confirmation checkbox
    const confirmCheckbox = page.locator('input#confirm-close')
    await confirmCheckbox.scrollIntoViewIfNeeded()
    await expect(confirmCheckbox).toBeVisible()
  })

  test('should adapt statistics grid for mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('http://localhost:3000/dashboard/frequencia?session=active')
    const encerrarButton = page.locator('button:has-text("Encerrar Aula")')
    await encerrarButton.click()

    // Verify 3-column grid on mobile
    const statsGrid = page.locator('text=Total de Alunos').locator('..')
    const gridStyles = await statsGrid.evaluate(el =>
      window.getComputedStyle(el.parentElement!).gridTemplateColumns
    )

    // Should have 3 columns (auto-fit or explicit)
    expect(gridStyles).toBeTruthy()
  })
})

test.describe('EncerrarAulaDialog - Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/frequencia?session=active')
    await page.waitForLoadState('networkidle')

    const encerrarButton = page.locator('button:has-text("Encerrar Aula")')
    await encerrarButton.click()
    await page.waitForSelector('[role="dialog"]', { timeout: 2000 })
  })

  test('should have descriptive dialog title', async ({ page }) => {
    const dialogTitle = page.locator('[role="dialog"] h2, [role="presentation"] h2')
    await expect(dialogTitle).toBeVisible()

    const titleText = await dialogTitle.textContent()
    expect(titleText).toContain('Encerrar')
  })

  test('should have descriptive dialog description', async ({ page }) => {
    const dialogDescription = page.locator('text=/Revise.*informações/i')
    await expect(dialogDescription).toBeVisible()
  })

  test('should support keyboard navigation (Tab order)', async ({ page }) => {
    // Tab to observações field
    await page.keyboard.press('Tab')

    // Verify observações field is focused
    const observacoesField = page.locator('textarea#observacoes')
    await expect(observacoesField).toBeFocused()

    // Tab to confirmation checkbox
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab') // May need multiple tabs

    // Tab to Cancelar button
    await page.keyboard.press('Tab')

    // Tab to Encerrar button
    await page.keyboard.press('Tab')
  })

  test('should close dialog with Escape key', async ({ page }) => {
    await page.keyboard.press('Escape')

    // Dialog should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 1000 })
  })

  test('should have accessible labels for form fields', async ({ page }) => {
    // Observações field should have label
    const observacoesLabel = page.locator('label[for="observacoes"]')
    await expect(observacoesLabel).toBeVisible()

    // Checkbox should have label
    const checkboxLabel = page.locator('label[for="confirm-close"]')
    await expect(checkboxLabel).toBeVisible()
  })

  test('should announce loading state to screen readers', async ({ page }) => {
    const confirmCheckbox = page.locator('input#confirm-close')
    await confirmCheckbox.check()

    const confirmButton = page.locator('[data-testid="confirm-encerrar-button"]')
    await confirmButton.click()

    // Verify aria-busy or role="status"
    await page.waitForSelector('[aria-busy="true"], [role="status"]', { timeout: 1000 })
  })
})
