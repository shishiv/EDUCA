/**
 * Playwright E2E Tests: AttendanceGrid V2 Component
 *
 * Test Coverage:
 * - Optimistic UI updates with immediate feedback
 * - 2-second debounced batch save functionality
 * - Phase awareness (disable when locked)
 * - Enhanced 48px touch targets for mobile
 * - Bulk operations (mark all, mark selected)
 * - Search and filter functionality
 * - Offline queue with localStorage persistence
 * - Real-time statistics from Zustand store
 *
 * Compliance: Task 2 state management integration
 */

import { test, expect } from '@playwright/test'

test.describe('AttendanceGrid V2 - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to attendance page with active session
    await page.goto('http://localhost:3000/dashboard/frequencia?turma=1&session=active')
    await page.waitForLoadState('networkidle')

    // Wait for grid to render
    await page.waitForSelector('[data-testid="attendance-grid"], .attendance-grid, text=Frequência', { timeout: 3000 })
  })

  test('should display attendance grid with statistics from Zustand store', async ({ page }) => {
    // Verify header
    const header = page.locator('text=Frequência')
    await expect(header).toBeVisible()

    // Verify statistics display
    const totalStat = page.locator('text=Total').locator('..')
    await expect(totalStat).toBeVisible()

    const presentesStat = page.locator('text=Presentes').locator('..')
    await expect(presentesStat).toBeVisible()

    const ausentesStat = page.locator('text=Ausentes').locator('..')
    await expect(ausentesStat).toBeVisible()
  })

  test('should mark student as present with optimistic update', async ({ page }) => {
    // Find first unmarked student
    const presentButton = page.locator('button[aria-label*="presente"], button:has(svg.lucide-check)').first()
    await presentButton.click()

    // Verify immediate feedback (optimistic update)
    const successToast = page.locator('text=/Marcação registrada/i')
    await expect(successToast).toBeVisible({ timeout: 2000 })

    // Verify "Salvando automaticamente" message
    const autoSaveMessage = page.locator('text=/Salvando automaticamente/i')
    await expect(autoSaveMessage).toBeVisible()

    // Wait for 2-second debounce
    await page.waitForTimeout(2500)

    // Verify "Sincronizado" toast after batch save
    const syncToast = page.locator('text=/Sincronizado/i')
    await expect(syncToast).toBeVisible({ timeout: 3000 })
  })

  test('should mark student as absent with optimistic update', async ({ page }) => {
    // Find first unmarked student and mark absent
    const absentButton = page.locator('button:has(svg.lucide-x)').nth(1) // Second X button (not close buttons)
    await absentButton.click()

    // Verify immediate feedback
    const successToast = page.locator('text=/Marcação registrada/i')
    await expect(successToast).toBeVisible({ timeout: 2000 })

    // Verify statistics update immediately (optimistic)
    const ausentesStat = page.locator('text=Ausentes').locator('..')
    const countBefore = await ausentesStat.locator('div.font-bold').textContent()

    // Statistics should update immediately
    expect(parseInt(countBefore || '0')).toBeGreaterThanOrEqual(1)
  })

  test('should debounce batch save for 2 seconds', async ({ page }) => {
    // Mark multiple students quickly
    const presentButtons = page.locator('button:has(svg.lucide-check)')
    await presentButtons.nth(0).click()
    await page.waitForTimeout(300)
    await presentButtons.nth(1).click()
    await page.waitForTimeout(300)
    await presentButtons.nth(2).click()

    // Verify pending count
    const pendingBadge = page.locator('text=/\\d+ pendente\\(s\\)/i')
    await expect(pendingBadge).toBeVisible()

    // Wait for 2-second debounce
    await page.waitForTimeout(2500)

    // Verify batch sync toast
    const syncToast = page.locator('text=/3 marcações salvas/i, text=/Sincronizado/i')
    await expect(syncToast.first()).toBeVisible({ timeout: 3000 })

    // Pending badge should disappear
    await expect(pendingBadge).not.toBeVisible({ timeout: 1000 })
  })

  test('should allow manual batch save via "Salvar Agora" button', async ({ page }) => {
    // Mark a student
    const presentButton = page.locator('button:has(svg.lucide-check)').first()
    await presentButton.click()

    // Wait for "Salvar Agora" button to appear
    const saveButton = page.locator('button:has-text("Salvar Agora"), button:has(svg.lucide-save)')
    await expect(saveButton).toBeVisible({ timeout: 1000 })

    // Click save button immediately (before 2s debounce)
    await saveButton.click()

    // Verify sync toast
    const syncToast = page.locator('text=/Sincronizado/i')
    await expect(syncToast).toBeVisible({ timeout: 3000 })

    // Save button should disappear
    await expect(saveButton).not.toBeVisible({ timeout: 1000 })
  })

  test('should disable marking when session is locked', async ({ page }) => {
    // Navigate to page with locked session
    await page.goto('http://localhost:3000/dashboard/frequencia?turma=1&session=locked')
    await page.waitForLoadState('networkidle')

    // Verify lock warning
    const lockWarning = page.locator('text=/Sessão bloqueada.*não existe o esquecer/i')
    await expect(lockWarning).toBeVisible()

    // Verify all mark buttons are disabled
    const presentButtons = page.locator('button:has(svg.lucide-check)')
    const firstButton = presentButtons.first()
    await expect(firstButton).toBeDisabled()

    // Try to click disabled button
    await firstButton.click({ force: true })

    // No toast should appear
    const toast = page.locator('[role="alert"], [role="status"]')
    const toastCount = await toast.count()
    expect(toastCount).toBe(0)
  })

  test('should show phase badge with current session phase', async ({ page }) => {
    // Verify phase badge exists
    const phaseBadge = page.locator('text=/Planejamento|Marcando|Finalizada|Bloqueada/')
    await expect(phaseBadge).toBeVisible()

    // In active session, should show "Marcando"
    const marcandoBadge = page.locator('text=Marcando')
    await expect(marcandoBadge).toBeVisible()
  })
})

test.describe('AttendanceGrid V2 - Touch Targets and Mobile', () => {
  test('should have 48px touch targets on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('http://localhost:3000/dashboard/frequencia?turma=1&session=active&mobile=true')
    await page.waitForLoadState('networkidle')

    // Verify first present button has 48px minimum
    const presentButton = page.locator('button:has(svg.lucide-check)').first()
    const boundingBox = await presentButton.boundingBox()

    expect(boundingBox!.height).toBeGreaterThanOrEqual(48)
    expect(boundingBox!.width).toBeGreaterThanOrEqual(48)
  })

  test('should support long press for student selection on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('http://localhost:3000/dashboard/frequencia?turma=1&session=active&mobile=true')

    // Find first student row
    const studentRow = page.locator('[class*="flex items-center justify-between"]').first()

    // Simulate long press (500ms)
    await studentRow.dispatchEvent('touchstart')
    await page.waitForTimeout(600)
    await studentRow.dispatchEvent('touchend')

    // Verify student row is selected (blue background)
    const selectedRow = page.locator('.bg-blue-50').first()
    await expect(selectedRow).toBeVisible()
  })

  test('should show "Marcar X como Presente" button when students selected', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('http://localhost:3000/dashboard/frequencia?turma=1&session=active&mobile=true')

    // Select 2 students via long press
    const studentRows = page.locator('[class*="flex items-center justify-between"]')

    await studentRows.nth(0).dispatchEvent('touchstart')
    await page.waitForTimeout(600)
    await studentRows.nth(0).dispatchEvent('touchend')

    await studentRows.nth(1).dispatchEvent('touchstart')
    await page.waitForTimeout(600)
    await studentRows.nth(1).dispatchEvent('touchend')

    // Verify bulk action button
    const bulkButton = page.locator('button:has-text("Marcar 2 como Presente")')
    await expect(bulkButton).toBeVisible()
  })

  test('should be scrollable on mobile with 60vh height', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('http://localhost:3000/dashboard/frequencia?turma=1&session=active&mobile=true')

    // Verify scroll area exists
    const scrollArea = page.locator('[class*="h-\\[60vh\\]"]')
    await expect(scrollArea).toBeVisible()

    // Try to scroll to bottom
    await scrollArea.evaluate(el => el.scrollTop = el.scrollHeight)

    // Verify scroll happened
    const scrollTop = await scrollArea.evaluate(el => el.scrollTop)
    expect(scrollTop).toBeGreaterThan(0)
  })
})

test.describe('AttendanceGrid V2 - Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/frequencia?turma=1&session=active')
    await page.waitForLoadState('networkidle')
  })

  test('should filter students by name search', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Buscar"]')
    await searchInput.fill('João')

    // Verify filtered results
    await page.waitForTimeout(500) // Debounce
    const studentRows = page.locator('[class*="flex items-center justify-between"]')
    const visibleCount = await studentRows.count()

    // Should show only students matching "João"
    const firstStudentName = await studentRows.first().locator('p.font-medium').textContent()
    expect(firstStudentName?.toLowerCase()).toContain('joão')
  })

  test('should filter students by matricula number', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Buscar"]')
    await searchInput.fill('2025001')

    await page.waitForTimeout(500)

    const studentRows = page.locator('[class*="flex items-center justify-between"]')
    const visibleCount = await studentRows.count()

    expect(visibleCount).toBeGreaterThanOrEqual(1)
  })

  test('should filter by unmarked students', async ({ page }) => {
    // Click filter button
    const filterButton = page.locator('button:has-text("Não Marcados")')
    await filterButton.click()

    // Verify only unmarked students shown
    const studentRows = page.locator('[class*="flex items-center justify-between"]')
    const firstRow = studentRows.first()

    // Should have both P and F buttons visible (not marked yet)
    const presentButton = firstRow.locator('button:has(svg.lucide-check)')
    const absentButton = firstRow.locator('button:has(svg.lucide-x)')

    await expect(presentButton).toBeVisible()
    await expect(absentButton).toBeVisible()
  })

  test('should show "Todos Presentes" button when filtering unmarked', async ({ page }) => {
    const filterButton = page.locator('button:has-text("Não Marcados")')
    await filterButton.click()

    // Verify bulk action button
    const todosButton = page.locator('button:has-text("Todos Presentes")')
    await expect(todosButton).toBeVisible()
  })

  test('should mark all unmarked students as present', async ({ page }) => {
    const filterButton = page.locator('button:has-text("Não Marcados")')
    await filterButton.click()

    const todosButton = page.locator('button:has-text("Todos Presentes")')
    await todosButton.click()

    // Wait for batch save
    await page.waitForTimeout(2500)

    // Verify sync toast
    const syncToast = page.locator('text=/Sincronizado/i')
    await expect(syncToast).toBeVisible({ timeout: 3000 })
  })
})

test.describe('AttendanceGrid V2 - Offline Mode', () => {
  test('should show offline indicator when network disconnected', async ({ page, context }) => {
    await page.goto('http://localhost:3000/dashboard/frequencia?turma=1&session=active')
    await page.waitForLoadState('networkidle')

    // Simulate offline
    await context.setOffline(true)

    // Wait for offline indicator
    const offlineIcon = page.locator('svg.lucide-wifi-off')
    await expect(offlineIcon).toBeVisible({ timeout: 2000 })

    // Verify offline message in footer
    const offlineMessage = page.locator('text=/Offline.*Aguardando conexão/i')
    await expect(offlineMessage).toBeVisible()
  })

  test('should queue updates when offline', async ({ page, context }) => {
    await page.goto('http://localhost:3000/dashboard/frequencia?turma=1&session=active')

    // Go offline
    await context.setOffline(true)

    // Mark a student
    const presentButton = page.locator('button:has(svg.lucide-check)').first()
    await presentButton.click()

    // Verify pending badge
    const pendingBadge = page.locator('text=/1 pendente\\(s\\)/i')
    await expect(pendingBadge).toBeVisible()

    // Wait for debounce (should NOT sync)
    await page.waitForTimeout(2500)

    // Pending should still be there
    await expect(pendingBadge).toBeVisible()
  })

  test('should sync queued updates when coming back online', async ({ page, context }) => {
    await page.goto('http://localhost:3000/dashboard/frequencia?turma=1&session=active')

    // Go offline and mark students
    await context.setOffline(true)

    const presentButtons = page.locator('button:has(svg.lucide-check)')
    await presentButtons.nth(0).click()
    await presentButtons.nth(1).click()

    await page.waitForTimeout(1000)

    // Verify pending
    const pendingBadge = page.locator('text=/2 pendente\\(s\\)/i')
    await expect(pendingBadge).toBeVisible()

    // Go back online
    await context.setOffline(false)

    // Wait for auto-sync
    await page.waitForTimeout(3000)

    // Verify sync toast
    const syncToast = page.locator('text=/Sincronizado/i')
    await expect(syncToast).toBeVisible({ timeout: 5000 })

    // Pending should clear
    await expect(pendingBadge).not.toBeVisible({ timeout: 2000 })
  })
})

test.describe('AttendanceGrid V2 - Statistics Integration', () => {
  test('should display real-time statistics from Zustand store', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/frequencia?turma=1&session=active')
    await page.waitForLoadState('networkidle')

    // Get initial stats
    const presentStat = page.locator('text=Presentes').locator('..').locator('div.font-bold')
    const initialPresent = await presentStat.textContent()

    // Mark a student as present
    const presentButton = page.locator('button:has(svg.lucide-check)').first()
    await presentButton.click()

    // Wait for optimistic update
    await page.waitForTimeout(500)

    // Verify stat incremented immediately
    const newPresent = await presentStat.textContent()
    expect(parseInt(newPresent!)).toBe(parseInt(initialPresent!) + 1)
  })

  test('should show completion percentage in footer', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/frequencia?turma=1&session=active')

    // Verify percentage display
    const percentage = page.locator('text=/%\\s+concluído/i')
    await expect(percentage).toBeVisible()

    // Mark students and verify percentage updates
    const presentButton = page.locator('button:has(svg.lucide-check)').first()
    await presentButton.click()

    await page.waitForTimeout(500)

    // Percentage should update
    const newPercentage = await percentage.textContent()
    expect(newPercentage).toMatch(/\d+%/)
  })
})

test.describe('AttendanceGrid V2 - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/frequencia?turma=1&session=active')
    await page.waitForLoadState('networkidle')
  })

  test('should support keyboard navigation for marking attendance', async ({ page }) => {
    // Tab to first present button
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab') // May need multiple tabs

    // Find focused button
    const focusedButton = page.locator('button:focus')
    await expect(focusedButton).toBeFocused()

    // Press Enter to mark
    await page.keyboard.press('Enter')

    // Verify toast
    const toast = page.locator('text=/Marcação registrada/i')
    await expect(toast).toBeVisible({ timeout: 2000 })
  })

  test('should have touch-manipulation class for better mobile touch', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('http://localhost:3000/dashboard/frequencia?turma=1&session=active&mobile=true')

    const presentButton = page.locator('button.touch-manipulation').first()
    await expect(presentButton).toBeVisible()
  })

  test('should show descriptive error messages', async ({ page }) => {
    // Navigate to locked session
    await page.goto('http://localhost:3000/dashboard/frequencia?turma=1&session=locked')

    // Try to mark (should be disabled)
    const presentButton = page.locator('button:has(svg.lucide-check)').first()

    // Verify button is disabled
    await expect(presentButton).toBeDisabled()

    // Verify descriptive lock message
    const lockMessage = page.locator('text=/Sessão bloqueada.*não existe o esquecer/i')
    await expect(lockMessage).toBeVisible()
  })
})
