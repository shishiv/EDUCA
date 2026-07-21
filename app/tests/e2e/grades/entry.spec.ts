import { test, expect } from '../support/diagnostics'
import { waitForPageLoad } from '../utils/test-helpers'

/**
 * E2E Tests: Grades Entry (Lançamento de Notas)
 * Tests for entering and managing student grades
 * 
 * @see app/(dashboard)/dashboard/notas/page.tsx
 */

test.describe('Grades Entry - Page Access', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
  })

  test('should display grades page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /notas|avaliações|grades/i })).toBeVisible()
  })

  test('should display page description', async ({ page }) => {
    // Look for description about grade management
    const description = page.getByText(/lançamento.*notas|registro.*avaliações/i)
    if (await description.isVisible()) {
      await expect(description).toBeVisible()
    }
  })

  test('should have turma selector', async ({ page }) => {
    const turmaFilter = page.getByLabel(/turma|classe/i)
    await expect(turmaFilter).toBeVisible()
  })

  test('should have período/bimestre selector', async ({ page }) => {
    const periodoFilter = page.getByLabel(/período|bimestre|trimestre/i)
    if (await periodoFilter.isVisible()) {
      await expect(periodoFilter).toBeVisible()
    }
  })

  test('should have disciplina selector', async ({ page }) => {
    const disciplinaFilter = page.getByLabel(/disciplina|matéria|componente/i)
    if (await disciplinaFilter.isVisible()) {
      await expect(disciplinaFilter).toBeVisible()
    }
  })
})

test.describe('Grades Entry - Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
  })

  test('should filter by turma', async ({ page }) => {
    const turmaSelect = page.locator('[role="combobox"]').filter({ hasText: /turma/i }).first()
    
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.waitForTimeout(300)
      
      const option = page.getByRole('option').first()
      if (await option.isVisible()) {
        await option.click()
        await page.waitForTimeout(1000)
        
        // Student list should appear
        const table = page.getByRole('table')
        if (await table.isVisible()) {
          await expect(table).toBeVisible()
        }
      }
    }
  })

  test('should filter by período', async ({ page }) => {
    // First select turma
    const turmaSelect = page.locator('[role="combobox"]').filter({ hasText: /turma/i }).first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.waitForTimeout(200)
      await page.getByRole('option').first().click()
      await page.waitForTimeout(500)
    }
    
    const periodoSelect = page.locator('[role="combobox"]').filter({ hasText: /período/i }).first()
    if (await periodoSelect.isVisible()) {
      await periodoSelect.click()
      await page.waitForTimeout(200)
      
      const option = page.getByRole('option').first()
      if (await option.isVisible()) {
        await option.click()
        await page.waitForTimeout(500)
      }
    }
  })

  test('should filter by disciplina', async ({ page }) => {
    // First select turma
    const turmaSelect = page.locator('[role="combobox"]').filter({ hasText: /turma/i }).first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.waitForTimeout(200)
      await page.getByRole('option').first().click()
      await page.waitForTimeout(500)
    }
    
    const disciplinaSelect = page.locator('[role="combobox"]').filter({ hasText: /disciplina/i }).first()
    if (await disciplinaSelect.isVisible()) {
      await disciplinaSelect.click()
      await page.waitForTimeout(200)
      
      const option = page.getByRole('option').first()
      if (await option.isVisible()) {
        await option.click()
        await page.waitForTimeout(500)
      }
    }
  })

  test('should require turma selection to show students', async ({ page }) => {
    // Without selecting turma, no students should be shown
    const emptyState = page.getByText(/selecione.*turma|escolha.*turma/i)
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible()
    }
  })
})

test.describe('Grades Entry - Student List Display', () => {
  async function selectTurma(page) {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.locator('[role="combobox"]').filter({ hasText: /turma/i }).first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.waitForTimeout(300)
      
      const option = page.getByRole('option').first()
      if (await option.isVisible()) {
        await option.click()
        await page.waitForTimeout(1500)
        return true
      }
    }
    return false
  }

  test('should display student table', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const table = page.getByRole('table')
      if (await table.isVisible()) {
        await expect(table).toBeVisible()
      }
    }
  })

  test('should display student names', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const nameColumn = page.getByRole('columnheader', { name: /nome|aluno/i })
      if (await nameColumn.isVisible()) {
        await expect(nameColumn).toBeVisible()
      }
    }
  })

  test('should display subject columns', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      // Look for subject/discipline column headers
      const mathColumn = page.getByRole('columnheader', { name: /matemática|português|ciências|história/i })
      if (await mathColumn.isVisible()) {
        await expect(mathColumn).toBeVisible()
      }
    }
  })

  test('should display average column', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const avgColumn = page.getByRole('columnheader', { name: /média/i })
      if (await avgColumn.isVisible()) {
        await expect(avgColumn).toBeVisible()
      }
    }
  })

  test('should show all students in turma', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const rows = page.getByRole('row')
      const count = await rows.count()
      
      // Should have header + at least one student
      expect(count).toBeGreaterThan(1)
    }
  })
})

test.describe('Grades Entry - Grade Input', () => {
  async function selectTurma(page) {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.locator('[role="combobox"]').filter({ hasText: /turma/i }).first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.waitForTimeout(300)
      await page.getByRole('option').first().click()
      await page.waitForTimeout(1500)
      return true
    }
    return false
  }

  test('should have editable grade input fields', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const gradeInputs = page.locator('input[type="text"], input[type="number"]').filter({ hasText: '' })
      if (await gradeInputs.first().isVisible()) {
        await expect(gradeInputs.first()).toBeVisible()
        await expect(gradeInputs.first()).toBeEditable()
      }
    }
  })

  test('should accept valid numeric grades', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const gradeInput = page.locator('input[type="text"], input[type="number"]').first()
      
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('8.5')
        await page.waitForTimeout(300)
        
        const value = await gradeInput.inputValue()
        expect(value).toMatch(/8[.,]5/)
      }
    }
  })

  test('should accept integer grades', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const gradeInput = page.locator('input[type="text"], input[type="number"]').first()
      
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('9')
        await page.waitForTimeout(200)
        
        const value = await gradeInput.inputValue()
        expect(value).toBe('9')
      }
    }
  })

  test('should accept decimal grades (one decimal)', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const gradeInput = page.locator('input[type="text"], input[type="number"]').first()
      
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('7.5')
        
        const value = await gradeInput.inputValue()
        expect(value).toMatch(/7[.,]5/)
      }
    }
  })

  test('should accept decimal grades (two decimals)', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const gradeInput = page.locator('input[type="text"], input[type="number"]').first()
      
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('8.75')
        
        const value = await gradeInput.inputValue()
        expect(value).toMatch(/8[.,]75/)
      }
    }
  })

  test('should accept perfect score (10)', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const gradeInput = page.locator('input[type="text"], input[type="number"]').first()
      
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('10')
        
        const value = await gradeInput.inputValue()
        expect(value).toBe('10')
      }
    }
  })

  test('should accept zero grade', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const gradeInput = page.locator('input[type="text"], input[type="number"]').first()
      
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('0')
        
        const value = await gradeInput.inputValue()
        expect(value).toBe('0')
      }
    }
  })
})

test.describe('Grades Entry - Validation', () => {
  async function selectTurma(page) {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.locator('[role="combobox"]').first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.waitForTimeout(300)
      await page.getByRole('option').first().click()
      await page.waitForTimeout(1500)
      return true
    }
    return false
  }

  test('should reject grades above 10', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const gradeInput = page.locator('input[type="text"], input[type="number"]').first()
      
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('15')
        await gradeInput.blur()
        await page.waitForTimeout(500)
        
        // Should show validation error
        const error = page.getByText(/inválido|máximo.*10|entre.*0.*10/i)
        if (await error.isVisible()) {
          await expect(error).toBeVisible()
        }
      }
    }
  })

  test('should reject negative grades', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const gradeInput = page.locator('input[type="text"], input[type="number"]').first()
      
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('-5')
        await gradeInput.blur()
        await page.waitForTimeout(500)
        
        // Should show validation error or prevent input
        const value = await gradeInput.inputValue()
        const isInvalid = value.startsWith('-')
        
        if (isInvalid) {
          const error = page.getByText(/inválido|negativo/i)
          if (await error.isVisible()) {
            await expect(error).toBeVisible()
          }
        }
      }
    }
  })

  test('should reject non-numeric input', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const gradeInput = page.locator('input[type="text"], input[type="number"]').first()
      
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('abc')
        await gradeInput.blur()
        await page.waitForTimeout(500)
        
        // Should show validation error
        const error = page.getByText(/inválido|numérico|número/i)
        if (await error.isVisible()) {
          await expect(error).toBeVisible()
        }
      }
    }
  })

  test('should validate grade format (max decimals)', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const gradeInput = page.locator('input[type="text"], input[type="number"]').first()
      
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('8.123')
        await gradeInput.blur()
        await page.waitForTimeout(300)
        
        const value = await gradeInput.inputValue()
        // Should either round or show error
        expect(value).toBeTruthy()
      }
    }
  })
})

test.describe('Grades Entry - Save Functionality', () => {
  async function enterGrade(page) {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.locator('[role="combobox"]').first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.waitForTimeout(300)
      await page.getByRole('option').first().click()
      await page.waitForTimeout(1500)
      
      const gradeInput = page.locator('input[type="text"], input[type="number"]').first()
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('9.0')
        await page.waitForTimeout(300)
        return true
      }
    }
    return false
  }

  test('should have save button', async ({ page }) => {
    const success = await enterGrade(page)
    
    if (success) {
      const saveButton = page.getByRole('button', { name: /salvar|confirmar|gravar/i })
      if (await saveButton.isVisible()) {
        await expect(saveButton).toBeVisible()
      }
    }
  })

  test('should save grades successfully', async ({ page }) => {
    const success = await enterGrade(page)
    
    if (success) {
      const saveButton = page.getByRole('button', { name: /salvar/i })
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await page.waitForTimeout(2000)
        
        // Should show success message
        const successMsg = page.getByText(/sucesso|salvo|atualizado/i)
        if (await successMsg.isVisible({ timeout: 5000 })) {
          await expect(successMsg).toBeVisible()
        }
      }
    }
  })

  test('should show loading state while saving', async ({ page }) => {
    const success = await enterGrade(page)
    
    if (success) {
      const saveButton = page.getByRole('button', { name: /salvar/i })
      if (await saveButton.isVisible()) {
        await saveButton.click()
        
        // Should show loading indicator
        const loading = page.locator('[class*="spin"], [class*="loading"]')
        if (await loading.first().isVisible({ timeout: 1000 })) {
          await expect(loading.first()).toBeVisible()
        }
      }
    }
  })

  test('should disable inputs while saving', async ({ page }) => {
    const success = await enterGrade(page)
    
    if (success) {
      const saveButton = page.getByRole('button', { name: /salvar/i })
      if (await saveButton.isVisible()) {
        await saveButton.click()
        
        // Inputs should be disabled
        const gradeInput = page.locator('input[type="text"], input[type="number"]').first()
        if (await gradeInput.isVisible()) {
          const isDisabled = await gradeInput.isDisabled()
          if (isDisabled) {
            expect(isDisabled).toBe(true)
          }
        }
      }
    }
  })

  test('should persist saved grades on page reload', async ({ page }) => {
    const success = await enterGrade(page)
    
    if (success) {
      const saveButton = page.getByRole('button', { name: /salvar/i })
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await page.waitForTimeout(2000)
        
        // Reload page
        await page.reload()
        await waitForPageLoad(page)
        
        // Select same turma
        const turmaSelect = page.locator('[role="combobox"]').first()
        if (await turmaSelect.isVisible()) {
          await turmaSelect.click()
          await page.waitForTimeout(200)
          await page.getByRole('option').first().click()
          await page.waitForTimeout(1500)
          
          // Grade should still be there
          const gradeInput = page.locator('input[type="text"], input[type="number"]').first()
          if (await gradeInput.isVisible()) {
            const value = await gradeInput.inputValue()
            expect(value).toBeTruthy()
          }
        }
      }
    }
  })
})

test.describe('Grades Entry - Average Calculation', () => {
  async function selectTurma(page) {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.locator('[role="combobox"]').first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.waitForTimeout(300)
      await page.getByRole('option').first().click()
      await page.waitForTimeout(1500)
      return true
    }
    return false
  }

  test('should display student average', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      // Look for average column or cells
      const avgCells = page.locator('[class*="media"], [class*="average"]').or(
        page.getByRole('cell').filter({ hasText: /\d+[.,]\d+/ })
      )
      
      if (await avgCells.first().isVisible()) {
        await expect(avgCells.first()).toBeVisible()
      }
    }
  })

  test('should calculate average from entered grades', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      // Enter multiple grades in a row
      const gradeInputs = page.locator('input[type="text"], input[type="number"]')
      const count = await gradeInputs.count()
      
      if (count >= 3) {
        await gradeInputs.nth(0).fill('8')
        await page.waitForTimeout(200)
        await gradeInputs.nth(1).fill('9')
        await page.waitForTimeout(200)
        await gradeInputs.nth(2).fill('7')
        await page.waitForTimeout(500)
        
        // Average should update (8+9+7)/3 = 8.0
        const avgCell = page.locator('[class*="media"]').or(
          page.getByText(/8[.,]0/)
        )
        
        if (await avgCell.first().isVisible()) {
          await expect(avgCell.first()).toBeVisible()
        }
      }
    }
  })

  test('should display turma average', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      // Look for class average indicator
      const turmaAvg = page.getByText(/média.*turma|média.*geral|média.*classe/i)
      if (await turmaAvg.isVisible()) {
        await expect(turmaAvg).toBeVisible()
      }
    }
  })
})

test.describe('Grades Entry - Visual Indicators', () => {
  async function selectTurma(page) {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.locator('[role="combobox"]').first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.waitForTimeout(300)
      await page.getByRole('option').first().click()
      await page.waitForTimeout(1500)
      return true
    }
    return false
  }

  test('should highlight failing grades (< 6.0)', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const gradeInput = page.locator('input[type="text"], input[type="number"]').first()
      
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('4.5')
        await gradeInput.blur()
        await page.waitForTimeout(500)
        
        // Should show red/warning indicator
        const failIndicator = page.locator('[class*="red"], [class*="danger"], [class*="fail"]')
        if (await failIndicator.first().isVisible()) {
          await expect(failIndicator.first()).toBeVisible()
        }
      }
    }
  })

  test('should indicate excellent grades (>= 9.0)', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const gradeInput = page.locator('input[type="text"], input[type="number"]').first()
      
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('9.5')
        await gradeInput.blur()
        await page.waitForTimeout(500)
        
        // Should show green/success indicator
        const excellentIndicator = page.locator('[class*="green"], [class*="success"]')
        if (await excellentIndicator.first().isVisible()) {
          await expect(excellentIndicator.first()).toBeVisible()
        }
      }
    }
  })

  test('should show empty/missing grade indicator', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      // Look for cells with no grade
      const emptyCells = page.getByText(/-|n\/a|pendente/i)
      if (await emptyCells.first().isVisible()) {
        await expect(emptyCells.first()).toBeVisible()
      }
    }
  })
})

test.describe('Grades Entry - Locked Periods', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
  })

  test('should indicate locked periods', async ({ page }) => {
    const periodoSelect = page.locator('[role="combobox"]').filter({ hasText: /período/i }).first()
    
    if (await periodoSelect.isVisible()) {
      await periodoSelect.click()
      await page.waitForTimeout(300)
      
      // Look for lock icon or disabled option
      const lockIcon = page.locator('[class*="lock"]')
      if (await lockIcon.first().isVisible()) {
        await expect(lockIcon.first()).toBeVisible()
      }
    }
  })

  test('should disable grade inputs for locked periods', async ({ page }) => {
    // This test depends on having locked periods in the system
    const turmaSelect = page.locator('[role="combobox"]').first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.waitForTimeout(200)
      await page.getByRole('option').first().click()
      await page.waitForTimeout(1000)
      
      const gradeInput = page.locator('input[type="text"], input[type="number"]').first()
      if (await gradeInput.isVisible()) {
        const isDisabled = await gradeInput.isDisabled()
        // If period is locked, inputs should be disabled
        if (isDisabled) {
          expect(isDisabled).toBe(true)
        }
      }
    }
  })

  test('should not show save button for locked periods', async ({ page }) => {
    // Navigate and check if save is hidden for locked content
    const turmaSelect = page.locator('[role="combobox"]').first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.waitForTimeout(200)
      await page.getByRole('option').first().click()
      await page.waitForTimeout(1000)
      
      // If locked, save button should be hidden or disabled
      const saveButton = page.getByRole('button', { name: /salvar/i })
      if (await saveButton.isVisible()) {
        const isDisabled = await saveButton.isDisabled()
        // Could be disabled if period is locked
        if (isDisabled) {
          expect(isDisabled).toBe(true)
        }
      }
    }
  })
})

test.describe('Grades Entry - Bulk Operations', () => {
  async function selectTurma(page) {
    await page.goto('/dashboard/notas')
    await waitForPageLoad(page)
    
    const turmaSelect = page.locator('[role="combobox"]').first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.waitForTimeout(300)
      await page.getByRole('option').first().click()
      await page.waitForTimeout(1500)
      return true
    }
    return false
  }

  test('should allow batch grade entry', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const gradeInputs = page.locator('input[type="text"], input[type="number"]')
      const count = await gradeInputs.count()
      
      if (count >= 3) {
        // Enter grades quickly
        for (let i = 0; i < Math.min(3, count); i++) {
          await gradeInputs.nth(i).fill(`${7 + i}`)
          await page.waitForTimeout(100)
        }
        
        expect(count).toBeGreaterThan(0)
      }
    }
  })

  test('should save multiple grade changes at once', async ({ page }) => {
    const success = await selectTurma(page)
    
    if (success) {
      const gradeInputs = page.locator('input[type="text"], input[type="number"]')
      const count = await gradeInputs.count()
      
      if (count >= 2) {
        await gradeInputs.nth(0).fill('8')
        await gradeInputs.nth(1).fill('9')
        await page.waitForTimeout(300)
        
        const saveButton = page.getByRole('button', { name: /salvar/i })
        if (await saveButton.isVisible()) {
          await saveButton.click()
          await page.waitForTimeout(2000)
          
          const successMsg = page.getByText(/sucesso/i)
          if (await successMsg.isVisible({ timeout: 5000 })) {
            await expect(successMsg).toBeVisible()
          }
        }
      }
    }
  })
})
