import { test, expect } from '../support/diagnostics'

const classLinks = (page: import('@playwright/test').Page) =>
  page.locator('a[href^="/dashboard/turmas/"]:not([href="/dashboard/turmas/nova"])')

async function openList(page: import('@playwright/test').Page) {
  await page.goto('/dashboard/turmas')
  await expect(page.getByRole('heading', { name: 'Turmas', exact: true })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('heading', { name: /Turmas \(\d+\)/ })).toBeVisible()
  await expect(classLinks(page).first()).toBeVisible({ timeout: 15000 })
}

test.describe('Turmas - List View', () => {
  test.beforeEach(async ({ page }) => {
    await openList(page)
  })

  test('displays page actions', async ({ page }) => {
    await expect(page.getByRole('link', { name: /nova turma/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /exportar/i })).toBeVisible()
  })

  test('displays the four statistics', async ({ page }) => {
    const main = page.getByRole('main')
    for (const label of ['Total', 'Ativas', 'Alunos', 'Ocupacao']) {
      await expect(main.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(main.getByText(/%/).first()).toBeVisible()
  })

  test('renders seeded class cards and actions', async ({ page }) => {
    await expect(classLinks(page).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /fazer chamada/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /ver diario/i }).first()).toBeVisible()
    await expect(page.getByText(/matutino|vespertino|integral/i).first()).toBeVisible()
  })

  test('opens class detail from a card', async ({ page }) => {
    await classLinks(page).first().click()
    await expect(page).toHaveURL(/\/dashboard\/turmas\/[0-9a-f-]+$/)
  })

  test('opens class creation', async ({ page }) => {
    await page.getByRole('link', { name: /nova turma/i }).click()
    await expect(page).toHaveURL(/\/dashboard\/turmas\/nova/)
  })
})

test.describe('Turmas - Filters', () => {
  test.beforeEach(async ({ page }) => {
    await openList(page)
  })

  test('has accessible search and select filters', async ({ page }) => {
    await expect(page.getByPlaceholder(/buscar por nome/i)).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Escola' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Serie' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Turno' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Status' })).toBeVisible()
  })

  test('filters by search and updates the observable count', async ({ page }) => {
    const search = page.getByPlaceholder(/buscar por nome/i)
    await search.fill('1º Ano')
    await expect(page.getByRole('heading', { name: /Turmas \(1\)/ })).toBeVisible()
    await expect(classLinks(page)).toHaveCount(1)
  })

  test('shows an empty state for an unmatched query', async ({ page }) => {
    await page.getByPlaceholder(/buscar por nome/i).fill('xyznonexistent123')
    await expect(page.getByText('Nenhuma turma encontrada')).toBeVisible()
    await expect(classLinks(page)).toHaveCount(0)
  })

  test('clears active filters', async ({ page }) => {
    const search = page.getByPlaceholder(/buscar por nome/i)
    await search.fill('xyznonexistent123')
    await page.getByRole('button', { name: 'Limpar', exact: true }).click()
    await expect(search).toHaveValue('')
    await expect(classLinks(page).first()).toBeVisible()
  })

  test('combines series and shift filters', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Serie' }).click()
    await page.getByRole('option', { name: '1º Ano', exact: true }).click()
    await page.getByRole('combobox', { name: 'Turno' }).click()
    await page.getByRole('option', { name: 'Matutino', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Turmas \(1\)/ })).toBeVisible()
  })
})

test.describe('Turmas - Responsive layout', () => {
  test('uses multiple columns on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await openList(page)
    const links = classLinks(page)
    expect(await links.count()).toBeGreaterThan(1)
    const first = await links.nth(0).boundingBox()
    const second = await links.nth(1).boundingBox()
    expect(first?.y).toBe(second?.y)
  })

  test('stacks cards and exposes mobile navigation on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 })
    await openList(page)
    const links = classLinks(page)
    expect(await links.count()).toBeGreaterThan(1)
    const first = await links.nth(0).boundingBox()
    const second = await links.nth(1).boundingBox()
    expect(second!.y).toBeGreaterThan(first!.y)
    await expect(page.getByLabel(/navegacao principal mobile/i)).toBeVisible()
  })
})
