import { test, expect } from '../support/diagnostics'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const serviceHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }

async function openForm(page: import('@playwright/test').Page) {
  await page.goto('/dashboard/matriculas/nova')
  await expect(page.getByRole('heading', { name: /nova matricula/i })).toBeVisible({ timeout: 15000 })
  await expect(page.getByPlaceholder(/buscar por nome/i)).toBeVisible()
}

async function selectStudent(page: import('@playwright/test').Page, name: string) {
  const search = page.getByPlaceholder(/buscar por nome/i)
  await search.fill(name)
  const result = page.getByText(name, { exact: true }).first()
  await expect(result).toBeVisible()
  await result.click()
  await expect(page.getByRole('button', { name: /alterar/i })).toBeVisible()
}

async function selectFirstClass(page: import('@playwright/test').Page) {
  await page.locator('#turma_id').click()
  const option = page.getByRole('option').first()
  await expect(option).toBeVisible()
  await option.click()
}

test.describe('Enrollment form', () => {
  test.beforeEach(async ({ page }) => {
    await openForm(page)
  })

  test('shows student search and required enrollment fields', async ({ page }) => {
    await expect(page.getByPlaceholder(/buscar por nome/i)).toBeVisible()
    await expect(page.locator('#turma_id')).toBeVisible()
    await expect(page.getByLabel(/ano letivo/i)).toBeVisible()
    await expect(page.getByLabel(/data da matrícula/i)).toBeVisible()
    await expect(page.getByLabel(/observações/i)).toBeVisible()
  })

  test('keeps submit disabled until student and class are selected', async ({ page }) => {
    const submit = page.getByRole('button', { name: /realizar matr[ií]cula/i })
    await expect(submit).toBeDisabled()
    await selectStudent(page, 'Ana Carolina E2E')
    await expect(submit).toBeDisabled()
    await selectFirstClass(page)
    await expect(submit).toBeEnabled()
  })

  test('filters students and shows identity details', async ({ page }) => {
    await page.getByPlaceholder(/buscar por nome/i).fill('Ana Carolina E2E')
    const result = page.getByText('Ana Carolina E2E', { exact: true })
    await expect(result).toBeVisible()
    await expect(page.getByText(/anos.*feminino.*resp/i)).toBeVisible()
    const resultRow = page.locator('.border.rounded-lg').filter({ hasText: 'Ana Carolina E2E' })
    await expect(resultRow.locator('.relative.flex.shrink-0.overflow-hidden.rounded-full').first()).toBeVisible()
  })

  test('shows an explicit empty search state', async ({ page }) => {
    await page.getByPlaceholder(/buscar por nome/i).fill('xyznonexistent123')
    await expect(page.getByText('Nenhum aluno encontrado')).toBeVisible()
  })

  test('shows class capacity after selection', async ({ page }) => {
    await selectFirstClass(page)
    await expect(page.getByText(/vagas disponíveis/i)).toBeVisible()
    await expect(page.getByText(/\d+\/\d+/).first()).toBeVisible()
  })

  test('creates and persists an enrollment for a disposable student', async ({ page, request }) => {
    const unique = `E2E Enrollment ${Date.now()}`
    const create = await request.post(`${SUPABASE_URL}/rest/v1/alunos?select=*`, {
      headers: { ...serviceHeaders, Prefer: 'return=representation' },
      data: {
        nome_completo: unique,
        data_nascimento: '2017-04-10',
        sexo: 'F',
        endereco: 'Rua Matrícula E2E, 100',
        nome_mae: 'Mãe Matrícula E2E',
        ativo: true,
      },
    })
    expect(create.ok()).toBe(true)
    const [student] = await create.json()

    try {
      // Reload so the client-side student list includes the disposable fixture.
      await page.reload()
      await expect(page.getByPlaceholder(/buscar por nome/i)).toBeVisible({ timeout: 15000 })
      await selectStudent(page, unique)
      await selectFirstClass(page)
      await page.getByLabel(/observações/i).fill('Matrícula criada pelo E2E')
      await page.getByRole('button', { name: /realizar matr[ií]cula/i }).click()
      await expect(page.getByText('Matricula realizada com sucesso!')).toBeVisible({ timeout: 10000 })
      await expect(page).toHaveURL(/\/dashboard\/matriculas$/)

      const persisted = await request.get(
        `${SUPABASE_URL}/rest/v1/matriculas?select=id&aluno_id=eq.${student.id}`,
        { headers: serviceHeaders }
      )
      expect(persisted.ok()).toBe(true)
      expect((await persisted.json()).length).toBe(1)
    } finally {
      await request.delete(`${SUPABASE_URL}/rest/v1/matriculas?aluno_id=eq.${student.id}`, { headers: serviceHeaders })
      await request.delete(`${SUPABASE_URL}/rest/v1/alunos?id=eq.${student.id}`, { headers: serviceHeaders })
    }
  })

  test('shows loading state during insertion', async ({ page }) => {
    await page.route('**/rest/v1/matriculas*', async route => {
      if (route.request().method() === 'POST') await new Promise(resolve => setTimeout(resolve, 650))
      await route.continue()
    })
    await selectStudent(page, 'Ana Carolina E2E')
    await selectFirstClass(page)
    const submit = page.locator('button[type="submit"]')
    const submission = submit.click()
    await expect(submit).toBeDisabled()
    await expect(submit).toContainText(/processando/i)
    await submission
  })

  test('cancel and back return to the list', async ({ page }) => {
    await page.getByRole('link', { name: /cancelar/i }).click()
    await expect(page).toHaveURL(/\/dashboard\/matriculas$/)
  })
})

test.describe('Enrollment list and detail', () => {
  test('list exposes filters and a detail action', async ({ page }) => {
    await page.goto('/dashboard/matriculas')
    await expect(page.getByRole('heading', { name: 'Matrículas', exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.getByPlaceholder(/buscar/i).last()).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
    const detail = page.locator('a[href^="/dashboard/matriculas/"]:not([href="/dashboard/matriculas/nova"])').first()
    await expect(detail).toBeVisible()
    await detail.click()
    await expect(page).toHaveURL(/\/dashboard\/matriculas\/[a-f0-9-]+$/)
  })

  test('detail shows student, class, status and management actions', async ({ page }) => {
    await page.goto('/dashboard/matriculas')
    const detail = page.locator('a[href^="/dashboard/matriculas/"]:not([href="/dashboard/matriculas/nova"])').first()
    await expect(detail).toBeVisible({ timeout: 15000 })
    await detail.click()
    await expect(page.getByText(/situação|situacao/i).first()).toBeVisible()
    await expect(page.getByText(/aluno/i).first()).toBeVisible()
    await expect(page.getByText(/turma/i).first()).toBeVisible()
  })
})
