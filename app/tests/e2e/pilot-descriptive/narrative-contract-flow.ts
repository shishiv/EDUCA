import { expect, type Browser, type Page, type TestInfo } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { narrativeSnapshotSchema } from '@/lib/reports/narrative-sources'
import { schoolPeriodsSchema } from '@/lib/services/school-periods'
import { z } from 'zod'
import {
  PILOT_DESCRIPTIVE_STUDENT_ID, PILOT_DESCRIPTIVE_CLASS_ID, PILOT_DESCRIPTIVE_SCHOOL_ID,
  PILOT_DESCRIPTIVE_AUTH_PASSWORD, PILOT_DESCRIPTIVE_ENROLLMENT_ID,
} from '../../../../supabase/seed-pilot-descriptive/pilot-descriptive-contract'

const firstRoute = `/dashboard/alunos/${PILOT_DESCRIPTIVE_STUDENT_ID}/diario/relatorio`
const secondRoute = `/diario/relatorios/${PILOT_DESCRIPTIVE_STUDENT_ID}`
const observation = 'Vivência sintética do segundo período: a criança compartilhou histórias com os colegas.'

async function openSecondReport(page: Page, finalized: boolean) {
  const status = finalized ? 'Finalizado' : 'Rascunho'
  await page.getByRole('button', { name: `2 Semestre de 2026 · ${status}`, exact: true }).click()
}

export async function saveUnconfiguredDraft(page: Page, testInfo: TestInfo) {
  await page.goto(secondRoute)
  await page.getByRole('button', { name: 'Novo Relatorio', exact: true }).click()
  await page.getByLabel('Semestre', { exact: true }).selectOption('segundo')
  await expect(page.getByText(/Período escolar não configurado/)).toBeVisible()
  const fields = page.locator('textarea')
  await expect(fields).toHaveCount(6)
  for (const field of await fields.all()) await field.fill('A criança sintética compartilha descobertas, amplia a autonomia e participa das atividades com os colegas.')
  await expect(page.getByRole('button', { name: 'Finalizar', exact: true })).toBeDisabled()
  const saved = page.waitForResponse(response => response.url().includes('/rest/v1/relatorios_descritivos') && response.request().method() === 'POST')
  await page.getByRole('button', { name: /salvar rascunho/i }).click()
  expect((await saved).ok()).toBe(true)
  await page.goto(firstRoute)
  await openSecondReport(page, false)
  await expect(page.locator('textarea').first()).toHaveValue(/A criança sintética compartilha descobertas/)
  await expect(page.getByText(/Período escolar não configurado/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Finalizar', exact: true })).toBeDisabled()
  await page.screenshot({ path: testInfo.outputPath('draft-without-period.png'), fullPage: true })
  const source = await page.request.post('/api/vivencias', { data: {
    aluno_id: PILOT_DESCRIPTIVE_STUDENT_ID, turma_id: PILOT_DESCRIPTIVE_CLASS_ID,
    data_vivencia: '2026-08-10', campos_experiencia: ['eu'], descricao: observation,
  } })
  expect(source.status()).toBe(201)
}

async function createDirector(service: SupabaseClient<Database>) {
  const email = 'diretor.narrativo@synthetic.invalid'
  const { data, error } = await service.auth.admin.createUser({ email, password: PILOT_DESCRIPTIVE_AUTH_PASSWORD, email_confirm: true })
  if (error || !data.user) throw error ?? new Error('DIRECTOR_FIXTURE_MISSING')
  const { error: profileError } = await service.from('users').insert({ id: data.user.id, nome: 'Diretor narrativo sintético', email,
    tipo_usuario: 'diretor', escola_id: PILOT_DESCRIPTIVE_SCHOOL_ID, ativo: true, primeiro_login: false, senha_padrao: false })
  if (profileError) throw profileError
  return { email, id: data.user.id }
}

async function configurePeriod(page: Page, configured: boolean) {
  // The synthetic pilot deliberately blocks the settings page. Preserve that
  // boundary; exercise the scoped API here and the settings DOM in the general runner.
  const current = await page.request.get('/api/school-settings/academic-year?year=2026')
  expect(current.ok()).toBe(true)
  const body = z.object({ academicYear: z.object({ periodos: schoolPeriodsSchema }) }).parse(await current.json())
  const periods = body.academicYear.periodos.filter(period => period.chave !== 'segundo')
  if (configured) periods.push({ chave: 'segundo', nome: 'Segundo período sintético', data_inicio: '2026-08-01', data_fim: '2026-12-31' })
  const saved = await page.request.patch('/api/school-settings/periods', { data: { year: 2026, periods } })
  expect(saved.ok()).toBe(true)
  expect(await saved.json()).toMatchObject({ periods })
}

async function finalizedReport(service: SupabaseClient<Database>) {
  const { data, error } = await service.from('relatorios_descritivos').select('id,status,fontes_snapshot')
    .eq('matricula_id', PILOT_DESCRIPTIVE_ENROLLMENT_ID).eq('semestre', 'segundo').single()
  if (error) throw error
  expect(data.status).toBe('finalizado')
  return { id: data.id, snapshot: narrativeSnapshotSchema.parse(data.fontes_snapshot) }
}

async function verifySnapshot(page: Page, directorPage: Page, service: SupabaseClient<Database>) {
  const before = await finalizedReport(service)
  expect(before.snapshot.fontes).toHaveLength(1)
  expect(before.snapshot.periodo.nome).toBe('Segundo período sintético')
  const changed = await page.request.put(`/api/vivencias/${before.snapshot.fontes[0].id}`, { data: { descricao: 'Texto vivo alterado depois da captura do relatório sintético.' } })
  expect(changed.ok()).toBe(true)
  await configurePeriod(directorPage, false)
  await page.goto(secondRoute)
  await openSecondReport(page, true)
  await expect(page.getByText(observation, { exact: true })).toBeVisible()
  await expect(page.getByText(/Captura imutável: 1 Vivências/)).toBeVisible()
  expect((await finalizedReport(service)).snapshot).toEqual(before.snapshot)
  expect((await page.request.get(`/api/pilot/descriptive-reports/${before.id}/pdf`)).status()).toBe(200)
  await directorPage.goto(firstRoute)
  await openSecondReport(directorPage, true)
  await expect(directorPage.locator('textarea')).toHaveCount(6)
  for (const field of await directorPage.locator('textarea').all()) await expect(field).toBeDisabled()
  await expect(directorPage.getByRole('button', { name: 'Novo Relatorio', exact: true })).toHaveCount(0)
}

export async function configureAndFinalizeDraft(page: Page, browser: Browser, service: SupabaseClient<Database>, testInfo: TestInfo) {
  const director = await createDirector(service)
  await page.goto(firstRoute)
  const directorContext = await browser.newContext({ baseURL: new URL(page.url()).origin, storageState: { cookies: [], origins: [] } })
  try {
    const directorPage = await directorContext.newPage()
    await directorPage.goto('/login')
    await directorPage.getByLabel('E-mail', { exact: true }).fill(director.email)
    await directorPage.getByLabel('Senha', { exact: true }).fill(PILOT_DESCRIPTIVE_AUTH_PASSWORD)
    await directorPage.getByRole('button', { name: /entrar/i }).click()
    await expect(directorPage).toHaveURL(/\/dashboard/)
    await configurePeriod(directorPage, true)
    await page.goto(firstRoute)
    await openSecondReport(page, false)
    await expect(page.getByText(/Prévia viva: 1 Vivências/)).toBeVisible()
    await page.getByRole('button', { name: 'Finalizar', exact: true }).click()
    await expect(page.getByText(/Captura imutável: 1 Vivências/)).toBeVisible()
    await verifySnapshot(page, directorPage, service)
    await page.screenshot({ path: testInfo.outputPath('finalized-captured-sources.png'), fullPage: true })
  } finally {
    await directorContext.close()
    // The disposable lifecycle removes profiles and Auth together; no shared users exist.
  }
}
