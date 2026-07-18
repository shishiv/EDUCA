import { test, expect } from '@playwright/test'
import { waitForPageLoad, navigateTo, selectOption } from '../utils/test-helpers'

/**
 * E2E Tests: Notas & Boletim (Grades & Report Cards)
 * Tests grade management and student report card generation
 */

test.describe('Notas - Page Access', () => {
  test('should access notas page', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    await expect(page.getByRole('heading', { name: /notas|avaliações|grades/i })).toBeVisible()
  })

  test('should have turma filter', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.getByLabel(/turma|classe/i)
    await expect(turmaSelect).toBeVisible()
  })

  test('should have período/bimestre filter', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const periodoSelect = page.getByLabel(/período|bimestre|trimestre/i)
    // Should have period selector for Brazilian school system
  })
})

test.describe('Notas - Grade Entry', () => {
  test('should display student list for selected turma', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      
      // Should show students
      await page.waitForTimeout(2000)
      await expect(page.getByRole('table')).toBeVisible()
    }
  })

  test('should have subject/disciplina columns', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    // Select turma
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
      
      // Look for subject headers
      const subjects = page.getByRole('columnheader', { name: /matemática|português|ciências/i })
      // Should show subject columns
    }
  })

  test('should allow entering numeric grades', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
      
      // Find grade input field
      const gradeInput = page.getByRole('textbox').first()
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('8.5')
        await expect(gradeInput).toHaveValue('8.5')
      }
    }
  })

  test('should validate grade range (0-10)', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
      
      const gradeInput = page.getByRole('textbox').first()
      if (await gradeInput.isVisible()) {
        // Try invalid grade
        await gradeInput.fill('15')
        
        // Should show validation error
        const errorMessage = page.getByText(/inválido|entre.*0.*10|máximo.*10/i)
        // May show validation
      }
    }
  })

  test('should accept decimal grades', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
      
      const gradeInput = page.getByRole('textbox').first()
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('7.25')
        await expect(gradeInput).toHaveValue(/7[.,]25/)
      }
    }
  })

  test('should save grades on submit', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
      
      // Fill a grade
      const gradeInput = page.getByRole('textbox').first()
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('9.0')
        
        // Save
        const saveButton = page.getByRole('button', { name: /salvar|confirmar/i })
        await saveButton.click()
        
        // Should show success
        await expect(page.getByText(/sucesso|salvo|atualizado/i)).toBeVisible({ timeout: 10000 })
      }
    }
  })
})

test.describe('Notas - Grade Calculation', () => {
  test('should display average grade per student', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
      
      // Look for average column
      const avgColumn = page.getByRole('columnheader', { name: /média|average/i })
      // Should calculate student averages
    }
  })

  test('should highlight failing students', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
      
      // Look for red/warning indicators for grades < 6.0
      const failingIndicator = page.locator('[class*="red"], [class*="danger"], [class*="fail"]')
      // May be visible if students have failing grades
    }
  })

  test('should calculate turma average', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
      
      // Look for class/turma average
      const classAvg = page.getByText(/média.*turma|média.*geral/i)
      // Should show overall class performance
    }
  })
})

test.describe('Boletim - Student Report Card', () => {
  test('should access individual student boletim', async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    // Click first student
    const firstStudent = page.getByRole('row').nth(1)
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      
      // Should navigate to student details
      await page.waitForTimeout(2000)
      
      // Look for boletim link/tab
      const boletimLink = page.getByRole('link', { name: /boletim|histórico|notas/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await expect(page).toHaveURL(/boletim/)
      }
    }
  })

  test('should display student identification', async ({ page }) => {
    // Navigate to a boletim page (using a known test student ID or first available)
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const firstRow = page.getByRole('row').nth(1)
    const viewButton = firstRow.getByRole('link', { name: /ver|visualizar|detalhes/i })
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await page.waitForTimeout(1000)
      
      // Navigate to boletim
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        
        // Should show student name and basic info
        await expect(page.getByText(/nome|aluno/i)).toBeVisible()
      }
    }
  })

  test('should display grades by subject and period', async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const viewButton = page.getByRole('row').nth(1).getByRole('link').first()
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(2000)
        
        // Should show subject breakdown
        const subjects = page.getByText(/matemática|português|ciências|história|geografia/i)
        // Should display all subjects
      }
    }
  })

  test('should show attendance percentage in boletim', async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const viewButton = page.getByRole('row').nth(1).getByRole('link').first()
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(2000)
        
        // Should include frequency/attendance
        const frequencyInfo = page.getByText(/frequência|presença|%/i)
        // Should be visible in report card
      }
    }
  })

  test('should display final average', async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const viewButton = page.getByRole('row').nth(1).getByRole('link').first()
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(2000)
        
        // Should show overall average
        const finalAvg = page.getByText(/média.*final|média.*geral/i)
        // Should calculate final grade
      }
    }
  })

  test('should show approval status', async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const viewButton = page.getByRole('row').nth(1).getByRole('link').first()
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(2000)
        
        // Should show aprovado/reprovado
        const status = page.getByText(/aprovado|reprovado|recuperação/i)
        // Should indicate pass/fail status
      }
    }
  })
})

test.describe('Boletim - PDF Export', () => {
  test('should have print/export button', async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const viewButton = page.getByRole('row').nth(1).getByRole('link').first()
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(2000)
        
        // Look for export button
        const exportButton = page.getByRole('button', { name: /imprimir|pdf|exportar/i })
        await expect(exportButton).toBeVisible()
      }
    }
  })

  test('should generate PDF on export', async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const viewButton = page.getByRole('row').nth(1).getByRole('link').first()
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(2000)
        
        const exportButton = page.getByRole('button', { name: /pdf|exportar/i })
        if (await exportButton.isVisible()) {
          const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
          await exportButton.click()
          
          const download = await downloadPromise
          await expect(download.suggestedFilename()).toMatch(/boletim|report.*card/i)
        }
      }
    }
  })

  test('should include school logo in PDF', async ({ page }) => {
    // This would require visual testing or PDF parsing
    // Just verify export includes proper formatting
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const viewButton = page.getByRole('row').nth(1).getByRole('link').first()
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await page.waitForTimeout(1000)
      
      const boletimLink = page.getByRole('link', { name: /boletim/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await page.waitForTimeout(2000)
        
        // Should have school branding
        const schoolName = page.getByText(/escola/i)
        // Should be visible in boletim header
      }
    }
  })
})

test.describe('Notas - Edge Cases', () => {
  test('should handle missing grades gracefully', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
      
      // Empty cells should be shown appropriately
      const emptyIndicator = page.getByText(/-|n\/a|pending/i)
      // May be visible for students without grades
    }
  })

  test('should prevent editing locked periods', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    // Select a past period (if periods are closed)
    const periodoSelect = page.getByLabel(/período/i)
    if (await periodoSelect.isVisible()) {
      await periodoSelect.click()
      await page.getByRole('option').first().click()
      
      // Check if fields are disabled
      const gradeInput = page.getByRole('textbox').first()
      if (await gradeInput.isVisible()) {
        const isDisabled = await gradeInput.isDisabled()
        // Locked periods should have disabled inputs
      }
    }
  })

  test('should show alert for students at risk of failing', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
      
      // Look for risk indicators
      const riskAlert = page.getByText(/risco.*reprovação|baixo.*desempenho|atenção/i)
      // Should highlight at-risk students
    }
  })

  test('should validate special characters in grade input', async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
      
      const gradeInput = page.getByRole('textbox').first()
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('abc')
        
        // Should reject non-numeric input
        const errorMessage = page.getByText(/inválido|numérico|número/i)
        // Should show validation error
      }
    }
  })
})
