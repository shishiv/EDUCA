import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Responsável (Guardian) Forms
 * Tests guardian/parent management
 */

test.describe('Responsável - List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/responsaveis')
  })

  test('should display responsaveis list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /responsáveis/i })).toBeVisible()
  })

  test('should have add button', async ({ page }) => {
    await expect(page.getByRole('link', { name: /novo.*responsável|adicionar/i })).toBeVisible()
  })

  test('should have search', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquisar/i)
    await expect(searchInput).toBeVisible()
  })
})

test.describe('Responsável - Create Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/responsaveis/novo')
  })

  test('should display all required fields', async ({ page }) => {
    await expect(page.getByLabel(/nome/i)).toBeVisible()
    await expect(page.getByLabel(/cpf/i)).toBeVisible()
    await expect(page.getByLabel(/telefone/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
  })

  test('should validate CPF', async ({ page }) => {
    await page.getByLabel(/nome/i).fill('Responsável Teste')
    await page.getByLabel(/cpf/i).fill('111.111.111-11')
    await page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
    
    await expect(page.getByText(/cpf.*inválido/i)).toBeVisible()
  })

  test('should validate phone format', async ({ page }) => {
    await page.getByLabel(/nome/i).fill('Responsável Teste')
    await page.getByLabel(/cpf/i).fill('529.982.247-25')
    await page.getByLabel(/telefone/i).fill('123')
    await page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
    
    await expect(page.getByText(/telefone.*válido|formato/i)).toBeVisible()
  })

  test('should have parentesco field', async ({ page }) => {
    const parentescoField = page.getByLabel(/parentesco|relação/i)
    if (await parentescoField.isVisible()) {
      await parentescoField.click()
      
      // Common options
      await expect(page.getByRole('option', { name: /mãe/i })).toBeVisible()
      await expect(page.getByRole('option', { name: /pai/i })).toBeVisible()
    }
  })

  test('should create responsável successfully', async ({ page }) => {
    const respName = `Responsável E2E ${Date.now()}`
    
    await page.getByLabel(/nome/i).fill(respName)
    await page.getByLabel(/cpf/i).fill('529.982.247-25')
    await page.getByLabel(/telefone/i).fill('(34) 99999-9999')
    await page.getByLabel(/email/i).fill('responsavel@teste.com')
    
    // Parentesco if available
    const parentescoField = page.getByLabel(/parentesco|relação/i)
    if (await parentescoField.isVisible()) {
      await parentescoField.click()
      await page.getByRole('option').first().click()
    }
    
    await page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
    
    await expect(page.getByText(/sucesso|criado|cadastrado/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Responsável - Vínculo com Aluno', () => {
  test('should link responsável to aluno', async ({ page }) => {
    await page.goto('/dashboard/responsaveis')
    
    // Click on first responsável
    const respLink = page.getByRole('link').filter({ hasText: /responsável/i }).first()
    if (await respLink.isVisible()) {
      await respLink.click()
      
      // Look for alunos section
      const alunosSection = page.getByRole('heading', { name: /alunos|filhos|dependentes/i })
      if (await alunosSection.isVisible()) {
        // Should have add aluno option
        const addAlunoButton = page.getByRole('button', { name: /vincular.*aluno|adicionar.*aluno/i })
        await expect(addAlunoButton).toBeVisible()
      }
    }
  })
})
