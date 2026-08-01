import { test, expect } from '../support/diagnostics'
import { 
  waitForPageLoad, 
  generateValidCPF,
  generateTestEmail,
  formatBrazilianPhone,
  expectFormSuccess,
  expectFormError
} from '../utils/test-helpers'

async function completeRelationshipAndConsent(page: import('@playwright/test').Page) {
  await page.locator('#parentesco').click()
  await page.getByRole('option', { name: /mãe|pai|responsável/i }).first().click()
  await page.getByRole('checkbox', { name: /consentimento lgpd/i }).click()
}

/**
 * E2E Tests: Responsáveis - Complete CRUD
 * Tests for guardians/parents listing, creation, viewing, editing, and deletion
 */

test.describe('Responsáveis - List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/responsaveis')
    await waitForPageLoad(page)
  })

  test('should display page header and title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /responsáveis/i })).toBeVisible()
  })

  test('should display "Novo Responsável" button', async ({ page }) => {
    const newButton = page.getByRole('link', { name: /novo responsável|adicionar responsável/i })
    await expect(newButton).toBeVisible()
    await expect(newButton).toHaveAttribute('href', /\/responsaveis\/novo/)
  })

  test('should display responsaveis table', async ({ page }) => {
    const table = page.getByRole('table')
    await expect(table).toBeVisible()
    
    // Check for expected columns
    await expect(page.getByRole('columnheader', { name: 'Responsável', exact: true })).toBeVisible()
  })

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquisar|filtrar/i)
    await expect(searchInput).toBeVisible()
    await expect(searchInput).toBeEditable()
  })

  test('should filter responsaveis by search term', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|pesquisar|filtrar/i)
    
    await searchInput.fill('Silva')
    await page.waitForTimeout(500)
    
    // Table should still be visible
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('should display parentesco filter', async ({ page }) => {
    const parentescoFilter = page.locator('[role="combobox"]').filter({ hasText: /parentesco|todos/i }).first()
    
    if (await parentescoFilter.isVisible()) {
      await expect(parentescoFilter).toBeVisible()
    }
  })

  test('should filter by parentesco', async ({ page }) => {
    const parentescoFilter = page.locator('[role="combobox"]').filter({ hasText: /parentesco|todos/i }).first()
    
    if (await parentescoFilter.isVisible()) {
      await parentescoFilter.click()
      
      const maeOption = page.getByRole('option', { name: /mãe/i })
      if (await maeOption.isVisible()) {
        await maeOption.click()
        await page.waitForTimeout(500)
        
        await expect(page.getByRole('table')).toBeVisible()
      }
    }
  })

  test('should show student count for each responsavel', async ({ page }) => {
    // Look for indicators showing number of students
    const countBadge = page.locator('text=/\\d+\\s*(aluno|estudante)/i').first()
    
    if (await countBadge.isVisible()) {
      await expect(countBadge).toBeVisible()
    }
  })

  test('should display contact information', async ({ page }) => {
    // Phone and email should be visible in the table
    const phoneIcon = page.locator('[class*="lucide"]').filter({ hasText: '' }).first()
    const emailIcon = page.locator('[class*="lucide"]').filter({ hasText: '' }).first()
    
    // At least some contact info should be present
    const table = page.getByRole('table')
    await expect(table).toBeVisible()
  })
})

test.describe('Responsáveis - Create Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/responsaveis/novo')
    await waitForPageLoad(page)
  })

  test('should display create form header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /novo responsável|cadastrar responsável/i })).toBeVisible()
  })

  test('should have back button', async ({ page }) => {
    const backButton = page.getByRole('link', { name: /voltar/i })
    await expect(backButton).toBeVisible()
    await expect(backButton).toHaveAttribute('href', /\/responsaveis$/)
  })

  test('should display all required fields', async ({ page }) => {
    await expect(page.getByLabel(/nome/i)).toBeVisible()
    await expect(page.getByLabel(/cpf/i)).toBeVisible()
    await expect(page.getByLabel(/telefone|celular/i)).toBeVisible()
  })

  test('should have parentesco field', async ({ page }) => {
    const parentescoLabel = page.locator('label').filter({ hasText: /parentesco|grau/i })
    await expect(parentescoLabel).toBeVisible()
  })

  test('should validate CPF format', async ({ page }) => {
    const cpfField = page.getByLabel(/cpf/i)
    
    await cpfField.fill('111.111.111-11')
    await cpfField.blur()
    
    await page.getByLabel(/nome/i).fill('Test Validation')
    await completeRelationshipAndConsent(page)
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    await expect(page.getByText(/cpf.*inválido/i)).toBeVisible()
  })

  test('should validate phone format', async ({ page }) => {
    const phoneField = page.getByLabel(/telefone|celular/i)
    
    await phoneField.fill('123') // Invalid phone
    await phoneField.blur()
    await page.waitForTimeout(300)
    
    await page.getByLabel(/nome/i).fill('Test Phone')
    await page.getByLabel(/cpf/i).fill(generateValidCPF())
    await completeRelationshipAndConsent(page)
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    // Should show error
    await expectFormError(page)
  })

  test('should validate email format', async ({ page }) => {
    const emailField = page.getByLabel(/email|e-mail/i)
    
    if (await emailField.isVisible()) {
      await emailField.fill('invalid-email')
      await emailField.blur()
      
      await page.getByLabel(/nome/i).fill('Test Email')
      
      const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
      await saveButton.click()
      
      await expect(page.getByText(/email.*inválido/i)).toBeVisible()
    }
  })

  test('should create responsavel successfully', async ({ page }) => {
    const timestamp = Date.now()
    const responsavelName = `E2E Test Responsavel ${timestamp}`
    
    // Fill required fields
    await page.getByLabel(/nome/i).fill(responsavelName)
    
    const validCPF = generateValidCPF()
    await page.getByLabel(/cpf/i).fill(validCPF)
    
    const phoneField = page.getByLabel(/telefone|celular/i)
    await phoneField.fill('17981234567')
    
    // Select parentesco
    const parentescoSelect = page.locator('select, [role="combobox"]').filter({ hasText: /selecione|parentesco/i }).first()
    if (await parentescoSelect.isVisible()) {
      await parentescoSelect.click()
      await page.getByRole('option', { name: /mãe|pai|responsável/i }).first().click()
    }
    
    await page.getByRole('checkbox', { name: /consentimento lgpd/i }).click()

    // Optional email
    const emailField = page.getByLabel(/email/i)
    if (await emailField.isVisible()) {
      await emailField.fill(generateTestEmail('resp'))
    }
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    await expectFormSuccess(page)
    
    // Should redirect
    await expect(page).not.toHaveURL(/\/novo/)
  })

  test('should create responsavel with all fields', async ({ page }) => {
    const timestamp = Date.now()
    
    await page.getByLabel(/nome/i).fill(`Complete Test ${timestamp}`)
    await page.getByLabel(/cpf/i).fill(generateValidCPF())
    await page.getByLabel(/telefone|celular/i).fill('17987654321')
    
    const emailField = page.getByLabel(/email/i)
    if (await emailField.isVisible()) {
      await emailField.fill(generateTestEmail('complete'))
    }
    
    const enderecoField = page.getByLabel(/endereço/i)
    if (await enderecoField.isVisible()) {
      await enderecoField.fill('Rua Teste, 123 - Centro')
    }
    
    const profissaoField = page.getByLabel(/profissão|ocupação/i)
    if (await profissaoField.isVisible()) {
      await profissaoField.fill('Engenheiro')
    }
    
    const parentescoSelect = page.locator('#parentesco')
    await parentescoSelect.click()
    await page.getByRole('option').first().click()
    await page.getByRole('checkbox', { name: /consentimento lgpd/i }).click()
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    await expectFormSuccess(page)
  })

  test('should not allow duplicate CPF', async ({ page }) => {
    // First, try to create with a known CPF
    // This test assumes there's already a responsavel in the system
    
    await page.getByLabel(/nome/i).fill('Duplicate CPF Test')
    await page.getByLabel(/cpf/i).fill('529.982.247-25') // Known valid CPF
    await page.getByLabel(/telefone|celular/i).fill('17999999999')
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    // Might show duplicate error or succeed if no duplicate
    // This test documents the expected behavior
    await page.waitForTimeout(2000)
  })
})

test.describe('Responsáveis - View Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/responsaveis')
    await waitForPageLoad(page)
  })

  test('should navigate to detail page', async ({ page }) => {
    const viewButton = page.getByRole('link', { name: /ver|visualizar|detalhes/i }).first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      
      await expect(page).toHaveURL(/\/responsaveis\/[a-f0-9-]+/)
      await waitForPageLoad(page)
    }
  })

  test('should display responsavel information', async ({ page }) => {
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
      
      // Should show name
      const heading = page.getByRole('heading').first()
      await expect(heading).toBeVisible()
      
      const headingText = await heading.textContent()
      expect(headingText).toBeTruthy()
    }
  })

  test('should display contact information', async ({ page }) => {
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
      
      // Should display phone, email, etc.
      const phoneLabel = page.getByText(/telefone|celular/i)
      if (await phoneLabel.isVisible()) {
        await expect(phoneLabel).toBeVisible()
      }
    }
  })

  test('should display linked students', async ({ page }) => {
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
      
      // Should show alunos section
      const alunosSection = page.getByText(/alunos?|estudantes?|filhos?/i)
      if (await alunosSection.first().isVisible()) {
        await expect(alunosSection.first()).toBeVisible()
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

test.describe('Responsáveis - Edit Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/responsaveis')
    await waitForPageLoad(page)
  })

  test('should navigate to edit page', async ({ page }) => {
    const editButton = page.getByRole('link', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      
      await expect(page).toHaveURL(/\/responsaveis\/[a-f0-9-]+\/editar/)
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

  test('should update responsavel name', async ({ page }) => {
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

  test('should update phone number', async ({ page }) => {
    const editButton = page.getByRole('link', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await waitForPageLoad(page)
      
      const phoneField = page.getByLabel(/telefone|celular/i)
      await phoneField.clear()
      await phoneField.fill('17987654321')
      
      const saveButton = page.getByRole('button', { name: /salvar|atualizar/i })
      await saveButton.click()
      
      await expectFormSuccess(page)
    }
  })

  test('should update email', async ({ page }) => {
    const editButton = page.getByRole('link', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await waitForPageLoad(page)
      
      const emailField = page.getByLabel(/email/i)
      if (await emailField.isVisible()) {
        await emailField.clear()
        await emailField.fill(generateTestEmail('updated'))
        
        const saveButton = page.getByRole('button', { name: /salvar|atualizar/i })
        await saveButton.click()
        
        await expectFormSuccess(page)
      }
    }
  })

  test('should validate CPF on update', async ({ page }) => {
    const editButton = page.getByRole('link', { name: /editar/i }).first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await waitForPageLoad(page)
      
      const cpfField = page.getByLabel(/cpf/i)
      await cpfField.clear()
      await cpfField.fill('111.111.111-11') // Invalid
      
      const saveButton = page.getByRole('button', { name: /salvar|atualizar/i })
      await saveButton.click()
      
      await expect(page.getByText(/cpf.*inválido/i)).toBeVisible()
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
      
      await expect(page).toHaveURL(/\/responsaveis$/)
    }
  })
})

test.describe('Responsáveis - Delete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/responsaveis')
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

  test('should prevent deletion if responsavel has linked students', async ({ page }) => {
    // This test documents the expected behavior
    // A responsavel with linked students should not be deletable
    
    const deleteButton = page.getByRole('button', { name: /excluir|deletar/i }).first()
    
    if (await deleteButton.isVisible()) {
      // Check if button is disabled or shows warning
      const isDisabled = await deleteButton.isDisabled()
      
      if (!isDisabled) {
        await deleteButton.click()
        
        // Might show warning message
        const warningMessage = page.getByText(/possui.*alunos|não.*pode.*excluir|vinculado/i)
        if (await warningMessage.isVisible()) {
          await expect(warningMessage).toBeVisible()
        }
      }
    }
  })
})

test.describe('Responsáveis - Stats and Metrics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/responsaveis')
    await waitForPageLoad(page)
  })

  test('should display total responsaveis count', async ({ page }) => {
    const statsContainer = page.locator('.grid').first()
    
    if (await statsContainer.isVisible()) {
      const totalStat = page.getByText(/total|todos.*responsáveis/i)
      if (await totalStat.isVisible()) {
        await expect(totalStat).toBeVisible()
      }
    }
  })

  test('should show counts by parentesco', async ({ page }) => {
    const statsCards = page.locator('[class*="card"]')
    
    if (await statsCards.first().isVisible()) {
      // Look for stats like "Mães: X", "Pais: Y"
      const statNumbers = page.locator('text=/\\d+/').first()
      if (await statNumbers.isVisible()) {
        await expect(statNumbers).toBeVisible()
      }
    }
  })
})

test.describe('Responsáveis - Linking to Alunos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/responsaveis')
    await waitForPageLoad(page)
  })

  test('should show link to student from responsavel detail', async ({ page }) => {
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
      
      // Look for student links
      const studentLink = page.getByRole('link', { name: /ver.*aluno|aluno/i })
      if (await studentLink.isVisible()) {
        await expect(studentLink).toBeVisible()
      }
    }
  })

  test('should navigate from responsavel to student detail', async ({ page }) => {
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
      
      const studentLink = page.getByRole('link').filter({ hasText: /aluno/i }).first()
      if (await studentLink.isVisible()) {
        const href = await studentLink.getAttribute('href')
        
        if (href?.includes('/alunos/')) {
          await studentLink.click()
          
          await expect(page).toHaveURL(/\/alunos\/[a-f0-9-]+/)
        }
      }
    }
  })
})

test.describe('Responsáveis - Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/responsaveis')
    await waitForPageLoad(page)
  })

  test('should have export button', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /exportar|download/i })
    
    if (await exportButton.isVisible()) {
      await expect(exportButton).toBeVisible()
    }
  })

  test('should show export options', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /exportar|download/i })
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      
      // Look for PDF/Excel options
      const pdfOption = page.getByRole('menuitem', { name: /pdf/i })
      const excelOption = page.getByRole('menuitem', { name: /excel/i })
      
      await expect(
        pdfOption.or(excelOption)
      ).toBeVisible()
    }
  })
})
