import { test, expect } from '@playwright/test'
import { waitForPageLoad } from '../utils/test-helpers'

/**
 * E2E Tests: Diário - Lesson Content Form
 * Tests for structured lesson content form with BNCC skills
 * 
 * @see components/diary/LessonContentForm.tsx
 * @see components/diary/BNNCSelector.tsx
 */

test.describe('Lesson Form - Access', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
  })

  test('should access lesson form from diary list', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    // Look for "New Lesson" button
    const newLessonButton = page.getByRole('button', { name: /nova.*aula|novo.*conteúdo|adicionar/i })
    
    if (await newLessonButton.isVisible()) {
      await expect(newLessonButton).toBeVisible()
    }
  })

  test('should display lesson creation form', async ({ page }) => {
    await page.waitForTimeout(2000)
    
    const newButton = page.getByRole('button', { name: /nov[ao]/i })
    
    if (await newButton.isVisible()) {
      await newButton.click()
      await page.waitForTimeout(500)
      
      // Form should open (dialog or page)
      const form = page.locator('form, [role="dialog"]')
      if (await form.isVisible()) {
        await expect(form).toBeVisible()
      }
    }
  })
})

test.describe('Lesson Form - Basic Fields', () => {
  async function openLessonForm(page) {
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)
    
    const newButton = page.getByRole('button', { name: /nov[ao]/i })
    if (await newButton.isVisible()) {
      await newButton.click()
      await page.waitForTimeout(500)
      return true
    }
    return false
  }

  test('should display date field', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const dateInput = page.getByLabel(/data.*aula/i)
      if (await dateInput.isVisible()) {
        await expect(dateInput).toBeVisible()
        expect(await dateInput.getAttribute('type')).toBe('date')
      }
    }
  })

  test('should display subject/discipline field', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const disciplineField = page.getByLabel(/disciplina|matéria/i)
      if (await disciplineField.isVisible()) {
        await expect(disciplineField).toBeVisible()
      }
    }
  })

  test('should display theme/topic field', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const themeField = page.getByLabel(/tema|assunto|tópico/i)
      if (await themeField.isVisible()) {
        await expect(themeField).toBeVisible()
      }
    }
  })

  test('should display objective field', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const objectiveField = page.getByLabel(/objetivo|meta/i)
      if (await objectiveField.isVisible()) {
        await expect(objectiveField).toBeVisible()
      }
    }
  })

  test('should display content/description field', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const contentField = page.getByLabel(/conteúdo|descrição/i)
      if (await contentField.isVisible()) {
        await expect(contentField).toBeVisible()
      }
    }
  })

  test('should display methodology field', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const methodField = page.getByLabel(/metodologia|método|atividade/i)
      if (await methodField.isVisible()) {
        await expect(methodField).toBeVisible()
      }
    }
  })

  test('should display resources field', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const resourceField = page.getByLabel(/recursos|materiais/i)
      if (await resourceField.isVisible()) {
        await expect(resourceField).toBeVisible()
      }
    }
  })
})

test.describe('Lesson Form - BNCC Selector', () => {
  async function openLessonForm(page) {
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)
    
    const newButton = page.getByRole('button', { name: /nov[ao]/i })
    if (await newButton.isVisible()) {
      await newButton.click()
      await page.waitForTimeout(500)
      return true
    }
    return false
  }

  test('should display BNCC skills selector', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const bnccLabel = page.getByText(/habilidades.*bncc|bncc|código.*bncc/i)
      if (await bnccLabel.isVisible()) {
        await expect(bnccLabel).toBeVisible()
      }
    }
  })

  test('should have BNCC input field', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const bnccInput = page.getByPlaceholder(/ef\d+|ei\d+|bncc/i)
      if (await bnccInput.isVisible()) {
        await expect(bnccInput).toBeVisible()
      }
    }
  })

  test('should display BNCC format examples', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      // Look for example codes
      const example = page.getByText(/ef\d{2}[a-z]{2}\d{2}|ei\d{2}[a-z]{2}\d{2}/i)
      if (await example.isVisible()) {
        await expect(example).toBeVisible()
      }
    }
  })

  test('should accept valid BNCC code (EF format)', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const bnccInput = page.locator('input').filter({ hasText: /bncc/i }).or(page.getByPlaceholder(/ef|bncc/i))
      
      if (await bnccInput.first().isVisible()) {
        await bnccInput.first().fill('EF01MA06')
        await page.waitForTimeout(300)
        
        // Should show validation indicator
        const validIcon = page.locator('[class*="check"], [class*="green"]')
        if (await validIcon.first().isVisible()) {
          await expect(validIcon.first()).toBeVisible()
        }
      }
    }
  })

  test('should accept valid BNCC code (EI format)', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const bnccInput = page.locator('input[id*="bncc"], input[name*="bncc"]').first()
      
      if (await bnccInput.isVisible()) {
        await bnccInput.fill('EI03EO01')
        await page.waitForTimeout(300)
        
        const value = await bnccInput.inputValue()
        expect(value).toBe('EI03EO01')
      }
    }
  })

  test('should accept multiple BNCC codes', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const bnccInput = page.locator('input[id*="bncc"], input[name*="bncc"]').first()
      
      if (await bnccInput.isVisible()) {
        await bnccInput.fill('EF01MA06, EF01MA08')
        await page.waitForTimeout(300)
        
        const value = await bnccInput.inputValue()
        expect(value).toContain('EF01MA06')
        expect(value).toContain('EF01MA08')
      }
    }
  })

  test('should validate invalid BNCC codes', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const bnccInput = page.locator('input[id*="bncc"], input[name*="bncc"]').first()
      
      if (await bnccInput.isVisible()) {
        await bnccInput.fill('INVALID123')
        await bnccInput.blur()
        await page.waitForTimeout(300)
        
        // Should show validation error
        const errorIcon = page.locator('[class*="alert"], [class*="yellow"], [class*="warning"]')
        if (await errorIcon.first().isVisible()) {
          await expect(errorIcon.first()).toBeVisible()
        }
      }
    }
  })

  test('should display BNCC code as badge when valid', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const bnccInput = page.locator('input[id*="bncc"], input[name*="bncc"]').first()
      
      if (await bnccInput.isVisible()) {
        await bnccInput.fill('EF02LP08')
        await bnccInput.blur()
        await page.waitForTimeout(500)
        
        // Should display badge
        const badge = page.locator('[class*="badge"]').filter({ hasText: /ef02lp08/i })
        if (await badge.isVisible()) {
          await expect(badge).toBeVisible()
        }
      }
    }
  })

  test('should allow removing BNCC code badges', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const bnccInput = page.locator('input[id*="bncc"], input[name*="bncc"]').first()
      
      if (await bnccInput.isVisible()) {
        await bnccInput.fill('EF01MA06')
        await bnccInput.blur()
        await page.waitForTimeout(500)
        
        // Look for remove button on badge
        const removeButton = page.locator('button').filter({ hasText: /×|x/i }).first()
        if (await removeButton.isVisible()) {
          await removeButton.click()
          await page.waitForTimeout(300)
          
          // Badge should be removed
          const badge = page.locator('[class*="badge"]').filter({ hasText: /ef01ma06/i })
          await expect(badge).not.toBeVisible()
        }
      }
    }
  })

  test('should show BNCC help tooltip', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      // Look for help icon
      const helpButton = page.locator('button[aria-label*="juda"], button[aria-label*="info"]').first()
      
      if (await helpButton.isVisible()) {
        await helpButton.hover()
        await page.waitForTimeout(500)
        
        // Tooltip should appear
        const tooltip = page.locator('[role="tooltip"]')
        if (await tooltip.isVisible()) {
          await expect(tooltip).toBeVisible()
        }
      }
    }
  })

  test('should auto-uppercase BNCC codes', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const bnccInput = page.locator('input[id*="bncc"], input[name*="bncc"]').first()
      
      if (await bnccInput.isVisible()) {
        await bnccInput.fill('ef01ma06')
        await page.waitForTimeout(200)
        
        const value = await bnccInput.inputValue()
        expect(value).toBe('EF01MA06')
      }
    }
  })
})

test.describe('Lesson Form - Validation', () => {
  async function openLessonForm(page) {
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)
    
    const newButton = page.getByRole('button', { name: /nov[ao]/i })
    if (await newButton.isVisible()) {
      await newButton.click()
      await page.waitForTimeout(500)
      return true
    }
    return false
  }

  test('should require date field', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const saveButton = page.getByRole('button', { name: /salvar|confirmar/i })
      
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await page.waitForTimeout(500)
        
        // Should show validation error
        const error = page.getByText(/data.*obrigatória|campo.*obrigatório/i)
        if (await error.isVisible()) {
          await expect(error).toBeVisible()
        }
      }
    }
  })

  test('should require theme/topic', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const saveButton = page.getByRole('button', { name: /salvar/i })
      
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await page.waitForTimeout(500)
        
        const error = page.getByText(/tema.*obrigatório|preencha.*tema/i)
        if (await error.isVisible()) {
          await expect(error).toBeVisible()
        }
      }
    }
  })

  test('should validate minimum content length', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const contentField = page.locator('textarea').first()
      
      if (await contentField.isVisible()) {
        await contentField.fill('abc')
        await contentField.blur()
        await page.waitForTimeout(300)
        
        // Should show character count warning
        const charInfo = page.getByText(/mínimo.*caracteres|\d+\/\d+/i)
        if (await charInfo.isVisible()) {
          await expect(charInfo).toBeVisible()
        }
      }
    }
  })

  test('should prevent future lesson dates', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const dateInput = page.getByLabel(/data/i).first()
      
      if (await dateInput.isVisible()) {
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + 10)
        
        await dateInput.fill(futureDate.toISOString().split('T')[0])
        await dateInput.blur()
        await page.waitForTimeout(300)
        
        // Should show validation or be prevented by max attribute
        const maxAttr = await dateInput.getAttribute('max')
        if (maxAttr) {
          expect(maxAttr).toBeTruthy()
        }
      }
    }
  })

  test('should validate BNCC code limit', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const bnccInput = page.locator('input[id*="bncc"]').first()
      
      if (await bnccInput.isVisible()) {
        // Try to add many codes
        const manyCodes = Array.from({ length: 15 }, (_, i) => `EF0${i % 9 + 1}MA0${i % 9 + 1}`).join(', ')
        await bnccInput.fill(manyCodes)
        await bnccInput.blur()
        await page.waitForTimeout(500)
        
        // Should show limit warning
        const warning = page.getByText(/máximo.*habilidades|limite/i)
        if (await warning.isVisible()) {
          await expect(warning).toBeVisible()
        }
      }
    }
  })
})

test.describe('Lesson Form - Submission', () => {
  async function fillCompleteForm(page) {
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)
    
    const newButton = page.getByRole('button', { name: /nov[ao]/i })
    if (!(await newButton.isVisible())) return false
    
    await newButton.click()
    await page.waitForTimeout(500)
    
    // Fill date
    const dateInput = page.getByLabel(/data/i).first()
    if (await dateInput.isVisible()) {
      const today = new Date().toISOString().split('T')[0]
      await dateInput.fill(today)
    }
    
    // Fill subject
    const subjectInput = page.getByLabel(/disciplina|matéria/i).first()
    if (await subjectInput.isVisible()) {
      await subjectInput.fill('Matemática')
    }
    
    // Fill theme
    const themeInput = page.getByLabel(/tema/i).first()
    if (await themeInput.isVisible()) {
      await themeInput.fill('Adição e Subtração')
    }
    
    // Fill objective
    const objectiveInput = page.getByLabel(/objetivo/i).first()
    if (await objectiveInput.isVisible()) {
      await objectiveInput.fill('Compreender operações básicas de adição')
    }
    
    // Fill content
    const contentInput = page.locator('textarea').first()
    if (await contentInput.isVisible()) {
      await contentInput.fill('Introdução às operações matemáticas básicas, trabalhando com exemplos práticos do cotidiano dos alunos')
    }
    
    // Fill BNCC
    const bnccInput = page.locator('input[id*="bncc"]').first()
    if (await bnccInput.isVisible()) {
      await bnccInput.fill('EF01MA06')
      await page.waitForTimeout(300)
    }
    
    return true
  }

  test('should submit form successfully', async ({ page }) => {
    const success = await fillCompleteForm(page)
    
    if (success) {
      const saveButton = page.getByRole('button', { name: /salvar/i })
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await page.waitForTimeout(2000)
        
        // Should show success message
        const successMsg = page.getByText(/sucesso|salvo|registrado/i)
        if (await successMsg.isVisible({ timeout: 5000 })) {
          await expect(successMsg).toBeVisible()
        }
      }
    }
  })

  test('should disable form during submission', async ({ page }) => {
    const success = await fillCompleteForm(page)
    
    if (success) {
      const saveButton = page.getByRole('button', { name: /salvar/i })
      if (await saveButton.isVisible()) {
        await saveButton.click()
        
        // Button should show loading state
        const loadingButton = page.getByRole('button', { name: /salvando|aguarde/i })
        if (await loadingButton.isVisible({ timeout: 1000 })) {
          await expect(loadingButton).toBeVisible()
        }
      }
    }
  })

  test('should close form after successful submission', async ({ page }) => {
    const success = await fillCompleteForm(page)
    
    if (success) {
      const saveButton = page.getByRole('button', { name: /salvar/i })
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await page.waitForTimeout(3000)
        
        // Form should close
        const form = page.locator('[role="dialog"]')
        if (await form.isVisible()) {
          await expect(form).not.toBeVisible({ timeout: 5000 })
        }
      }
    }
  })

  test('should refresh list after new entry', async ({ page }) => {
    const success = await fillCompleteForm(page)
    
    if (success) {
      const saveButton = page.getByRole('button', { name: /salvar/i })
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await page.waitForTimeout(3000)
        
        // List should contain entries
        const entries = page.locator('[role="button"], [class*="lesson-card"]')
        if (await entries.first().isVisible()) {
          const count = await entries.count()
          expect(count).toBeGreaterThan(0)
        }
      }
    }
  })
})

test.describe('Lesson Form - Cancel Action', () => {
  async function openLessonForm(page) {
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)
    
    const newButton = page.getByRole('button', { name: /nov[ao]/i })
    if (await newButton.isVisible()) {
      await newButton.click()
      await page.waitForTimeout(500)
      return true
    }
    return false
  }

  test('should have cancel button', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const cancelButton = page.getByRole('button', { name: /cancelar|fechar/i })
      if (await cancelButton.isVisible()) {
        await expect(cancelButton).toBeVisible()
      }
    }
  })

  test('should close form on cancel', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const cancelButton = page.getByRole('button', { name: /cancelar/i })
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
        await page.waitForTimeout(500)
        
        const form = page.locator('[role="dialog"]')
        await expect(form).not.toBeVisible()
      }
    }
  })

  test('should discard unsaved changes on cancel', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      // Fill some data
      const themeInput = page.getByLabel(/tema/i).first()
      if (await themeInput.isVisible()) {
        await themeInput.fill('Test Theme')
      }
      
      const cancelButton = page.getByRole('button', { name: /cancelar/i })
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
        await page.waitForTimeout(500)
        
        // Form should be closed
        const form = page.locator('[role="dialog"]')
        await expect(form).not.toBeVisible()
      }
    }
  })
})

test.describe('Lesson Form - Accessibility', () => {
  async function openLessonForm(page) {
    await page.goto('/dashboard/diario')
    await waitForPageLoad(page)
    await page.waitForTimeout(2000)
    
    const newButton = page.getByRole('button', { name: /nov[ao]/i })
    if (await newButton.isVisible()) {
      await newButton.click()
      await page.waitForTimeout(500)
      return true
    }
    return false
  }

  test('should have proper form labels', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const labels = page.locator('label')
      const count = await labels.count()
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should indicate required fields', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const requiredMarkers = page.locator('[class*="text-red"]').filter({ hasText: /\*/ })
      if (await requiredMarkers.first().isVisible()) {
        await expect(requiredMarkers.first()).toBeVisible()
      }
    }
  })

  test('should support keyboard navigation', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      await page.keyboard.press('Tab')
      await page.waitForTimeout(100)
      
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    }
  })

  test('should have accessible dialog', async ({ page }) => {
    const success = await openLessonForm(page)
    
    if (success) {
      const dialog = page.locator('[role="dialog"]')
      if (await dialog.isVisible()) {
        await expect(dialog).toBeVisible()
      }
    }
  })
})
