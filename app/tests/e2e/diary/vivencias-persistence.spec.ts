import { test, expect } from '../support/diagnostics'
import { createClient } from '@supabase/supabase-js'
import { loginAs } from '../utils/test-helpers'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let studentId = ''
let classId = ''
const description = 'Vivência E2E criada pelo professor sintético.'

test.beforeAll(async () => {
  const { data: student, error: studentError } = await service
    .from('alunos')
    .select('id')
    .eq('nome_completo', 'Pedro Silva E2E')
    .single()
  if (studentError || !student) throw studentError || new Error('VIVENCIA_E2E_STUDENT_MISSING')
  studentId = student.id

  const { data: turma, error: turmaError } = await service
    .from('turmas')
    .select('id')
    .eq('nome', '1º Ano A E2E')
    .single()
  if (turmaError || !turma) throw turmaError || new Error('VIVENCIA_E2E_CLASS_MISSING')
  classId = turma.id

  await service.from('vivencias').delete().eq('descricao', description)
})

test.afterAll(async () => {
  if (studentId) await service.from('vivencias').delete().eq('descricao', description)
})

async function expectRenderedLinksAllowed(
  page: import('@playwright/test').Page,
  path: string,
  heading: RegExp,
) {
  await page.goto(path)
  await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible()
  const hrefs = await page.locator('main a[href]').evaluateAll(links => [
    ...new Set(links.map(link => link.getAttribute('href')).filter((href): href is string => Boolean(href))),
  ])

  for (const href of hrefs) {
    const response = await page.request.get(new URL(href, page.url()).toString())
    expect(new URL(response.url()).pathname).not.toBe('/unauthorized')
    expect(response.status()).toBeLessThan(400)
  }

  return hrefs
}

test.describe('Educação Infantil Vivências persistence', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'professor@test.com')
    await expect(page.getByText('Painel do Professor')).toBeVisible()
  })

  test('creates, edits the date, and reloads a narrative on desktop', async ({ page }) => {
    const editedDate = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    await page.goto(`/dashboard/alunos/${studentId}/diario/novo`)
    await expect(page.getByText(/registrando vivencia para/i)).toBeVisible()
    await page.getByRole('checkbox').first().click()
    await page.getByLabel(/descri.*viv/i).fill(description)
    await page.getByRole('button', { name: /salvar/i }).click()
    await expect(page).toHaveURL(new RegExp(`/dashboard/alunos/${studentId}/diario$`))
    await expect(page.getByText(description)).toBeVisible()
    await page.reload()
    await expect(page.getByText(description)).toBeVisible()

    const card = page.getByText(description).locator('..')
    await card.getByRole('button', { name: /opcoes/i }).click()
    await page.getByRole('menuitem', { name: /editar/i }).click()
    await page.getByLabel(/data da vivencia/i).fill(editedDate)
    const updateResponse = page.waitForResponse(response =>
      response.request().method() === 'PUT' && response.url().includes('/api/vivencias/'),
    )
    await page.getByRole('button', { name: /salvar vivencia/i }).click()
    expect((await updateResponse).status()).toBe(200)

    await page.reload()
    await expect(page.getByText(description)).toBeVisible()
    await page.getByText(description).locator('..').getByRole('button', { name: /opcoes/i }).click()
    await page.getByRole('menuitem', { name: /editar/i }).click()
    await expect(page.getByLabel(/data da vivencia/i)).toHaveValue(editedDate)
  })

  test('keeps the form usable at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/dashboard/alunos/${studentId}/diario/novo`)
    await expect(page.getByRole('button', { name: /salvar/i })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow).toBe(false)
  })

  test('renders only contextual links the professor may open', async ({ page }) => {
    const classLinks = await expectRenderedLinksAllowed(page, `/dashboard/turmas/${classId}`, /1º Ano A E2E/i)
    const diaryLinks = await expectRenderedLinksAllowed(page, `/dashboard/alunos/${studentId}/diario`, /diario infantil/i)

    expect(classLinks).not.toContain(`/dashboard/turmas/${classId}/editar`)
    expect(classLinks).not.toContain(`/dashboard/alunos/${studentId}`)
    expect(diaryLinks).not.toContain(`/dashboard/alunos/${studentId}`)

    await page.goto(`/dashboard/turmas/${classId}/editar`)
    await expect(page).toHaveURL(/\/unauthorized$/)
    await page.goto(`/dashboard/alunos/${studentId}`)
    await expect(page).toHaveURL(/\/unauthorized$/)
  })
})

async function expectReadOnlyDiary(page: import('@playwright/test').Page, mobile: boolean) {
  if (mobile) await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/dashboard/alunos/${studentId}/diario`)
  await expect(page.getByRole('heading', { name: /diario infantil/i })).toBeVisible()
  await expect(page.locator(`a[href="/dashboard/alunos/${studentId}/diario/novo"]`)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /opcoes/i })).toHaveCount(0)

  await page.goto(`/dashboard/alunos/${studentId}/diario/relatorio`)
  await expect(page.getByRole('heading', { name: /relatório de desenvolvimento|relatorio de desenvolvimento/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /salvar rascunho/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^finalizar$/i })).toHaveCount(0)
  for (const textarea of await page.locator('textarea').all()) await expect(textarea).toBeDisabled()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)

  await page.goto(`/dashboard/alunos/${studentId}/diario/novo`)
  await expect(page).toHaveURL(/\/unauthorized$/)
}

test.describe('Diretor Vivências read-only access', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'diretor@test.com')
    await expect(page.getByText('Total de Alunos')).toBeVisible()
  })

  test('keeps the desktop diary and report read-only', async ({ page }) => {
    await expectReadOnlyDiary(page, false)
  })
})

test.describe('Secretário Vivências read-only access', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'secretario@test.com')
    await expect(page.getByText('Total de Alunos')).toBeVisible()
  })

  test('keeps the 390px diary and report read-only', async ({ page }) => {
    await expectReadOnlyDiary(page, true)
  })
})
