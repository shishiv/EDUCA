import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Turma Detail Page
 * Tests detalhes, lista de alunos
 */

test.describe('Turma - Detail View', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to list first
    await page.goto('/dashboard/turmas')
    await page.waitForTimeout(1000)
    
    // Click on first turma card
    const firstCard = page.locator('a[href*="/dashboard/turmas/"]').first()
    if (await firstCard.isVisible()) {
      await firstCard.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('should display turma header information', async ({ page }) => {
    // Check if we're on a detail page
    await expect(page).toHaveURL(/\/dashboard\/turmas\/[^\/]+$/)
    
    // Should have back button
    await expect(page.getByRole('link', { name: /voltar/i })).toBeVisible()
    
    // Should have edit button
    await expect(page.getByRole('link', { name: /editar/i })).toBeVisible()
  })

  test('should display turma name and details', async ({ page }) => {
    // Page should load
    await page.waitForTimeout(1000)
    
    // Should show turma information
    const hasContent = await page.locator('text=/turma|série|serie|ano/i').count() > 0
    expect(hasContent).toBeTruthy()
  })

  test('should display escola information', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    // Should show escola name or info
    const hasEscola = await page.locator('text=/escola|cemei|emei|emef/i').count() > 0
    expect(hasEscola).toBeTruthy()
  })

  test('should display turno badge', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    // Should show turno (Manhã, Tarde, or Integral)
    const hasTurno = await page.locator('text=/manhã|tarde|integral|matutino|vespertino/i').count() > 0
    expect(hasTurno).toBeTruthy()
  })

  test('should display capacidade information', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    // Should show capacity or student count
    const hasCapacidade = await page.locator('text=/capacidade|alunos|vaga/i').count() > 0
    expect(hasCapacidade).toBeTruthy()
  })

  test('should display professor information if assigned', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    // Check for professor section
    const hasProfessor = await page.getByText(/professor/i).count() > 0
    expect(hasProfessor).toBeTruthy()
  })

  test('should display statistics cards', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    // Should have stats cards
    const cards = page.locator('[class*="Card"]')
    const cardCount = await cards.count()
    expect(cardCount).toBeGreaterThan(0)
  })

  test('should show enrollment count', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    // Should show matriculados count
    const hasMatriculados = await page.locator('text=/matriculado/i').count() > 0
    expect(hasMatriculados).toBeTruthy()
  })

  test('should show available spots (vagas)', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    // Should show vagas disponiveis
    const hasVagas = await page.locator('text=/vaga.*disponí|disponí.*vaga/i').count() > 0
    expect(hasVagas).toBeTruthy()
  })

  test('should display students list section', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    // Should have alunos section
    const hasAlunosSection = await page.getByText(/alunos/i).count() > 0
    expect(hasAlunosSection).toBeTruthy()
  })

  test('should display students table if there are enrollments', async ({ page }) => {
    await page.waitForTimeout(1500)
    
    // Check for table or empty state
    const hasTable = await page.locator('table').count() > 0
    const hasEmptyState = await page.getByText(/nenhum aluno/i).isVisible()
    
    expect(hasTable || hasEmptyState).toBeTruthy()
  })

  test('should show student names in list', async ({ page }) => {
    await page.waitForTimeout(1500)
    
    const table = page.locator('table')
    
    if (await table.isVisible()) {
      // Should have table rows
      const rows = table.locator('tbody tr')
      const rowCount = await rows.count()
      
      // If there are rows, check for student data
      if (rowCount > 0) {
        const firstRow = rows.first()
        const hasContent = await firstRow.textContent()
        expect(hasContent).toBeTruthy()
        expect(hasContent!.length).toBeGreaterThan(5)
      }
    }
  })

  test('should show student status badges', async ({ page }) => {
    await page.waitForTimeout(1500)
    
    const table = page.locator('table')
    
    if (await table.isVisible()) {
      // Look for status badges (Ativa, Transferida, etc)
      const hasBadges = await page.locator('[class*="badge"]').or(
        page.locator('text=/ativa|transferid|cancelad/i')
      ).count() > 0
      
      expect(hasBadges).toBeTruthy()
    }
  })

  test('should show student age or birth date', async ({ page }) => {
    await page.waitForTimeout(1500)
    
    const table = page.locator('table')
    
    if (await table.isVisible()) {
      const rows = table.locator('tbody tr')
      if (await rows.count() > 0) {
        // Should show age or date information
        const hasAgeInfo = await page.locator('text=/ano|idade|data/i').count() > 0
        expect(hasAgeInfo).toBeTruthy()
      }
    }
  })

  test('should have navigation to chamada', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    // Look for chamada button/link
    const chamadaLink = page.getByRole('link', { name: /chamada/i }).or(
      page.getByRole('button', { name: /chamada/i })
    )
    
    if (await chamadaLink.count() > 0) {
      await expect(chamadaLink.first()).toBeVisible()
    }
  })

  test('should have navigation to diario', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    // Look for diario button/link
    const diarioLink = page.getByRole('link', { name: /diário|diario/i }).or(
      page.getByRole('button', { name: /diário|diario/i })
    )
    
    if (await diarioLink.count() > 0) {
      await expect(diarioLink.first()).toBeVisible()
    }
  })

  test('should show progress bar for capacity', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    // Look for progress indicator
    const hasProgress = await page.locator('[role="progressbar"]').or(
      page.locator('[class*="progress"]')
    ).count() > 0
    
    expect(hasProgress).toBeTruthy()
  })

  test('should show frequency statistics', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    // Look for frequency/presença information
    const hasFrequencia = await page.locator('text=/frequência|frequencia|presença|presenca/i').count() > 0
    expect(hasFrequencia).toBeTruthy()
  })

  test('should navigate back to list', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    const backButton = page.getByRole('link', { name: /voltar/i })
    await backButton.click()
    
    await expect(page).toHaveURL(/\/dashboard\/turmas$/)
  })

  test('should navigate to edit page', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    const editButton = page.getByRole('link', { name: /editar/i })
    
    if (await editButton.isVisible()) {
      await editButton.click()
      await expect(page).toHaveURL(/\/dashboard\/turmas\/[^\/]+\/edit/)
    }
  })
})

test.describe('Turma - Detail Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/turmas')
    await page.waitForTimeout(1000)
  })

  test('should show empty state when no students enrolled', async ({ page }) => {
    // Try to find a turma with 0 students
    const emptyTurma = page.locator('a[href*="/dashboard/turmas/"]').filter({
      hasText: /0\/|vazia/i
    }).first()
    
    if (await emptyTurma.isVisible()) {
      await emptyTurma.click()
      await page.waitForTimeout(1000)
      
      // Should show empty state
      const hasEmptyMessage = await page.getByText(/nenhum aluno|sem aluno|não há aluno/i).isVisible()
      expect(hasEmptyMessage).toBeTruthy()
    }
  })
})

test.describe('Turma - Students List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/turmas')
    await page.waitForTimeout(1000)
    
    // Click on first turma
    const firstCard = page.locator('a[href*="/dashboard/turmas/"]').first()
    if (await firstCard.isVisible()) {
      await firstCard.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('should display student avatars or initials', async ({ page }) => {
    await page.waitForTimeout(1500)
    
    // Look for avatars
    const hasAvatars = await page.locator('[class*="avatar"]').or(
      page.locator('[class*="Avatar"]')
    ).count() > 0
    
    expect(hasAvatars).toBeTruthy()
  })

  test('should show student gender', async ({ page }) => {
    await page.waitForTimeout(1500)
    
    const table = page.locator('table')
    
    if (await table.isVisible()) {
      // Look for gender indicators (M/F or Masculino/Feminino)
      const hasGender = await page.locator('text=/masculino|feminino|^m$|^f$/i').count() > 0
      expect(hasGender).toBeTruthy()
    }
  })

  test('should be able to click on student row', async ({ page }) => {
    await page.waitForTimeout(1500)
    
    const table = page.locator('table')
    
    if (await table.isVisible()) {
      const rows = table.locator('tbody tr')
      if (await rows.count() > 0) {
        // First row should be clickable or have a link
        const firstRow = rows.first()
        const isClickable = await firstRow.evaluate((el) => {
          return window.getComputedStyle(el).cursor === 'pointer' ||
                 el.querySelector('a') !== null
        })
        
        expect(isClickable).toBeTruthy()
      }
    }
  })

  test('should show enrollment status for each student', async ({ page }) => {
    await page.waitForTimeout(1500)
    
    const table = page.locator('table')
    
    if (await table.isVisible()) {
      const rows = table.locator('tbody tr')
      if (await rows.count() > 0) {
        // Should have situacao/status column
        const hasStatus = await page.locator('th').filter({ hasText: /situação|situacao|status/i }).count() > 0
        expect(hasStatus).toBeTruthy()
      }
    }
  })
})

test.describe('Turma - Detail Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/turmas')
    await page.waitForTimeout(1000)
    
    const firstCard = page.locator('a[href*="/dashboard/turmas/"]').first()
    if (await firstCard.isVisible()) {
      await firstCard.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('should have action buttons', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    // Should have buttons for common actions
    const hasActions = await page.locator('button, a').filter({
      hasText: /chamada|diário|diario|editar|adicionar/i
    }).count() > 0
    
    expect(hasActions).toBeTruthy()
  })

  test('should navigate to chamada page', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    const chamadaButton = page.getByRole('link', { name: /fazer chamada|chamada/i }).first()
    
    if (await chamadaButton.isVisible()) {
      await chamadaButton.click()
      await expect(page).toHaveURL(/\/dashboard\/turmas\/[^\/]+\/chamada/)
    }
  })

  test('should show year (ano letivo)', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    // Should display ano letivo
    const hasAno = await page.locator('text=/202[0-9]|ano.*letivo/i').count() > 0
    expect(hasAno).toBeTruthy()
  })

  test('should display serie information', async ({ page }) => {
    await page.waitForTimeout(1000)
    
    // Should show serie
    const hasSerie = await page.locator('text=/série|serie|ano|berç|maternal|pré/i').count() > 0
    expect(hasSerie).toBeTruthy()
  })
})

test.describe('Turma - Detail Responsiveness', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard/turmas')
    await page.waitForTimeout(1000)
    
    const firstCard = page.locator('a[href*="/dashboard/turmas/"]').first()
    if (await firstCard.isVisible()) {
      await firstCard.click()
      await page.waitForTimeout(1000)
      
      // Page should load and be usable
      await expect(page.getByRole('link', { name: /voltar/i })).toBeVisible()
    }
  })

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/dashboard/turmas')
    await page.waitForTimeout(1000)
    
    const firstCard = page.locator('a[href*="/dashboard/turmas/"]').first()
    if (await firstCard.isVisible()) {
      await firstCard.click()
      await page.waitForTimeout(1000)
      
      // Content should be visible
      const hasContent = await page.locator('[class*="Card"]').count() > 0
      expect(hasContent).toBeTruthy()
    }
  })
})
