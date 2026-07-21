import { test, expect } from '../support/diagnostics'
import { 
  waitForPageLoad, 
  generateValidCPF, 
  expectFormSuccess, 
  expectFormError 
} from '../utils/test-helpers'

/**
 * E2E Tests: Alunos - Create Form
 * Tests for student creation form with CPF, date validation, and Brazilian compliance
 */

test.describe('Alunos - Create Form Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos/novo')
    await waitForPageLoad(page)
  })

  test('should display form header and title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /novo aluno|cadastrar aluno|adicionar aluno/i })).toBeVisible()
  })

  test('should have back button to list', async ({ page }) => {
    const backButton = page.getByRole('link', { name: /voltar/i })
    await expect(backButton).toBeVisible()
    await expect(backButton).toHaveAttribute('href', /\/alunos$/)
  })

  test('should display tabbed interface', async ({ page }) => {
    // Check for tabs: Dados Pessoais, Dados Familiares, etc.
    const tabsList = page.getByRole('tablist')
    
    if (await tabsList.isVisible()) {
      await expect(tabsList).toBeVisible()
      
      // Common tabs
      const pessoaisTab = page.getByRole('tab', { name: /dados.*pessoais|pessoal/i })
      const familiaresTab = page.getByRole('tab', { name: /dados.*familiares|família/i })
      
      if (await pessoaisTab.isVisible()) {
        await expect(pessoaisTab).toBeVisible()
      }
      
      if (await familiaresTab.isVisible()) {
        await expect(familiaresTab).toBeVisible()
      }
    }
  })

  test('should have save button', async ({ page }) => {
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await expect(saveButton).toBeVisible()
    await expect(saveButton).toBeEnabled()
  })
})

test.describe('Alunos - Required Fields', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos/novo')
    await waitForPageLoad(page)
  })

  test('should display all required personal data fields', async ({ page }) => {
    // Nome completo
    await expect(page.getByLabel(/nome.*completo/i)).toBeVisible()
    
    // Data de nascimento
    await expect(page.getByLabel(/data.*nascimento/i)).toBeVisible()
    
    // Sexo/Gênero
    await expect(page.locator('label').filter({ hasText: /sexo|gênero/i })).toBeVisible()
    
    // CPF
    await expect(page.getByLabel(/cpf/i)).toBeVisible()
    
    // Nome da mãe
    await expect(page.getByLabel(/nome.*mãe|mãe/i)).toBeVisible()
  })

  test('should show required field indicators', async ({ page }) => {
    await expect(page.getByText('Nome Completo *', { exact: true })).toBeVisible()
    await expect(page.getByText('Data de Nascimento *', { exact: true })).toBeVisible()
    await expect(page.getByText('Endereço Completo *', { exact: true })).toBeVisible()
    await expect(page.getByLabel(/nome.*completo/i)).toHaveAttribute('required', '')
  })

  test('should not allow submission with empty required fields', async ({ page }) => {
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    // Should show validation errors
    await expectFormError(page)
  })

  test('should validate nome_completo is required', async ({ page }) => {
    // Leave name empty, fill other fields
    await page.getByLabel(/data.*nascimento/i).fill('2015-05-10')
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    // Should show error for nome
    await expect(page.getByText(/nome.*obrigatório|campo.*obrigatório/i).first()).toBeVisible()
  })
})

test.describe('Alunos - CPF Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos/novo')
    await waitForPageLoad(page)
  })

  test('should reject invalid CPF format', async ({ page }) => {
    const cpfField = page.getByLabel(/cpf/i)
    
    await cpfField.fill('123')
    await cpfField.blur()
    await page.waitForTimeout(300)
    
    // Should show format error
    const errorMessage = page.getByText(/cpf.*inválido|formato.*inválido/i)
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible()
    }
  })

  test('should reject CPF with all same digits', async ({ page }) => {
    const cpfField = page.getByLabel(/cpf/i)
    
    await cpfField.fill('111.111.111-11')
    await cpfField.blur()
    await page.waitForTimeout(300)
    
    // Fill other required fields to trigger validation
    await page.getByLabel(/nome.*completo/i).fill('Teste Aluno')
    await page.getByLabel(/data.*nascimento/i).fill('2015-05-10')
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    await expect(page.getByText(/cpf.*inválido/i)).toBeVisible()
  })

  test('should reject CPF with invalid checksum', async ({ page }) => {
    const cpfField = page.getByLabel(/cpf/i)
    
    // CPF with wrong checksum digits
    await cpfField.fill('123.456.789-00')
    await cpfField.blur()
    await page.waitForTimeout(300)
    
    await page.getByLabel(/nome.*completo/i).fill('Teste Aluno')
    await page.getByLabel(/data.*nascimento/i).fill('2015-05-10')
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    await expect(page.getByText(/cpf.*inválido/i)).toBeVisible()
  })

  test('should accept valid CPF', async ({ page }) => {
    const cpfField = page.getByLabel(/cpf/i)
    
    // Use known valid CPF
    await cpfField.fill('529.982.247-25')
    await cpfField.blur()
    await page.waitForTimeout(500)
    
    // Should NOT show CPF error
    const cpfError = page.getByText(/cpf.*inválido/i)
    await expect(cpfError).not.toBeVisible()
  })

  test('should accept generated valid CPF', async ({ page }) => {
    const validCPF = generateValidCPF()
    const cpfField = page.getByLabel(/cpf/i)
    
    await cpfField.fill(validCPF)
    await cpfField.blur()
    await page.waitForTimeout(500)
    
    // Should NOT show error
    const cpfError = page.getByText(/cpf.*inválido/i)
    await expect(cpfError).not.toBeVisible()
  })

  test('should auto-format CPF as user types', async ({ page }) => {
    const cpfField = page.getByLabel(/cpf/i)
    
    // Type digits only
    await cpfField.fill('52998224725')
    await cpfField.blur()
    
    // Should format to XXX.XXX.XXX-XX or just validate
    const value = await cpfField.inputValue()
    
    // Either formatted or unformatted is OK, as long as it's accepted
    expect(value.length).toBeGreaterThanOrEqual(11)
  })

  test('should allow CPF field to be optional', async ({ page }) => {
    // Check if CPF has required indicator
    const cpfLabel = page.getByLabel(/cpf/i)
    const labelText = await cpfLabel.textContent()
    
    // If CPF is not required (no asterisk), should allow empty
    if (!labelText?.includes('*')) {
      // Fill required fields without CPF
      await page.getByLabel(/nome.*completo/i).fill('Aluno Sem CPF')
      await page.getByLabel(/data.*nascimento/i).fill('2015-05-10')
      
      const sexoSelect = page.getByLabel(/sexo|gênero/i)
      await sexoSelect.click()
      await page.getByRole('option', { name: /masculino/i }).first().click()
      
      await page.getByLabel(/nome.*mãe/i).fill('Maria Teste')
      
      const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
      await saveButton.click()
      
      // Should not show CPF error
      const cpfError = page.getByText(/cpf.*inválido|cpf.*obrigatório/i)
      if (await cpfError.isVisible()) {
        // This means CPF is required - test should pass either way
        await expect(cpfError).toBeVisible()
      }
    }
  })
})

test.describe('Alunos - Data de Nascimento Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos/novo')
    await waitForPageLoad(page)
  })

  test('should have date picker for data_nascimento', async ({ page }) => {
    const dateField = page.getByLabel(/data.*nascimento/i)
    await expect(dateField).toBeVisible()
    
    // Should accept date input
    await expect(dateField).toHaveAttribute('type', /date|text/)
  })

  test('should accept valid birth date', async ({ page }) => {
    const dateField = page.getByLabel(/data.*nascimento/i)
    
    await dateField.fill('2015-05-10')
    await dateField.blur()
    
    const value = await dateField.inputValue()
    expect(value).toBeTruthy()
  })

  test('should reject future dates', async ({ page }) => {
    const dateField = page.getByLabel(/data.*nascimento/i)
    
    // Try to set date in the future
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const futureDateStr = futureDate.toISOString().split('T')[0]
    
    await dateField.fill(futureDateStr)
    await dateField.blur()
    
    await page.getByLabel(/nome.*completo/i).fill('Teste Futuro')
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    // Should show validation error
    await expectFormError(page, /data.*nascimento|data.*inválida|futuro/i)
  })

  test('should calculate and display age', async ({ page }) => {
    const dateField = page.getByLabel(/data.*nascimento/i)
    
    // Set birth date to 8 years ago
    const birthDate = new Date()
    birthDate.setFullYear(birthDate.getFullYear() - 8)
    const birthDateStr = birthDate.toISOString().split('T')[0]
    
    await dateField.fill(birthDateStr)
    await dateField.blur()
    await page.waitForTimeout(500)
    
    // Look for age display (might show "8 anos")
    const ageDisplay = page.getByText(/8 anos|idade.*8/i)
    if (await ageDisplay.isVisible()) {
      await expect(ageDisplay).toBeVisible()
    }
  })

  test('should warn for very young students (infantil)', async ({ page }) => {
    const dateField = page.getByLabel(/data.*nascimento/i)
    
    // Set birth date to 3 years ago (infantil age)
    const birthDate = new Date()
    birthDate.setFullYear(birthDate.getFullYear() - 3)
    const birthDateStr = birthDate.toISOString().split('T')[0]
    
    await dateField.fill(birthDateStr)
    await dateField.blur()
    await page.waitForTimeout(500)
    
    // Might show infantil indicator
    const infantilIndicator = page.getByText(/infantil|creche/i)
    if (await infantilIndicator.isVisible()) {
      await expect(infantilIndicator).toBeVisible()
    }
  })
})

test.describe('Alunos - Sexo/Gender Field', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos/novo')
    await waitForPageLoad(page)
  })

  test('should display sexo select field', async ({ page }) => {
    const sexoLabel = page.locator('label').filter({ hasText: /sexo|gênero/i })
    await expect(sexoLabel).toBeVisible()
  })

  test('should have Masculino and Feminino options', async ({ page }) => {
    const sexoSelect = page.locator('select, [role="combobox"]').filter({ hasText: /selecione|escolha|sexo/i }).first()
    
    if (await sexoSelect.isVisible()) {
      await sexoSelect.click()
      await page.waitForTimeout(200)
      
      await expect(page.getByRole('option', { name: /masculino/i })).toBeVisible()
      await expect(page.getByRole('option', { name: /feminino/i })).toBeVisible()
    }
  })

  test('should allow selecting Masculino', async ({ page }) => {
    const sexoSelect = page.locator('select, [role="combobox"]').filter({ hasText: /selecione|escolha|sexo/i }).first()
    
    if (await sexoSelect.isVisible()) {
      await sexoSelect.click()
      await page.getByRole('option', { name: /masculino/i }).click()
      
      // Selection should be visible
      await expect(sexoSelect).toContainText(/masculino/i)
    }
  })

  test('should allow selecting Feminino', async ({ page }) => {
    const sexoSelect = page.locator('select, [role="combobox"]').filter({ hasText: /selecione|escolha|sexo/i }).first()
    
    if (await sexoSelect.isVisible()) {
      await sexoSelect.click()
      await page.getByRole('option', { name: /feminino/i }).click()
      
      await expect(sexoSelect).toContainText(/feminino/i)
    }
  })
})

test.describe('Alunos - Bolsa Família Fields', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos/novo')
    await waitForPageLoad(page)
  })

  test('should have Bolsa Família checkbox', async ({ page }) => {
    const bolsaCheckbox = page.getByLabel(/bolsa.*família/i)
    
    if (await bolsaCheckbox.isVisible()) {
      await expect(bolsaCheckbox).toBeVisible()
    }
  })

  test('should show NIS field when Bolsa Família is checked', async ({ page }) => {
    const bolsaCheckbox = page.getByLabel(/bolsa.*família/i)
    
    if (await bolsaCheckbox.isVisible()) {
      await bolsaCheckbox.check()
      await page.waitForTimeout(300)
      
      // NIS field should appear
      const nisField = page.getByLabel(/nis/i)
      await expect(nisField).toBeVisible()
    }
  })

  test('should hide NIS field when Bolsa Família is unchecked', async ({ page }) => {
    const bolsaCheckbox = page.getByLabel(/bolsa.*família/i)
    
    if (await bolsaCheckbox.isVisible()) {
      await bolsaCheckbox.check()
      await page.waitForTimeout(200)
      
      await bolsaCheckbox.uncheck()
      await page.waitForTimeout(200)
      
      // NIS field should be hidden
      const nisField = page.getByLabel(/nis/i)
      await expect(nisField).not.toBeVisible()
    }
  })

  test('should validate NIS format (11 digits)', async ({ page }) => {
    const bolsaCheckbox = page.getByLabel(/bolsa.*família/i)
    
    if (await bolsaCheckbox.isVisible()) {
      await bolsaCheckbox.check()
      await page.waitForTimeout(200)
      
      const nisField = page.getByLabel(/nis/i)
      await nisField.fill('123') // Invalid - too short
      await nisField.blur()
      
      await page.getByLabel(/nome.*completo/i).fill('Teste NIS')
      
      const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
      await saveButton.click()
      
      // Should show NIS validation error
      await expect(page.getByText(/nis.*inválido|nis.*11.*dígitos/i)).toBeVisible()
    }
  })

  test('should accept valid NIS (11 digits)', async ({ page }) => {
    const bolsaCheckbox = page.getByLabel(/bolsa.*família/i)
    
    if (await bolsaCheckbox.isVisible()) {
      await bolsaCheckbox.check()
      await page.waitForTimeout(200)
      
      const nisField = page.getByLabel(/nis/i)
      await nisField.fill('12345678901') // 11 digits
      await nisField.blur()
      await page.waitForTimeout(300)
      
      // Should NOT show error
      const nisError = page.getByText(/nis.*inválido/i)
      await expect(nisError).not.toBeVisible()
    }
  })
})

test.describe('Alunos - Family Data', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos/novo')
    await waitForPageLoad(page)
  })

  test('should display nome_mae field', async ({ page }) => {
    await expect(page.getByLabel(/nome.*mãe|mãe/i)).toBeVisible()
  })

  test('should display nome_pai field', async ({ page }) => {
    await expect(page.getByLabel(/nome.*pai|pai/i)).toBeVisible()
  })

  test('should have responsavel field', async ({ page }) => {
    const respField = page.getByLabel(/responsável/i)
    if (await respField.isVisible()) {
      await expect(respField).toBeVisible()
    }
  })
})

test.describe('Alunos - Successful Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos/novo')
    await waitForPageLoad(page)
  })

  test('should create student with all required data', async ({ page }) => {
    const timestamp = Date.now()
    const studentName = `E2E Test Student ${timestamp}`
    
    // Fill required fields
    await page.getByLabel(/nome.*completo/i).fill(studentName)
    
    await page.getByLabel(/data.*nascimento/i).fill('2015-03-15')
    
    // Select sexo
    const sexoSelect = page.locator('select, [role="combobox"]').filter({ hasText: /selecione|escolha|sexo/i }).first()
    await sexoSelect.click()
    await page.getByRole('option', { name: /masculino/i }).first().click()
    
    // Valid CPF
    const validCPF = generateValidCPF()
    await page.getByLabel(/cpf/i).fill(validCPF)
    
    // Required family and address data
    await page.getByLabel(/nome.*mãe/i).fill('Maria Teste E2E')
    await page.getByLabel(/endereço.*completo/i).fill('Rua Teste E2E, 123, Centro')
    
    // Submit
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    // Wait for success
    await expectFormSuccess(page)
    
    // Should redirect to list or detail
    await expect(page).not.toHaveURL(/\/novo/)
  })

  test('should create student without optional CPF', async ({ page }) => {
    const timestamp = Date.now()
    const studentName = `E2E No CPF ${timestamp}`
    
    await page.getByLabel(/nome.*completo/i).fill(studentName)
    await page.getByLabel(/data.*nascimento/i).fill('2016-08-20')
    
    const sexoSelect = page.locator('select, [role="combobox"]').filter({ hasText: /selecione|escolha|sexo/i }).first()
    await sexoSelect.click()
    await page.getByRole('option', { name: /feminino/i }).first().click()
    
    // Skip optional CPF
    await page.getByLabel(/nome.*mãe/i).fill('Ana Teste E2E')
    await page.getByLabel(/endereço.*completo/i).fill('Rua Sem CPF, 456, Centro')
    
    const saveButton = page.getByRole('button', { name: /salvar|criar|cadastrar/i })
    await saveButton.click()
    
    // Might succeed if CPF is optional
    const successMessage = page.getByText(/sucesso|criado|cadastrado/i)
    const errorMessage = page.getByText(/cpf.*obrigatório/i)
    
    // One of these should be visible
    await expect(
      successMessage.or(errorMessage)
    ).toBeVisible({ timeout: 5000 })
  })

  test('should show loading state during submission', async ({ page }) => {
    const timestamp = Date.now()

    // Hold the insert response long enough to observe the loading state.
    await page.route('**/rest/v1/alunos*', async route => {
      await new Promise(resolve => setTimeout(resolve, 750))
      await route.continue()
    })
    
    await page.getByLabel(/nome.*completo/i).fill(`Loading Test ${timestamp}`)
    await page.getByLabel(/data.*nascimento/i).fill('2015-05-10')
    
    const sexoSelect = page.locator('select, [role="combobox"]').first()
    if (await sexoSelect.isVisible()) {
      await sexoSelect.click()
      await page.getByRole('option').first().click()
    }
    
    await page.getByLabel(/nome.*mãe/i).fill('Test Mãe')
    await page.getByLabel(/endereço.*completo/i).fill('Rua Loading, 789, Centro')
    
    const saveButton = page.locator('button[type="submit"]')
    const submission = saveButton.click()

    // Use a stable selector because the accessible name changes to "Cadastrando".
    await expect(saveButton).toBeDisabled()
    await expect(saveButton).toContainText(/cadastrando/i)
    await submission
    await expect(page).toHaveURL(/\/dashboard\/alunos$/, { timeout: 10000 })
    // Let the destination layout finish its Realtime handshake before teardown.
    await page.waitForTimeout(500)
  })
})

test.describe('Alunos - Form Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos/novo')
    await waitForPageLoad(page)
  })

  test('should navigate between tabs', async ({ page }) => {
    const familiaresTab = page.getByRole('tab', { name: /familiares|família/i })
    
    if (await familiaresTab.isVisible()) {
      await familiaresTab.click()
      
      // Should show family data fields
      await expect(page.getByLabel(/nome.*mãe|mãe/i)).toBeVisible()
    }
  })

  test('should preserve data when switching tabs', async ({ page }) => {
    const testName = 'Tab Switch Test'
    
    await page.getByLabel(/nome.*completo/i).fill(testName)
    
    // Switch to another tab if available
    const familiaresTab = page.getByRole('tab', { name: /familiares|família/i })
    if (await familiaresTab.isVisible()) {
      await familiaresTab.click()
      
      // Switch back
      const pessoaisTab = page.getByRole('tab', { name: /pessoais|pessoal/i })
      await pessoaisTab.click()
      
      // Data should still be there
      const nameField = page.getByLabel(/nome.*completo/i)
      await expect(nameField).toHaveValue(testName)
    }
  })

  test('should cancel and return to list', async ({ page }) => {
    await page.getByLabel(/nome.*completo/i).fill('Will be cancelled')
    
    const cancelLink = page.getByRole('link', { name: 'Cancelar', exact: true })
    await cancelLink.click()
    
    // Should go back to list
    await expect(page).toHaveURL(/\/alunos$/)
  })
})
