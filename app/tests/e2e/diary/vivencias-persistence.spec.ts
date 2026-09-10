import { test, expect } from '../support/diagnostics'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loginAs } from '../utils/test-helpers'
import type { Database } from '@/types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getLocalServiceClient() {
  if (!new URL(SUPABASE_URL).hostname.match(/^(127\.0\.0\.1|localhost)$/)) {
    throw new Error('Vivencias persistence E2E requires a loopback Supabase URL')
  }
  if (!SUPABASE_SERVICE_KEY.startsWith('sb_secret_')) {
    throw new Error('Vivencias persistence E2E requires the local Supabase service key')
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

let service: SupabaseClient<Database>
let studentId = ''
let classId = ''
let professorId = ''
const description = 'Vivência E2E criada pelo professor sintético.'
const observations = 'Observação sintética persistida com a vivência.'
const editedObservations = 'Observação sintética atualizada após a edição.'
const baselineDescription = 'Vivência E2E determinística de exploração corporal'

test.beforeAll(async () => {
  service = getLocalServiceClient()
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

  const { data: professor, error: professorError } = await service
    .from('users')
    .select('id')
    .eq('email', 'professor@test.com')
    .single()
  if (professorError || !professor) {
    throw professorError || new Error('VIVENCIA_E2E_PROFESSOR_MISSING')
  }
  professorId = professor.id

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
    await page.goto(`/dashboard/alunos/${studentId}/diario/novo`)
    const form = page.getByRole('form', { name: 'Registrar vivência de Pedro Silva E2E' })
    await expect(form).toBeVisible()
    const createdDate = await form.getByLabel('Data da Vivência *', { exact: true }).inputValue()
    const editedDate = new Date(Date.parse(createdDate) - 86_400_000).toISOString().slice(0, 10)
    await form.getByRole('checkbox').nth(0).click()
    await form.getByRole('checkbox').nth(1).click()
    await form.getByLabel('Descrição da Vivência *', { exact: true }).fill(description)
    await form.getByLabel(/Observações Adicionais/).fill(observations)

    const createResponsePromise = page.waitForResponse(response => {
      return response.request().method() === 'POST'
        && new URL(response.url()).pathname === '/api/vivencias'
    })
    await form.getByRole('button', { name: 'Salvar Vivência', exact: true }).click()
    const createResponse = await createResponsePromise
    expect(createResponse.status()).toBe(201)
    expect(await createResponse.json()).toMatchObject({
      data: {
        aluno_id: studentId,
        turma_id: classId,
        professor_id: professorId,
        created_by: professorId,
        campos_experiencia: ['eu', 'corpo'],
        descricao: description,
        observacoes: observations,
      },
    })

    await expect(page).toHaveURL(new RegExp(`/dashboard/alunos/${studentId}/diario$`))
    const createdCard = page.getByText(description, { exact: true }).locator('..')
    await expect(createdCard).toContainText(observations)
    await expect(createdCard).toContainText('O eu, o outro e o nos')
    await expect(createdCard).toContainText('Corpo, gestos e movimentos')
    await page.reload()
    await expect(page.getByText(description, { exact: true })).toBeVisible()

    const { data: storedVivencia, error: storedError } = await service
      .from('vivencias')
      .select('aluno_id, turma_id, professor_id, created_by, campos_experiencia, observacoes')
      .eq('descricao', description)
      .single()
    if (storedError || !storedVivencia) {
      throw storedError || new Error('VIVENCIA_E2E_CREATED_ROW_MISSING')
    }
    expect(storedVivencia).toMatchObject({
      aluno_id: studentId,
      turma_id: classId,
      professor_id: professorId,
      created_by: professorId,
      campos_experiencia: ['eu', 'corpo'],
      observacoes: observations,
    })

    const card = page.getByText(description, { exact: true }).locator('..')
    await card.getByRole('button', { name: /opcoes/i }).click()
    await page.getByRole('menuitem', { name: /editar/i }).click()
    const editDialog = page.getByRole('dialog', { name: 'Editar Vivencia' })
    const editForm = editDialog.getByRole('form', { name: 'Registrar vivência de Pedro Silva E2E' })
    await editForm.getByLabel('Data da Vivência *', { exact: true }).fill(editedDate)
    await editForm.getByLabel(/Observações Adicionais/).fill(editedObservations)
    const updateResponsePromise = page.waitForResponse(response => {
      return response.request().method() === 'PUT'
        && new URL(response.url()).pathname.startsWith('/api/vivencias/')
    })
    await editForm.getByRole('button', { name: 'Salvar Vivência', exact: true }).click()
    const updateResponse = await updateResponsePromise
    expect(updateResponse.status()).toBe(200)
    expect(await updateResponse.json()).toMatchObject({
      data: {
        data_vivencia: editedDate,
        observacoes: editedObservations,
        updated_by: professorId,
      },
    })

    await page.reload()
    const reloadedCard = page.getByText(description, { exact: true }).locator('..')
    await expect(reloadedCard).toContainText(editedObservations)
    await reloadedCard.getByRole('button', { name: /opcoes/i }).click()
    await page.getByRole('menuitem', { name: /editar/i }).click()
    const reopenedForm = page
      .getByRole('dialog', { name: 'Editar Vivencia' })
      .getByRole('form', { name: 'Registrar vivência de Pedro Silva E2E' })
    await expect(reopenedForm.getByLabel('Data da Vivência *', { exact: true })).toHaveValue(editedDate)
    await expect(reopenedForm.getByLabel(/Observações Adicionais/)).toHaveValue(editedObservations)
    await expect(reopenedForm.getByRole('checkbox').nth(0)).toHaveAttribute('aria-checked', 'true')
    await expect(reopenedForm.getByRole('checkbox').nth(1)).toHaveAttribute('aria-checked', 'true')
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
  await expect(page.getByRole('heading', { name: 'Diario Infantil', exact: true })).toBeVisible()
  await expect(page.getByText(baselineDescription, { exact: true })).toBeVisible()
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
