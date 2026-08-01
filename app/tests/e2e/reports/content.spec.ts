import { test, expect } from '../support/diagnostics'

async function openReport(page: import('@playwright/test').Page) {
  await page.goto('/relatorios/conteudo')
  await expect(page.getByRole('heading', { name: /relatorio de conteudo ministrado/i })).toBeVisible({ timeout: 15000 })
}

async function generateReport(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /gerar relatorio/i }).click()
  await expect(page.getByText('Adição com números naturais', { exact: true })).toBeVisible({ timeout: 15000 })
}

test.describe('Content report', () => {
  test.beforeEach(async ({ page }) => {
    await openReport(page)
  })

  test('shows description, filters and disabled export before generation', async ({ page }) => {
    await expect(page.getByText(/visualize o conteudo das aulas/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Filtros', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /exportar pdf/i })).toBeDisabled()
  })

  test('provides accessible class, discipline and period filters', async ({ page }) => {
    await expect(page.getByLabel('Turma', { exact: true })).toBeVisible()
    await expect(page.getByLabel(/disciplina/i)).toBeVisible()
    await expect(page.getByLabel('Periodo', { exact: true })).toBeVisible()
  })

  test('shows custom date controls for a custom period', async ({ page }) => {
    await page.getByLabel('Periodo', { exact: true }).click()
    await page.getByRole('option', { name: /personalizado/i }).click()
    await expect(page.getByRole('button', { name: 'Data Inicio', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Data Fim', exact: true })).toBeVisible()
  })

  test('generates the seeded lesson and summary', async ({ page }) => {
    await generateReport(page)
    await expect(page.getByText('Aulas', { exact: true }).last()).toBeVisible()
    await expect(page.getByText('Habilidades BNCC', { exact: true }).last()).toBeVisible()
    await expect(page.getByText('Media/Aula', { exact: true })).toBeVisible()
    await expect(page.getByText('Disciplinas', { exact: true })).toBeVisible()
  })

  test('shows lesson objective, BNCC skill and methodology', async ({ page }) => {
    await generateReport(page)
    await expect(page.getByText(/resolver e elaborar problemas de adição/i)).toBeVisible()
    await expect(page.getByText('EF01MA06', { exact: true })).toBeVisible()
    await expect(page.getByText(/resolução colaborativa de problemas/i)).toBeVisible()
  })

  test('switches between Aulas, BNCC and Tabela tabs', async ({ page }) => {
    await generateReport(page)
    await page.getByRole('tab', { name: 'BNCC', exact: true }).click()
    await expect(page.getByText('EF01MA06', { exact: true })).toBeVisible()
    await page.getByRole('tab', { name: 'Tabela', exact: true }).click()
    const table = page.getByRole('table')
    await expect(table).toBeVisible()
    await expect(table.getByRole('columnheader', { name: /data/i })).toBeVisible()
    await expect(table.getByRole('columnheader', { name: /tema/i })).toBeVisible()
  })

  test('filters report by a specific class', async ({ page }) => {
    await page.getByLabel('Turma', { exact: true }).click()
    const option = page.getByRole('option').filter({ hasNotText: /todas as turmas/i }).first()
    await option.click()
    await generateReport(page)
    await expect(page.getByText('Adição com números naturais', { exact: true })).toBeVisible()
  })

  test('enables and downloads PDF after generation', async ({ page }) => {
    await generateReport(page)
    const exportButton = page.getByRole('button', { name: /exportar pdf/i })
    await expect(exportButton).toBeEnabled()
    const downloadPromise = page.waitForEvent('download')
    await exportButton.click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('remains usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 })
    await expect(page.getByRole('button', { name: /gerar relatorio/i })).toBeVisible()
    await expect(page.getByLabel('Turma', { exact: true })).toBeVisible()
  })
})
