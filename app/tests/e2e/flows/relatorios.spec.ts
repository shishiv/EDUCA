import { test, expect } from '../support/diagnostics'

// The hub routes to the canonical reports. Report data, filters and exports
// are exercised by reports/{frequency,content,bolsa-familia}.spec.ts.
test.describe('Relatórios: canonical destinations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await expect(page.getByRole('heading', { name: 'Relatórios', exact: true })).toBeVisible()
  })

  test('shows the three available report destinations', async ({ page }) => {
    const reports = page.getByRole('region', { name: 'Relatórios', exact: true })
    await expect(reports.getByRole('link')).toHaveCount(3)
    await expect(reports.getByRole('link', { name: /Frequência/ })).toHaveAttribute('href', '/relatorios/frequencia')
    await expect(reports.getByRole('link', { name: /Conteúdo/ })).toHaveAttribute('href', '/relatorios/conteudo')
    await expect(reports.getByRole('link', { name: /Bolsa Família/ })).toHaveAttribute('href', '/relatorios/bolsa-familia')
  })

  for (const report of [
    { name: 'Frequência', route: '/relatorios/frequencia' },
    { name: 'Conteúdo', route: '/relatorios/conteudo' },
    { name: 'Bolsa Família', route: '/relatorios/bolsa-familia' },
  ]) {
    test(`opens ${report.name} from its card`, async ({ page }) => {
      const reports = page.getByRole('region', { name: 'Relatórios', exact: true })
      await reports.getByRole('link', { name: new RegExp(report.name) }).click()
      await expect(page).toHaveURL(new RegExp(`${report.route}$`))
      await expect(page.getByRole('heading', { name: new RegExp(report.name, 'i'), level: 1 })).toBeVisible()
    })
  }
})
