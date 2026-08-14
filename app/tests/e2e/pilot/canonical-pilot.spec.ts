import { createClient } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { test, expect } from '@playwright/test'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const CANONICAL_DATE = process.env.PILOT_CANONICAL_DATE || ''
const BROWSER_RECEIPT_PATH = process.env.PILOT_CANONICAL_BROWSER_RECEIPT_PATH

const SCHOOL_A = '10000000-0000-0000-0000-000000000001'
const CLASS_A = '30000000-0000-0000-0000-000000000001'
const ENROLLMENT_A = '50000000-0000-0000-0000-000000000001'
const CANONICAL_ROUTE = `/dashboard/turmas/${CLASS_A}/chamada`
const TEACHER_EMAIL = 'professora.a@synthetic.invalid'
const DIRECTOR_B_EMAIL = 'diretora.b@synthetic.invalid'
const PASSWORD = 'Synthetic-Only-2026!'

function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

async function signedInClient(email: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error || !data.session) throw new Error(`PILOT_CANONICAL_BROWSER_AUTH_FAILED: ${email}`)
  return client
}

test('canonical synthetic pilot path proves read, write, and school isolation', async ({ page }) => {
  // Deliberate-break contract: the gate, identity, route, or RLS boundary must
  // make this single real browser session fail when it is weakened.
  expect(CANONICAL_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(new URL(SUPABASE_URL).hostname).toMatch(/^(127\.0\.0\.1|localhost)$/)

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard/)
  await page.getByRole('button', { name: 'Abrir menu do usuário' }).click()
  await expect(page.getByText('Professora Sintetica A', { exact: true })).toBeVisible()
  await expect(page.getByText('Professor(a)', { exact: true }).last()).toBeVisible()
  await page.keyboard.press('Escape')

  // The canonical route first renders its real no-session state. Opening the
  // session then exposes class, school, and student reads from Supabase.
  await page.goto(CANONICAL_ROUTE)
  await expect(page).toHaveURL(new RegExp(`${CLASS_A}/chamada$`))
  await expect(page.getByRole('heading', { name: 'Nenhuma chamada nesta data', exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: /abrir chamada/i })).toBeVisible()

  await page.getByRole('button', { name: /abrir chamada/i }).click()
  await expect(page.getByText('Chamada aberta. Marque a presença e salve os registros.', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Turma Sintetica A', exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/Escola Sintetica A/)).toBeVisible()
  await expect(page.getByText('Aluno Sintetico A', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`${CLASS_A}/chamada\\?sessao=[0-9a-f-]{36}$`))

  const sessionId = new URL(page.url()).searchParams.get('sessao')
  expect(sessionId).toMatch(/^[0-9a-f-]{36}$/)

  const absent = page.getByRole('button', { name: 'Falta', exact: true }).first()
  await expect(absent).toHaveAttribute('aria-pressed', 'false')
  await absent.click()
  await expect(absent).toHaveAttribute('aria-pressed', 'true')

  const saveButton = page.getByRole('button', { name: 'Salvar', exact: true })
  await expect(saveButton).toBeEnabled()
  await saveButton.click()
  await expect(page.getByText('Chamada salva com sucesso!', { exact: true })).toBeVisible()

  // Reloading the same named URL proves that the write crossed the browser,
  // Server Action, PostgREST, RLS, and canonical frequency boundaries.
  await page.reload()
  await expect(page.getByRole('button', { name: 'Falta', exact: true }).first()).toHaveAttribute('aria-pressed', 'true')

  const service = createServiceClient()
  const [{ data: teacherProfile, error: teacherProfileError }, { data: session, error: sessionError }, { data: attendance, error: attendanceError }] = await Promise.all([
    service.from('users').select('id,tipo_usuario,escola_id').eq('email', TEACHER_EMAIL).single(),
    service.from('sessoes_aula').select('id,turma_id,escola_id,professor_id,data_aula,status').eq('id', sessionId!).single(),
    service.from('frequencia').select('id,matricula_id,sessao_id,data_aula,presente,status_presenca,professor_id,marcado_por').eq('sessao_id', sessionId!).eq('matricula_id', ENROLLMENT_A).single(),
  ])
  expect(teacherProfileError).toBeNull()
  expect(sessionError).toBeNull()
  expect(attendanceError).toBeNull()
  expect(teacherProfile).toEqual(expect.objectContaining({
    tipo_usuario: 'professor',
    escola_id: SCHOOL_A,
  }))
  expect(session).toEqual(expect.objectContaining({
    id: sessionId,
    turma_id: CLASS_A,
    escola_id: SCHOOL_A,
    professor_id: teacherProfile?.id,
    data_aula: CANONICAL_DATE,
    status: 'ABERTA',
  }))
  expect(attendance).toEqual(expect.objectContaining({
    matricula_id: ENROLLMENT_A,
    sessao_id: sessionId,
    data_aula: CANONICAL_DATE,
    presente: false,
    status_presenca: 'F',
    professor_id: teacherProfile?.id,
    marcado_por: teacherProfile?.id,
  }))

  const directorB = await signedInClient(DIRECTOR_B_EMAIL)
  const [{ data: crossSchoolClass, error: crossSchoolReadError }, directorBProfile] = await Promise.all([
    directorB.from('turmas').select('id').eq('id', CLASS_A),
    service.from('users').select('id').eq('email', DIRECTOR_B_EMAIL).single(),
  ])
  expect(crossSchoolReadError).toBeNull()
  expect(crossSchoolClass).toHaveLength(0)
  expect(directorBProfile.error).toBeNull()
  const directorBId = directorBProfile.data?.id
  expect(directorBId).toBeTruthy()

  const crossSchoolWrite = await directorB.from('frequencia').insert({
    id: '70000000-0000-0000-0000-000000000099',
    matricula_id: ENROLLMENT_A,
    sessao_id: sessionId!,
    data_aula: CANONICAL_DATE,
    presente: true,
    status_presenca: 'P',
    professor_id: directorBId!,
    marcado_por: directorBId!,
  })
  expect(crossSchoolWrite.error).not.toBeNull()

  const browserReceipt = {
    result: 'pass',
    identity: TEACHER_EMAIL,
    role: 'professor',
    school: 'SYN-A',
    route: CANONICAL_ROUTE,
    date: CANONICAL_DATE,
    read: 'class, school, and student rendered through authenticated browser reads',
    write: 'attendance F saved and persisted after reload',
    security: 'school B cannot read or write school A attendance',
  }
  if (BROWSER_RECEIPT_PATH) {
    mkdirSync(dirname(BROWSER_RECEIPT_PATH), { recursive: true })
    writeFileSync(BROWSER_RECEIPT_PATH, `${JSON.stringify(browserReceipt, null, 2)}\n`, 'utf8')
  }
  await test.info().attach('canonical-pilot-browser-result.json', {
    body: Buffer.from(`${JSON.stringify(browserReceipt, null, 2)}\n`),
    contentType: 'application/json',
  })
  console.info(`PILOT_CANONICAL_BROWSER_RECEIPT: result=pass identity=${TEACHER_EMAIL} school=SYN-A route=${CANONICAL_ROUTE} read=pass write=pass rls=pass`)
})
