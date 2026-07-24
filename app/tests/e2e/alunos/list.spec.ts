import { test, expect } from '../support/diagnostics'

const rows = (page: import('@playwright/test').Page) => page.getByRole('table').locator('tbody tr')

async function openList(page: import('@playwright/test').Page) {
  await page.goto('/dashboard/alunos')
  await expect(page.getByRole('heading', { name: 'Alunos', exact: true })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('table')).toBeVisible()
}

test.describe('Students list', () => {
  test.beforeEach(async ({ page }) => {
    await openList(page)
  })

  test('shows actions and summary metrics', async ({ page }) => {
    await expect(page.getByRole('link', { name: /novo aluno/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /exportar/i })).toBeVisible()
    const main = page.getByRole('main')
    for (const label of ['Total', 'Matriculados', 'Não Matriculados', 'NEE']) {
      await expect(main.getByText(label, { exact: true })).toBeVisible()
    }
  })

  test('shows seeded students and accessible table columns', async ({ page }) => {
    expect(await rows(page).count()).toBeGreaterThan(0)
    for (const column of ['Aluno', 'Idade', 'Responsável', 'Escola Atual', 'Status', 'Ações']) {
      await expect(page.getByRole('columnheader', { name: column, exact: true })).toBeVisible()
    }
  })

  test('filters by exact student search and updates count', async ({ page }) => {
    const search = page.getByPlaceholder(/buscar por nome/i)
    await search.fill('Pedro Silva E2E')
    await expect(page.getByRole('heading', { name: /Alunos \(1\)/ })).toBeVisible()
    await expect(rows(page)).toHaveCount(1)
    await expect(page.getByText('Pedro Silva E2E', { exact: true })).toBeVisible()
  })

  test('shows and clears a no-results state', async ({ page }) => {
    const search = page.getByPlaceholder(/buscar por nome/i)
    await search.fill('xyznonexistent123')
    await expect(page.getByText('Nenhum aluno encontrado')).toBeVisible()
    await page.getByRole('button', { name: /limpar filtros/i }).click()
    await expect(search).toHaveValue('')
    expect(await rows(page).count()).toBeGreaterThan(0)
  })

  test('provides accessible status and sex filters', async ({ page }) => {
    await expect(page.getByRole('combobox', { name: 'Status' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Sexo' })).toBeVisible()
  })

  test('filters by female students', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Sexo' }).click()
    await page.getByRole('option', { name: 'Feminino', exact: true }).click()
    await expect(page.getByText('Feminino').first()).toBeVisible()
    const count = await rows(page).count()
    expect(count).toBeGreaterThan(0)
  })

  test('opens student detail through an accessible action', async ({ page }) => {
    const link = page.getByRole('link', { name: /^Ver / }).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/dashboard\/alunos\/[a-f0-9-]+$/)
  })

  test('opens student edit through an accessible action', async ({ page }) => {
    const link = page.getByRole('link', { name: /^Editar / }).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/dashboard\/alunos\/[a-f0-9-]+\/editar$/)
  })

  test('opens and cancels the deactivate confirmation', async ({ page }) => {
    await page.getByRole('button', { name: /^Desativar / }).first().click()
    const dialog = page.getByRole('alertdialog', { name: /desativar aluno/i })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: /cancelar/i }).click()
    await expect(dialog).toBeHidden()
  })

  test('navigates to student creation', async ({ page }) => {
    await page.getByRole('link', { name: /novo aluno/i }).click()
    await expect(page).toHaveURL(/\/dashboard\/alunos\/novo$/)
  })
})

test('student list remains usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 })
  await openList(page)
  await expect(page.getByRole('heading', { name: 'Alunos', exact: true })).toBeVisible()
  await expect(page.getByLabel(/navegacao principal mobile/i)).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
})
