import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Escola (School) Forms
 * Tests CRUD operations for schools
 */

test.describe('Escola - List View', () => {
  test.beforeEach(async ({ page }) => {
    // Assumes authenticated user (via setup)
    await page.goto('/dashboard/escolas')
  })

  test('should display schools list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /escolas/i })).toBeVisible()
    
    // Should have add button
    await expect(page.getByRole('link', { name: /nova escola|adicionar/i })).toBeVisible()
  })

  test('should navigate to create school form', async ({ page }) => {
    await page.getByRole('link', { name: /nova escola|adicionar/i }).click()
    await expect(page).toHaveURL(/escolas.*nova/)
  })
})

test.describe('Escola - Create Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/escolas/nova')
  })

  test('should display all required fields', async ({ page }) => {
    // Required fields per schema
    await expect(page.getByLabel(/nome/i)).toBeVisible()
    await expect(page.getByLabel(/endereço/i)).toBeVisible()
    await expect(page.getByLabel(/telefone/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    
    // Optional but common fields
    const inepField = page.getByLabel(/inep|código/i)
    if (await inepField.isVisible()) {
      await expect(inepField).toBeEditable()
    }
  })

  test('should validate required fields', async ({ page }) => {
    // Submit empty form
    await page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
    
    // Should show validation errors
    await expect(page.getByText(/nome.*obrigatório|informe.*nome/i)).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    await page.getByLabel(/nome/i).fill('Escola Teste')
    await page.getByLabel(/email/i).fill('invalidemail')
    await page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
    
    await expect(page.getByText(/email.*válido/i)).toBeVisible()
  })

  test('should validate phone format', async ({ page }) => {
    await page.getByLabel(/nome/i).fill('Escola Teste')
    await page.getByLabel(/telefone/i).fill('123')
    await page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
    
    // Should show phone validation error
    await expect(page.getByText(/telefone.*válido|formato.*inválido/i)).toBeVisible()
  })

  test('should create school successfully', async ({ page }) => {
    const schoolName = `Escola Teste E2E ${Date.now()}`
    
    await page.getByLabel(/nome/i).fill(schoolName)
    await page.getByLabel(/endereço/i).fill('Rua Teste, 123')
    await page.getByLabel(/telefone/i).fill('(34) 99999-9999')
    await page.getByLabel(/email/i).fill('escola@teste.com')
    
    await page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
    
    // Should redirect to schools list or show success
    await expect(page.getByText(/sucesso|criada|cadastrada/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Escola - Edit Form', () => {
  test('should load existing school data', async ({ page }) => {
    // Navigate to first school's edit page
    await page.goto('/dashboard/escolas')
    
    // Click edit on first school
    const editButton = page.getByRole('link', { name: /editar/i }).first()
    if (await editButton.isVisible()) {
      await editButton.click()
      
      // Should have pre-filled data
      await expect(page.getByLabel(/nome/i)).not.toBeEmpty()
    }
  })

  test('should update school successfully', async ({ page }) => {
    await page.goto('/dashboard/escolas')
    
    const editButton = page.getByRole('link', { name: /editar/i }).first()
    if (await editButton.isVisible()) {
      await editButton.click()
      
      // Update a field
      const nameField = page.getByLabel(/nome/i)
      await nameField.fill(`Escola Atualizada ${Date.now()}`)
      
      await page.getByRole('button', { name: /salvar|atualizar/i }).click()
      
      await expect(page.getByText(/sucesso|atualizada/i)).toBeVisible({ timeout: 10000 })
    }
  })
})
