import type { Page } from '@playwright/test'
import { test, expect } from '../support/diagnostics'
import { createDashboardFixture, readDashboardOracle, setFixtureAttendanceBands } from './dashboard-fixture'
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

  test('F09 exact metrics survive school changes and reloads in two academic years', async ({ page }, testInfo) => {
    const fixture = await createDashboardFixture()
    try {
      const cases = [
        { schoolId: fixture.schoolA, school: fixture.schoolAName, year: 2025, students: 3, classes: 2, teachers: 1, facts: 4, present: 3, attendance: 75 },
        { schoolId: fixture.schoolB, school: fixture.schoolBName, year: 2025, students: 1, classes: 1, teachers: 1, facts: 2, present: 2, attendance: 100 },
        { schoolId: fixture.schoolA, school: fixture.schoolAName, year: 2026, students: 2, classes: 1, teachers: 1, facts: 3, present: 1, attendance: 33.3 },
        { schoolId: fixture.schoolB, school: fixture.schoolBName, year: 2026, students: 4, classes: 2, teachers: 2, facts: 5, present: 1, attendance: 20 },
      ]
      for (const { schoolId, school, year, ...expected } of cases) {
        expect(await readDashboardOracle(schoolId, year)).toEqual(expected)
        // There is no year picker. The existing dashboard resolves the browser's civil year.
        await page.clock.setFixedTime(new Date(`${year}-09-17T12:00:00Z`))
        await page.reload()
        const alerts = page.waitForResponse(response => {
          const url = new URL(response.url())
          return url.pathname === '/api/dashboard/alerts' && url.searchParams.get('escolaId') === schoolId
            && url.searchParams.get('year') === String(year)
        })
        await selectDashboardSchool(page, school)
        const alertResponse = await alerts
        // Alerts resolve the server year, independently of the browser clock used for metrics.
        if (year !== new Date().getFullYear()) {
          expect(alertResponse.status()).toBe(409)
          expect(await alertResponse.json()).toEqual({ error: 'Ano letivo desatualizado' })
        } else {
          expect(alertResponse.status()).toBe(200)
        }
        await expectDashboardMetrics(page, year, expected)
        await page.reload()
        await expectDashboardMetrics(page, year, expected)
      }
      await selectDashboardSchool(page, fixture.schoolAName)
      await expectDashboardMetrics(page, 2026, { students: 2, classes: 1, teachers: 1, attendance: 33.3 })
    } finally {
      await testInfo.attach('f09-dashboard-cleanup.json', {
        body: JSON.stringify(await fixture.cleanup()), contentType: 'application/json',
      })
    }
  })

  test('F10 school override survives reload without leaking or hiding missing configuration', async ({ page }, testInfo) => {
    const fixture = await createDashboardFixture()
    try {
      await page.clock.setFixedTime(new Date('2026-09-17T12:00:00Z'))
      await setFixtureAttendanceBands(page.request, fixture.schoolA, { reference: 20, attention: 30 })
      await page.reload()
      await selectDashboardSchool(page, fixture.schoolAName)
      const attendance = page.getByRole('article').filter({ hasText: 'Frequência Média' })
      await expect(attendance.locator('strong')).toHaveText('33.3%')
      await expect(attendance).toHaveAttribute('data-tone', 'teal')
      await page.reload()
      await expect(attendance).toHaveAttribute('data-tone', 'teal')
      await selectDashboardSchool(page, fixture.schoolBName)
      await expect(attendance.locator('strong')).toHaveText('20%')
      await expect(attendance).toHaveAttribute('data-tone', 'warning')
      await setFixtureAttendanceBands(page.request, fixture.schoolA, { reference: 40, attention: 50 })
      await selectDashboardSchool(page, fixture.schoolAName)
      await page.reload()
      await expect(attendance.locator('strong')).toHaveText('33.3%')
      await expect(attendance).toHaveAttribute('data-tone', 'warning')
      await page.route('**/rest/v1/rpc/get_municipal_settings', route => route.fulfill({
        contentType: 'application/json', body: JSON.stringify([{ attendance_bands: null }]),
      }))
      await page.reload()
      await expect(page.getByRole('alert').filter({ hasText: 'Configuração de frequência indisponível' })).toBeVisible()
      await expect(page.locator('.app-metric strong')).toHaveCount(0)
    } finally {
      await testInfo.attach('f10-dashboard-cleanup.json', {
        body: JSON.stringify(await fixture.cleanup()), contentType: 'application/json',
      })
    }
  })

  test('F09 a failed dashboard query is not presented as valid zero metrics', async ({ page }, testInfo) => {
    const fixture = await createDashboardFixture()
    try {
      await page.clock.setFixedTime(new Date('2026-09-17T12:00:00Z'))
      await page.reload()
      await selectDashboardSchool(page, fixture.schoolBName)
      await expectDashboardMetrics(page, 2026, { students: 4, classes: 2, teachers: 2, attendance: 20 })
      await page.route('**/rest/v1/frequencia?*', route => route.fulfill({
        status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'F09 deliberate query failure' }),
      }))
      await page.reload()
      await expect(page.getByRole('alert').filter({ hasText: /dashboard|painel/i })).toBeVisible()
      await expect(page.locator('.app-metric strong')).toHaveCount(0)
      await page.unroute('**/rest/v1/frequencia?*')
      await page.getByRole('button', { name: /tentar novamente/i }).click()
      await expectDashboardMetrics(page, 2026, { students: 4, classes: 2, teachers: 2, attendance: 20 })
      expect(await readDashboardOracle(fixture.schoolB, 2026)).toEqual({
        students: 4, classes: 2, teachers: 2, attendance: 20, facts: 5, present: 1,
      })
    } finally {
      await testInfo.attach('f09-dashboard-cleanup.json', {
        body: JSON.stringify(await fixture.cleanup()), contentType: 'application/json',
      })
    }
  })
})

async function selectDashboardSchool(page: Page, school: string) {
  const selector = page.getByRole('complementary', { name: /navegação principal/i }).getByRole('combobox')
  await selector.click()
  const option = page.getByRole('option', { name: school, exact: true })
  await expect(option).toHaveCount(1)
  await option.click()
  await expect(selector).toHaveText(school)
}

async function expectDashboardMetrics(page: Page, year: number, expected: {
  students: number; classes: number; teachers: number; attendance: number
}) {
  const dashboard = page.getByRole('region', { name: 'Dashboard', exact: true })
  await expect(dashboard.getByRole('article').locator('strong')).toHaveText([
    `${expected.attendance}%`, String(expected.students), String(expected.classes), String(expected.teachers),
  ])
  await expect(page.getByRole('region', { name: 'Minhas Turmas' })).toContainText(`Turmas ativas no ano letivo ${year}`)
  await expect(dashboard).toContainText('1 escola ativa')
}

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
