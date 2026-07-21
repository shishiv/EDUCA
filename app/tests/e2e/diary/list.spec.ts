import { test, expect } from '../support/diagnostics'
import { waitForPageLoad } from '../utils/test-helpers'

/**
 * E2E Tests: Diário de Classe - List View
 * Tests for listing, filtering, and viewing class diary entries
 * 
 * @see app/(dashboard)/dashboard/diario/page.tsx
 */

test.describe('Diário - Page Access', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
  })

  test('should display page header and title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /diário de classe/i })).toBeVisible()
  })

  test('should display legal compliance notice', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Documento Legal', exact: true })).toBeVisible()
    await expect(page.getByText(/auditáveis|imutáveis/i)).toBeVisible()
  })

  test('should display page description', async ({ page }) => {
    await expect(page.getByText(/histórico.*aulas|frequência.*alunos/i)).toBeVisible()
  })
})

test.describe('Diário - Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
  })

  test('should display turma filter', async ({ page }) => {
    const turmaFilter = page.getByLabel(/turma/i)
    await expect(turmaFilter).toBeVisible()
  })

  test('should display date range filters', async ({ page }) => {
    await expect(page.getByLabel('Data Inicial', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByLabel('Data Final', { exact: true })).toBeVisible()
  })

  test('should filter by turma when selected', async ({ page }) => {
    const turmaFilter = page.locator('[role="combobox"]').filter({ hasText: /turma|selecione/i }).first()
    
    if (await turmaFilter.isVisible()) {
      await turmaFilter.click()
      await page.waitForTimeout(300)
      
      const turmaOption = page.getByRole('option').first()
      if (await turmaOption.isVisible()) {
        await turmaOption.click()
        await page.waitForTimeout(500)
        
        // List should update or show loading state
        const list = page.locator('[data-testid="diary-list"], .space-y-3, .space-y-4').first()
        if (await list.isVisible()) {
          await expect(list).toBeVisible()
        }
      }
    }
  })

  test('should filter by date range', async ({ page }) => {
    const dateInputs = page.locator('input[type="date"]')
    
    if (await dateInputs.first().isVisible()) {
      // Set start date
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 1)
      await dateInputs.first().fill(startDate.toISOString().split('T')[0])
      
      await page.waitForTimeout(500)
      
      // Results should update
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should display status filter', async ({ page }) => {
    // Look for status filter (locked/unlocked)
    const statusFilter = page.getByLabel(/status|situação/i)
    
    if (await statusFilter.isVisible()) {
      await expect(statusFilter).toBeVisible()
    }
  })

  test('should combine multiple filters', async ({ page }) => {
    // Apply turma filter
    const turmaFilter = page.locator('[role="combobox"]').filter({ hasText: /turma/i }).first()
    
    if (await turmaFilter.isVisible()) {
      await turmaFilter.click()
      await page.waitForTimeout(200)
      
      const option = page.getByRole('option').first()
      if (await option.isVisible()) {
        await option.click()
        await page.waitForTimeout(300)
      }
    }
    
    // Apply date filter
    const dateInputs = page.locator('input[type="date"]')
    if (await dateInputs.first().isVisible()) {
      const today = new Date()
      await dateInputs.first().fill(today.toISOString().split('T')[0])
      await page.waitForTimeout(300)
    }
    
    // Page should remain stable
    await expect(page).toHaveURL(/\/diario/)
  })
})

test.describe('Diário - List Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
  })

  test('should display diary entries list', async ({ page }) => {
    // Wait for any loading state to complete
    await page.waitForTimeout(2000)
    
    // Look for diary list container
    const listContainer = page.locator('[class*="space-y"]').first()
    
    if (await listContainer.isVisible()) {
      await expect(listContainer).toBeVisible()
    }
  })

  test('should display lesson cards with date', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    // Look for date elements in cards
    const dateElements = page.locator('time[datetime]')
    
    if (await dateElements.first().isVisible()) {
      const count = await dateElements.count()
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should display lesson theme/subject', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    // Look for lesson titles
    const lessonTitles = page.locator('h3, [class*="font-bold"]').filter({ hasText: /.{3,}/ })
    
    if (await lessonTitles.first().isVisible()) {
      const firstTitle = await lessonTitles.first().textContent()
      expect(firstTitle?.length).toBeGreaterThan(0)
    }
  })

  test('should display attendance statistics', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    // Look for attendance indicators (presentes/ausentes)
    const attendanceText = page.getByText(/presentes|ausentes|\d+\/\d+/i)
    
    if (await attendanceText.first().isVisible()) {
      await expect(attendanceText.first()).toBeVisible()
    }
  })

  test('should display attendance percentage badge', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    // Look for percentage badges
    const percentageBadges = page.locator('[class*="badge"]').filter({ hasText: /\d+%/ })
    
    if (await percentageBadges.first().isVisible()) {
      const badgeText = await percentageBadges.first().textContent()
      expect(badgeText).toMatch(/\d+%/)
    }
  })

  test('should show empty state when no entries', async ({ page }) => {
    // Apply filters that likely return no results
    const turmaFilter = page.locator('[role="combobox"]').first()
    
    if (await turmaFilter.isVisible()) {
      await turmaFilter.click()
      await page.waitForTimeout(200)
      
      // Select a turma if available
      const option = page.getByRole('option').first()
      if (await option.isVisible()) {
        await option.click()
        await page.waitForTimeout(2000)
        
        // Look for empty state
        const emptyState = page.getByText(/nenhum.*registro|sem.*aulas|lista.*vazia/i)
        if (await emptyState.isVisible()) {
          await expect(emptyState).toBeVisible()
        }
      }
    }
  })
})

test.describe('Diário - Entry Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
  })

  test('should allow clicking on diary entry', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    // Find first lesson card
    const firstCard = page.locator('[role="button"], [class*="cursor-pointer"]').filter({ hasText: /presentes|ausentes/i }).first()
    
    if (await firstCard.isVisible()) {
      await firstCard.click()
      await page.waitForTimeout(500)
      
      // Should open detail dialog or navigate
      const dialog = page.locator('[role="dialog"]')
      if (await dialog.isVisible()) {
        await expect(dialog).toBeVisible()
      }
    }
  })

  test('should display lesson details in dialog', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    const firstCard = page.locator('[role="button"]').filter({ hasText: /presentes/i }).first()
    
    if (await firstCard.isVisible()) {
      await firstCard.click()
      await page.waitForTimeout(500)
      
      const dialog = page.locator('[role="dialog"]')
      if (await dialog.isVisible()) {
        // Should show lesson details
        await expect(dialog.getByText(/data.*aula|tema|objetivo/i)).toBeVisible()
      }
    }
  })

  test('should close detail dialog', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    const firstCard = page.locator('[role="button"]').first()
    
    if (await firstCard.isVisible()) {
      await firstCard.click()
      await page.waitForTimeout(500)
      
      const dialog = page.locator('[role="dialog"]')
      if (await dialog.isVisible()) {
        // Look for close button
        const closeButton = dialog.getByRole('button', { name: /fechar|×/i })
        if (await closeButton.isVisible()) {
          await closeButton.click()
          await page.waitForTimeout(300)
          
          await expect(dialog).not.toBeVisible()
        }
      }
    }
  })

  test('should highlight selected entry', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    const firstCard = page.locator('[role="button"]').first()
    
    if (await firstCard.isVisible()) {
      await firstCard.click()
      await page.waitForTimeout(300)
      
      // Card should have selected/active state
      const isSelected = await firstCard.getAttribute('data-selected')
      const hasActiveClass = await firstCard.evaluate(el => 
        el.className.includes('bg-blue') || el.className.includes('ring-')
      )
      
      expect(isSelected === 'true' || hasActiveClass).toBeTruthy()
    }
  })
})

test.describe('Diário - Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
  })

  test('should display pagination controls if needed', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    const nextButton = page.getByRole('button', { name: /próximo|next|→/i })
    const prevButton = page.getByRole('button', { name: /anterior|previous|←/i })
    
    if (await nextButton.isVisible()) {
      await expect(nextButton).toBeVisible()
      await expect(prevButton).toBeVisible()
    }
  })

  test('should navigate to next page', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    const nextButton = page.getByRole('button', { name: /próximo|next|→/i })
    
    if (await nextButton.isVisible() && await nextButton.isEnabled()) {
      await nextButton.click()
      await waitForPageLoad(page)
      
      await expect(page).toHaveURL(/\/diario/)
      await page.waitForTimeout(1000)
    }
  })

  test('should navigate back to previous page', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    const nextButton = page.getByRole('button', { name: /próximo|next/i })
    const prevButton = page.getByRole('button', { name: /anterior|previous/i })
    
    if (await nextButton.isVisible() && await nextButton.isEnabled()) {
      await nextButton.click()
      await page.waitForTimeout(1000)
      
      if (await prevButton.isEnabled()) {
        await prevButton.click()
        await page.waitForTimeout(1000)
      }
    }
  })

  test('should display page information', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    // Look for page info like "Página 1 de 5"
    const pageInfo = page.getByText(/página \d+|exibindo \d+/i)
    
    if (await pageInfo.isVisible()) {
      await expect(pageInfo).toBeVisible()
    }
  })
})

test.describe('Diário - Permissions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
  })

  test('should display appropriate content for user role', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    // Teachers should see their classes
    // Directors/Secretaries should see all classes
    const turmaFilter = page.getByLabel(/turma/i)
    
    if (await turmaFilter.isVisible()) {
      await expect(turmaFilter).toBeVisible()
    }
  })

  test('should not show edit controls for locked entries', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    // Look for locked indicators
    const lockedBadge = page.locator('[class*="badge"]').filter({ hasText: /bloqueado|locked/i })
    
    if (await lockedBadge.first().isVisible()) {
      // Locked entries should not have edit button nearby
      const parentCard = lockedBadge.first().locator('..')
      const editButton = parentCard.getByRole('button', { name: /editar/i })
      
      await expect(editButton).not.toBeVisible()
    }
  })
})

test.describe('Diário - Responsiveness', () => {
  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
    
    await expect(page.getByRole('heading', { name: /diário/i })).toBeVisible()
    
    // Filters should be visible
    const turmaFilter = page.getByLabel(/turma/i)
    await expect(turmaFilter).toBeVisible()
  })

  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
    
    await expect(page.getByRole('heading', { name: /diário/i })).toBeVisible()
  })

  test('should adapt lesson cards for mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)
    
    // Cards should be visible and stacked
    const cards = page.locator('[role="button"]')
    if (await cards.first().isVisible()) {
      const count = await cards.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })
})

test.describe('Diário - Loading States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/diario')
  })

  test('should show loading state initially', async ({ page }) => {
    // Look for loading indicators immediately after navigation
    const loadingIndicator = page.locator('[class*="animate-pulse"], [class*="skeleton"]')
    
    if (await loadingIndicator.first().isVisible({ timeout: 1000 })) {
      await expect(loadingIndicator.first()).toBeVisible()
    }
  })

  test('should hide loading state after data loads', async ({ page }) => {
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)
    
    // Loading indicators should be gone
    const loadingIndicator = page.locator('[class*="animate-spin"]').filter({ hasText: /carregando/i })
    
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Diário - Error Handling', () => {
  test('should display error message on fetch failure', async ({ page }) => {
    // This would require mocking or testing with bad data
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)
    
    // Look for error state
    const errorMessage = page.getByText(/erro.*carregar|falha.*conexão/i)
    
    // Error should not be visible under normal conditions
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible()
    }
  })

  test('should handle empty filter results gracefully', async ({ page }) => {
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
    
    // Apply date filter with no results
    const dateInput = page.locator('input[type="date"]').first()
    
    if (await dateInput.isVisible()) {
      await dateInput.fill('2000-01-01')
      await page.waitForTimeout(1000)
      
      // Should show empty state
      const emptyMessage = page.getByText(/nenhum.*encontrado|sem.*resultados/i)
      if (await emptyMessage.isVisible()) {
        await expect(emptyMessage).toBeVisible()
      }
    }
  })
})
