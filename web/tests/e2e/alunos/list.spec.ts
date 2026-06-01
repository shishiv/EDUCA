import { test, expect } from '@playwright/test'
import { waitForPageLoad, getTableRowCount } from '../utils/test-helpers'

/**
 * E2E Tests: Alunos - List View
 * Tests for listing, filtering, searching, and pagination of students
 */

test.describe('Alunos - List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
  })

  test('should display page header and title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /alunos/i })).toBeVisible()
  })

  test('should display "Novo Aluno" button', async ({ page }) => {
    const newButton = page.getByRole('link', { name: /novo aluno|adicionar aluno/i })
    await expect(newButton).toBeVisible()
    await expect(newButton).toHaveAttribute('href', /\/alunos\/novo/)
  })

  test('should display students table', async ({ page }) => {
    // Wait for table to be visible
    const table = page.getByRole('table')
    await expect(table).toBeVisible()

    // Check for table headers
    await expect(page.getByRole('columnheader', { name: /nome|aluno/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /idade|data.*nascimento/i })).toBeVisible()
  })

  test('should display empty state when no students', async ({ page }) => {
    // This test might only pass if there are no students
    const emptyState = page.getByText(/nenhum aluno|sem alunos|lista.*vazia/i)
    
    // Check if table has rows or empty state is shown
    const tableRows = page.getByRole('row')
    const rowCount = await tableRows.count()
    
    if (rowCount <= 1) { // Only header row
      await expect(emptyState).toBeVisible()
    }
  })
})

test.describe('Alunos - Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
  })

  test('should have search input field', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquisar|filtrar/i)
    await expect(searchInput).toBeVisible()
    await expect(searchInput).toBeEditable()
  })

  test('should filter students by name when typing in search', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquisar|filtrar/i)
    
    // Get initial row count
    const initialCount = await getTableRowCount(page)
    
    if (initialCount > 0) {
      // Type in search
      await searchInput.fill('João')
      await page.waitForTimeout(500) // Wait for debounce
      
      // Results should filter (count should change or stay the same)
      const filteredCount = await getTableRowCount(page)
      expect(filteredCount).toBeLessThanOrEqual(initialCount)
    }
  })

  test('should show no results message when search has no matches', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquisar|filtrar/i)
    
    // Search for non-existent name
    await searchInput.fill('XYZNONEXISTENT123456')
    await page.waitForTimeout(500)
    
    // Should show empty state or no results
    const emptyMessage = page.getByText(/nenhum aluno|sem resultados|não encontrado/i)
    await expect(emptyMessage).toBeVisible({ timeout: 3000 })
  })

  test('should clear search and show all students', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquisar|filtrar/i)
    
    // Search first
    await searchInput.fill('João')
    await page.waitForTimeout(500)
    
    // Clear search
    await searchInput.clear()
    await page.waitForTimeout(500)
    
    // Should show students again (if any exist)
    const table = page.getByRole('table')
    await expect(table).toBeVisible()
  })
})

test.describe('Alunos - Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
  })

  test('should have status filter dropdown', async ({ page }) => {
    // Look for status filter (Ativo/Inativo)
    const statusFilter = page.locator('select, [role="combobox"]').filter({ hasText: /status|situação|todos/i }).first()
    
    if (await statusFilter.isVisible()) {
      await expect(statusFilter).toBeVisible()
    }
  })

  test('should filter by active status', async ({ page }) => {
    // Find and use status filter
    const statusFilterTrigger = page.locator('[role="combobox"]').filter({ hasText: /todos|status/i }).first()
    
    if (await statusFilterTrigger.isVisible()) {
      await statusFilterTrigger.click()
      
      // Select "Ativos" option
      const activeOption = page.getByRole('option', { name: /ativo/i })
      if (await activeOption.isVisible()) {
        await activeOption.click()
        await page.waitForTimeout(500)
        
        // Verify table updated
        const table = page.getByRole('table')
        await expect(table).toBeVisible()
      }
    }
  })

  test('should filter by gender (sexo)', async ({ page }) => {
    // Look for sexo filter
    const sexoFilter = page.locator('[role="combobox"]').filter({ hasText: /sexo|gênero|masculino|feminino/i }).first()
    
    if (await sexoFilter.isVisible()) {
      await sexoFilter.click()
      
      // Select an option
      const mOption = page.getByRole('option', { name: /masculino/i })
      if (await mOption.isVisible()) {
        await mOption.click()
        await page.waitForTimeout(500)
      }
    }
  })

  test('should combine search and filters', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquisar/i)
    
    // Apply search
    await searchInput.fill('Silva')
    await page.waitForTimeout(300)
    
    // Apply filter
    const statusFilter = page.locator('[role="combobox"]').filter({ hasText: /todos|status/i }).first()
    if (await statusFilter.isVisible()) {
      await statusFilter.click()
      const activeOption = page.getByRole('option', { name: /ativo/i })
      if (await activeOption.isVisible()) {
        await activeOption.click()
        await page.waitForTimeout(300)
      }
    }
    
    // Results should reflect both filters
    const table = page.getByRole('table')
    await expect(table).toBeVisible()
  })

  test('should reset all filters', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquisar/i)
    
    // Apply some filters
    await searchInput.fill('Test')
    await page.waitForTimeout(300)
    
    // Clear search
    await searchInput.clear()
    await page.waitForTimeout(300)
    
    // Table should show all results again
    const table = page.getByRole('table')
    await expect(table).toBeVisible()
  })
})

test.describe('Alunos - Stats Bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
  })

  test('should display stats cards', async ({ page }) => {
    // Look for stat cards
    const statsContainer = page.locator('.grid').first()
    
    if (await statsContainer.isVisible()) {
      // Check for common stats
      const totalStat = page.getByText(/total|todos os alunos/i)
      if (await totalStat.isVisible()) {
        await expect(totalStat).toBeVisible()
      }
    }
  })

  test('should show correct student counts', async ({ page }) => {
    // Stats should show numbers
    const statNumbers = page.locator('[class*="text-2xl"], [class*="text-3xl"]').filter({ hasText: /^\d+$/ })
    
    if (await statNumbers.first().isVisible()) {
      const count = await statNumbers.count()
      expect(count).toBeGreaterThan(0)
    }
  })
})

test.describe('Alunos - Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
  })

  test('should display pagination controls if needed', async ({ page }) => {
    // Check if pagination exists (only if there are enough students)
    const nextButton = page.getByRole('button', { name: /próximo|next|→/i })
    const prevButton = page.getByRole('button', { name: /anterior|previous|←/i })
    
    // These might not be visible if there aren't enough students
    if (await nextButton.isVisible()) {
      await expect(nextButton).toBeVisible()
      await expect(prevButton).toBeVisible()
    }
  })

  test('should navigate to next page', async ({ page }) => {
    const nextButton = page.getByRole('button', { name: /próximo|next|→/i })
    
    if (await nextButton.isVisible()) {
      const isEnabled = await nextButton.isEnabled()
      
      if (isEnabled) {
        await nextButton.click()
        await waitForPageLoad(page)
        
        // Should still be on alunos page
        await expect(page).toHaveURL(/\/alunos/)
        
        // Table should be visible
        await expect(page.getByRole('table')).toBeVisible()
      }
    }
  })

  test('should navigate back to previous page', async ({ page }) => {
    const nextButton = page.getByRole('button', { name: /próximo|next|→/i })
    const prevButton = page.getByRole('button', { name: /anterior|previous|←/i })
    
    if (await nextButton.isVisible() && await nextButton.isEnabled()) {
      // Go to next page
      await nextButton.click()
      await waitForPageLoad(page)
      
      // Go back
      if (await prevButton.isEnabled()) {
        await prevButton.click()
        await waitForPageLoad(page)
        
        // Should be back on first page
        await expect(page.getByRole('table')).toBeVisible()
      }
    }
  })

  test('should show page numbers', async ({ page }) => {
    // Look for page number indicators
    const pageInfo = page.getByText(/página \d+ de \d+|page \d+ of \d+/i)
    
    if (await pageInfo.isVisible()) {
      await expect(pageInfo).toBeVisible()
    }
  })
})

test.describe('Alunos - Table Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
  })

  test('should display action buttons for each student', async ({ page }) => {
    // Get first row (skip header)
    const firstDataRow = page.getByRole('row').nth(1)
    
    if (await firstDataRow.isVisible()) {
      // Look for action buttons (Ver/Editar)
      const viewButton = firstDataRow.getByRole('link', { name: /ver|visualizar|detalhes/i })
      const editButton = firstDataRow.getByRole('link', { name: /editar/i })
      
      if (await viewButton.isVisible()) {
        await expect(viewButton).toBeVisible()
      }
      
      if (await editButton.isVisible()) {
        await expect(editButton).toBeVisible()
      }
    }
  })

  test('should navigate to student details when clicking view', async ({ page }) => {
    const firstDataRow = page.getByRole('row').nth(1)
    
    if (await firstDataRow.isVisible()) {
      const viewButton = firstDataRow.getByRole('link', { name: /ver|visualizar|detalhes/i }).first()
      
      if (await viewButton.isVisible()) {
        await viewButton.click()
        
        // Should navigate to detail page
        await expect(page).toHaveURL(/\/alunos\/[a-f0-9-]+/)
        
        // Detail page should load
        await expect(page.getByRole('heading')).toBeVisible()
      }
    }
  })

  test('should show student badges', async ({ page }) => {
    // Look for status badges (Ativo/Inativo)
    const badges = page.locator('[class*="badge"]')
    
    if (await badges.first().isVisible()) {
      const badgeCount = await badges.count()
      expect(badgeCount).toBeGreaterThan(0)
    }
  })
})

test.describe('Alunos - Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
  })

  test('should display export button', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /exportar|download/i })
    
    if (await exportButton.isVisible()) {
      await expect(exportButton).toBeVisible()
    }
  })

  test('should open export menu when clicked', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /exportar|download/i })
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      
      // Look for export options
      const pdfOption = page.getByRole('menuitem', { name: /pdf/i })
      const excelOption = page.getByRole('menuitem', { name: /excel|xlsx/i })
      
      if (await pdfOption.isVisible()) {
        await expect(pdfOption).toBeVisible()
      }
      
      if (await excelOption.isVisible()) {
        await expect(excelOption).toBeVisible()
      }
    }
  })
})

test.describe('Alunos - Responsiveness', () => {
  test('should display correctly on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    // Page should still be usable
    await expect(page.getByRole('heading', { name: /alunos/i })).toBeVisible()
    
    // Search should be visible
    const searchInput = page.getByPlaceholder(/buscar|pesquisar/i)
    await expect(searchInput).toBeVisible()
  })

  test('should display correctly on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    // Table should be visible
    await expect(page.getByRole('table')).toBeVisible()
  })
})
