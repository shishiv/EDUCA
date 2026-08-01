import { test, expect } from '../support/diagnostics'
import { navigateToDashboard } from '../utils/test-helpers'

let firstClassPath: string | null = null

async function openFirstClass(page: import('@playwright/test').Page) {
  if (!firstClassPath) {
    await page.goto('/dashboard/turmas')
    const link = page
      .locator('a[href^="/dashboard/turmas/"]:not([href="/dashboard/turmas/nova"])')
      .first()
    await expect(link).toBeVisible({ timeout: 15000 })
    firstClassPath = await link.getAttribute('href')
    expect(firstClassPath).toBeTruthy()
  }

  await page.goto(firstClassPath!)
  try {
    await expect(page.getByText('Informações da Turma', { exact: true })).toBeVisible({ timeout: 5000 })
  } catch {
    await navigateToDashboard(page)
    await page.goto(firstClassPath!)
    await expect(page.getByText('Informações da Turma', { exact: true })).toBeVisible({ timeout: 15000 })
  }
}

test.describe('Class detail', () => {
  test.beforeEach(async ({ page }) => {
    await openFirstClass(page)
  })

  test('shows header actions and identity', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/turmas\/[a-f0-9-]+$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Voltar', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Editar', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /abrir aula/i })).toBeVisible()
  })

  test('shows capacity, attendance and session statistics', async ({ page }) => {
    for (const label of ['Vagas Disponíveis', 'Frequência Média', 'Sessões de Aula']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(
      page.getByRole('paragraph').filter({ hasText: /^Alunos Matriculados$/ })
    ).toBeVisible()
    await expect(page.getByText(/\d+% livre/)).toBeVisible()
  })

  test('shows school, series, shift, teacher, capacity and year', async ({ page }) => {
    for (const label of ['Série', 'Turno', 'Professor Responsável', 'Capacidade', 'Ano Letivo']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(page.getByRole('paragraph').filter({ hasText: /^Status$/ })).toBeVisible()
  })

  test('renders enrolled students with status and profile actions', async ({ page }) => {
    const table = page.getByRole('table').first()
    await expect(table).toBeVisible()
    await expect(table.getByRole('columnheader', { name: 'Aluno', exact: true })).toBeVisible()
    await expect(table.getByRole('columnheader', { name: 'Sexo', exact: true })).toBeVisible()
    await expect(table.getByText(/masculino|feminino/i).first()).toBeVisible()
    await expect(table.getByRole('link', { name: /ver perfil/i }).first()).toBeVisible()
  })

  test('renders student initials in an avatar', async ({ page }) => {
    const table = page.getByRole('table').first()
    await expect(table.locator('.relative.flex.shrink-0.overflow-hidden.rounded-full').first()).toBeVisible()
  })

  test('attendance action points to the implemented route', async ({ page }) => {
    const link = page.getByRole('link', { name: /marcar frequência/i })
    await expect(link).toHaveAttribute('href', /\/diario\/frequencia\?turma=/)
  })

  test('back returns to the class list', async ({ page }) => {
    await page.getByRole('link', { name: 'Voltar', exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard\/turmas$/)
  })

  test('edit opens the implemented form', async ({ page }) => {
    await page.getByRole('link', { name: 'Editar', exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard\/turmas\/[a-f0-9-]+\/editar$/)
    await expect(page.getByRole('heading', { name: /editar turma/i })).toBeVisible()
  })

  test('class attendance route is reachable', async ({ page }) => {
    const classId = firstClassPath!.split('/').pop()
    const path = `/dashboard/turmas/${classId}/chamada`
    await page.goto(path)
    const present = page.getByRole('button', { name: 'Presente' }).first()
    try {
      await expect(present).toBeVisible({ timeout: 5000 })
    } catch {
      await navigateToDashboard(page)
      await page.goto(path)
      await expect(present).toBeVisible({ timeout: 15000 })
    }
  })

  test('remains usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 })
    await openFirstClass(page)
    await expect(page.getByText('Informações da Turma', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.getByLabel(/navegacao principal mobile/i)).toBeVisible()
  })
})
