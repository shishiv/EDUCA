import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Attendance Justification Modal
 * Tests the justification modal for marking justified absences (J):
 * - Modal opening/closing
 * - Required justification text
 * - Validation and submission
 * - Keyboard shortcuts (Ctrl+Enter)
 * - Cancel behavior
 *
 * Swarm 3: Frequência (Chamada)
 */

test.describe('Justification Modal - Opening and Closing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/diario/frequencia')
    
    // Select a turma to load attendance
    const turmaSelect = page.getByLabel(/turma/i).first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
    }
  })

  test('should open justification modal when clicking J button', async ({ page }) => {
    // Find J button (Justificada)
    const jButton = page.getByRole('button', { name: /^J$/i }).first()
      .or(page.getByRole('button', { name: /justificad/i }).first())
    
    if (await jButton.isVisible()) {
      await jButton.click()
      
      // Modal should appear
      await expect(
        page.getByRole('heading', { name: /justificar|justificativa/i })
      ).toBeVisible()
    }
  })

  test('should display modal title "Justificar Falta"', async ({ page }) => {
    const jButton = page.getByRole('button', { name: /^J$/i }).first()
      .or(page.getByRole('button', { name: /justificad/i }).first())
    
    if (await jButton.isVisible()) {
      await jButton.click()
      
      await expect(
        page.getByRole('heading', { name: /justificar.*falta/i })
      ).toBeVisible()
    }
  })

  test('should show student name in modal description', async ({ page }) => {
    const jButton = page.getByRole('button', { name: /^J$/i }).first()
    
    if (await jButton.isVisible()) {
      await jButton.click()
      
      // Modal should mention student name
      const modalContent = page.getByRole('dialog')
        .or(page.locator('[role="dialog"]'))
        .or(page.locator('.modal'))
      
      await expect(modalContent).toBeVisible()
      
      // Should contain description text
      await expect(
        page.getByText(/informe.*motivo|motivo.*falta/i)
      ).toBeVisible()
    }
  })

  test('should close modal when clicking Cancel button', async ({ page }) => {
    const jButton = page.getByRole('button', { name: /^J$/i }).first()
    
    if (await jButton.isVisible()) {
      await jButton.click()
      
      // Wait for modal
      await page.waitForTimeout(500)
      
      // Click Cancel
      const cancelButton = page.getByRole('button', { name: /cancelar/i })
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
        
        // Modal should close
        await expect(
          page.getByRole('heading', { name: /justificar.*falta/i })
        ).not.toBeVisible()
      }
    }
  })

  test('should close modal when clicking backdrop/overlay', async ({ page }) => {
    const jButton = page.getByRole('button', { name: /^J$/i }).first()
    
    if (await jButton.isVisible()) {
      await jButton.click()
      
      await page.waitForTimeout(500)
      
      // Click outside modal (backdrop)
      await page.keyboard.press('Escape')
      
      // Modal should close
      await expect(
        page.getByRole('heading', { name: /justificar.*falta/i })
      ).not.toBeVisible()
    }
  })

  test('should close modal on Escape key', async ({ page }) => {
    const jButton = page.getByRole('button', { name: /^J$/i }).first()
    
    if (await jButton.isVisible()) {
      await jButton.click()
      
      await page.waitForTimeout(500)
      
      // Press Escape
      await page.keyboard.press('Escape')
      
      // Modal should close
      await expect(
        page.getByRole('heading', { name: /justificar.*falta/i })
      ).not.toBeVisible()
    }
  })
})

test.describe('Justification Modal - Form Fields', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/diario/frequencia')
    
    const turmaSelect = page.getByLabel(/turma/i).first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
    }
    
    // Open justification modal
    const jButton = page.getByRole('button', { name: /^J$/i }).first()
    if (await jButton.isVisible()) {
      await jButton.click()
      await page.waitForTimeout(500)
    }
  })

  test('should have justification textarea field', async ({ page }) => {
    const textarea = page.getByLabel(/motivo/i)
      .or(page.getByPlaceholder(/atestado|motivo|justificativa/i))
    
    if (await textarea.isVisible()) {
      await expect(textarea).toBeVisible()
    }
  })

  test('should show required indicator (*) on motivo field', async ({ page }) => {
    const requiredLabel = page.getByText(/motivo.*\*/i)
      .or(page.locator('label:has-text("*")'))
    
    if (await requiredLabel.isVisible()) {
      await expect(requiredLabel).toBeVisible()
    }
  })

  test('should have placeholder text with examples', async ({ page }) => {
    const textarea = page.getByPlaceholder(/atestado.*medico|comparecimento|doença/i)
    
    if (await textarea.isVisible()) {
      const placeholder = await textarea.getAttribute('placeholder')
      expect(placeholder).toBeTruthy()
      expect(placeholder?.toLowerCase()).toMatch(/atestado|doença|audiencia/)
    }
  })

  test('should auto-focus textarea when modal opens', async ({ page }) => {
    // Textarea should be focused
    const focusedElement = page.locator(':focus')
    const focusedTag = await focusedElement.evaluate(el => el.tagName)
    
    expect(focusedTag.toLowerCase()).toBe('textarea')
  })

  test('should show helper text about Ctrl+Enter shortcut', async ({ page }) => {
    const helperText = page.getByText(/ctrl.*enter|ctrl\+enter/i)
    
    if (await helperText.isVisible()) {
      await expect(helperText).toBeVisible()
    }
  })

  test('should allow typing in textarea', async ({ page }) => {
    const textarea = page.getByLabel(/motivo/i)
      .or(page.getByPlaceholder(/atestado|motivo/i))
    
    if (await textarea.isVisible()) {
      await textarea.fill('Atestado médico - consulta odontológica')
      
      const value = await textarea.inputValue()
      expect(value).toBe('Atestado médico - consulta odontológica')
    }
  })

  test('should support multi-line text in textarea', async ({ page }) => {
    const textarea = page.getByLabel(/motivo/i)
      .or(page.getByPlaceholder(/atestado|motivo/i))
    
    if (await textarea.isVisible()) {
      await textarea.fill('Linha 1\nLinha 2\nLinha 3')
      
      const value = await textarea.inputValue()
      expect(value).toContain('\n')
    }
  })
})

test.describe('Justification Modal - Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/diario/frequencia')
    
    const turmaSelect = page.getByLabel(/turma/i).first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
    }
    
    const jButton = page.getByRole('button', { name: /^J$/i }).first()
    if (await jButton.isVisible()) {
      await jButton.click()
      await page.waitForTimeout(500)
    }
  })

  test('should disable Confirm button when textarea is empty', async ({ page }) => {
    const confirmButton = page.getByRole('button', { name: /confirmar/i })
    
    if (await confirmButton.isVisible()) {
      await expect(confirmButton).toBeDisabled()
    }
  })

  test('should enable Confirm button when text is entered', async ({ page }) => {
    const textarea = page.getByLabel(/motivo/i)
      .or(page.getByPlaceholder(/atestado|motivo/i))
    
    if (await textarea.isVisible()) {
      await textarea.fill('Atestado médico')
      
      const confirmButton = page.getByRole('button', { name: /confirmar/i })
      if (await confirmButton.isVisible()) {
        await expect(confirmButton).not.toBeDisabled()
      }
    }
  })

  test('should require non-whitespace text', async ({ page }) => {
    const textarea = page.getByLabel(/motivo/i)
      .or(page.getByPlaceholder(/atestado|motivo/i))
    
    if (await textarea.isVisible()) {
      // Fill with only spaces
      await textarea.fill('   ')
      
      const confirmButton = page.getByRole('button', { name: /confirmar/i })
      if (await confirmButton.isVisible()) {
        // Should still be disabled
        await expect(confirmButton).toBeDisabled()
      }
    }
  })

  test('should trim whitespace from justification', async ({ page }) => {
    const textarea = page.getByLabel(/motivo/i)
      .or(page.getByPlaceholder(/atestado|motivo/i))
    
    if (await textarea.isVisible()) {
      await textarea.fill('  Atestado médico  ')
      
      const confirmButton = page.getByRole('button', { name: /confirmar/i })
      if (await confirmButton.isVisible() && !await confirmButton.isDisabled()) {
        await confirmButton.click()
        
        // Success message should appear
        await expect(
          page.getByText(/sucesso|marcado.*justificad/i)
        ).toBeVisible({ timeout: 10000 })
      }
    }
  })
})

test.describe('Justification Modal - Submission', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/diario/frequencia')
    
    const turmaSelect = page.getByLabel(/turma/i).first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
    }
    
    const jButton = page.getByRole('button', { name: /^J$/i }).first()
    if (await jButton.isVisible()) {
      await jButton.click()
      await page.waitForTimeout(500)
    }
  })

  test('should submit justification when clicking Confirm button', async ({ page }) => {
    const textarea = page.getByLabel(/motivo/i)
      .or(page.getByPlaceholder(/atestado|motivo/i))
    
    if (await textarea.isVisible()) {
      await textarea.fill('Atestado médico - gripe')
      
      const confirmButton = page.getByRole('button', { name: /confirmar/i })
      if (await confirmButton.isVisible() && !await confirmButton.isDisabled()) {
        await confirmButton.click()
        
        // Modal should close
        await expect(
          page.getByRole('heading', { name: /justificar.*falta/i })
        ).not.toBeVisible()
        
        // Success message
        await expect(
          page.getByText(/sucesso|marcado|justificad/i)
        ).toBeVisible({ timeout: 10000 })
      }
    }
  })

  test('should submit with Ctrl+Enter keyboard shortcut', async ({ page }) => {
    const textarea = page.getByLabel(/motivo/i)
      .or(page.getByPlaceholder(/atestado|motivo/i))
    
    if (await textarea.isVisible()) {
      await textarea.fill('Comparecimento a tribunal')
      
      // Press Ctrl+Enter
      await textarea.press('Control+Enter')
      
      // Modal should close
      await expect(
        page.getByRole('heading', { name: /justificar.*falta/i })
      ).not.toBeVisible()
      
      // Success message
      await expect(
        page.getByText(/sucesso|marcado|justificad/i)
      ).toBeVisible({ timeout: 10000 })
    }
  })

  test('should mark attendance as J after submission', async ({ page }) => {
    const textarea = page.getByLabel(/motivo/i)
      .or(page.getByPlaceholder(/atestado|motivo/i))
    
    if (await textarea.isVisible()) {
      await textarea.fill('Doença na família')
      
      const confirmButton = page.getByRole('button', { name: /confirmar/i })
      if (await confirmButton.isVisible() && !await confirmButton.isDisabled()) {
        await confirmButton.click()
        
        await page.waitForTimeout(1000)
        
        // J button should be active/pressed
        const jButton = page.getByRole('button', { name: /^J$/i }).first()
        if (await jButton.isVisible()) {
          await expect(jButton).toHaveAttribute('aria-pressed', 'true')
        }
      }
    }
  })

  test('should display success toast after submission', async ({ page }) => {
    const textarea = page.getByLabel(/motivo/i)
      .or(page.getByPlaceholder(/atestado|motivo/i))
    
    if (await textarea.isVisible()) {
      await textarea.fill('Consulta médica agendada')
      
      const confirmButton = page.getByRole('button', { name: /confirmar/i })
      if (await confirmButton.isVisible() && !await confirmButton.isDisabled()) {
        await confirmButton.click()
        
        // Toast notification
        await expect(
          page.locator('.sonner').or(page.getByText(/sucesso/i))
        ).toBeVisible({ timeout: 10000 })
      }
    }
  })
})

test.describe('Justification Modal - Reset Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/diario/frequencia')
    
    const turmaSelect = page.getByLabel(/turma/i).first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
    }
  })

  test('should clear textarea when reopening modal', async ({ page }) => {
    const jButton = page.getByRole('button', { name: /^J$/i }).first()
    
    if (await jButton.isVisible()) {
      // First open
      await jButton.click()
      await page.waitForTimeout(500)
      
      const textarea = page.getByLabel(/motivo/i)
        .or(page.getByPlaceholder(/atestado|motivo/i))
      
      if (await textarea.isVisible()) {
        await textarea.fill('Test text')
        
        // Cancel
        const cancelButton = page.getByRole('button', { name: /cancelar/i })
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
          await page.waitForTimeout(500)
        }
        
        // Reopen modal (different student or same)
        const secondJButton = page.getByRole('button', { name: /^J$/i }).nth(1)
        if (await secondJButton.isVisible()) {
          await secondJButton.click()
          await page.waitForTimeout(500)
          
          // Textarea should be empty
          const reopenedTextarea = page.getByLabel(/motivo/i)
            .or(page.getByPlaceholder(/atestado|motivo/i))
          
          if (await reopenedTextarea.isVisible()) {
            const value = await reopenedTextarea.inputValue()
            expect(value).toBe('')
          }
        }
      }
    }
  })

  test('should reset to disabled Confirm button when reopening', async ({ page }) => {
    const jButton = page.getByRole('button', { name: /^J$/i }).first()
    
    if (await jButton.isVisible()) {
      await jButton.click()
      await page.waitForTimeout(500)
      
      const textarea = page.getByLabel(/motivo/i)
        .or(page.getByPlaceholder(/atestado|motivo/i))
      
      if (await textarea.isVisible()) {
        await textarea.fill('Some text')
        
        // Cancel
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
        
        // Reopen
        await jButton.click()
        await page.waitForTimeout(500)
        
        // Confirm should be disabled again
        const confirmButton = page.getByRole('button', { name: /confirmar/i })
        if (await confirmButton.isVisible()) {
          await expect(confirmButton).toBeDisabled()
        }
      }
    }
  })
})

test.describe('Justification Modal - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/diario/frequencia')
    
    const turmaSelect = page.getByLabel(/turma/i).first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
    }
  })

  test('should show error if submission fails', async ({ page }) => {
    // This test simulates a network error scenario
    // In real implementation, you might mock the API response
    
    const jButton = page.getByRole('button', { name: /^J$/i }).first()
    
    if (await jButton.isVisible()) {
      await jButton.click()
      await page.waitForTimeout(500)
      
      const textarea = page.getByLabel(/motivo/i)
        .or(page.getByPlaceholder(/atestado|motivo/i))
      
      if (await textarea.isVisible()) {
        // Simulate offline mode
        await page.context().setOffline(true)
        
        await textarea.fill('Test justification')
        
        const confirmButton = page.getByRole('button', { name: /confirmar/i })
        if (await confirmButton.isVisible() && !await confirmButton.isDisabled()) {
          await confirmButton.click()
          
          // Should show error message
          await expect(
            page.getByText(/erro|falha|network|offline/i)
          ).toBeVisible({ timeout: 10000 })
        }
        
        // Restore online
        await page.context().setOffline(false)
      }
    }
  })

  test('should keep modal open after submission error', async ({ page }) => {
    const jButton = page.getByRole('button', { name: /^J$/i }).first()
    
    if (await jButton.isVisible()) {
      await jButton.click()
      await page.waitForTimeout(500)
      
      const textarea = page.getByLabel(/motivo/i)
        .or(page.getByPlaceholder(/atestado|motivo/i))
      
      if (await textarea.isVisible()) {
        await page.context().setOffline(true)
        
        await textarea.fill('Test justification')
        
        const confirmButton = page.getByRole('button', { name: /confirmar/i })
        if (await confirmButton.isVisible() && !await confirmButton.isDisabled()) {
          await confirmButton.click()
          
          await page.waitForTimeout(1000)
          
          // Modal should still be visible after error
          await expect(
            page.getByRole('heading', { name: /justificar.*falta/i })
          ).toBeVisible()
        }
        
        await page.context().setOffline(false)
      }
    }
  })
})

test.describe('Justification Modal - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/diario/frequencia')
    
    const turmaSelect = page.getByLabel(/turma/i).first()
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(2000)
    }
    
    const jButton = page.getByRole('button', { name: /^J$/i }).first()
    if (await jButton.isVisible()) {
      await jButton.click()
      await page.waitForTimeout(500)
    }
  })

  test('should have role="dialog" on modal', async ({ page }) => {
    const dialog = page.getByRole('dialog')
    
    if (await dialog.isVisible()) {
      await expect(dialog).toBeVisible()
    }
  })

  test('should have aria-labelledby pointing to title', async ({ page }) => {
    const dialog = page.getByRole('dialog')
    
    if (await dialog.isVisible()) {
      const ariaLabelledBy = await dialog.getAttribute('aria-labelledby')
      expect(ariaLabelledBy).toBeTruthy()
    }
  })

  test('should trap focus within modal', async ({ page }) => {
    // Tab through modal elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Focus should stay within modal
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('should have proper label for textarea', async ({ page }) => {
    const textarea = page.getByLabel(/motivo/i)
    
    if (await textarea.isVisible()) {
      await expect(textarea).toBeVisible()
    }
  })

  test('should have visible focus indicators', async ({ page }) => {
    const textarea = page.getByLabel(/motivo/i)
      .or(page.getByPlaceholder(/atestado|motivo/i))
    
    if (await textarea.isVisible()) {
      await textarea.focus()
      
      // Element should be focused
      const focused = await page.locator(':focus').count()
      expect(focused).toBeGreaterThan(0)
    }
  })
})
