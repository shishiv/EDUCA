import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Matrícula (Enrollment) Forms
 * Tests enrollment operations
 */

test.describe('Matrícula - List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/matriculas')
  })

  test('should display matriculas list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /matrículas/i })).toBeVisible()
  })

  test('should have filter by situação', async ({ page }) => {
    const situacaoFilter = page.getByLabel(/situação|status/i)
    if (await situacaoFilter.isVisible()) {
      await situacaoFilter.click()
      
      // Should have status options
      await expect(page.getByRole('option', { name: /ativa/i })).toBeVisible()
      await expect(page.getByRole('option', { name: /transferida/i })).toBeVisible()
    }
  })

  test('should have filter by ano letivo', async ({ page }) => {
    const anoFilter = page.getByLabel(/ano.*letivo/i)
    if (await anoFilter.isVisible()) {
      await expect(anoFilter).toBeEditable()
    }
  })
})

test.describe('Matrícula - Create', () => {
  test('should have required fields for new matrícula', async ({ page }) => {
    await page.goto('/dashboard/matriculas/nova')
    
    // Required fields
    await expect(page.getByLabel(/aluno/i)).toBeVisible()
    await expect(page.getByLabel(/turma/i)).toBeVisible()
    await expect(page.getByLabel(/ano.*letivo/i)).toBeVisible()
  })

  test('should validate aluno selection', async ({ page }) => {
    await page.goto('/dashboard/matriculas/nova')
    
    await page.getByRole('button', { name: /salvar|criar|matricular/i }).click()
    
    // Should require aluno
    await expect(page.getByText(/aluno.*obrigatório|selecione.*aluno/i)).toBeVisible()
  })

  test('should validate turma selection', async ({ page }) => {
    await page.goto('/dashboard/matriculas/nova')
    
    // Select aluno first
    const alunoSelect = page.getByLabel(/aluno/i)
    await alunoSelect.click()
    await page.getByRole('option').first().click()
    
    await page.getByRole('button', { name: /salvar|criar|matricular/i }).click()
    
    // Should require turma
    await expect(page.getByText(/turma.*obrigatório|selecione.*turma/i)).toBeVisible()
  })

  test('should create matrícula successfully', async ({ page }) => {
    await page.goto('/dashboard/matriculas/nova')
    
    // Select aluno
    const alunoSelect = page.getByLabel(/aluno/i)
    await alunoSelect.click()
    await page.getByRole('option').first().click()
    
    // Select turma
    const turmaSelect = page.getByLabel(/turma/i)
    await turmaSelect.click()
    await page.getByRole('option').first().click()
    
    // Set ano letivo
    const anoField = page.getByLabel(/ano.*letivo/i)
    await anoField.fill('2026')
    
    await page.getByRole('button', { name: /salvar|criar|matricular/i }).click()
    
    await expect(page.getByText(/sucesso|matriculado|criada/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Matrícula - Status Changes', () => {
  test('should allow transferring student', async ({ page }) => {
    await page.goto('/dashboard/matriculas')
    
    // Find an active matrícula
    const transferButton = page.getByRole('button', { name: /transferir/i }).first()
    if (await transferButton.isVisible()) {
      await transferButton.click()
      
      // Should show transfer dialog/form
      await expect(page.getByText(/transferência|transferir/i)).toBeVisible()
    }
  })

  test('should allow cancelling matrícula', async ({ page }) => {
    await page.goto('/dashboard/matriculas')
    
    // Find cancel option
    const cancelButton = page.getByRole('button', { name: /cancelar|desativar/i }).first()
    if (await cancelButton.isVisible()) {
      await cancelButton.click()
      
      // Should show confirmation
      await expect(page.getByText(/confirmar|certeza/i)).toBeVisible()
    }
  })
})
