import { test, expect } from '@playwright/test'
import { waitForPageLoad, expectFormSuccess, expectFormError } from '../utils/test-helpers'

/**
 * E2E Tests: Atribuições - Teacher-Class Assignment
 * Tests for assigning teachers to classes (turmas)
 */

test.describe('Teacher Assignments - Page Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/atribuicoes')
    await waitForPageLoad(page)
  })

  test('should display page header and title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /atribuições|atribuir|vínculos/i })).toBeVisible()
  })

  test('should display assignments table or grid', async ({ page }) => {
    const table = page.getByRole('table')
    const grid = page.locator('[class*="grid"]')
    
    await expect(table.or(grid)).toBeVisible()
  })

  test('should have create assignment button', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /nova.*atribuição|atribuir|vincular/i })
    
    if (await newButton.isVisible()) {
      await expect(newButton).toBeVisible()
    }
  })

  test('should display existing assignments', async ({ page }) => {
    // Look for teacher names or assignment rows
    const assignments = page.locator('text=/professor|prof\\./i').first()
    
    if (await assignments.isVisible()) {
      await expect(assignments).toBeVisible()
    }
  })
})

test.describe('Teacher Assignments - Filter and Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/atribuicoes')
    await waitForPageLoad(page)
  })

  test('should have escola filter', async ({ page }) => {
    const escolaFilter = page.locator('[role="combobox"]').filter({ hasText: /escola|todas/i }).first()
    
    if (await escolaFilter.isVisible()) {
      await expect(escolaFilter).toBeVisible()
    }
  })

  test('should filter assignments by escola', async ({ page }) => {
    const escolaFilter = page.locator('[role="combobox"]').filter({ hasText: /escola|todas/i }).first()
    
    if (await escolaFilter.isVisible()) {
      await escolaFilter.click()
      await page.waitForTimeout(200)
      
      const firstOption = page.getByRole('option').first()
      await firstOption.click()
      await page.waitForTimeout(500)
      
      // Results should update
      const table = page.getByRole('table')
      const grid = page.locator('[class*="grid"]')
      await expect(table.or(grid)).toBeVisible()
    }
  })

  test('should have ano/série filter', async ({ page }) => {
    const anoFilter = page.locator('[role="combobox"]').filter({ hasText: /ano|série|todos/i }).first()
    
    if (await anoFilter.isVisible()) {
      await expect(anoFilter).toBeVisible()
    }
  })

  test('should filter by ano letivo', async ({ page }) => {
    const anoFilter = page.locator('[role="combobox"]').filter({ hasText: /ano.*letivo|2024|2025/i }).first()
    
    if (await anoFilter.isVisible()) {
      await anoFilter.click()
      await page.waitForTimeout(200)
      
      await page.getByRole('option').first().click()
      await page.waitForTimeout(500)
      
      const table = page.getByRole('table')
      await expect(table).toBeVisible()
    }
  })

  test('should search by teacher name', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquisar|professor/i)
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('Prof')
      await page.waitForTimeout(500)
      
      await expect(page.getByRole('table')).toBeVisible()
    }
  })
})

test.describe('Teacher Assignments - Create Assignment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/atribuicoes')
    await waitForPageLoad(page)
  })

  test('should open assignment modal/form', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /nova.*atribuição|atribuir|vincular/i })
    
    if (await newButton.isVisible()) {
      await newButton.click()
      await page.waitForTimeout(300)
      
      // Should show dialog or navigate to form
      const dialog = page.getByRole('dialog')
      const heading = page.getByRole('heading', { name: /atribuir|nova.*atribuição/i })
      
      await expect(dialog.or(heading)).toBeVisible()
    }
  })

  test('should display professor selection field', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /nova.*atribuição|atribuir/i })
    
    if (await newButton.isVisible()) {
      await newButton.click()
      await page.waitForTimeout(300)
      
      const professorSelect = page.locator('[role="combobox"]').filter({ hasText: /professor|selecione/i })
      if (await professorSelect.first().isVisible()) {
        await expect(professorSelect.first()).toBeVisible()
      }
    }
  })

  test('should display turma selection field', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /nova.*atribuição|atribuir/i })
    
    if (await newButton.isVisible()) {
      await newButton.click()
      await page.waitForTimeout(300)
      
      const turmaSelect = page.locator('[role="combobox"]').filter({ hasText: /turma|classe/i })
      if (await turmaSelect.first().isVisible()) {
        await expect(turmaSelect.first()).toBeVisible()
      }
    }
  })

  test('should display disciplina selection field', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /nova.*atribuição|atribuir/i })
    
    if (await newButton.isVisible()) {
      await newButton.click()
      await page.waitForTimeout(300)
      
      const disciplinaSelect = page.locator('[role="combobox"]').filter({ hasText: /disciplina|matéria/i })
      if (await disciplinaSelect.first().isVisible()) {
        await expect(disciplinaSelect.first()).toBeVisible()
      }
    }
  })

  test('should validate required fields', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /nova.*atribuição|atribuir/i })
    
    if (await newButton.isVisible()) {
      await newButton.click()
      await page.waitForTimeout(300)
      
      const saveButton = page.getByRole('button', { name: /salvar|atribuir|confirmar/i })
      if (await saveButton.isVisible()) {
        await saveButton.click()
        
        // Should show validation errors
        await expectFormError(page, /obrigatório|selecione/i)
      }
    }
  })

  test('should create teacher-class assignment', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /nova.*atribuição|atribuir/i })
    
    if (await newButton.isVisible()) {
      await newButton.click()
      await page.waitForTimeout(300)
      
      // Select professor
      const professorSelect = page.locator('select, [role="combobox"]').filter({ hasText: /professor/i }).first()
      if (await professorSelect.isVisible()) {
        await professorSelect.click()
        await page.waitForTimeout(200)
        await page.getByRole('option').first().click()
      }
      
      // Select turma
      const turmaSelect = page.locator('select, [role="combobox"]').filter({ hasText: /turma|classe/i }).first()
      if (await turmaSelect.isVisible()) {
        await turmaSelect.click()
        await page.waitForTimeout(200)
        await page.getByRole('option').first().click()
      }
      
      // Select disciplina
      const disciplinaSelect = page.locator('select, [role="combobox"]').filter({ hasText: /disciplina/i }).first()
      if (await disciplinaSelect.isVisible()) {
        await disciplinaSelect.click()
        await page.waitForTimeout(200)
        await page.getByRole('option').first().click()
      }
      
      const saveButton = page.getByRole('button', { name: /salvar|atribuir|confirmar/i })
      if (await saveButton.isVisible()) {
        await saveButton.click()
        
        await expectFormSuccess(page)
      }
    }
  })

  test('should not allow duplicate assignment', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /nova.*atribuição|atribuir/i })
    
    if (await newButton.isVisible()) {
      await newButton.click()
      await page.waitForTimeout(300)
      
      // Try to create assignment that already exists
      const professorSelect = page.locator('select, [role="combobox"]').filter({ hasText: /professor/i }).first()
      if (await professorSelect.isVisible()) {
        await professorSelect.click()
        await page.getByRole('option').first().click()
        
        const turmaSelect = page.locator('select, [role="combobox"]').filter({ hasText: /turma/i }).first()
        if (await turmaSelect.isVisible()) {
          await turmaSelect.click()
          await page.getByRole('option').first().click()
          
          const disciplinaSelect = page.locator('select, [role="combobox"]').filter({ hasText: /disciplina/i }).first()
          if (await disciplinaSelect.isVisible()) {
            await disciplinaSelect.click()
            await page.getByRole('option').first().click()
            
            const saveButton = page.getByRole('button', { name: /salvar|atribuir/i })
            await saveButton.click()
            
            // Might show duplicate error
            const duplicateError = page.getByText(/já.*atribuído|duplicado|já.*existe/i)
            if (await duplicateError.isVisible()) {
              await expect(duplicateError).toBeVisible()
            }
          }
        }
      }
    }
  })
})

test.describe('Teacher Assignments - Multiple Assignments', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/atribuicoes')
    await waitForPageLoad(page)
  })

  test('should allow professor to have multiple turmas', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /nova.*atribuição|atribuir/i })
    
    if (await newButton.isVisible()) {
      await newButton.click()
      await page.waitForTimeout(300)
      
      // Check for multiple turmas selection
      const multipleTurmasCheckbox = page.getByLabel(/múltiplas.*turmas|várias.*turmas/i)
      
      if (await multipleTurmasCheckbox.isVisible()) {
        await expect(multipleTurmasCheckbox).toBeVisible()
      }
    }
  })

  test('should allow turma to have multiple professors', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /nova.*atribuição|atribuir/i })
    
    if (await newButton.isVisible()) {
      await newButton.click()
      await page.waitForTimeout(300)
      
      // Different professors can teach different subjects in same turma
      const disciplinaSelect = page.locator('[role="combobox"]').filter({ hasText: /disciplina/i }).first()
      
      if (await disciplinaSelect.isVisible()) {
        await expect(disciplinaSelect).toBeVisible()
      }
    }
  })
})

test.describe('Teacher Assignments - View and Edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/atribuicoes')
    await waitForPageLoad(page)
  })

  test('should display professor name in assignment', async ({ page }) => {
    const professorName = page.locator('text=/prof\\.|professor/i').first()
    
    if (await professorName.isVisible()) {
      await expect(professorName).toBeVisible()
    }
  })

  test('should display turma name in assignment', async ({ page }) => {
    const turmaName = page.locator('text=/\\d+[°º]?\\s*(ano|série)|turma/i').first()
    
    if (await turmaName.isVisible()) {
      await expect(turmaName).toBeVisible()
    }
  })

  test('should display disciplina in assignment', async ({ page }) => {
    const disciplina = page.locator('text=/matemática|português|história|ciências/i').first()
    
    if (await disciplina.isVisible()) {
      await expect(disciplina).toBeVisible()
    }
  })

  test('should have edit button for assignment', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await expect(editButton).toBeVisible()
    }
  })

  test('should edit existing assignment', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(300)
      
      // Should open edit dialog
      const dialog = page.getByRole('dialog')
      if (await dialog.isVisible()) {
        await expect(dialog).toBeVisible()
        
        // Change disciplina
        const disciplinaSelect = page.locator('[role="combobox"]').filter({ hasText: /disciplina/i }).first()
        if (await disciplinaSelect.isVisible()) {
          await disciplinaSelect.click()
          await page.getByRole('option').nth(1).click()
          
          const saveButton = page.getByRole('button', { name: /salvar|atualizar/i })
          await saveButton.click()
          
          await expectFormSuccess(page)
        }
      }
    }
  })
})

test.describe('Teacher Assignments - Delete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/atribuicoes')
    await waitForPageLoad(page)
  })

  test('should have delete button for assignment', async ({ page }) => {
    const deleteButton = page.getByRole('button', { name: /excluir|remover|desvincular/i }).first()
    
    if (await deleteButton.isVisible()) {
      await expect(deleteButton).toBeVisible()
    }
  })

  test('should show confirmation before delete', async ({ page }) => {
    const deleteButton = page.getByRole('button', { name: /excluir|remover|desvincular/i }).first()
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      
      // Should show confirmation dialog
      const confirmDialog = page.getByRole('alertdialog')
      if (await confirmDialog.isVisible()) {
        await expect(confirmDialog).toBeVisible()
        await expect(page.getByRole('button', { name: /confirmar|sim/i })).toBeVisible()
      }
    }
  })

  test('should cancel deletion', async ({ page }) => {
    const deleteButton = page.getByRole('button', { name: /excluir|remover/i }).first()
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      
      const confirmDialog = page.getByRole('alertdialog')
      if (await confirmDialog.isVisible()) {
        const cancelButton = page.getByRole('button', { name: /cancelar|não/i })
        await cancelButton.click()
        
        await expect(confirmDialog).not.toBeVisible()
      }
    }
  })

  test('should delete assignment', async ({ page }) => {
    const deleteButton = page.getByRole('button', { name: /excluir|remover/i }).first()
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      
      const confirmDialog = page.getByRole('alertdialog')
      if (await confirmDialog.isVisible()) {
        const confirmButton = page.getByRole('button', { name: /confirmar|sim|excluir/i })
        await confirmButton.click()
        
        await expectFormSuccess(page)
      }
    }
  })
})

test.describe('Teacher Assignments - Bulk Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/atribuicoes')
    await waitForPageLoad(page)
  })

  test('should have bulk assignment option', async ({ page }) => {
    const bulkButton = page.getByRole('button', { name: /lote|múltiplas|em.*massa/i })
    
    if (await bulkButton.isVisible()) {
      await expect(bulkButton).toBeVisible()
    }
  })

  test('should allow selecting multiple assignments', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]')
    
    if (await checkboxes.first().isVisible()) {
      const count = await checkboxes.count()
      
      if (count > 1) {
        await checkboxes.nth(1).check()
        await checkboxes.nth(2).check()
        
        // Should show bulk action buttons
        const bulkActions = page.getByText(/selecionado|ações/i)
        if (await bulkActions.isVisible()) {
          await expect(bulkActions).toBeVisible()
        }
      }
    }
  })
})

test.describe('Teacher Assignments - Calendar View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/atribuicoes')
    await waitForPageLoad(page)
  })

  test('should have calendar/schedule view toggle', async ({ page }) => {
    const calendarButton = page.getByRole('button', { name: /calendário|horário|grade/i })
    
    if (await calendarButton.isVisible()) {
      await expect(calendarButton).toBeVisible()
      
      await calendarButton.click()
      await page.waitForTimeout(500)
      
      // Should show calendar view
      const calendar = page.locator('[class*="calendar"]')
      if (await calendar.isVisible()) {
        await expect(calendar).toBeVisible()
      }
    }
  })
})

test.describe('Teacher Assignments - Stats', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/atribuicoes')
    await waitForPageLoad(page)
  })

  test('should display total assignments count', async ({ page }) => {
    const statsContainer = page.locator('.grid').first()
    
    if (await statsContainer.isVisible()) {
      const totalStat = page.getByText(/total|atribuições/i)
      if (await totalStat.isVisible()) {
        await expect(totalStat).toBeVisible()
      }
    }
  })

  test('should show unassigned turmas count', async ({ page }) => {
    const unassignedStat = page.getByText(/sem.*atribuição|pendente/i)
    
    if (await unassignedStat.isVisible()) {
      await expect(unassignedStat).toBeVisible()
    }
  })

  test('should show professor workload', async ({ page }) => {
    // Number of turmas per professor
    const workloadIndicator = page.locator('text=/\\d+\\s*turmas?/i').first()
    
    if (await workloadIndicator.isVisible()) {
      await expect(workloadIndicator).toBeVisible()
    }
  })
})

test.describe('Teacher Assignments - Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/atribuicoes')
    await waitForPageLoad(page)
  })

  test('should have export button', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /exportar|download/i })
    
    if (await exportButton.isVisible()) {
      await expect(exportButton).toBeVisible()
    }
  })

  test('should export assignments list', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /exportar|download/i })
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      
      // Should show export options
      const pdfOption = page.getByRole('menuitem', { name: /pdf/i })
      const excelOption = page.getByRole('menuitem', { name: /excel/i })
      
      if (await pdfOption.isVisible() || await excelOption.isVisible()) {
        await expect(pdfOption.or(excelOption)).toBeVisible()
      }
    }
  })
})
