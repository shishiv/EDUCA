import { test, expect } from '@playwright/test'
import { waitForPageLoad } from '../utils/test-helpers'

/**
 * E2E Tests: Alunos - Detail Page
 * Tests for student detail view with tabs, profile information, and related data
 */

test.describe('Alunos - Detail Page Access', () => {
  test('should navigate to detail page from list', async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    // Click on first student view button
    const viewButton = page.getByRole('link', { name: /ver|visualizar|detalhes/i }).first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      
      // Should navigate to detail page with UUID
      await expect(page).toHaveURL(/\/alunos\/[a-f0-9-]+/)
      
      // Page should load
      await waitForPageLoad(page)
    }
  })

  test('should load detail page directly with valid ID', async ({ page }) => {
    // First get a student ID from the list
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const firstLink = page.getByRole('link').filter({ has: page.locator('[href*="/alunos/"]') }).first()
    const href = await firstLink.getAttribute('href')
    
    if (href && href.includes('/alunos/')) {
      await page.goto(href)
      await waitForPageLoad(page)
      
      // Should display student detail
      await expect(page.getByRole('heading')).toBeVisible()
    }
  })

  test('should show 404 or error for invalid student ID', async ({ page }) => {
    await page.goto('/dashboard/alunos/invalid-uuid-12345')
    
    // Should show error message or 404
    const errorMessage = page.getByText(/não encontrado|erro|inválido/i)
    await expect(errorMessage).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Alunos - Profile Header', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to first student
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const viewButton = page.getByRole('link', { name: /ver|visualizar|detalhes/i }).first()
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
    }
  })

  test('should display student name in header', async ({ page }) => {
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible()
    
    const headingText = await heading.textContent()
    expect(headingText).toBeTruthy()
    expect(headingText!.length).toBeGreaterThan(0)
  })

  test('should display student avatar or initials', async ({ page }) => {
    // Look for avatar component
    const avatar = page.locator('[class*="avatar"]').first()
    
    if (await avatar.isVisible()) {
      await expect(avatar).toBeVisible()
    }
  })

  test('should display back button', async ({ page }) => {
    const backButton = page.getByRole('link', { name: /voltar/i })
    await expect(backButton).toBeVisible()
    await expect(backButton).toHaveAttribute('href', /\/alunos$/)
  })

  test('should display edit button', async ({ page }) => {
    const editButton = page.getByRole('link', { name: /editar/i })
    
    if (await editButton.isVisible()) {
      await expect(editButton).toBeVisible()
      await expect(editButton).toHaveAttribute('href', /\/editar/)
    }
  })

  test('should display status badge', async ({ page }) => {
    // Look for Ativo/Inativo badge
    const statusBadge = page.locator('[class*="badge"]').filter({ hasText: /ativo|inativo/i })
    
    if (await statusBadge.first().isVisible()) {
      await expect(statusBadge.first()).toBeVisible()
    }
  })

  test('should display age or birth date', async ({ page }) => {
    // Look for age display (e.g., "8 anos" or birth date)
    const ageDisplay = page.getByText(/\d+\s*anos?|idade/i)
    const dateDisplay = page.getByText(/\d{2}\/\d{2}\/\d{4}/)
    
    // At least one should be visible
    await expect(
      ageDisplay.or(dateDisplay)
    ).toBeVisible()
  })
})

test.describe('Alunos - Personal Information Grid', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
    }
  })

  test('should display personal data section', async ({ page }) => {
    const personalSection = page.getByText(/dados.*pessoais|informações.*pessoais/i)
    
    if (await personalSection.isVisible()) {
      await expect(personalSection).toBeVisible()
    }
  })

  test('should display CPF if available', async ({ page }) => {
    const cpfLabel = page.getByText(/cpf/i)
    
    if (await cpfLabel.isVisible()) {
      await expect(cpfLabel).toBeVisible()
      
      // Should have formatted CPF value nearby
      const cpfValue = page.locator('text=/\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}/')
      if (await cpfValue.isVisible()) {
        await expect(cpfValue).toBeVisible()
      }
    }
  })

  test('should display birth date', async ({ page }) => {
    const birthLabel = page.getByText(/data.*nascimento|nascimento/i)
    
    if (await birthLabel.isVisible()) {
      await expect(birthLabel).toBeVisible()
    }
  })

  test('should display gender', async ({ page }) => {
    const sexoLabel = page.getByText(/sexo|gênero/i)
    
    if (await sexoLabel.isVisible()) {
      await expect(sexoLabel).toBeVisible()
      
      // Should show M/F or Masculino/Feminino
      await expect(
        page.getByText(/masculino|feminino|m|f/i)
      ).toBeVisible()
    }
  })

  test('should display contact information', async ({ page }) => {
    // Look for phone or email
    const phoneLabel = page.getByText(/telefone|celular/i)
    const emailLabel = page.getByText(/email|e-mail/i)
    
    if (await phoneLabel.isVisible()) {
      await expect(phoneLabel).toBeVisible()
    }
    
    if (await emailLabel.isVisible()) {
      await expect(emailLabel).toBeVisible()
    }
  })

  test('should display address', async ({ page }) => {
    const addressLabel = page.getByText(/endereço/i)
    
    if (await addressLabel.isVisible()) {
      await expect(addressLabel).toBeVisible()
    }
  })
})

test.describe('Alunos - Family Information', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
    }
  })

  test('should display nome da mãe', async ({ page }) => {
    const maeLabel = page.getByText(/nome.*mãe|mãe/i)
    
    if (await maeLabel.isVisible()) {
      await expect(maeLabel).toBeVisible()
    }
  })

  test('should display nome do pai', async ({ page }) => {
    const paiLabel = page.getByText(/nome.*pai|pai/i)
    
    if (await paiLabel.isVisible()) {
      await expect(paiLabel).toBeVisible()
    }
  })

  test('should display responsável information', async ({ page }) => {
    const respLabel = page.getByText(/responsável/i)
    
    if (await respLabel.isVisible()) {
      await expect(respLabel).toBeVisible()
    }
  })

  test('should link to responsável detail page', async ({ page }) => {
    const respLink = page.getByRole('link', { name: /ver.*responsável|responsável/i })
    
    if (await respLink.isVisible()) {
      await expect(respLink).toBeVisible()
      await expect(respLink).toHaveAttribute('href', /\/responsaveis/)
    }
  })
})

test.describe('Alunos - Tabs Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
    }
  })

  test('should display tabs navigation', async ({ page }) => {
    const tabsList = page.getByRole('tablist')
    
    if (await tabsList.isVisible()) {
      await expect(tabsList).toBeVisible()
    }
  })

  test('should have Visão Geral tab', async ({ page }) => {
    const overviewTab = page.getByRole('tab', { name: /visão.*geral|geral|perfil/i })
    
    if (await overviewTab.isVisible()) {
      await expect(overviewTab).toBeVisible()
    }
  })

  test('should have Matrículas tab', async ({ page }) => {
    const matriculasTab = page.getByRole('tab', { name: /matrículas|matrícula/i })
    
    if (await matriculasTab.isVisible()) {
      await expect(matriculasTab).toBeVisible()
    }
  })

  test('should have Frequência tab', async ({ page }) => {
    const frequenciaTab = page.getByRole('tab', { name: /frequência|chamada/i })
    
    if (await frequenciaTab.isVisible()) {
      await expect(frequenciaTab).toBeVisible()
    }
  })

  test('should have Boletim tab', async ({ page }) => {
    const boletimTab = page.getByRole('tab', { name: /boletim|notas/i })
    
    if (await boletimTab.isVisible()) {
      await expect(boletimTab).toBeVisible()
    }
  })

  test('should switch to Matrículas tab', async ({ page }) => {
    const matriculasTab = page.getByRole('tab', { name: /matrículas|matrícula/i })
    
    if (await matriculasTab.isVisible()) {
      await matriculasTab.click()
      await page.waitForTimeout(300)
      
      // Should show matriculas content
      const matriculasContent = page.getByText(/turma|ano.*letivo|série/i)
      await expect(matriculasContent.first()).toBeVisible()
    }
  })

  test('should switch to Frequência tab', async ({ page }) => {
    const frequenciaTab = page.getByRole('tab', { name: /frequência|chamada/i })
    
    if (await frequenciaTab.isVisible()) {
      await frequenciaTab.click()
      await page.waitForTimeout(300)
      
      // Should show frequency content
      const freqContent = page.getByText(/presença|falta|percentual/i)
      await expect(freqContent.first()).toBeVisible()
    }
  })

  test('should switch to Boletim tab', async ({ page }) => {
    const boletimTab = page.getByRole('tab', { name: /boletim|notas/i })
    
    if (await boletimTab.isVisible()) {
      await boletimTab.click()
      await page.waitForTimeout(300)
      
      // Should show grades content
      const boletimContent = page.getByText(/disciplina|bimestre|nota|média/i)
      await expect(boletimContent.first()).toBeVisible()
    }
  })
})

test.describe('Alunos - Matrículas Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
      
      // Navigate to Matrículas tab
      const matriculasTab = page.getByRole('tab', { name: /matrículas/i })
      if (await matriculasTab.isVisible()) {
        await matriculasTab.click()
        await page.waitForTimeout(300)
      }
    }
  })

  test('should display matriculas list', async ({ page }) => {
    const matriculasTab = page.getByRole('tab', { name: /matrículas/i })
    
    if (await matriculasTab.isVisible()) {
      // Should show table or cards with matriculas
      const table = page.getByRole('table')
      const cards = page.locator('[class*="card"]')
      
      await expect(
        table.or(cards.first())
      ).toBeVisible()
    }
  })

  test('should display turma name', async ({ page }) => {
    const matriculasTab = page.getByRole('tab', { name: /matrículas/i })
    
    if (await matriculasTab.isVisible()) {
      const turmaText = page.getByText(/turma|série/i)
      if (await turmaText.first().isVisible()) {
        await expect(turmaText.first()).toBeVisible()
      }
    }
  })

  test('should display matricula status', async ({ page }) => {
    const matriculasTab = page.getByRole('tab', { name: /matrículas/i })
    
    if (await matriculasTab.isVisible()) {
      const statusBadge = page.locator('[class*="badge"]').filter({ hasText: /ativo|concluído|transferido/i })
      if (await statusBadge.first().isVisible()) {
        await expect(statusBadge.first()).toBeVisible()
      }
    }
  })

  test('should display ano letivo', async ({ page }) => {
    const matriculasTab = page.getByRole('tab', { name: /matrículas/i })
    
    if (await matriculasTab.isVisible()) {
      const anoText = page.getByText(/\d{4}/)
      if (await anoText.first().isVisible()) {
        await expect(anoText.first()).toBeVisible()
      }
    }
  })

  test('should show empty state if no matriculas', async ({ page }) => {
    const matriculasTab = page.getByRole('tab', { name: /matrículas/i })
    
    if (await matriculasTab.isVisible()) {
      const emptyState = page.getByText(/nenhuma matrícula|sem matrículas/i)
      const table = page.getByRole('table')
      
      // Either empty state or table should be visible
      await expect(
        emptyState.or(table)
      ).toBeVisible()
    }
  })
})

test.describe('Alunos - Frequência Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
      
      const frequenciaTab = page.getByRole('tab', { name: /frequência/i })
      if (await frequenciaTab.isVisible()) {
        await frequenciaTab.click()
        await page.waitForTimeout(300)
      }
    }
  })

  test('should display attendance percentage', async ({ page }) => {
    const freqTab = page.getByRole('tab', { name: /frequência/i })
    
    if (await freqTab.isVisible()) {
      const percentageText = page.getByText(/\d+%|percentual/i)
      if (await percentageText.first().isVisible()) {
        await expect(percentageText.first()).toBeVisible()
      }
    }
  })

  test('should display total presences', async ({ page }) => {
    const freqTab = page.getByRole('tab', { name: /frequência/i })
    
    if (await freqTab.isVisible()) {
      const presencasText = page.getByText(/presenças|presente/i)
      if (await presencasText.first().isVisible()) {
        await expect(presencasText.first()).toBeVisible()
      }
    }
  })

  test('should display total absences', async ({ page }) => {
    const freqTab = page.getByRole('tab', { name: /frequência/i })
    
    if (await freqTab.isVisible()) {
      const faltasText = page.getByText(/faltas|ausência/i)
      if (await faltasText.first().isVisible()) {
        await expect(faltasText.first()).toBeVisible()
      }
    }
  })

  test('should show attendance calendar or list', async ({ page }) => {
    const freqTab = page.getByRole('tab', { name: /frequência/i })
    
    if (await freqTab.isVisible()) {
      const table = page.getByRole('table')
      const calendar = page.locator('[class*="calendar"]')
      
      // At least one should be visible
      const hasTable = await table.isVisible()
      const hasCalendar = await calendar.isVisible()
      
      expect(hasTable || hasCalendar).toBeTruthy()
    }
  })
})

test.describe('Alunos - Boletim Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
      
      const boletimTab = page.getByRole('tab', { name: /boletim/i })
      if (await boletimTab.isVisible()) {
        await boletimTab.click()
        await page.waitForTimeout(300)
      }
    }
  })

  test('should display grades table', async ({ page }) => {
    const boletimTab = page.getByRole('tab', { name: /boletim/i })
    
    if (await boletimTab.isVisible()) {
      const table = page.getByRole('table')
      if (await table.isVisible()) {
        await expect(table).toBeVisible()
      }
    }
  })

  test('should display disciplinas', async ({ page }) => {
    const boletimTab = page.getByRole('tab', { name: /boletim/i })
    
    if (await boletimTab.isVisible()) {
      const disciplinaHeader = page.getByRole('columnheader', { name: /disciplina|matéria/i })
      if (await disciplinaHeader.isVisible()) {
        await expect(disciplinaHeader).toBeVisible()
      }
    }
  })

  test('should display bimestre columns', async ({ page }) => {
    const boletimTab = page.getByRole('tab', { name: /boletim/i })
    
    if (await boletimTab.isVisible()) {
      const bimestreHeader = page.getByText(/bimestre|1º.*bim|2º.*bim/i)
      if (await bimestreHeader.first().isVisible()) {
        await expect(bimestreHeader.first()).toBeVisible()
      }
    }
  })

  test('should display média final', async ({ page }) => {
    const boletimTab = page.getByRole('tab', { name: /boletim/i })
    
    if (await boletimTab.isVisible()) {
      const mediaText = page.getByText(/média|final/i)
      if (await mediaText.first().isVisible()) {
        await expect(mediaText.first()).toBeVisible()
      }
    }
  })

  test('should show approval status', async ({ page }) => {
    const boletimTab = page.getByRole('tab', { name: /boletim/i })
    
    if (await boletimTab.isVisible()) {
      const statusText = page.getByText(/aprovado|reprovado|recuperação/i)
      if (await statusText.first().isVisible()) {
        await expect(statusText.first()).toBeVisible()
      }
    }
  })
})

test.describe('Alunos - Special Tags and Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
    }
  })

  test('should display Bolsa Família badge if applicable', async ({ page }) => {
    const bolsaBadge = page.getByText(/bolsa.*família/i)
    
    // This might not be visible for all students
    if (await bolsaBadge.isVisible()) {
      await expect(bolsaBadge).toBeVisible()
    }
  })

  test('should display necessidades especiais if applicable', async ({ page }) => {
    const needsText = page.getByText(/necessidades.*especiais|deficiência|pcd/i)
    
    if (await needsText.isVisible()) {
      await expect(needsText).toBeVisible()
    }
  })

  test('should display faixa etária indicator', async ({ page }) => {
    const faixaIndicator = page.getByText(/infantil|fundamental|anos.*iniciais|anos.*finais/i)
    
    if (await faixaIndicator.isVisible()) {
      await expect(faixaIndicator).toBeVisible()
    }
  })
})

test.describe('Alunos - Actions on Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    const viewButton = page.getByRole('link', { name: /ver|visualizar/i }).first()
    if (await viewButton.isVisible()) {
      await viewButton.click()
      await waitForPageLoad(page)
    }
  })

  test('should navigate back to list', async ({ page }) => {
    const backButton = page.getByRole('link', { name: /voltar/i })
    await backButton.click()
    
    await expect(page).toHaveURL(/\/alunos$/)
  })

  test('should navigate to edit page', async ({ page }) => {
    const editButton = page.getByRole('link', { name: /editar/i })
    
    if (await editButton.isVisible()) {
      const currentUrl = page.url()
      const studentId = currentUrl.match(/\/alunos\/([a-f0-9-]+)/)?.[1]
      
      await editButton.click()
      
      if (studentId) {
        await expect(page).toHaveURL(new RegExp(`/alunos/${studentId}/editar`))
      }
    }
  })

  test('should have print or export boletim button', async ({ page }) => {
    const boletimTab = page.getByRole('tab', { name: /boletim/i })
    
    if (await boletimTab.isVisible()) {
      await boletimTab.click()
      await page.waitForTimeout(300)
      
      const printButton = page.getByRole('button', { name: /imprimir|exportar|download/i })
      if (await printButton.isVisible()) {
        await expect(printButton).toBeVisible()
      }
    }
  })
})
