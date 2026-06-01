import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Usuário (User) Forms
 * Tests user management with role-based access
 */

test.describe('Usuário - List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/usuarios')
  })

  test('should display usuarios list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /usuários/i })).toBeVisible()
  })

  test('should have filter by role', async ({ page }) => {
    const roleFilter = page.getByLabel(/tipo|perfil|função/i)
    if (await roleFilter.isVisible()) {
      await roleFilter.click()
      
      // Should have role options
      await expect(page.getByRole('option', { name: /admin/i })).toBeVisible()
      await expect(page.getByRole('option', { name: /diretor/i })).toBeVisible()
      await expect(page.getByRole('option', { name: /professor/i })).toBeVisible()
    }
  })
})

test.describe('Usuário - Create Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/usuarios/novo')
  })

  test('should display all required fields', async ({ page }) => {
    await expect(page.getByLabel(/nome/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/tipo|perfil|função/i)).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    await page.getByLabel(/nome/i).fill('Usuário Teste')
    await page.getByLabel(/email/i).fill('invalidemail')
    await page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
    
    await expect(page.getByText(/email.*válido/i)).toBeVisible()
  })

  test('should have tipo_usuario select with correct options', async ({ page }) => {
    const tipoSelect = page.getByLabel(/tipo|perfil|função/i)
    await tipoSelect.click()
    
    // Per database schema: admin, diretor, secretario, professor, responsavel
    await expect(page.getByRole('option', { name: /admin/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /diretor/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /secretário/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /professor/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /responsável/i })).toBeVisible()
  })

  test('should require escola for non-admin roles', async ({ page }) => {
    await page.getByLabel(/nome/i).fill('Diretor Teste')
    await page.getByLabel(/email/i).fill('diretor@teste.com')
    
    // Select diretor
    const tipoSelect = page.getByLabel(/tipo|perfil|função/i)
    await tipoSelect.click()
    await page.getByRole('option', { name: /diretor/i }).click()
    
    // Should show escola field
    const escolaField = page.getByLabel(/escola/i)
    await expect(escolaField).toBeVisible()
  })

  test('should create user successfully', async ({ page }) => {
    const userName = `Usuário E2E ${Date.now()}`
    const userEmail = `user${Date.now()}@teste.com`
    
    await page.getByLabel(/nome/i).fill(userName)
    await page.getByLabel(/email/i).fill(userEmail)
    
    // Select tipo
    const tipoSelect = page.getByLabel(/tipo|perfil|função/i)
    await tipoSelect.click()
    await page.getByRole('option', { name: /professor/i }).click()
    
    // Select escola if visible
    const escolaSelect = page.getByLabel(/escola/i)
    if (await escolaSelect.isVisible()) {
      await escolaSelect.click()
      await page.getByRole('option').first().click()
    }
    
    await page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
    
    await expect(page.getByText(/sucesso|criado|cadastrado/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Usuário - Role-Based Access', () => {
  test('should show admin-only features for admin', async ({ page }) => {
    // Login as admin
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('admin@test.com')
    await page.getByLabel(/senha/i).fill('test123456')
    await page.getByRole('button', { name: /entrar/i }).click()
    
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })
    
    // Admin should see all menu items
    await expect(page.getByRole('link', { name: /usuários/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /escolas/i })).toBeVisible()
  })
})
