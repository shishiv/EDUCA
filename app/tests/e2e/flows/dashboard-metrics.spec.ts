import { test, expect } from '../support/diagnostics'
import { navigateToDashboard } from '../utils/test-helpers'

/**
 * E2E Tests: Dashboard Metrics & Stats
 *
 * Actual stat-card labels (from page.tsx):
 *   "Total de Alunos", "Turmas Ativas", "Frequência Média", "Professores Ativos"
 * Quick-access items visible to admin:
 *   "Novo Aluno", "Matrícula", "Frequência", "Nova Turma", "Relatórios", "Config"
 */

test.describe('Dashboard - Page Loads', () => {
  test('dashboard renders greeting and network heading', async ({ page }) => {
    await navigateToDashboard(page)
    await expect(page.getByRole('region', { name: 'Dashboard', exact: true }).getByText(/Rede Municipal de Educação/)).toBeVisible()
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
    await expect(page.getByText('Frequência Média')).toBeVisible()
  })

  test('should display Professores Ativos stat card', async ({ page }) => {
    await expect(page.locator('.app-metric__label').getByText('Professores Ativos', { exact: true })).toBeVisible()
  })

  test('stat cards contain numeric values', async ({ page }) => {
    const values = page.getByRole('region', { name: 'Dashboard', exact: true }).getByRole('article').locator('strong')
    await expect(values).toHaveCount(4)
    for (const value of await values.all()) {
      await expect(value).toHaveText(/^\d[\d.,]*%?$/)
    }
  })
})

test.describe('Dashboard - Navigation', () => {
  test('quick-access Novo Aluno navigates to alunos/novo', async ({ page }) => {
    await navigateToDashboard(page)
    // Click the quick-access tile (span with text-xs class, not sidebar)
    await page.locator('span:text-is("Novo Aluno")').first().click()
    await expect(page).toHaveURL(/\/dashboard\/alunos\/novo/)
  })

  test('quick-access Nova Turma navigates to turmas/nova', async ({ page }) => {
    await navigateToDashboard(page)
    await page.locator('span:text-is("Nova Turma")').first().click()
    await expect(page).toHaveURL(/\/dashboard\/turmas\/nova/)
  })

  test('Relatórios hub links to the implemented report routes', async ({ page }) => {
    await navigateToDashboard(page)
    await page
      .getByRole('navigation', { name: 'Acessos rápidos' })
      .getByRole('link', { name: 'Relatórios', exact: true })
      .click()
    await expect(page).toHaveURL(/\/dashboard\/relatorios/)
    const reports = page.getByRole('region', { name: 'Relatórios' })
    await expect(reports.getByRole('link', { name: /^Frequência\b/i })).toHaveAttribute('href', '/relatorios/frequencia')
    await expect(reports.getByRole('link', { name: /^Conteúdo\b/i })).toHaveAttribute('href', '/relatorios/conteudo')
    await expect(reports.getByRole('link', { name: /^Bolsa Família\b/i })).toHaveAttribute('href', '/relatorios/bolsa-familia')

    await reports.getByRole('link', { name: /^Frequência\b/i }).click()
    await expect(page).toHaveURL(/\/relatorios\/frequencia/)
  })

  test('Diário page loads from the shared navigation', async ({ page }) => {
    await navigateToDashboard(page)
    await page.getByRole('link', { name: /Diário de Classe/i }).first().click()
    await expect(page).toHaveURL(/\/diario/)
    await expect(page.getByText(/diário/i).first()).toBeVisible({ timeout: 20000 })
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
    await navigateToDashboard(page)
    await expect(page.getByText('Minhas Turmas')).toBeVisible()
  })

  test('Turmas ativas description is visible', async ({ page }) => {
    await navigateToDashboard(page)
    await expect(page.getByRole('region', { name: 'Minhas Turmas' }).getByText(/Turmas ativas no ano letivo \d{4}/)).toBeVisible()
  })
})

test.describe('Dashboard - Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 })
    await navigateToDashboard(page)
  })

  test('bottom navigation exposes only implemented routes', async ({ page }) => {
    const nav = page.getByLabel(/navegação principal mobile/i)
    await expect(nav).toBeVisible()
    await expect(nav.getByRole('link', { name: /frequência/i })).toHaveAttribute('href', '/dashboard/turmas')
    await expect(nav.getByRole('link', { name: /relatórios/i })).toHaveAttribute('href', '/dashboard/relatorios')
  })

  test('drawer opens, exposes role-allowed links and closes', async ({ page }) => {
    await page.getByRole('button', { name: /abrir menu/i }).click()
    const drawer = page.getByRole('dialog', { name: 'Menu principal' })
    await expect(drawer.getByRole('link', { name: 'Alunos', exact: true })).toBeVisible()
    await drawer.getByRole('button', { name: /fechar sidebar/i }).click()
    await expect(drawer).toBeHidden()
  })
})

test.describe('Dashboard - Sidebar Navigation', () => {
  test('sidebar nav links are present', async ({ page }) => {
    await navigateToDashboard(page)
    const sidebar = page.getByRole('complementary', { name: /navegação principal/i })
    await expect(sidebar).toBeVisible()
  })

  test('navigate to Alunos via sidebar', async ({ page }) => {
    await navigateToDashboard(page)
    const sidebar = page.getByRole('complementary', { name: /navegação principal/i })
    await sidebar.getByRole('link', { name: 'Alunos', exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard\/alunos/)
  })

  test('shared shell keeps route context on a secondary screen', async ({ page }) => {
    await navigateToDashboard(page)

    const sidebar = page.getByRole('complementary', { name: /navegação principal/i })
    await sidebar.getByRole('link', { name: 'Alunos', exact: true }).click()

    await expect(page).toHaveURL(/\/dashboard\/alunos/)
    await expect(page.getByRole('navigation', { name: 'Alunos' })).toContainText('Alunos')
    await expect(
      sidebar.getByRole('link', { name: 'Alunos', exact: true })
    ).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { name: 'Alunos', exact: true })).toBeVisible()
  })
})
