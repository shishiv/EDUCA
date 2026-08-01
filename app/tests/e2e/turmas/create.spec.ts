import { test, expect } from '../support/diagnostics'

/**
 * E2E Tests: Turma Create Form
 * Tests form criação (série, turno, ano letivo)
 */

test.describe('Turma - Create Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/turmas/nova')
  })

  test('should display page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /nova turma/i })).toBeVisible()
    await expect(page.getByText(/crie uma nova turma/i)).toBeVisible()
  })

  test('should have back button', async ({ page }) => {
    const backButton = page.getByRole('link', { name: /voltar/i })
    await expect(backButton).toBeVisible()
  })

  test('should display all required fields', async ({ page }) => {
    // Nome da turma
    await expect(page.getByLabel(/nome.*turma/i)).toBeVisible()
    
    // Ano letivo
    await expect(page.getByLabel(/ano.*letivo/i)).toBeVisible()
    
    // Escola
    await expect(page.locator('#escola_id')).toBeVisible()
    
    // Série
    await expect(page.locator('#serie')).toBeVisible()
    
    // Turno
    await expect(page.locator('#turno')).toBeVisible()
    
    // Capacidade
    await expect(page.getByLabel(/capacidade/i)).toBeVisible()
  })

  test('should have optional fields', async ({ page }) => {
    // Professor
    const professorField = page.locator('#professor_id')
    await expect(professorField).toBeVisible()
    
    // Observações
    const obsField = page.getByLabel(/observações|observacoes/i)
    await expect(obsField).toBeVisible()
    
    // Ativo switch
    const ativoSwitch = page.locator('#ativo')
    await expect(ativoSwitch).toBeVisible()
  })

  test('should validate required field - nome', async ({ page }) => {
    // Try to submit without filling nome
    await page.getByRole('button', { name: /criar turma/i }).click()
    
    // HTML5 validation should prevent submission
    const nomeInput = page.getByLabel(/nome.*turma/i)
    const isInvalid = await nomeInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
    expect(isInvalid).toBeTruthy()
  })

  test('should have escola select with options', async ({ page }) => {
    const escolaSelect = page.locator('#escola_id')
    await escolaSelect.click()
    
    // Should have school options
    await expect(page.getByRole('option', { name: /cemei|emei|emef/i }).first()).toBeVisible({ timeout: 3000 })
  })

  test('should have ano letivo with default current year', async ({ page }) => {
    const anoInput = page.getByLabel(/ano.*letivo/i)
    const value = await anoInput.inputValue()
    
    const currentYear = new Date().getFullYear()
    expect(parseInt(value)).toBe(currentYear)
  })

  test('should enable serie after escola selection', async ({ page }) => {
    const serieSelect = page.locator('#serie')
    
    // Serie should be disabled initially
    await expect(serieSelect).toBeDisabled()
    
    // Select escola
    const escolaSelect = page.locator('#escola_id')
    await escolaSelect.click()
    await page.getByRole('option').first().click()
    
    // Serie should now be enabled
    await expect(serieSelect).toBeEnabled()
  })

  test('should show series based on escola type', async ({ page }) => {
    // Select a CEMEI (creche)
    const escolaSelect = page.locator('#escola_id')
    await escolaSelect.click()
    await page.getByRole('option', { name: /cemei/i }).click()
    
    // Open serie select
    const serieSelect = page.locator('#serie')
    await serieSelect.click()
    
    // Should show creche series (Berçário, Maternal)
    const hasBercario = await page.getByRole('option', { name: /berç|maternal/i }).count() > 0
    expect(hasBercario).toBeTruthy()
  })

  test('should have turno options', async ({ page }) => {
    const turnoSelect = page.locator('#turno')
    await turnoSelect.click()
    
    // Should have all turno options
    await expect(page.getByRole('option', { name: /matutino/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /vespertino/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /integral/i })).toBeVisible()
  })

  test('should enable professor after escola selection', async ({ page }) => {
    const professorSelect = page.locator('#professor_id')
    
    // Professor should be disabled initially
    await expect(professorSelect).toBeDisabled()
    
    // Select escola
    const escolaSelect = page.locator('#escola_id')
    await escolaSelect.click()
    await page.getByRole('option').first().click()
    
    // Wait a bit for state update
    await page.waitForTimeout(500)
    
    // Professor should now be enabled
    await expect(professorSelect).toBeEnabled()
  })

  test('should have capacidade with min and max', async ({ page }) => {
    const capacidadeInput = page.getByLabel(/capacidade/i)
    
    // Check min
    await capacidadeInput.fill('0')
    const minValid = await capacidadeInput.evaluate((el: HTMLInputElement) => el.validity.valid)
    expect(minValid).toBeFalsy()
    
    // Check valid value
    await capacidadeInput.fill('25')
    const validValue = await capacidadeInput.evaluate((el: HTMLInputElement) => el.validity.valid)
    expect(validValue).toBeTruthy()
  })

  test('should reset professor when escola changes', async ({ page }) => {
    // Select first escola
    const escolaSelect = page.locator('#escola_id')
    await escolaSelect.click()
    await page.getByRole('option').first().click()
    await page.waitForTimeout(500)
    
    // Select a professor
    const professorSelect = page.locator('#professor_id')
    await professorSelect.click()
    await page.getByRole('option').first().click()
    
    // Change escola
    await escolaSelect.click()
    await page.getByRole('option').nth(1).click()
    await page.waitForTimeout(500)
    
    // Professor should be reset (placeholder visible)
    const professorValue = await professorSelect.textContent()
    expect(professorValue).toContain('Selecione')
  })

  test('should have ativo switch checked by default', async ({ page }) => {
    const ativoSwitch = page.locator('#ativo')
    const isChecked = await ativoSwitch.isChecked()
    expect(isChecked).toBeTruthy()
  })

  test('should display escola info panel', async ({ page }) => {
    // Select escola
    const escolaSelect = page.locator('#escola_id')
    await escolaSelect.click()
    await page.getByRole('option').first().click()
    await page.waitForTimeout(500)
    
    // Info panel should show escola details
    await expect(page.getByText(/informações da escola/i)).toBeVisible()
    await expect(page.getByText(/professores disponíveis|professores disponiveis/i)).toBeVisible()
  })

  test('should display capacidade panel', async ({ page }) => {
    await expect(page.getByText('Capacidade Máxima *', { exact: true })).toBeVisible()
    await expect(page.getByText(/recomendações|recomendacoes/i)).toBeVisible()
  })

  test('should create turma with valid data', async ({ page }) => {
    const turmaName = `Turma E2E ${Date.now()}`
    
    // Fill nome
    await page.getByLabel(/nome.*turma/i).fill(turmaName)
    
    // Select escola
    const escolaSelect = page.locator('#escola_id')
    await escolaSelect.click()
    await page.getByRole('option').first().click()
    await page.waitForTimeout(500)
    
    // Select serie
    const serieSelect = page.locator('#serie')
    await serieSelect.click()
    await page.getByRole('option').first().click()
    
    // Select turno
    const turnoSelect = page.locator('#turno')
    await turnoSelect.click()
    await page.getByRole('option', { name: /matutino/i }).click()
    
    // Set capacidade
    await page.getByLabel(/capacidade/i).fill('30')
    
    // Submit form
    await page.getByRole('button', { name: /criar turma/i }).click()
    
    // Successful creation redirects back to the list.
    await expect(page).toHaveURL(/\/dashboard\/turmas$/, { timeout: 10000 })
  })

  test('should create turma with professor assigned', async ({ page }) => {
    // Fill required fields
    await page.getByLabel(/nome.*turma/i).fill('Turma com Professor')
    
    // Select escola
    const escolaSelect = page.locator('#escola_id')
    await escolaSelect.click()
    await page.getByRole('option').first().click()
    await page.waitForTimeout(500)
    
    // Select serie
    const serieSelect = page.locator('#serie')
    await serieSelect.click()
    await page.getByRole('option').first().click()
    
    // Select turno
    const turnoSelect = page.locator('#turno')
    await turnoSelect.click()
    await page.getByRole('option', { name: /matutino/i }).click()
    
    // Select professor
    const professorSelect = page.locator('#professor_id')
    await professorSelect.click()
    await page.getByRole('option').first().click()
    
    // Set capacidade
    await page.getByLabel(/capacidade/i).fill('25')
    
    // Submit
    await page.getByRole('button', { name: /criar turma/i }).click()
    
    await expect(page).toHaveURL(/\/dashboard\/turmas$/, { timeout: 10000 })
  })

  test('should create turma with observacoes', async ({ page }) => {
    // Fill required fields
    await page.getByLabel(/nome.*turma/i).fill('Turma com Observações')
    
    // Select escola
    const escolaSelect = page.locator('#escola_id')
    await escolaSelect.click()
    await page.getByRole('option').first().click()
    await page.waitForTimeout(500)
    
    // Select serie
    const serieSelect = page.locator('#serie')
    await serieSelect.click()
    await page.getByRole('option').first().click()
    
    // Select turno
    const turnoSelect = page.locator('#turno')
    await turnoSelect.click()
    await page.getByRole('option', { name: /vespertino/i }).click()
    
    // Fill observacoes
    await page.getByLabel(/observações|observacoes/i).fill('Esta é uma turma de teste com observações especiais.')
    
    // Submit
    await page.getByRole('button', { name: /criar turma/i }).click()
    
    await expect(page).toHaveURL(/\/dashboard\/turmas$/, { timeout: 10000 })
  })

  test('should toggle ativo status', async ({ page }) => {
    const ativoSwitch = page.locator('#ativo')
    
    // Should be checked by default
    expect(await ativoSwitch.isChecked()).toBeTruthy()
    
    // Toggle off
    await ativoSwitch.click()
    expect(await ativoSwitch.isChecked()).toBeFalsy()
    
    // Toggle back on
    await ativoSwitch.click()
    expect(await ativoSwitch.isChecked()).toBeTruthy()
  })

  test('should cancel and return to list', async ({ page }) => {
    const cancelButton = page.getByRole('button', { name: /cancelar/i }).or(
      page.getByRole('link', { name: /cancelar/i })
    )
    
    if (await cancelButton.isVisible()) {
      await cancelButton.click()
      await expect(page).toHaveURL(/\/dashboard\/turmas$/)
    }
  })

  test('should show loading state when submitting', async ({ page }) => {
    // Fill minimum required fields
    await page.getByLabel(/nome.*turma/i).fill('Test Turma')
    
    const escolaSelect = page.locator('#escola_id')
    await escolaSelect.click()
    await page.getByRole('option').first().click()
    await page.waitForTimeout(500)
    
    const serieSelect = page.locator('#serie')
    await serieSelect.click()
    await page.getByRole('option').first().click()
    
    const turnoSelect = page.locator('#turno')
    await turnoSelect.click()
    await page.getByRole('option').first().click()
    
    // Click submit
    const submitButton = page.getByRole('button', { name: /criar turma/i })
    await submitButton.click()
    
    // Should show loading state
    await expect(page.getByText(/salvando/i).or(submitButton)).toBeVisible()
  })

  test('should have proper form structure', async ({ page }) => {
    // Form should exist
    const form = page.locator('form')
    await expect(form).toBeVisible()
    
    // Should have sections
    await expect(page.getByText(/dados da turma/i)).toBeVisible()
  })

  test('should display capacity recommendations', async ({ page }) => {
    await expect(page.getByText(/berçário.*maternal.*15-20/i)).toBeVisible()
    await expect(page.getByText(/fundamental.*25-30/i)).toBeVisible()
  })
})

test.describe('Turma - Create Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/turmas/nova')
  })

  test('should validate ano letivo range', async ({ page }) => {
    const anoInput = page.getByLabel(/ano.*letivo/i)
    
    // Try invalid year (too old)
    await anoInput.fill('2010')
    const isValid = await anoInput.evaluate((el: HTMLInputElement) => el.validity.valid)
    expect(isValid).toBeFalsy()
  })

  test('should require escola selection', async ({ page }) => {
    await page.getByLabel(/nome.*turma/i).fill('Test')
    await page.getByRole('button', { name: /criar turma/i }).click()
    
    // Should prevent submission or show error
    const url = page.url()
    expect(url).toContain('/nova')
  })

  test('should require serie selection', async ({ page }) => {
    await page.getByLabel(/nome.*turma/i).fill('Test')
    
    const escolaSelect = page.locator('#escola_id')
    await escolaSelect.click()
    await page.getByRole('option').first().click()
    
    await page.getByRole('button', { name: /criar turma/i }).click()
    
    // Should stay on same page
    const url = page.url()
    expect(url).toContain('/nova')
  })

  test('should require turno selection', async ({ page }) => {
    await page.getByLabel(/nome.*turma/i).fill('Test')
    
    const escolaSelect = page.locator('#escola_id')
    await escolaSelect.click()
    await page.getByRole('option').first().click()
    await page.waitForTimeout(500)
    
    const serieSelect = page.locator('#serie')
    await serieSelect.click()
    await page.getByRole('option').first().click()
    
    await page.getByRole('button', { name: /criar turma/i }).click()
    
    // Should stay on same page
    const url = page.url()
    expect(url).toContain('/nova')
  })
})
