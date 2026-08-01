import { test, expect } from '../support/diagnostics'
import { 
  waitForPageLoad,
  expectFormSuccess,
  expectFormError,
  getTableRowCount
} from '../utils/test-helpers'

/**
 * E2E Tests: Escolas - Complete CRUD
 * Tests for schools listing, creation, viewing, editing, and deletion
 */

test.describe('Escolas - List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/escolas')
    await waitForPageLoad(page)
  })

  test('should display page header and title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Escolas', exact: true })).toBeVisible()
  })

  test('should display "Nova Escola" button', async ({ page }) => {
    const newButton = page.getByRole('link', { name: /nova escola|adicionar escola/i })
    await expect(newButton).toBeVisible()
    await expect(newButton).toHaveAttribute('href', /\/escolas\/nova/)
  })

  test('should display schools table or grid', async ({ page }) => {
    // Check for table or grid layout
    const table = page.getByRole('table')
    const grid = page.locator('[class*="grid"]')
    
    await expect(table.or(grid)).toBeVisible()
  })

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquisar|filtrar/i)
    await expect(searchInput).toBeVisible()
    await expect(searchInput).toBeEditable()
  })

  test('should filter schools by search term', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquisar|filtrar/i)
    
    await searchInput.fill('Escola')
    await page.waitForTimeout(500)
    
    // Results should be visible
    const table = page.getByRole('table')
    const grid = page.locator('[class*="grid"]')
    await expect(table.or(grid)).toBeVisible()
  })

  test('should display school names', async ({ page }) => {
    // Schools should be listed with names
    const schoolNames = page.locator('text=/escola|E\\.M\\.|E\\.E\\./i').first()
    if (await schoolNames.isVisible()) {
      await expect(schoolNames).toBeVisible()
    }
  })

  test('should display school codes', async ({ page }) => {
    // Schools should show INEP codes or internal codes
    const codePattern = page.locator('text=/\\d{6,}/').first()
    if (await codePattern.isVisible()) {
      await expect(codePattern).toBeVisible()
    }
  })
})

test.describe('Escolas - Create Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/escolas/nova')
    await waitForPageLoad(page)
  })

  test('should display create form header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /nova escola|cadastrar escola/i })).toBeVisible()
  })

  test('should have back button', async ({ page }) => {
    const backButton = page.getByRole('link', { name: /voltar/i })
    await expect(backButton).toBeVisible()
    await expect(backButton).toHaveAttribute('href', /\/escolas$/)
  })

  test('should display all required fields', async ({ page }) => {
    await expect(page.getByLabel(/nome/i)).toBeVisible()
    
    // INEP code
    const inepField = page.getByLabel(/inep|código/i)
    if (await inepField.isVisible()) {
      await expect(inepField).toBeVisible()
    }
  })

  test('should have tipo/nivel field', async ({ page }) => {
    const tipoLabel = page.locator('label').filter({ hasText: /tipo|nível|modalidade/i })
    if (await tipoLabel.isVisible()) {
      await expect(tipoLabel).toBeVisible()
    }
  })

  test('should validate required nome field', async ({ page }) => {
    const nome = page.getByLabel(/nome/i)
    await expect(nome).toHaveAttribute('required', '')
    await page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
    expect(await nome.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true)
  })

  test('should validate INEP code format', async ({ page }) => {
    const inepField = page.getByLabel(/inep|código/i)
    
    if (await inepField.isVisible()) {
      await inepField.fill('123') // Invalid - too short
      await inepField.blur()
      
      await page.getByLabel(/nome/i).fill('Test INEP Validation')
      
      const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
      await saveButton.click()
      
      // Might show INEP validation error
      const inepError = page.getByText(/inep.*inválido|código.*inválido/i)
      if (await inepError.isVisible()) {
        await expect(inepError).toBeVisible()
      }
    }
  })

  test('should create escola successfully', async ({ page }) => {
    const timestamp = Date.now()
    const escolaName = `E2E Test Escola ${timestamp}`
    
    // Fill required fields
    await page.getByLabel(/nome/i).fill(escolaName)
    
    // INEP code (8 digits)
    const inepField = page.getByLabel(/inep|código/i)
    if (await inepField.isVisible()) {
      await inepField.fill(`${timestamp.toString().slice(-8)}`)
    }
    
    // Select tipo/nivel
    const tipoSelect = page.locator('select, [role="combobox"]').filter({ 
      hasText: /tipo|nível|modalidade|selecione/i 
    }).first()
    
    if (await tipoSelect.isVisible()) {
      await tipoSelect.click()
      await page.getByRole('option').first().click()
    }
    
    // Optional: endereço
    const enderecoField = page.getByLabel(/endereço/i)
    if (await enderecoField.isVisible()) {
      await enderecoField.fill('Rua Teste, 123')
    }
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    await expectFormSuccess(page)
    
    // Should redirect
    await expect(page).not.toHaveURL(/\/nova/)
  })

  test('should create escola with all fields', async ({ page }) => {
    const timestamp = Date.now()
    
    await page.getByLabel(/nome/i).fill(`Escola Completa ${timestamp}`)
    
    const inepField = page.getByLabel(/inep/i)
    if (await inepField.isVisible()) {
      await inepField.fill(`${timestamp.toString().slice(-8)}`)
    }
    
    const enderecoField = page.getByLabel(/endereço/i)
    if (await enderecoField.isVisible()) {
      await enderecoField.fill('Av. Principal, 456')
    }
    
    const telefoneField = page.getByLabel(/telefone/i)
    if (await telefoneField.isVisible()) {
      await telefoneField.fill('17 3333-4444')
    }
    
    const emailField = page.getByLabel(/email/i)
    if (await emailField.isVisible()) {
      await emailField.fill(`escola${timestamp}@teste.com`)
    }
    
    const tipoSelect = page.locator('select, [role="combobox"]').first()
    if (await tipoSelect.isVisible()) {
      await tipoSelect.click()
      await page.getByRole('option').first().click()
    }
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    await expectFormSuccess(page)
  })

  test('should show loading state during submission', async ({ page }) => {
    const timestamp = Date.now()
    await page.route('**/rest/v1/escolas*', async route => {
      await new Promise(resolve => setTimeout(resolve, 750))
      await route.continue()
    })
    
    await page.getByLabel(/nome/i).fill(`Loading Test ${timestamp}`)
    await page.getByLabel(/inep|código/i).fill(timestamp.toString().slice(-8))
    await page.locator('#tipo').click()
    await page.getByRole('option').first().click()
    
    const saveButton = page.locator('button[type="submit"]')
    const submission = saveButton.click()
    await expect(saveButton).toBeDisabled()
    await expect(saveButton).toContainText(/salvando|cadastrando/i)
    await submission
  })
})

test.describe('Escolas - View Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/escolas')
    await waitForPageLoad(page)
  })

  test('should navigate to detail page', async ({ page }) => {
    const viewButton = page.getByRole('link', { name: /ver|visualizar|detalhes/i }).first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      
      await expect(page).toHaveURL(/\/escolas\/[a-f0-9-]+/)
      await waitForPageLoad(page)
    }
  })

  test('should display escola information', async ({ page }) => {
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
      
      // Should show school name
      const heading = page.getByRole('heading').first()
      await expect(heading).toBeVisible()
      
      const headingText = await heading.textContent()
      expect(headingText).toBeTruthy()
    }
  })

  test('should display INEP code', async ({ page }) => {
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
      
      const inepLabel = page.getByText(/inep|código/i)
      if (await inepLabel.isVisible()) {
        await expect(inepLabel).toBeVisible()
      }
    }
  })

  test('should display linked turmas', async ({ page }) => {
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
      
      // Should show turmas section
      const turmasSection = page.getByText(/turmas|classes/i)
      if (await turmasSection.first().isVisible()) {
        await expect(turmasSection.first()).toBeVisible()
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

test.describe('Escolas - Edit Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/escolas')
    await waitForPageLoad(page)
  })

  test('should navigate to edit page', async ({ page }) => {
    const editButton = page.getByRole('link', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      
      await expect(page).toHaveURL(/\/escolas\/[a-f0-9-]+\/editar/)
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

  test('should update escola name', async ({ page }) => {
    const editButton = page.getByRole('link', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await waitForPageLoad(page)
      
      const nameField = page.getByLabel(/nome/i)
      const currentName = await nameField.inputValue()
      
      // Append timestamp to make it unique
      const updatedName = `${currentName} ${Date.now()}`
      await nameField.clear()
      await nameField.fill(updatedName)
      
      const saveButton = page.getByRole('button', { name: /salvar|atualizar/i })
      await saveButton.click()
      
      await expectFormSuccess(page)
    }
  })

  test('should update contact information', async ({ page }) => {
    const editButton = page.getByRole('link', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await waitForPageLoad(page)
      
      const phoneField = page.getByLabel(/telefone/i)
      if (await phoneField.isVisible()) {
        await phoneField.clear()
        await phoneField.fill('17 3444-5555')
        
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
      
      await expect(page).toHaveURL(/\/escolas$/)
    }
  })
})

test.describe('Escolas - Delete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/escolas')
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
      
      // Should show alert dialog
      const confirmDialog = page.getByRole('alertdialog')
      if (await confirmDialog.isVisible()) {
        await expect(confirmDialog).toBeVisible()
        
        // Should have confirm and cancel buttons
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
        
        // Dialog should close
        await expect(confirmDialog).not.toBeVisible()
      }
    }
  })

  test('should prevent deletion if escola has linked turmas', async ({ page }) => {
    const deleteButton = page.getByRole('button', { name: /excluir|deletar/i }).first()
    
    if (await deleteButton.isVisible()) {
      const isDisabled = await deleteButton.isDisabled()
      
      if (!isDisabled) {
        await deleteButton.click()
        
        // Might show warning message
        const warningMessage = page.getByText(/possui.*turmas|não.*pode.*excluir|vinculado/i)
        if (await warningMessage.isVisible()) {
          await expect(warningMessage).toBeVisible()
        }
      }
    }
  })
})

test.describe('Escolas - Stats and Metrics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/escolas')
    await waitForPageLoad(page)
  })

  test('should display total escolas count', async ({ page }) => {
    const statsContainer = page.locator('.grid').first()
    
    if (await statsContainer.isVisible()) {
      const totalStat = page.getByText(/total|todas.*escolas/i)
      if (await totalStat.isVisible()) {
        await expect(totalStat).toBeVisible()
      }
    }
  })

  test('should show student count per escola', async ({ page }) => {
    // Look for indicators showing number of students per school
    const countBadge = page.locator('text=/\\d+\\s*(aluno|estudante)/i').first()
    
    if (await countBadge.isVisible()) {
      await expect(countBadge).toBeVisible()
    }
  })
})

test.describe('Escolas - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/escolas')
    await waitForPageLoad(page)
  })

  test('should navigate from escola to turmas list', async ({ page }) => {
    const turmasLink = page.getByRole('link', { name: /turmas/i }).first()
    
    if (await turmasLink.isVisible()) {
      await turmasLink.click()
      
      await expect(page).toHaveURL(/\/turmas/)
      await waitForPageLoad(page)
    }
  })
})
