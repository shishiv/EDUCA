import { test, expect } from '../support/diagnostics'
import { navigateToDashboard } from '../utils/test-helpers'

let firstStudentPath: string | null = null

async function openFirstStudent(page: import('@playwright/test').Page) {
  if (!firstStudentPath) {
    await page.goto('/dashboard/alunos')
    const link = page
      .locator('a[href^="/dashboard/alunos/"]:not([href="/dashboard/alunos/novo"])')
      .first()
    await expect(link).toBeVisible({ timeout: 15000 })
    firstStudentPath = await link.getAttribute('href')
    expect(firstStudentPath).toBeTruthy()
  }
  await page.goto(firstStudentPath!)
  try {
    await expect(page.getByRole('link', { name: 'Voltar', exact: true })).toBeVisible({ timeout: 5000 })
  } catch {
    // Retry once after the dashboard has refreshed an interrupted auth request.
    await navigateToDashboard(page)
    await page.goto(firstStudentPath!)
    await expect(page.getByRole('link', { name: 'Voltar', exact: true })).toBeVisible({ timeout: 15000 })
  }
}

test.describe('Student detail', () => {
  test.beforeEach(async ({ page }) => {
    await openFirstStudent(page)
  })

  test('loads directly from a seeded student link', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/alunos\/[a-f0-9-]+$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('shows identity, age and birth date', async ({ page }) => {
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).not.toHaveText('')
    await expect(page.getByText(/\d+ anos?/).first()).toBeVisible()
    await expect(page.getByText(/\d{2}\/\d{2}\/\d{4}/).first()).toBeVisible()
  })

  test('shows personal and family data', async ({ page }) => {
    await expect(page.getByText('Dados Pessoais', { exact: true })).toBeVisible()
    await expect(page.getByText('Data de Nascimento', { exact: true })).toBeVisible()
    await expect(page.getByText('Sexo', { exact: true })).toBeVisible()
    await expect(page.locator('label').filter({ hasText: /^Mae$/ })).toBeVisible()
    await expect(page.locator('label').filter({ hasText: /^Pai$/ })).toBeVisible()
  })

  test('shows enrollment history and attendance summary', async ({ page }) => {
    await expect(page.getByText('Historico de Matriculas', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Frequencia', exact: true })).toBeVisible()
    await expect(page.getByText(/\d+% frequencia/i).first()).toBeVisible()
  })

  test('shows active/class tags', async ({ page }) => {
    await expect(page.getByText(/ativa|ativo/i).first()).toBeVisible()
    await expect(page.getByText(/matutino|vespertino|integral/i).first()).toBeVisible()
  })

  test('back returns to the student list', async ({ page }) => {
    await page.getByRole('link', { name: 'Voltar', exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard\/alunos$/)
  })

  test('edit opens the implemented edit form', async ({ page }) => {
    await page.getByRole('link', { name: 'Editar', exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard\/alunos\/[a-f0-9-]+\/editar$/)
    await expect(page.getByRole('heading', { name: /editar aluno/i })).toBeVisible()
  })

  test('keeps core controls visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 })
    await openFirstStudent(page)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('link', { name: 'Voltar', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Editar', exact: true })).toBeVisible()
  })
})

test('invalid student id shows an explicit error and recovery action', async ({ page }) => {
  await page.goto('/dashboard/alunos/invalid-uuid-12345')
  await expect(page.getByRole('main').getByText(/não encontrado|erro|inválido/i).first()).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('link', { name: /voltar para lista/i })).toBeVisible()
})
