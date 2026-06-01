import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Aluno (Student) Forms
 * Tests CRUD operations for students with Brazilian compliance
 */

test.describe('Aluno - List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
  })

  test('should display alunos list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /alunos/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /novo aluno|adicionar/i })).toBeVisible()
  })

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquisar|filtrar/i)
    await expect(searchInput).toBeVisible()
  })

  test('should filter by escola when admin', async ({ page }) => {
    const escolaFilter = page.getByLabel(/escola/i)
    // Admin should see escola filter
    if (await escolaFilter.isVisible()) {
      await escolaFilter.click()
      const options = page.getByRole('option')
      await expect(options.first()).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Aluno - Create Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos/novo')
  })

  test('should display all required fields', async ({ page }) => {
    // Personal data
    await expect(page.getByLabel(/nome.*completo/i)).toBeVisible()
    await expect(page.getByLabel(/data.*nascimento/i)).toBeVisible()
    await expect(page.getByLabel(/sexo|gênero/i)).toBeVisible()
    
    // Brazilian documents
    await expect(page.getByLabel(/cpf/i)).toBeVisible()
    
    // Family data
    await expect(page.getByLabel(/nome.*mãe|mãe/i)).toBeVisible()
  })

  test('should validate CPF format', async ({ page }) => {
    await page.getByLabel(/nome.*completo/i).fill('Aluno Teste')
    await page.getByLabel(/cpf/i).fill('111.111.111-11')
    await page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
    
    // Should reject invalid CPF (all same digits)
    await expect(page.getByText(/cpf.*inválido|cpf.*válido/i)).toBeVisible()
  })

  test('should validate CPF checksum', async ({ page }) => {
    await page.getByLabel(/nome.*completo/i).fill('Aluno Teste')
    await page.getByLabel(/cpf/i).fill('123.456.789-00')
    await page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
    
    // Should reject CPF with wrong checksum
    await expect(page.getByText(/cpf.*inválido|cpf.*válido/i)).toBeVisible()
  })

  test('should accept valid CPF', async ({ page }) => {
    const cpfField = page.getByLabel(/cpf/i)
    // Valid CPF: 529.982.247-25
    await cpfField.fill('529.982.247-25')
    
    // Should not show error immediately
    await cpfField.blur()
    await page.waitForTimeout(500)
    
    const cpfError = page.getByText(/cpf.*inválido/i)
    await expect(cpfError).not.toBeVisible()
  })

  test('should have sexo/gender options', async ({ page }) => {
    const sexoSelect = page.getByLabel(/sexo|gênero/i)
    await sexoSelect.click()
    
    await expect(page.getByRole('option', { name: /masculino|m/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /feminino|f/i })).toBeVisible()
  })

  test('should have Bolsa Família checkbox', async ({ page }) => {
    const bolsaCheckbox = page.getByLabel(/bolsa.*família/i)
    await expect(bolsaCheckbox).toBeVisible()
    
    // When checked, should show NIS field
    await bolsaCheckbox.check()
    await expect(page.getByLabel(/nis/i)).toBeVisible()
  })

  test('should validate NIS when Bolsa Família is checked', async ({ page }) => {
    const bolsaCheckbox = page.getByLabel(/bolsa.*família/i)
    await bolsaCheckbox.check()
    
    const nisField = page.getByLabel(/nis/i)
    await nisField.fill('123')
    
    await page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
    
    // Should validate NIS format (11 digits)
    await expect(page.getByText(/nis.*inválido|nis.*11.*dígitos/i)).toBeVisible()
  })

  test('should have necessidades especiais field', async ({ page }) => {
    const needsField = page.getByLabel(/necessidades.*especiais|deficiência/i)
    if (await needsField.isVisible()) {
      await expect(needsField).toBeEditable()
    }
  })

  test('should create aluno successfully with minimum data', async ({ page }) => {
    const alunoName = `Aluno E2E ${Date.now()}`
    
    await page.getByLabel(/nome.*completo/i).fill(alunoName)
    
    // Date picker
    const dateField = page.getByLabel(/data.*nascimento/i)
    await dateField.fill('2015-03-15')
    
    // Sexo
    const sexoSelect = page.getByLabel(/sexo|gênero/i)
    await sexoSelect.click()
    await page.getByRole('option', { name: /masculino|m/i }).click()
    
    // CPF (valid)
    await page.getByLabel(/cpf/i).fill('529.982.247-25')
    
    // Nome da mãe
    await page.getByLabel(/nome.*mãe|mãe/i).fill('Maria Teste')
    
    await page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
    
    await expect(page.getByText(/sucesso|criado|cadastrado/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Aluno - Edit Form', () => {
  test('should load existing student data', async ({ page }) => {
    await page.goto('/dashboard/alunos')
    
    const viewButton = page.getByRole('link', { name: /ver|visualizar|detalhes/i }).first()
    if (await viewButton.isVisible()) {
      await viewButton.click()
      
      // Should have pre-filled data
      await expect(page.getByText(/nome|aluno/i)).toBeVisible()
    }
  })
})

test.describe('Aluno - Boletim', () => {
  test('should access student boletim', async ({ page }) => {
    await page.goto('/dashboard/alunos')
    
    // Click on first student
    const alunoLink = page.getByRole('link').filter({ hasText: /aluno|estudante/i }).first()
    if (await alunoLink.isVisible()) {
      await alunoLink.click()
      
      // Look for boletim link/tab
      const boletimLink = page.getByRole('link', { name: /boletim|notas/i })
      if (await boletimLink.isVisible()) {
        await boletimLink.click()
        await expect(page.getByRole('heading', { name: /boletim/i })).toBeVisible()
      }
    }
  })
})
