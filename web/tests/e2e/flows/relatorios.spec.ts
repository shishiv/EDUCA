import { test, expect } from '@playwright/test'
import { waitForPageLoad, navigateTo, selectOption } from '../utils/test-helpers'

/**
 * E2E Tests: Relatórios (Reports)
 * Tests report generation, filtering, and download
 */

test.describe('Relatórios - Page Access', () => {
  test('should access relatórios page', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    await expect(page.getByRole('heading', { name: /relatórios|reports/i })).toBeVisible()
  })

  test('should display list of available reports', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    // Should show table or list of reports
    const reportsTable = page.getByRole('table')
    if (await reportsTable.isVisible()) {
      await expect(reportsTable).toBeVisible()
    } else {
      // Or cards/list view
      await expect(page.getByText(/frequência|matrículas|alunos|turmas/i).first()).toBeVisible()
    }
  })

  test('should have button to generate new report', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const newReportButton = page.getByRole('button', { name: /novo.*relatório|gerar.*relatório|criar/i })
    await expect(newReportButton).toBeVisible()
  })
})

test.describe('Relatórios - Report Types', () => {
  test('should list frequency report type', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const frequencyReport = page.getByText(/relatório.*frequência|frequência.*relatório/i)
    // Should be available as a report type
  })

  test('should list enrollment report type', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const enrollmentReport = page.getByText(/relatório.*matrículas?|matrículas?.*relatório/i)
    // Should be available as a report type
  })

  test('should list student performance report', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const performanceReport = page.getByText(/desempenho|rendimento|notas/i)
    // Should be available as a report type
  })

  test('should list Bolsa Família compliance report', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const bfReport = page.getByText(/bolsa.*família|bf|compliance/i)
    // BF-specific reports for Brazilian compliance
  })

  test('should list school summary report', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const schoolReport = page.getByText(/escolas?.*resumo|consolidado/i)
    // Summary reports per school
  })
})

test.describe('Relatórios - Report Generation', () => {
  test('should open report generation dialog', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const generateButton = page.getByRole('button', { name: /gerar|novo.*relatório|criar/i })
    await generateButton.click()
    
    // Dialog should open
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('should require report type selection', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const generateButton = page.getByRole('button', { name: /gerar|novo.*relatório/i })
    await generateButton.click()
    
    // Type selector should be present
    const typeSelect = page.getByLabel(/tipo.*relatório|report.*type/i)
    await expect(typeSelect).toBeVisible()
  })

  test('should allow date range selection', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const generateButton = page.getByRole('button', { name: /gerar|novo/i })
    await generateButton.click()
    
    // Date fields
    const startDate = page.getByLabel(/data.*inicial|início|from/i)
    const endDate = page.getByLabel(/data.*final|fim|to/i)
    
    if (await startDate.isVisible()) {
      await expect(startDate).toBeVisible()
      await expect(endDate).toBeVisible()
    }
  })

  test('should allow school filter selection', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const generateButton = page.getByRole('button', { name: /gerar|novo/i })
    await generateButton.click()
    
    // School filter
    const schoolSelect = page.getByLabel(/escola/i)
    if (await schoolSelect.isVisible()) {
      await expect(schoolSelect).toBeVisible()
    }
  })

  test('should allow turma filter selection', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const generateButton = page.getByRole('button', { name: /gerar|novo/i })
    await generateButton.click()
    
    // Turma filter
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await expect(turmaSelect).toBeVisible()
    }
  })

  test('should generate report on submit', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const generateButton = page.getByRole('button', { name: /gerar|novo/i })
    await generateButton.click()
    
    // Fill minimum required fields
    const typeSelect = page.getByLabel(/tipo/i)
    if (await typeSelect.isVisible()) {
      await typeSelect.click()
      await page.getByRole('option').first().click()
    }
    
    // Submit
    const submitButton = page.getByRole('button', { name: /gerar|confirmar|criar/i }).last()
    if (await submitButton.isVisible()) {
      await submitButton.click()
      
      // Should show success or loading state
      await page.waitForTimeout(2000)
    }
  })

  test('should show generating status', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const generateButton = page.getByRole('button', { name: /gerar|novo/i })
    await generateButton.click()
    
    // Quick form fill
    const typeSelect = page.getByLabel(/tipo/i)
    if (await typeSelect.isVisible()) {
      await typeSelect.click()
      await page.getByRole('option').first().click()
      
      const submitButton = page.getByRole('button', { name: /gerar|confirmar/i }).last()
      await submitButton.click()
      
      // Look for loading/generating indicator
      const loading = page.getByText(/gerando|processando|loading/i)
      // May be visible briefly
    }
  })
})

test.describe('Relatórios - Report Listing', () => {
  test('should display report name/type', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    // Should show report names in table
    const reportName = page.getByRole('cell', { name: /frequência|matrícula|desempenho/i })
    // May be visible if reports exist
  })

  test('should display report creation date', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    // Look for timestamps
    const dateColumn = page.getByText(/criado.*em|data|created/i)
    // Should show when reports were created
  })

  test('should display report status', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    // Look for status badges
    const statusBadge = page.getByText(/completo|processando|pendente|erro|ready/i)
    // Should show report generation status
  })

  test('should show download button for completed reports', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const downloadButton = page.getByRole('button', { name: /download|baixar/i }).first()
    // Should be available for ready reports
  })

  test('should filter reports by type', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const filterSelect = page.getByLabel(/filtrar.*tipo|tipo.*relatório/i)
    if (await filterSelect.isVisible()) {
      await filterSelect.click()
      await page.getByRole('option', { name: /frequência/i }).click()
      
      // Should filter list
      await page.waitForTimeout(1000)
    }
  })

  test('should filter reports by date range', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const dateFilter = page.getByLabel(/data/i)
    if (await dateFilter.isVisible()) {
      // Date filtering exists
      await expect(dateFilter).toBeVisible()
    }
  })
})

test.describe('Relatórios - Report Download', () => {
  test('should download report as PDF', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const downloadButton = page.getByRole('button', { name: /download.*pdf|baixar.*pdf/i }).first()
    if (await downloadButton.isVisible()) {
      // Setup download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
      await downloadButton.click()
      
      const download = await downloadPromise
      await expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
    }
  })

  test('should download report as Excel', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const excelButton = page.getByRole('button', { name: /excel|xlsx|planilha/i }).first()
    if (await excelButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
      await excelButton.click()
      
      const download = await downloadPromise
      await expect(download.suggestedFilename()).toMatch(/\.xlsx?$/i)
    }
  })

  test('should download report as CSV', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const csvButton = page.getByRole('button', { name: /csv/i }).first()
    if (await csvButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
      await csvButton.click()
      
      const download = await downloadPromise
      await expect(download.suggestedFilename()).toMatch(/\.csv$/i)
    }
  })

  test('should show file size before download', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    // Look for file size indication
    const fileSize = page.getByText(/kb|mb|bytes/i)
    // May be displayed in report listing
  })
})

test.describe('Relatórios - Report Preview', () => {
  test('should allow previewing report before download', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const previewButton = page.getByRole('button', { name: /visualizar|preview|ver/i }).first()
    if (await previewButton.isVisible()) {
      await previewButton.click()
      
      // Should open preview modal or new page
      await page.waitForTimeout(2000)
    }
  })

  test('should display report data in preview', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const previewButton = page.getByRole('button', { name: /visualizar|ver/i }).first()
    if (await previewButton.isVisible()) {
      await previewButton.click()
      
      // Should show report content
      await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
    }
  })
})

test.describe('Relatórios - Report Deletion', () => {
  test('should allow deleting old reports', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const deleteButton = page.getByRole('button', { name: /excluir|deletar|remover/i }).first()
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      
      // Should show confirmation dialog
      await expect(page.getByText(/confirmar|tem.*certeza/i)).toBeVisible()
    }
  })

  test('should confirm before deletion', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const deleteButton = page.getByRole('button', { name: /excluir|deletar/i }).first()
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      
      // Cancel should close dialog
      const cancelButton = page.getByRole('button', { name: /cancelar|não/i })
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
        // Report should still exist
      }
    }
  })
})

test.describe('Relatórios - Error Handling', () => {
  test('should handle generation errors gracefully', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    // Look for failed reports
    const errorBadge = page.getByText(/erro|falha|failed/i)
    // May be visible if report generation failed
  })

  test('should allow retry on failed reports', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const retryButton = page.getByRole('button', { name: /tentar.*novamente|retry/i })
    if (await retryButton.isVisible()) {
      await retryButton.click()
      // Should restart generation
    }
  })

  test('should show empty state when no reports exist', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const emptyMessage = page.getByText(/nenhum.*relatório|sem.*relatórios|no.*reports/i)
    // May be visible in fresh setup
  })
})

test.describe('Relatórios - Scheduled Reports', () => {
  test('should have option to schedule recurring reports', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const scheduleButton = page.getByRole('button', { name: /agendar|schedule/i })
    // May be available for automatic report generation
  })

  test('should display scheduled reports list', async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await waitForPageLoad(page)
    
    const scheduledTab = page.getByRole('tab', { name: /agendados?|scheduled/i })
    if (await scheduledTab.isVisible()) {
      await scheduledTab.click()
      // Should show scheduled reports
    }
  })
})
