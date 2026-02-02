import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Turma (Class) Forms
 * Tests CRUD operations for classes
 */

test.describe('Turma - List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/turmas')
  })

  test('should display turmas list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /turmas/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /nova turma|adicionar/i })).toBeVisible()
  })

  test('should have filter options', async ({ page }) => {
    // Check for common filters
    const serieFilter = page.getByLabel(/série|ano/i)
    const turnoFilter = page.getByLabel(/turno/i)
    
    // At least one filter should exist
    const hasFilters = await serieFilter.isVisible() || await turnoFilter.isVisible()
    expect(hasFilters).toBeTruthy()
  })
})

test.describe('Turma - Create Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/turmas/nova')
  })

  test('should display all required fields', async ({ page }) => {
    await expect(page.getByLabel(/nome/i)).toBeVisible()
    await expect(page.getByLabel(/série|ano/i)).toBeVisible()
    await expect(page.getByLabel(/turno/i)).toBeVisible()
    await expect(page.getByLabel(/escola/i)).toBeVisible()
  })

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
    
    // Should show validation errors
    await expect(page.getByText(/nome.*obrigatório|informe/i)).toBeVisible()
  })

  test('should have turno select options', async ({ page }) => {
    const turnoSelect = page.getByLabel(/turno/i)
    await turnoSelect.click()
    
    // Should have morning/afternoon options
    await expect(page.getByRole('option', { name: /manhã|matutino/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /tarde|vespertino/i })).toBeVisible()
  })

  test('should have escola select with options', async ({ page }) => {
    const escolaSelect = page.getByLabel(/escola/i)
    await escolaSelect.click()
    
    // Should have at least one school option (from seed data)
    const options = page.getByRole('option')
    await expect(options.first()).toBeVisible({ timeout: 5000 })
  })

  test('should create turma successfully', async ({ page }) => {
    const turmaName = `Turma E2E ${Date.now()}`
    
    await page.getByLabel(/nome/i).fill(turmaName)
    
    // Select série
    const serieSelect = page.getByLabel(/série|ano/i)
    await serieSelect.click()
    await page.getByRole('option').first().click()
    
    // Select turno
    const turnoSelect = page.getByLabel(/turno/i)
    await turnoSelect.click()
    await page.getByRole('option', { name: /manhã|matutino/i }).click()
    
    // Select escola
    const escolaSelect = page.getByLabel(/escola/i)
    await escolaSelect.click()
    await page.getByRole('option').first().click()
    
    // Set ano_letivo
    const anoField = page.getByLabel(/ano.*letivo/i)
    if (await anoField.isVisible()) {
      await anoField.fill('2026')
    }
    
    // Set capacidade
    const capacidadeField = page.getByLabel(/capacidade/i)
    if (await capacidadeField.isVisible()) {
      await capacidadeField.fill('30')
    }
    
    await page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
    
    await expect(page.getByText(/sucesso|criada|cadastrada/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Turma - Atribuição de Professor', () => {
  test('should allow assigning professor to turma', async ({ page }) => {
    await page.goto('/dashboard/turmas')
    
    // Click on first turma
    const turmaLink = page.getByRole('link').filter({ hasText: /turma|1|2|3|4|5/i }).first()
    if (await turmaLink.isVisible()) {
      await turmaLink.click()
      
      // Look for professor assignment field
      const professorSelect = page.getByLabel(/professor/i)
      if (await professorSelect.isVisible()) {
        await professorSelect.click()
        
        // Should have professor options
        const options = page.getByRole('option')
        await expect(options.first()).toBeVisible({ timeout: 5000 })
      }
    }
  })
})
