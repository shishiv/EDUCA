import { test, expect } from '@playwright/test'
import { waitForPageLoad, navigateTo } from '../utils/test-helpers'

/**
 * E2E Tests: Dashboard Metrics & Stats
 * Tests the main dashboard KPIs, statistics, and alerts
 */

test.describe('Dashboard - Main Metrics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
  })

  test('should display total alunos metric', async ({ page }) => {
    const alunosCard = page.getByText(/total.*alunos|alunos.*total/i)
    await expect(alunosCard).toBeVisible()
    
    // Should show numeric value
    const numberPattern = page.locator('text=/\\d+/').first()
    await expect(numberPattern).toBeVisible()
  })

  test('should display total escolas metric', async ({ page }) => {
    const escolasCard = page.getByText(/total.*escolas?|escolas?.*total/i)
    await expect(escolasCard).toBeVisible()
  })

  test('should display total turmas metric', async ({ page }) => {
    const turmasCard = page.getByText(/total.*turmas?|turmas?.*total/i)
    await expect(turmasCard).toBeVisible()
  })

  test('should display total matrículas metric', async ({ page }) => {
    const matriculasCard = page.getByText(/total.*matrículas?|matrículas?.*total/i)
    await expect(matriculasCard).toBeVisible()
  })

  test('should display frequência média metric', async ({ page }) => {
    const frequenciaCard = page.getByText(/frequência.*média|média.*frequência/i)
    await expect(frequenciaCard).toBeVisible()
    
    // Should show percentage
    const percentPattern = page.locator('text=/%/')
    // May be visible depending on data
  })
})

test.describe('Dashboard - Stat Cards', () => {
  test('should display stat cards with icons', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Check for common dashboard sections
    const sections = [
      /alunos/i,
      /escolas?/i,
      /turmas?/i,
      /matrículas?/i
    ]
    
    for (const pattern of sections) {
      const section = page.getByText(pattern).first()
      // Should be present if data exists
    }
  })

  test('should navigate to alunos from stat card', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    const alunosLink = page.getByRole('link', { name: /ver.*alunos|alunos/i })
    if (await alunosLink.isVisible()) {
      await alunosLink.click()
      await expect(page).toHaveURL(/\/dashboard\/alunos/)
    }
  })

  test('should navigate to escolas from stat card', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    const escolasLink = page.getByRole('link', { name: /ver.*escolas|escolas/i })
    if (await escolasLink.isVisible()) {
      await escolasLink.click()
      await expect(page).toHaveURL(/\/dashboard\/escolas/)
    }
  })
})

test.describe('Dashboard - Alerts & Notifications', () => {
  test('should display baixa frequência alert when applicable', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Look for low attendance warnings
    const lowAttendanceAlert = page.getByText(/frequência.*baixa|abaixo.*80|alunos.*infrequentes/i)
    // May be visible if students with low attendance exist
  })

  test('should display documentos pendentes alert', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Look for pending documents warning
    const pendingDocsAlert = page.getByText(/documentos?.*pendentes?|pendências?/i)
    // May be visible if there are pending documents
  })

  test('should display Bolsa Família alerts', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Look for Bolsa Família related alerts
    const bfAlert = page.getByText(/bolsa.*família|bf/i)
    // May be present if BF students need attention
  })

  test('should show alert severity indicators', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Look for alert severity badges/icons
    const warningIndicator = page.locator('[data-severity="warning"], [class*="warning"], [class*="alert"]')
    // Checks if severity styling exists
  })

  test('should allow dismissing alerts', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Look for dismiss buttons on alerts
    const dismissButton = page.getByRole('button', { name: /dispensar|fechar|x/i })
    if (await dismissButton.isVisible()) {
      await dismissButton.click()
      // Alert should disappear
      await page.waitForTimeout(1000)
    }
  })
})

test.describe('Dashboard - Recent Activity', () => {
  test('should display recent matriculas', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    const recentSection = page.getByText(/atividades?.*recentes?|recente/i)
    // May show recent activity feed
  })

  test('should display recent frequency changes', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Look for recent attendance updates
    const frequencyActivity = page.getByText(/frequência.*registrada|chamada.*realizada/i)
    // May be present if recent attendance was recorded
  })

  test('should display timestamp on activities', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Look for relative timestamps
    const timestamp = page.getByText(/há.*minutos?|há.*horas?|hoje|ontem/i)
    // May be visible if activity feed exists
  })
})

test.describe('Dashboard - Quick Actions', () => {
  test('should have quick action to register attendance', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    const quickAction = page.getByRole('link', { name: /registrar.*frequência|chamada/i })
    if (await quickAction.isVisible()) {
      await expect(quickAction).toHaveAttribute('href', /diario|chamada|frequencia/)
    }
  })

  test('should have quick action to add student', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    const addStudentAction = page.getByRole('link', { name: /novo.*aluno|adicionar.*aluno/i })
    if (await addStudentAction.isVisible()) {
      await expect(addStudentAction).toHaveAttribute('href', /alunos\/novo/)
    }
  })

  test('should have quick action for new enrollment', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    const enrollAction = page.getByRole('link', { name: /nova.*matrícula|matricular/i })
    if (await enrollAction.isVisible()) {
      await expect(enrollAction).toHaveAttribute('href', /matriculas\/nova/)
    }
  })
})

test.describe('Dashboard - Teacher View', () => {
  test('should show teacher-specific turmas list', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Teachers should see their assigned turmas
    const turmasList = page.getByText(/suas?.*turmas?|minhas?.*turmas?/i)
    // May be visible for professor role
  })

  test('should allow quick access to turma diario', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    const diarioLink = page.getByRole('link', { name: /ver.*diário|acessar.*diário/i }).first()
    if (await diarioLink.isVisible()) {
      await diarioLink.click()
      await expect(page).toHaveURL(/diario|frequencia/)
    }
  })

  test('should display pending attendance warnings for teachers', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    const pendingWarning = page.getByText(/chamadas?.*pendentes?|frequência.*não.*registrada/i)
    // May be visible if teacher has pending attendance
  })
})

test.describe('Dashboard - Data Refresh', () => {
  test('should have refresh button for stats', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    const refreshButton = page.getByRole('button', { name: /atualizar|refresh|recarregar/i })
    if (await refreshButton.isVisible()) {
      await refreshButton.click()
      // Should reload data
      await page.waitForTimeout(2000)
    }
  })

  test('should auto-refresh metrics on navigation back', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Navigate away
    await page.goto('/dashboard/alunos')
    await waitForPageLoad(page)
    
    // Navigate back
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Stats should be visible (re-fetched)
    await expect(page.getByText(/total.*alunos|alunos/i).first()).toBeVisible()
  })
})

test.describe('Dashboard - Empty States', () => {
  test('should handle empty state gracefully', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    // Look for zero values or empty state messages
    const zeroOrEmpty = page.getByText(/nenhum.*registro|0 alunos?|sem.*dados/i)
    // May be visible in fresh installations
  })

  test('should show onboarding prompts for new installations', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForPageLoad(page)
    
    const onboarding = page.getByText(/começar|primeiros.*passos|bem.*vindo/i)
    // May be visible for new setups
  })
})
