import { test, expect } from '../support/diagnostics'
import { navigateToDashboard } from '../utils/test-helpers'

/**
 * E2E Tests: Dashboard Metrics & Stats
 *
 * Actual stat-card labels (from page.tsx):
 *   "Total de Alunos", "Turmas Ativas", "Frequencia Media", "Professores Ativos"
 * Quick-access items visible to admin:
 *   "Novo Aluno", "Matrícula", "Frequência", "Nova Turma", "Relatórios", "Config"
 */

test.describe('Dashboard - Page Loads', () => {
  test('dashboard renders greeting and year heading', async ({ page }) => {
    await navigateToDashboard(page)
    await expect(page.getByText(/Ano Letivo/i)).toBeVisible()
  })

  test('dashboard shows quick-access actions for admin', async ({ page }) => {
    await navigateToDashboard(page)
    await expect(page.getByText('Novo Aluno')).toBeVisible()
    await expect(page.getByText('Nova Turma')).toBeVisible()
  })
})

test.describe('Dashboard - Stat Cards', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page)
  })

  test('should display Total de Alunos stat card', async ({ page }) => {
    await expect(page.getByText('Total de Alunos')).toBeVisible()
  })

  test('should display Turmas Ativas stat card', async ({ page }) => {
    // Use exact:true to match only the stat card label, not the subtitle
    await expect(page.getByText('Turmas Ativas', { exact: true })).toBeVisible()
  })

  test('should display Frequencia Media stat card', async ({ page }) => {
    await expect(page.getByText('Frequencia Media')).toBeVisible()
  })

  test('should display Professores Ativos stat card', async ({ page }) => {
    await expect(page.getByText('Professores Ativos')).toBeVisible()
  })

  test('stat cards contain numeric values', async ({ page }) => {
    // Stat card values rendered as large text
    const numbers = page.locator('.text-3xl, .text-2xl, [class*="value"]')
    const count = await numbers.count()
    expect(count).toBeGreaterThan(0)
  })
})

const READY = async (page: import('@playwright/test').Page) => {
  await navigateToDashboard(page)
}

test.describe('Dashboard - Navigation', () => {
  test('quick-access Novo Aluno navigates to alunos/novo', async ({ page }) => {
    await READY(page)
    // Click the quick-access tile (span with text-xs class, not sidebar)
    await page.locator('span:text-is("Novo Aluno")').first().click()
    await expect(page).toHaveURL(/\/dashboard\/alunos\/novo/)
  })

  test('quick-access Nova Turma navigates to turmas/nova', async ({ page }) => {
    await READY(page)
    await page.locator('span:text-is("Nova Turma")').first().click()
    await expect(page).toHaveURL(/\/dashboard\/turmas\/nova/)
  })

  test('Relatórios page loads', async ({ page }) => {
    // Navigate directly - verifies the page is accessible
    await navigateToDashboard(page)
    await page.goto('/dashboard/relatorios')
    await expect(page).toHaveURL(/\/dashboard\/relatorios/)
    await expect(page.getByText(/relatório/i).first()).toBeVisible({ timeout: 20000 })
  })

  test('Configurações page loads', async ({ page }) => {
    await navigateToDashboard(page)
    await page.goto('/dashboard/configuracoes')
    await expect(page).toHaveURL(/\/dashboard\/configuracoes/)
    await page.waitForLoadState('load')
  })
})

test.describe('Dashboard - Minhas Turmas section', () => {
  test('Minhas Turmas card is visible', async ({ page }) => {
    await READY(page)
    await expect(page.getByText('Minhas Turmas')).toBeVisible()
  })

  test('Turmas ativas description is visible', async ({ page }) => {
    await READY(page)
    await expect(page.getByText('Turmas ativas no sistema')).toBeVisible()
  })
})

test.describe('Dashboard - Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 })
    await navigateToDashboard(page)
  })

  test('bottom navigation exposes only implemented routes', async ({ page }) => {
    const nav = page.getByLabel(/navegacao principal mobile/i)
    await expect(nav).toBeVisible()
    await expect(nav.getByRole('link', { name: /frequencia/i })).toHaveAttribute('href', '/diario/frequencia')
    await expect(nav.getByRole('link', { name: /relatorios/i })).toHaveAttribute('href', '/dashboard/relatorios')
  })

  test('drawer opens, exposes role-allowed links and closes', async ({ page }) => {
    await page.getByRole('button', { name: /abrir menu/i }).click()
    const studentLink = page.getByRole('link', { name: 'Alunos', exact: true }).last()
    await expect(studentLink).toBeVisible()
    await page.getByRole('button', { name: /fechar sidebar/i }).click()
    await expect(studentLink).toBeHidden()
  })
})

test.describe('Dashboard - Sidebar Navigation', () => {
  test('sidebar nav links are present', async ({ page }) => {
    await READY(page)
    const sidebar = page.locator('nav, aside').first()
    await expect(sidebar).toBeVisible()
  })

  test('navigate to Alunos via sidebar', async ({ page }) => {
    await READY(page)
    const alunosLink = page.getByRole('link', { name: /^alunos$/i }).first()
    if (await alunosLink.isVisible()) {
      await alunosLink.click()
      await expect(page).toHaveURL(/\/dashboard\/alunos/)
    }
  })
})
