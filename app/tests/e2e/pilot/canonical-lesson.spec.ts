import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import type { Database } from '@/types/database'

const SCHOOL = '10000000-0000-0000-0000-000000000001'
const TEACHER_EMAIL = 'professora.a@synthetic.invalid'
const PASSWORD = 'Synthetic-Only-2026!'

function localClient(serviceRole = false): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = serviceRole ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) {
    throw new Error('Canonical diary E2E requires the disposable synthetic local stack')
  }
  if (process.env.PILOT_SYNTHETIC_DATA_ONLY !== 'true') throw new Error('Synthetic-only gate is required')
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function setSchoolCutoff(value: string) {
  const director = localClient()
  const login = await director.auth.signInWithPassword({ email: 'diretora.a@synthetic.invalid', password: PASSWORD })
  if (login.error) throw login.error
  const result = await director.rpc('set_attendance_daily_cutoff', { p_school_id: SCHOOL, p_cutoff: value })
  if (result.error) throw result.error
  await director.auth.signOut()
}

async function createClassFixture() {
  const service = localClient(true)
  const teacher = await service.from('users').select('id').eq('email', TEACHER_EMAIL).single()
  if (teacher.error) throw teacher.error
  const classId = randomUUID()
  const studentId = randomUUID()
  const enrollmentId = randomUUID()
  const classRow = await service.from('turmas').insert({
    id: classId, nome: 'Turma do diário sintético', serie: '1 ano', turno: 'matutino',
    ano_letivo: new Date().getUTCFullYear(), escola_id: SCHOOL, professor_id: teacher.data.id,
  })
  if (classRow.error) throw classRow.error
  const student = await service.from('alunos').insert({
    id: studentId, nome_completo: 'Estudante do diário sintético', data_nascimento: '2018-01-01',
    sexo: 'M', escola_id: SCHOOL,
  })
  if (student.error) throw student.error
  const enrollment = await service.from('matriculas').insert({
    id: enrollmentId, aluno_id: studentId, turma_id: classId,
    ano_letivo: new Date().getUTCFullYear(), situacao: 'ativa',
  })
  if (enrollment.error) throw enrollment.error
  return { service, classId, enrollmentId, teacherId: teacher.data.id }
}

async function loginTeacher(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill(TEACHER_EMAIL)
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: /^entrar$/i }).click()
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 })
}

async function fillLesson(page: Page, classId: string, theme: string) {
  await page.goto(`/diario?turma=${classId}`)
  await page.getByRole('button', { name: /Nova Aula/i }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Tema/Conteúdo *', { exact: true }).fill(theme)
  await dialog.getByLabel('Objetivo *', { exact: true }).fill('Reconhecer partes de um todo com materiais concretos.')
  await dialog.getByLabel('Habilidades BNCC').fill('EF01MA06')
  await dialog.getByRole('button', { name: 'Salvar Aula', exact: true }).click()
}

async function recordAbsenceAndClose(page: Page, classId: string, sessionId: string) {
  await page.goto(`/dashboard/turmas/${classId}/chamada?sessao=${sessionId}`)
  await page.getByRole('button', { name: 'Falta', exact: true }).click()
  const save = page.getByRole('button', { name: 'Salvar', exact: true })
  await expect(save).toBeEnabled()
  await save.click()
  await expect(save).toBeDisabled()
  await page.getByRole('button', { name: 'Fechar chamada', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar Encerramento' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Chamada fechada. Os registros agora são imutáveis.', { exact: true })).toBeVisible()
}

test.use({ storageState: { cookies: [], origins: [] }, timezoneId: 'America/Sao_Paulo' })

test.describe('canonical diary creation', () => {
  test.afterEach(async () => {
    await setSchoolCutoff('24:00:00')
  })

  test('creates a lesson through attendance and preserves two sessions on the same day', async ({ page }) => {
    const { service, classId, enrollmentId, teacherId } = await createClassFixture()
    await setSchoolCutoff('24:00:00')
    await loginTeacher(page)
    await fillLesson(page, classId, 'Frações com materiais concretos')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const first = await service.from('sessoes_aula').select('*').eq('turma_id', classId).single()
    if (first.error) throw first.error
    expect(first.data).toMatchObject({ status: 'ABERTA', escola_id: SCHOOL, professor_id: teacherId })
    expect(first.data.auto_fechamento_agendado).toBeTruthy()
    const content = await service.from('conteudo_aula').select('tema,objetivo,habilidades_bncc,created_by')
      .eq('sessao_id', first.data.id).single()
    expect(content.error).toBeNull()
    expect(content.data).toMatchObject({
      tema: 'Frações com materiais concretos', habilidades_bncc: ['EF01MA06'], created_by: teacherId,
    })
    await recordAbsenceAndClose(page, classId, first.data.id)
    await fillLesson(page, classId, 'Frações em uma nova sessão')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const sessions = await service.from('sessoes_aula').select('id,status,data_aula,hash_legal')
      .eq('turma_id', classId).order('created_at')
    expect(sessions.error).toBeNull()
    expect(sessions.data).toHaveLength(2)
    expect(sessions.data?.[0]).toMatchObject({ id: first.data.id, status: 'FECHADA', data_aula: first.data.data_aula })
    expect(sessions.data?.[0]?.hash_legal).toBeTruthy()
    expect(sessions.data?.[1]).toMatchObject({ status: 'ABERTA', data_aula: first.data.data_aula })
    const history = await service.from('frequencia').select('sessao_id,status_presenca').eq('matricula_id', enrollmentId)
    expect(history.error).toBeNull()
    expect(history.data).toEqual([{ sessao_id: first.data.id, status_presenca: 'F' }])
    await page.reload()
    const rows = page.getByRole('row').filter({ hasText: 'Turma do diário sintético' })
    await expect(rows).toHaveCount(2)
    const [year, month, day] = first.data.data_aula.split('-')
    await expect(rows.first()).toContainText(`${day}/${month}/${year}`)
    await rows.filter({ hasText: 'Bloqueada' }).click()
    await expect(page.getByRole('dialog')).toContainText('Frações com materiais concretos')
    await page.keyboard.press('Escape')
    await rows.filter({ hasText: 'Chamada' }).click()
    await expect(page.getByRole('dialog')).toContainText('Frações em uma nova sessão')
  })

  test('shows the database cutoff rejection without persisting session or lesson content', async ({ page }) => {
    const { service, classId } = await createClassFixture()
    await setSchoolCutoff('00:00:00')
    await loginTeacher(page)
    await fillLesson(page, classId, 'Conteúdo rejeitado pelo prazo')
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('O prazo configurado pela escola para abrir a chamada encerrou.')
    const sessions = await service.from('sessoes_aula').select('id').eq('turma_id', classId)
    expect(sessions.error).toBeNull()
    expect(sessions.data).toEqual([])
    const content = await service.from('conteudo_aula').select('id').eq('tema', 'Conteúdo rejeitado pelo prazo')
    expect(content.error).toBeNull()
    expect(content.data).toEqual([])
  })
})
