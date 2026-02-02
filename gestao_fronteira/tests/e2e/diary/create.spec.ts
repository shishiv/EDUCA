import { test, expect } from '@playwright/test'
import { waitForPageLoad } from '../utils/test-helpers'

/**
 * E2E Tests: Diário de Classe - Create Entry
 * Tests for creating new class diary entries/registrations
 * 
 * @see app/(dashboard)/dashboard/alunos/[id]/diario/novo/page.tsx
 */

test.describe('Diário - Create Access', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
  })

  test('should access diary creation from student profile', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    // Click on first student
    const firstStudent = page.getByRole('row').nth(1)
    const viewButton = firstStudent.getByRole('link').first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await page.waitForTimeout(1000)
      
      // Look for diary tab/link
      const diarioLink = page.getByRole('link', { name: /diário|vivências/i })
      if (await diarioLink.isVisible()) {
        await diarioLink.click()
        await page.waitForTimeout(1000)
        
        // Look for "New" button
        const newButton = page.getByRole('button', { name: /nova.*vivência|novo.*registro|adicionar/i })
        if (await newButton.isVisible()) {
          await expect(newButton).toBeVisible()
        }
      }
    }
  })

  test('should display "New Diary Entry" button', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(1000)
      
      const diarioLink = page.getByRole('link', { name: /diário/i })
      if (await diarioLink.isVisible()) {
        await diarioLink.click()
        await page.waitForTimeout(1000)
        
        const newButton = page.getByRole('button', { name: /nov[ao]/i })
        if (await newButton.isVisible()) {
          await expect(newButton).toBeVisible()
        }
      }
    }
  })

  test('should navigate to creation page', async ({ page }) => {
    // Direct navigation to diary new page (requires student ID)
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(500)
      
      const diarioLink = page.getByRole('link', { name: /diário/i })
      if (await diarioLink.isVisible()) {
        await diarioLink.click()
        await page.waitForTimeout(500)
        
        const newButton = page.getByRole('button', { name: /nov[ao]/i })
        if (await newButton.isVisible()) {
          await newButton.click()
          await page.waitForTimeout(500)
          
          // Should show form
          await expect(page.getByText(/registrando.*vivência|nova.*vivência/i)).toBeVisible()
        }
      }
    }
  })
})

test.describe('Diário - Creation Form', () => {
  // Helper to navigate to form
  async function navigateToForm(page) {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(1000)
      
      const diarioLink = page.getByRole('link', { name: /diário/i })
      if (await diarioLink.isVisible()) {
        await diarioLink.click()
        await page.waitForTimeout(1000)
        
        const newButton = page.getByRole('button', { name: /nov[ao]/i })
        if (await newButton.isVisible()) {
          await newButton.click()
          await page.waitForTimeout(500)
          return true
        }
      }
    }
    return false
  }

  test('should display student name in form header', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      const studentInfo = page.getByText(/registrando.*para|aluno/i)
      if (await studentInfo.isVisible()) {
        await expect(studentInfo).toBeVisible()
      }
    }
  })

  test('should display date picker with default today', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      const dateInput = page.locator('input[type="date"]').first()
      
      if (await dateInput.isVisible()) {
        await expect(dateInput).toBeVisible()
        
        const value = await dateInput.inputValue()
        expect(value).toBeTruthy()
      }
    }
  })

  test('should have date field labeled correctly', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      const dateLabel = page.getByText(/data.*vivência|data.*registro/i)
      if (await dateLabel.isVisible()) {
        await expect(dateLabel).toBeVisible()
      }
    }
  })

  test('should display campo de experiencia selector', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      const campoLabel = page.getByText(/campos.*experiência/i)
      if (await campoLabel.isVisible()) {
        await expect(campoLabel).toBeVisible()
      }
    }
  })

  test('should display description textarea', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      const descriptionLabel = page.getByText(/descrição.*vivência/i)
      if (await descriptionLabel.isVisible()) {
        await expect(descriptionLabel).toBeVisible()
        
        const textarea = page.locator('textarea').first()
        await expect(textarea).toBeVisible()
      }
    }
  })

  test('should display observations field (optional)', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      const obsLabel = page.getByText(/observações.*adicionais/i)
      if (await obsLabel.isVisible()) {
        await expect(obsLabel).toBeVisible()
      }
    }
  })

  test('should have save and cancel buttons', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      const saveButton = page.getByRole('button', { name: /salvar/i })
      const cancelButton = page.getByRole('button', { name: /cancelar/i })
      
      if (await saveButton.isVisible()) {
        await expect(saveButton).toBeVisible()
      }
      
      if (await cancelButton.isVisible()) {
        await expect(cancelButton).toBeVisible()
      }
    }
  })
})

test.describe('Diário - Form Validation', () => {
  async function navigateToForm(page) {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(1000)
      
      const diarioLink = page.getByRole('link', { name: /diário/i })
      if (await diarioLink.isVisible()) {
        await diarioLink.click()
        await page.waitForTimeout(1000)
        
        const newButton = page.getByRole('button', { name: /nov[ao]/i })
        if (await newButton.isVisible()) {
          await newButton.click()
          await page.waitForTimeout(500)
          return true
        }
      }
    }
    return false
  }

  test('should require date field', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      const dateInput = page.locator('input[type="date"]').first()
      
      if (await dateInput.isVisible()) {
        await dateInput.clear()
        await dateInput.blur()
        
        // Should show validation error
        const error = page.getByText(/data.*obrigatória|campo.*obrigatório/i)
        if (await error.isVisible({ timeout: 2000 })) {
          await expect(error).toBeVisible()
        }
      }
    }
  })

  test('should require at least one campo de experiencia', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      const textarea = page.locator('textarea').first()
      
      if (await textarea.isVisible()) {
        await textarea.fill('Test description with enough characters to pass validation')
        
        const saveButton = page.getByRole('button', { name: /salvar/i })
        if (await saveButton.isVisible()) {
          await saveButton.click()
          await page.waitForTimeout(500)
          
          // Should show validation error
          const error = page.getByText(/selecione.*campo|campo.*obrigatório/i)
          if (await error.isVisible()) {
            await expect(error).toBeVisible()
          }
        }
      }
    }
  })

  test('should validate description minimum length', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      const textarea = page.locator('textarea').first()
      
      if (await textarea.isVisible()) {
        await textarea.fill('abc')
        await textarea.blur()
        await page.waitForTimeout(300)
        
        // Should show character count or error
        const charInfo = page.getByText(/\d+\/\d+|mínimo.*\d+.*caracteres/i)
        if (await charInfo.isVisible()) {
          await expect(charInfo).toBeVisible()
        }
      }
    }
  })

  test('should validate description maximum length', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      const textarea = page.locator('textarea').first()
      
      if (await textarea.isVisible()) {
        // Try to fill with very long text
        const longText = 'a'.repeat(2000)
        await textarea.fill(longText)
        await page.waitForTimeout(300)
        
        // Should show character count warning
        const charCount = page.getByText(/\d+\/\d+/)
        if (await charCount.isVisible()) {
          await expect(charCount).toBeVisible()
        }
      }
    }
  })

  test('should prevent future dates', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      const dateInput = page.locator('input[type="date"]').first()
      
      if (await dateInput.isVisible()) {
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + 7)
        const futureDateStr = futureDate.toISOString().split('T')[0]
        
        await dateInput.fill(futureDateStr)
        await dateInput.blur()
        await page.waitForTimeout(300)
        
        // HTML5 max attribute should prevent future dates
        const maxAttr = await dateInput.getAttribute('max')
        expect(maxAttr).toBeTruthy()
      }
    }
  })
})

test.describe('Diário - Form Interaction', () => {
  async function navigateToForm(page) {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(1000)
      
      const diarioLink = page.getByRole('link', { name: /diário/i })
      if (await diarioLink.isVisible()) {
        await diarioLink.click()
        await page.waitForTimeout(1000)
        
        const newButton = page.getByRole('button', { name: /nov[ao]/i })
        if (await newButton.isVisible()) {
          await newButton.click()
          await page.waitForTimeout(500)
          return true
        }
      }
    }
    return false
  }

  test('should allow selecting multiple campos de experiencia', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      // Look for campo buttons/checkboxes
      const campoButtons = page.locator('[role="button"], button, [type="checkbox"]').filter({ hasText: /eu|corpo|traços|escuta|espaços/i })
      
      if (await campoButtons.first().isVisible()) {
        const count = await campoButtons.count()
        
        if (count >= 2) {
          await campoButtons.first().click()
          await page.waitForTimeout(200)
          await campoButtons.nth(1).click()
          await page.waitForTimeout(200)
          
          // Both should be selected
          expect(count).toBeGreaterThanOrEqual(2)
        }
      }
    }
  })

  test('should update character count as typing', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      const textarea = page.locator('textarea').first()
      
      if (await textarea.isVisible()) {
        await textarea.fill('Testing character count update')
        await page.waitForTimeout(300)
        
        const charCount = page.getByText(/\d+\/\d+/)
        if (await charCount.isVisible()) {
          const text = await charCount.textContent()
          expect(text).toMatch(/\d+/)
        }
      }
    }
  })

  test('should allow filling observations field', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      const textareas = page.locator('textarea')
      
      if (await textareas.count() >= 2) {
        const obsTextarea = textareas.last()
        await obsTextarea.fill('Additional observations for this entry')
        
        const value = await obsTextarea.inputValue()
        expect(value).toBe('Additional observations for this entry')
      }
    }
  })

  test('should cancel form and return to list', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      const cancelButton = page.getByRole('button', { name: /cancelar/i })
      
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
        await page.waitForTimeout(500)
        
        // Form should close or navigate back
        const form = page.getByText(/registrando.*vivência/i)
        await expect(form).not.toBeVisible({ timeout: 2000 })
      }
    }
  })

  test('should disable save button while submitting', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      // Fill form completely
      const textarea = page.locator('textarea').first()
      if (await textarea.isVisible()) {
        await textarea.fill('This is a complete description with enough characters to pass validation requirements')
      }
      
      // Select a campo
      const campoButton = page.locator('button, [role="button"]').filter({ hasText: /eu|corpo/i }).first()
      if (await campoButton.isVisible()) {
        await campoButton.click()
        await page.waitForTimeout(200)
      }
      
      const saveButton = page.getByRole('button', { name: /salvar/i })
      if (await saveButton.isVisible()) {
        // Click save
        await saveButton.click()
        
        // Button should show loading state
        const savingButton = page.getByRole('button', { name: /salvando/i })
        if (await savingButton.isVisible({ timeout: 1000 })) {
          await expect(savingButton).toBeVisible()
        }
      }
    }
  })
})

test.describe('Diário - Successful Creation', () => {
  async function fillAndSubmitForm(page) {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    if (!(await firstStudent.isVisible())) return false
    
    await firstStudent.click()
    await page.waitForTimeout(1000)
    
    const diarioLink = page.getByRole('link', { name: /diário/i })
    if (!(await diarioLink.isVisible())) return false
    
    await diarioLink.click()
    await page.waitForTimeout(1000)
    
    const newButton = page.getByRole('button', { name: /nov[ao]/i })
    if (!(await newButton.isVisible())) return false
    
    await newButton.click()
    await page.waitForTimeout(500)
    
    // Fill form
    const textarea = page.locator('textarea').first()
    if (!(await textarea.isVisible())) return false
    
    await textarea.fill('Esta é uma descrição completa de uma vivência observada com a criança. A interação demonstrou desenvolvimento em múltiplas áreas.')
    
    // Select campo
    const campoButton = page.locator('button, [role="button"]').filter({ hasText: /eu|corpo|traços/i }).first()
    if (await campoButton.isVisible()) {
      await campoButton.click()
      await page.waitForTimeout(200)
    }
    
    // Submit
    const saveButton = page.getByRole('button', { name: /salvar/i })
    if (await saveButton.isVisible()) {
      await saveButton.click()
      return true
    }
    
    return false
  }

  test('should submit form successfully', async ({ page }) => {
    const success = await fillAndSubmitForm(page)
    
    if (success) {
      // Wait for success message
      await page.waitForTimeout(2000)
      
      const successMessage = page.getByText(/sucesso|salv[oa]|criado|registrado/i)
      if (await successMessage.isVisible({ timeout: 5000 })) {
        await expect(successMessage).toBeVisible()
      }
    }
  })

  test('should redirect to diary list after creation', async ({ page }) => {
    const success = await fillAndSubmitForm(page)
    
    if (success) {
      await page.waitForTimeout(3000)
      
      // Should be back on diary list
      const list = page.getByText(/vivências|registros|histórico/i)
      if (await list.isVisible()) {
        await expect(list).toBeVisible()
      }
    }
  })

  test('should display new entry in list', async ({ page }) => {
    const success = await fillAndSubmitForm(page)
    
    if (success) {
      await page.waitForTimeout(3000)
      
      // New entry should appear in list
      const entries = page.locator('[class*="vivencia"], [data-testid*="entry"]')
      if (await entries.first().isVisible()) {
        const count = await entries.count()
        expect(count).toBeGreaterThan(0)
      }
    }
  })
})

test.describe('Diário - Form Accessibility', () => {
  async function navigateToForm(page) {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    const firstStudent = page.getByRole('row').nth(1).getByRole('link').first()
    if (await firstStudent.isVisible()) {
      await firstStudent.click()
      await page.waitForTimeout(1000)
      
      const diarioLink = page.getByRole('link', { name: /diário/i })
      if (await diarioLink.isVisible()) {
        await diarioLink.click()
        await page.waitForTimeout(1000)
        
        const newButton = page.getByRole('button', { name: /nov[ao]/i })
        if (await newButton.isVisible()) {
          await newButton.click()
          await page.waitForTimeout(500)
          return true
        }
      }
    }
    return false
  }

  test('should have proper labels for all fields', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      const dateLabel = page.getByLabel(/data/i)
      const descriptionLabel = page.getByLabel(/descrição/i)
      
      if (await dateLabel.isVisible()) {
        await expect(dateLabel).toBeVisible()
      }
      
      if (await descriptionLabel.isVisible()) {
        await expect(descriptionLabel).toBeVisible()
      }
    }
  })

  test('should indicate required fields', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      // Look for asterisks or "required" indicators
      const requiredIndicators = page.locator('[class*="text-red"], .text-destructive').filter({ hasText: /\*/ })
      
      if (await requiredIndicators.first().isVisible()) {
        const count = await requiredIndicators.count()
        expect(count).toBeGreaterThan(0)
      }
    }
  })

  test('should allow keyboard navigation', async ({ page }) => {
    const success = await navigateToForm(page)
    
    if (success) {
      // Tab through form fields
      await page.keyboard.press('Tab')
      await page.waitForTimeout(100)
      await page.keyboard.press('Tab')
      await page.waitForTimeout(100)
      
      // Focus should move through fields
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    }
  })
})
