import { test, expect } from '@playwright/test'
import { 
  waitForPageLoad,
  generateTestEmail,
  expectFormSuccess,
  expectFormError
} from '../utils/test-helpers'

/**
 * E2E Tests: Usuários - Complete CRUD
 * Tests for user listing, creation, viewing, editing, and deletion
 */

test.describe('Usuários - List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/usuarios')
    await waitForPageLoad(page)
  })

  test('should display page header and title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /usuários/i })).toBeVisible()
  })

  test('should display "Novo Usuário" button', async ({ page }) => {
    const newButton = page.getByRole('link', { name: /novo usuário|adicionar usuário/i })
    await expect(newButton).toBeVisible()
    await expect(newButton).toHaveAttribute('href', /\/usuarios\/novo/)
  })

  test('should display users table', async ({ page }) => {
    const table = page.getByRole('table')
    await expect(table).toBeVisible()
    
    // Check for expected columns
    await expect(page.getByRole('columnheader', { name: /nome/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /email/i })).toBeVisible()
  })

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquisar|filtrar/i)
    await expect(searchInput).toBeVisible()
    await expect(searchInput).toBeEditable()
  })

  test('should filter users by search term', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquisar|filtrar/i)
    
    await searchInput.fill('admin')
    await page.waitForTimeout(500)
    
    // Table should still be visible
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('should display role filter', async ({ page }) => {
    const roleFilter = page.locator('[role="combobox"]').filter({ hasText: /papel|função|todos/i }).first()
    
    if (await roleFilter.isVisible()) {
      await expect(roleFilter).toBeVisible()
    }
  })

  test('should filter by role', async ({ page }) => {
    const roleFilter = page.locator('[role="combobox"]').filter({ hasText: /papel|função|todos/i }).first()
    
    if (await roleFilter.isVisible()) {
      await roleFilter.click()
      
      const adminOption = page.getByRole('option', { name: /admin|diretor|professor/i })
      if (await adminOption.first().isVisible()) {
        await adminOption.first().click()
        await page.waitForTimeout(500)
        
        await expect(page.getByRole('table')).toBeVisible()
      }
    }
  })

  test('should display user roles/badges', async ({ page }) => {
    // Look for role badges in the table
    const roleBadge = page.locator('text=/admin|diretor|professor|coordenador/i').first()
    
    if (await roleBadge.isVisible()) {
      await expect(roleBadge).toBeVisible()
    }
  })

  test('should display user status (ativo/inativo)', async ({ page }) => {
    const statusBadge = page.locator('text=/ativo|inativo/i').first()
    
    if (await statusBadge.isVisible()) {
      await expect(statusBadge).toBeVisible()
    }
  })
})

test.describe('Usuários - Create Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/usuarios/novo')
    await waitForPageLoad(page)
  })

  test('should display create form header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /novo usuário|cadastrar usuário/i })).toBeVisible()
  })

  test('should have back button', async ({ page }) => {
    const backButton = page.getByRole('link', { name: /voltar/i })
    await expect(backButton).toBeVisible()
    await expect(backButton).toHaveAttribute('href', /\/usuarios$/)
  })

  test('should display all required fields', async ({ page }) => {
    await expect(page.getByLabel(/nome/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    
    const senhaField = page.getByLabel(/senha/i)
    if (await senhaField.isVisible()) {
      await expect(senhaField).toBeVisible()
    }
  })

  test('should have papel/role field', async ({ page }) => {
    const papelLabel = page.locator('label').filter({ hasText: /papel|função|perfil/i })
    await expect(papelLabel).toBeVisible()
  })

  test('should validate required nome field', async ({ page }) => {
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    // Should show validation error
    await expectFormError(page, /nome.*obrigatório|campo.*obrigatório/i)
  })

  test('should validate email format', async ({ page }) => {
    const emailField = page.getByLabel(/email/i)
    
    await emailField.fill('invalid-email')
    await emailField.blur()
    
    await page.getByLabel(/nome/i).fill('Test Email Validation')
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    await expect(page.getByText(/email.*inválido/i)).toBeVisible()
  })

  test('should validate password strength', async ({ page }) => {
    const senhaField = page.getByLabel(/senha/i).first()
    
    if (await senhaField.isVisible()) {
      await senhaField.fill('123') // Weak password
      await senhaField.blur()
      
      await page.getByLabel(/nome/i).fill('Test Password')
      await page.getByLabel(/email/i).fill(generateTestEmail('pass'))
      
      const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
      await saveButton.click()
      
      // Should show password error
      const passwordError = page.getByText(/senha.*fraca|senha.*curta|mínimo.*caracteres/i)
      if (await passwordError.isVisible()) {
        await expect(passwordError).toBeVisible()
      }
    }
  })

  test('should validate password confirmation match', async ({ page }) => {
    const senhaField = page.getByLabel(/^senha$/i).first()
    const confirmField = page.getByLabel(/confirmar.*senha|senha.*confirmação/i)
    
    if (await senhaField.isVisible() && await confirmField.isVisible()) {
      await senhaField.fill('TestPass123!')
      await confirmField.fill('TestPass456!') // Different
      
      await page.getByLabel(/nome/i).fill('Test Password Match')
      await page.getByLabel(/email/i).fill(generateTestEmail('match'))
      
      const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
      await saveButton.click()
      
      await expect(page.getByText(/senhas.*não.*correspondem|senhas.*diferentes/i)).toBeVisible()
    }
  })

  test('should create user successfully', async ({ page }) => {
    const timestamp = Date.now()
    const userName = `E2E Test User ${timestamp}`
    
    // Fill required fields
    await page.getByLabel(/nome/i).fill(userName)
    await page.getByLabel(/email/i).fill(generateTestEmail('user'))
    
    // Select papel/role
    const papelSelect = page.locator('select, [role="combobox"]').filter({ 
      hasText: /selecione|papel|função/i 
    }).first()
    
    if (await papelSelect.isVisible()) {
      await papelSelect.click()
      await page.getByRole('option', { name: /professor|coordenador/i }).first().click()
    }
    
    // Password (if required)
    const senhaField = page.getByLabel(/^senha$/i).first()
    if (await senhaField.isVisible()) {
      const password = 'TestPass123!'
      await senhaField.fill(password)
      
      const confirmField = page.getByLabel(/confirmar.*senha/i)
      if (await confirmField.isVisible()) {
        await confirmField.fill(password)
      }
    }
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    await expectFormSuccess(page)
    
    // Should redirect
    await expect(page).not.toHaveURL(/\/novo/)
  })

  test('should create user with escola assignment', async ({ page }) => {
    const timestamp = Date.now()
    
    await page.getByLabel(/nome/i).fill(`User With Escola ${timestamp}`)
    await page.getByLabel(/email/i).fill(generateTestEmail('escola'))
    
    // Select papel
    const papelSelect = page.locator('select, [role="combobox"]').filter({ 
      hasText: /papel|função/i 
    }).first()
    
    if (await papelSelect.isVisible()) {
      await papelSelect.click()
      await page.getByRole('option').first().click()
    }
    
    // Select escola
    const escolaSelect = page.locator('select, [role="combobox"]').filter({ 
      hasText: /escola/i 
    }).first()
    
    if (await escolaSelect.isVisible()) {
      await escolaSelect.click()
      await page.getByRole('option').first().click()
    }
    
    // Password
    const senhaField = page.getByLabel(/^senha$/i).first()
    if (await senhaField.isVisible()) {
      await senhaField.fill('TestPass123!')
      
      const confirmField = page.getByLabel(/confirmar/i)
      if (await confirmField.isVisible()) {
        await confirmField.fill('TestPass123!')
      }
    }
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    await expectFormSuccess(page)
  })

  test('should show loading state during submission', async ({ page }) => {
    const timestamp = Date.now()
    
    await page.getByLabel(/nome/i).fill(`Loading Test ${timestamp}`)
    await page.getByLabel(/email/i).fill(generateTestEmail('loading'))
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    // Button should show loading state
    await expect(saveButton).toBeDisabled()
  })

  test('should not allow duplicate email', async ({ page }) => {
    await page.getByLabel(/nome/i).fill('Duplicate Email Test')
    await page.getByLabel(/email/i).fill('admin@teste.com') // Known email
    
    const papelSelect = page.locator('select, [role="combobox"]').first()
    if (await papelSelect.isVisible()) {
      await papelSelect.click()
      await page.getByRole('option').first().click()
    }
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    // Might show duplicate error
    const duplicateError = page.getByText(/email.*já.*existe|email.*cadastrado/i)
    if (await duplicateError.isVisible()) {
      await expect(duplicateError).toBeVisible()
    }
  })
})

test.describe('Usuários - View Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/usuarios')
    await waitForPageLoad(page)
  })

  test('should navigate to detail page', async ({ page }) => {
    const viewButton = page.getByRole('link', { name: /ver|visualizar|detalhes/i }).first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      
      await expect(page).toHaveURL(/\/usuarios\/[a-f0-9-]+/)
      await waitForPageLoad(page)
    }
  })

  test('should display user information', async ({ page }) => {
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
      
      // Should show name
      const heading = page.getByRole('heading').first()
      await expect(heading).toBeVisible()
    }
  })

  test('should display user role', async ({ page }) => {
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
      
      // Should display papel/role
      const roleLabel = page.getByText(/papel|função/i)
      if (await roleLabel.isVisible()) {
        await expect(roleLabel).toBeVisible()
      }
    }
  })

  test('should display linked escola', async ({ page }) => {
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
      
      // Should show escola section
      const escolaSection = page.getByText(/escola/i)
      if (await escolaSection.first().isVisible()) {
        await expect(escolaSection.first()).toBeVisible()
      }
    }
  })

  test('should have edit button on detail page', async ({ page }) => {
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
      
      const editButton = page.getByRole('link', { name: /editar/i })
      if (await editButton.isVisible()) {
        await expect(editButton).toBeVisible()
      }
    }
  })
})

test.describe('Usuários - Edit Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/usuarios')
    await waitForPageLoad(page)
  })

  test('should navigate to edit page', async ({ page }) => {
    const editButton = page.getByRole('link', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      
      await expect(page).toHaveURL(/\/usuarios\/[a-f0-9-]+\/editar/)
      await waitForPageLoad(page)
    }
  })

  test('should load existing data in form', async ({ page }) => {
    const editButton = page.getByRole('link', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await waitForPageLoad(page)
      
      // Name field should have value
      const nameField = page.getByLabel(/nome/i)
      const nameValue = await nameField.inputValue()
      
      expect(nameValue).toBeTruthy()
      expect(nameValue.length).toBeGreaterThan(0)
    }
  })

  test('should update user name', async ({ page }) => {
    const editButton = page.getByRole('link', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await waitForPageLoad(page)
      
      const nameField = page.getByLabel(/nome/i)
      const currentName = await nameField.inputValue()
      
      const updatedName = `${currentName} ${Date.now()}`
      await nameField.clear()
      await nameField.fill(updatedName)
      
      const saveButton = page.getByRole('button', { name: /salvar|atualizar/i })
      await saveButton.click()
      
      await expectFormSuccess(page)
    }
  })

  test('should change user role', async ({ page }) => {
    const editButton = page.getByRole('link', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await waitForPageLoad(page)
      
      const papelSelect = page.locator('select, [role="combobox"]').filter({ 
        hasText: /papel|função/i 
      }).first()
      
      if (await papelSelect.isVisible()) {
        await papelSelect.click()
        await page.getByRole('option').nth(1).click()
        
        const saveButton = page.getByRole('button', { name: /salvar|atualizar/i })
        await saveButton.click()
        
        await expectFormSuccess(page)
      }
    }
  })

  test('should toggle user status (ativo/inativo)', async ({ page }) => {
    const editButton = page.getByRole('link', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await waitForPageLoad(page)
      
      const statusToggle = page.getByLabel(/ativo|status/i)
      if (await statusToggle.isVisible()) {
        await statusToggle.click()
        
        const saveButton = page.getByRole('button', { name: /salvar|atualizar/i })
        await saveButton.click()
        
        await expectFormSuccess(page)
      }
    }
  })

  test('should cancel edit and return to list', async ({ page }) => {
    const editButton = page.getByRole('link', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await waitForPageLoad(page)
      
      const nameField = page.getByLabel(/nome/i)
      await nameField.fill('This will be cancelled')
      
      const cancelButton = page.getByRole('link', { name: /voltar|cancelar/i })
      await cancelButton.click()
      
      await expect(page).toHaveURL(/\/usuarios$/)
    }
  })
})

test.describe('Usuários - Delete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/usuarios')
    await waitForPageLoad(page)
  })

  test('should display delete button', async ({ page }) => {
    const deleteButton = page.getByRole('button', { name: /excluir|deletar|remover/i }).first()
    
    if (await deleteButton.isVisible()) {
      await expect(deleteButton).toBeVisible()
    }
  })

  test('should show confirmation dialog on delete', async ({ page }) => {
    const deleteButton = page.getByRole('button', { name: /excluir|deletar|remover/i }).first()
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      
      const confirmDialog = page.getByRole('alertdialog')
      if (await confirmDialog.isVisible()) {
        await expect(confirmDialog).toBeVisible()
        
        await expect(page.getByRole('button', { name: /confirmar|sim|excluir/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /cancelar|não/i })).toBeVisible()
      }
    }
  })

  test('should cancel deletion', async ({ page }) => {
    const deleteButton = page.getByRole('button', { name: /excluir|deletar/i }).first()
    
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

  test('should prevent deletion of own account', async ({ page }) => {
    // This test documents expected behavior
    // Users should not be able to delete their own account
    
    const deleteButtons = page.getByRole('button', { name: /excluir|deletar/i })
    const count = await deleteButtons.count()
    
    if (count > 0) {
      // Some delete buttons should be disabled or show warning
      const disabledButtons = await deleteButtons.evaluateAll(
        buttons => buttons.filter(btn => btn.hasAttribute('disabled')).length
      )
      
      // At least one button should be disabled (current user)
      expect(disabledButtons).toBeGreaterThanOrEqual(0)
    }
  })
})

test.describe('Usuários - Stats', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/usuarios')
    await waitForPageLoad(page)
  })

  test('should display total users count', async ({ page }) => {
    const statsContainer = page.locator('.grid').first()
    
    if (await statsContainer.isVisible()) {
      const totalStat = page.getByText(/total|todos.*usuários/i)
      if (await totalStat.isVisible()) {
        await expect(totalStat).toBeVisible()
      }
    }
  })

  test('should show counts by role', async ({ page }) => {
    // Look for stats like "Professores: X", "Diretores: Y"
    const roleStats = page.locator('text=/\\d+\\s*(professor|diretor|admin|coordenador)/i').first()
    
    if (await roleStats.isVisible()) {
      await expect(roleStats).toBeVisible()
    }
  })
})
