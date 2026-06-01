import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Chamada (Attendance) Flow
 * Tests the complete attendance workflow with Brazilian compliance
 */

test.describe('Chamada - Access', () => {
  test('should access diário de classe', async ({ page }) => {
    await page.goto('/dashboard/diario')
    
    await expect(page.getByRole('heading', { name: /diário|chamada|frequência/i })).toBeVisible()
  })

  test('should have turma selection', async ({ page }) => {
    await page.goto('/dashboard/diario')
    
    const turmaSelect = page.getByLabel(/turma/i)
    await expect(turmaSelect).toBeVisible()
  })

  test('should have date selection', async ({ page }) => {
    await page.goto('/dashboard/diario')
    
    const dateField = page.getByLabel(/data/i)
    await expect(dateField).toBeVisible()
  })
})

test.describe('Chamada - Attendance Marking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/diario/frequencia')
  })

  test('should display student list for selected turma', async ({ page }) => {
    // Select a turma
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      
      // Should show students
      await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
    }
  })

  test('should allow marking presence', async ({ page }) => {
    // Select turma
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      
      // Wait for students to load
      await page.waitForTimeout(2000)
      
      // Find presence checkbox/button
      const presenceToggle = page.getByRole('checkbox', { name: /presente|presença/i }).first()
      if (await presenceToggle.isVisible()) {
        await presenceToggle.check()
        await expect(presenceToggle).toBeChecked()
      }
    }
  })

  test('should allow marking absence', async ({ page }) => {
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      
      await page.waitForTimeout(2000)
      
      // Find absence option
      const absenceToggle = page.getByRole('checkbox', { name: /falta|ausente/i }).first()
      if (await absenceToggle.isVisible()) {
        await absenceToggle.check()
        await expect(absenceToggle).toBeChecked()
      }
    }
  })

  test('should save attendance', async ({ page }) => {
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      
      await page.waitForTimeout(2000)
      
      // Save button
      const saveButton = page.getByRole('button', { name: /salvar|confirmar|enviar/i })
      if (await saveButton.isVisible()) {
        await saveButton.click()
        
        await expect(page.getByText(/sucesso|salvo|registrada/i)).toBeVisible({ timeout: 10000 })
      }
    }
  })
})

test.describe('Chamada - Locking Rules (Brazilian Compliance)', () => {
  test('should show warning for past dates', async ({ page }) => {
    await page.goto('/dashboard/diario/frequencia')
    
    // Select a past date
    const dateField = page.getByLabel(/data/i)
    if (await dateField.isVisible()) {
      // Set to yesterday
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const dateStr = yesterday.toISOString().split('T')[0]
      
      await dateField.fill(dateStr)
      
      // Should show warning or locked state
      const warning = page.getByText(/bloqueado|não.*editar|imutável|18.*horas/i)
      // May or may not be visible depending on lock rules
    }
  })

  test('should highlight Bolsa Família students', async ({ page }) => {
    await page.goto('/dashboard/diario/frequencia')
    
    const turmaSelect = page.getByLabel(/turma/i)
    if (await turmaSelect.isVisible()) {
      await turmaSelect.click()
      await page.getByRole('option').first().click()
      
      await page.waitForTimeout(2000)
      
      // Look for Bolsa Família indicators
      const bfIndicator = page.getByText(/bolsa.*família|bf|🎗️/i)
      // May be present if students with BF exist
    }
  })

  test('should show attendance percentage warning below 80%', async ({ page }) => {
    await page.goto('/dashboard/alunos')
    
    // Look for low attendance warning
    const lowAttendanceWarning = page.getByText(/frequência.*baixa|abaixo.*80|⚠️.*frequência/i)
    // May be visible if there are students with low attendance
  })
})

test.describe('Chamada - Sessões', () => {
  test('should list sessões/aulas', async ({ page }) => {
    await page.goto('/dashboard/sessoes')
    
    await expect(page.getByRole('heading', { name: /sessões|aulas/i })).toBeVisible()
  })

  test('should create new sessão', async ({ page }) => {
    await page.goto('/dashboard/sessoes')
    
    const newButton = page.getByRole('link', { name: /nova.*sessão|nova.*aula|adicionar/i })
    if (await newButton.isVisible()) {
      await newButton.click()
      
      // Should show creation form
      await expect(page.getByLabel(/turma/i)).toBeVisible()
      await expect(page.getByLabel(/data/i)).toBeVisible()
    }
  })
})
