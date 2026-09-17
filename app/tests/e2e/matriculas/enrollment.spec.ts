import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Page, Route } from '@playwright/test'
import type { Database, Tables } from '@/types/database'
import { test, expect } from '../support/diagnostics'
import { loginAs } from '../utils/test-helpers'
import { readEntityAudit, withLocalDatabase } from '../support/local-database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const FIXTURE_CLASS_NAME = '1º Ano A E2E'
const ENROLLMENT_MANAGER_EMAIL = 'diretor@test.com'
const ENROLLMENT_RPC_PATH = '/rest/v1/rpc/create_governed_enrollment'

type EnrollmentClass = Pick<Tables<'turmas'>, 'ano_letivo' | 'escola_id' | 'id' | 'nome' | 'serie'>
type TemporaryStudent = Tables<'alunos'>
type TemporaryEnrollment = Tables<'matriculas'>

interface EnrollmentFixture {
  enrollmentId?: string
  student: TemporaryStudent
  turma: EnrollmentClass
}

function getLocalServiceClient(): SupabaseClient<Database> {
  if (!new URL(SUPABASE_URL).hostname.match(/^(127\.0\.0\.1|localhost)$/)) {
    throw new Error('Enrollment E2E requires a loopback Supabase URL')
  }
  if (!SUPABASE_SERVICE_KEY.startsWith('sb_secret_')) {
    throw new Error('Enrollment E2E requires the local Supabase service key')
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function loadEnrollmentClass(): Promise<EnrollmentClass> {
  const { data, error } = await getLocalServiceClient()
    .from('turmas')
    .select('id, escola_id, ano_letivo, nome, serie')
    .eq('nome', FIXTURE_CLASS_NAME)
    .eq('ativo', true)
    .single()

  if (error || !data) {
    throw new Error(`Enrollment class fixture is unavailable: ${error?.message || FIXTURE_CLASS_NAME}`)
  }
  return data
}

async function seedTemporaryStudent(name: string, turma: EnrollmentClass): Promise<TemporaryStudent> {
  const { data, error } = await getLocalServiceClient()
    .from('alunos')
    .insert({
      nome_completo: name,
      data_nascimento: '2017-04-10',
      sexo: 'F',
      escola_id: turma.escola_id,
      endereco: 'Rua Matrícula E2E, 100',
      nome_mae: 'Mãe Matrícula E2E',
      ativo: true,
    })
    .select('*')
    .single()

  if (error || !data) throw new Error(`Temporary enrollment student seed failed: ${error?.message || name}`)
  return data
}

async function studentById(studentId: string): Promise<TemporaryStudent | null> {
  const { data, error } = await getLocalServiceClient()
    .from('alunos')
    .select('*')
    .eq('id', studentId)
    .maybeSingle()
  if (error) throw new Error(`Temporary enrollment student lookup failed: ${error.message}`)
  return data
}

async function enrollmentById(enrollmentId: string): Promise<TemporaryEnrollment | null> {
  const { data, error } = await getLocalServiceClient()
    .from('matriculas')
    .select('*')
    .eq('id', enrollmentId)
    .maybeSingle()
  if (error) throw new Error(`Temporary enrollment lookup failed: ${error.message}`)
  return data
}

async function enrollmentFor(fixture: EnrollmentFixture): Promise<TemporaryEnrollment | null> {
  const { data, error } = await getLocalServiceClient()
    .from('matriculas')
    .select('*')
    .eq('aluno_id', fixture.student.id)
    .eq('turma_id', fixture.turma.id)
    .eq('ano_letivo', fixture.turma.ano_letivo)
    .maybeSingle()
  if (error) throw new Error(`Temporary enrollment lookup failed: ${error.message}`)
  return data
}

async function readPersistedEnrollment(fixture: EnrollmentFixture): Promise<TemporaryEnrollment> {
  const enrollment = await enrollmentFor(fixture)
  if (!enrollment) throw new Error('Governed enrollment did not persist the disposable student')
  fixture.enrollmentId = enrollment.id
  return enrollment
}

async function cleanupEnrollmentFixture(fixture: EnrollmentFixture): Promise<void> {
  const service = getLocalServiceClient()
  const enrollment = fixture.enrollmentId
    ? await enrollmentById(fixture.enrollmentId)
    : await enrollmentFor(fixture)

  if (enrollment) {
    const { error } = await service.from('matriculas').delete().eq('id', enrollment.id)
    if (error) throw new Error(`Temporary enrollment cleanup failed: ${error.message}`)
    expect(await enrollmentById(enrollment.id), 'temporary enrollment cleanup must use the exact id').toBeNull()
  }

  const { error: studentError } = await service.from('alunos').delete().eq('id', fixture.student.id)
  if (studentError) throw new Error(`Temporary enrollment student cleanup failed: ${studentError.message}`)
  expect(await studentById(fixture.student.id), 'temporary enrollment student cleanup must use the exact id').toBeNull()
}

async function createEnrollmentFixture(name: string): Promise<EnrollmentFixture> {
  const turma = await loadEnrollmentClass()
  const student = await seedTemporaryStudent(name, turma)
  return { student, turma }
}

async function createPersistedEnrollmentFixture(name: string): Promise<EnrollmentFixture> {
  const fixture = await createEnrollmentFixture(name)
  const { data, error } = await getLocalServiceClient()
    .from('matriculas')
    .insert({
      aluno_id: fixture.student.id,
      turma_id: fixture.turma.id,
      ano_letivo: fixture.turma.ano_letivo,
      data_matricula: '2026-02-10',
      situacao: 'ativa',
      observacoes: 'Matrícula de visualização E2E',
    })
    .select('*')
    .single()

  if (error || !data) {
    await cleanupEnrollmentFixture(fixture)
    throw new Error(`Temporary enrollment seed failed: ${error?.message || name}`)
  }
  fixture.enrollmentId = data.id
  return fixture
}

async function openForm(page: Page): Promise<void> {
  await page.goto('/dashboard/matriculas/nova')
  await expect(page.getByRole('heading', { name: 'Nova Matrícula', exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByPlaceholder(/buscar por nome/i)).toBeVisible()
}

async function selectStudent(page: Page, name: string): Promise<void> {
  const search = page.getByPlaceholder(/buscar por nome/i)
  await search.fill(name)
  const result = page.getByText(name, { exact: true }).first()
  await expect(result).toBeVisible()
  await result.click()
  await expect(page.getByRole('button', { name: /alterar/i })).toBeVisible()
}

async function selectFixtureClass(page: Page, turma: EnrollmentClass): Promise<void> {
  await page.locator('#turma_id').click()
  const option = page.getByRole('option', { name: new RegExp(`${turma.nome} - ${turma.serie}`) })
  await expect(option).toBeVisible()
  await option.click()
  await expect(page.locator('#turma_id')).toContainText(turma.nome)
}

async function selectKnownClass(page: Page): Promise<void> {
  await selectFixtureClass(page, await loadEnrollmentClass())
}

function enrollmentDetailLink(page: Page, fixture: EnrollmentFixture) {
  if (!fixture.enrollmentId) throw new Error('Enrollment fixture is missing its exact enrollment id')
  const row = page.getByRole('row').filter({ hasText: fixture.student.nome_completo })
  return row.locator(`a[href="/dashboard/matriculas/${fixture.enrollmentId}"]`)
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
    await selectKnownClass(page)
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
    await selectKnownClass(page)
    await expect(page.getByText(/vagas disponíveis/i)).toBeVisible()
    await expect(page.getByText(/\d+\/\d+/).first()).toBeVisible()
  })

  test('cancel and back return to the list', async ({ page }) => {
    await page.getByRole('link', { name: /cancelar/i }).click()
    await expect(page).toHaveURL(/\/dashboard\/matriculas$/)
  })
})

test.describe('Enrollment mutations', () => {
  test('F09 cancellation persists after reload and invalid reactivation is denied', async ({ page }, testInfo) => {
    const fixture = await createPersistedEnrollmentFixture(`F09 Cancelamento ${Date.now()}`)
    const readState = () => withLocalDatabase(async db => (await db.query(
      'SELECT id, aluno_id, turma_id, situacao, observacoes FROM matriculas WHERE id = $1', [fixture.enrollmentId],
    )).rows)
    const cancelled = [{
      id: fixture.enrollmentId, aluno_id: fixture.student.id, turma_id: fixture.turma.id,
      situacao: 'cancelada', observacoes: 'Cancelamento sintético F09',
    }]
    try {
      await loginAs(page, ENROLLMENT_MANAGER_EMAIL)
      await page.goto(`/dashboard/matriculas/${fixture.enrollmentId}`)
      await page.getByRole('button', { name: 'Editar', exact: true }).click()
      await page.getByRole('combobox', { name: 'Situação', exact: true }).click()
      await page.getByRole('option', { name: 'Cancelada', exact: true }).click()
      await page.getByLabel('Observações', { exact: true }).fill('Cancelamento sintético F09')
      await page.getByRole('button', { name: 'Salvar', exact: true }).click()
      await expect.poll(readState).toEqual(cancelled)
      await page.reload()
      await expect(page.getByRole('alert').filter({ hasText: 'Status da Matrícula' })).toContainText('Cancelada')
      await expect(page.getByText('Cancelamento sintético F09', { exact: true })).toBeVisible()
      expect(await readState()).toEqual(cancelled)

      // An inactive student is an existing governed reactivation rejection, not a new rule.
      await withLocalDatabase(db => db.query('UPDATE alunos SET ativo = false WHERE id = $1', [fixture.student.id]))
      await page.getByRole('button', { name: 'Editar', exact: true }).click()
      await page.getByRole('combobox', { name: 'Situação', exact: true }).click()
      await page.getByRole('option', { name: 'Ativa', exact: true }).click()
      const denied = page.waitForResponse('**/rest/v1/rpc/update_governed_enrollment')
      await page.getByRole('button', { name: 'Salvar', exact: true }).click()
      const response = await denied
      expect(response.ok()).toBe(false)
      expect(await response.text()).toContain('PILOT_MANAGEMENT_STUDENT_DENIED')
      await expect(page.getByText('Erro ao atualizar matrícula', { exact: true })).toBeVisible()
      await page.reload()
      await expect(page.getByRole('alert').filter({ hasText: 'Status da Matrícula' })).toContainText('Cancelada')
      expect(await readState()).toEqual(cancelled)
    } finally {
      if (!fixture.enrollmentId) throw new Error('F09 cancellation fixture requires an enrollment id')
      const audit = await readEntityAudit(fixture.enrollmentId)
      await cleanupEnrollmentFixture(fixture)
      const retainedAudit = await readEntityAudit(fixture.enrollmentId)
      expect(retainedAudit.filter(row => audit.some(before => before.id === row.id))).toEqual(audit)
      await testInfo.attach('f09-enrollment-cleanup.json', {
        body: JSON.stringify({ enrollmentId: fixture.enrollmentId, studentId: fixture.student.id, removed: true, retainedAudit, appendedDuringCleanup: retainedAudit.length - audit.length }),
        contentType: 'application/json',
      })
    }
  })

  test('creates, persists, and reloads an enrollment for a disposable student', async ({ page }, testInfo) => {
    const fixture = await createEnrollmentFixture(`E2E Enrollment ${Date.now()}-${testInfo.workerIndex}`)
    let enrollmentResponse: Promise<import('@playwright/test').Response> | undefined

    try {
      await loginAs(page, ENROLLMENT_MANAGER_EMAIL)
      await openForm(page)
      await selectStudent(page, fixture.student.nome_completo)
      await selectFixtureClass(page, fixture.turma)
      await page.getByLabel(/observações/i).fill('Matrícula criada pelo E2E')

      enrollmentResponse = page.waitForResponse(response =>
        response.request().method() === 'POST' && new URL(response.url()).pathname === ENROLLMENT_RPC_PATH,
      )
      await page.getByRole('button', { name: /realizar matr[ií]cula/i }).click()
      expect((await enrollmentResponse).ok()).toBe(true)
      await expect(page.getByText('Matrícula realizada com sucesso!', { exact: true })).toBeVisible()
      await expect(page).toHaveURL(/\/dashboard\/matriculas$/)

      await expect.poll(() => enrollmentFor(fixture)).not.toBeNull()
      const persisted = await readPersistedEnrollment(fixture)
      expect(persisted).toMatchObject({
        aluno_id: fixture.student.id,
        turma_id: fixture.turma.id,
        ano_letivo: fixture.turma.ano_letivo,
        observacoes: 'Matrícula criada pelo E2E',
        situacao: 'ativa',
      })

      await page.reload()
      await expect(page.getByRole('heading', { name: 'Matrículas', exact: true })).toBeVisible()
      await expect(page.getByText(fixture.student.nome_completo, { exact: true })).toBeVisible()
    } finally {
      await enrollmentResponse?.catch(() => undefined)
      await cleanupEnrollmentFixture(fixture)
    }
  })

  test('shows loading state during the governed enrollment insertion', async ({ page }, testInfo) => {
    const fixture = await createEnrollmentFixture(`E2E Loading Enrollment ${Date.now()}-${testInfo.workerIndex}`)
    let releaseEnrollment: () => void = () => {}
    const enrollmentPaused = new Promise<void>(resolve => {
      releaseEnrollment = resolve
    })
    const holdEnrollment = async (route: Route): Promise<void> => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      await enrollmentPaused
      await route.continue()
    }

    await page.route(`**${ENROLLMENT_RPC_PATH}`, holdEnrollment)
    let enrollmentResponse: Promise<import('@playwright/test').Response> | undefined
    try {
      await loginAs(page, ENROLLMENT_MANAGER_EMAIL)
      await openForm(page)
      await selectStudent(page, fixture.student.nome_completo)
      await selectFixtureClass(page, fixture.turma)

      const submit = page.getByRole('button', { name: /realizar matr[ií]cula/i })
      const enrollmentRequest = page.waitForRequest(request =>
        request.method() === 'POST' && new URL(request.url()).pathname === ENROLLMENT_RPC_PATH,
      )
      enrollmentResponse = page.waitForResponse(response =>
        response.request().method() === 'POST' && new URL(response.url()).pathname === ENROLLMENT_RPC_PATH,
      )
      await submit.click()
      await enrollmentRequest
      await expect(page.getByRole('button', { name: 'Processando...', exact: true })).toBeDisabled()

      releaseEnrollment()
      expect((await enrollmentResponse).ok()).toBe(true)
      await expect(page.getByText('Matrícula realizada com sucesso!', { exact: true })).toBeVisible()
      await expect(page).toHaveURL(/\/dashboard\/matriculas$/)

      await expect.poll(() => enrollmentFor(fixture)).not.toBeNull()
      await readPersistedEnrollment(fixture)
    } finally {
      releaseEnrollment()
      await enrollmentResponse?.catch(() => undefined)
      await page.unroute(`**${ENROLLMENT_RPC_PATH}`, holdEnrollment)
      await cleanupEnrollmentFixture(fixture)
    }
  })
})

test.describe('Enrollment list and detail', () => {
  test('list exposes filters and a detail action', async ({ page }, testInfo) => {
    const fixture = await createPersistedEnrollmentFixture(`E2E Enrollment List ${Date.now()}-${testInfo.workerIndex}`)

    try {
      await page.goto('/dashboard/matriculas')
      await expect(page.getByRole('heading', { name: 'Matrículas', exact: true })).toBeVisible({ timeout: 15_000 })
      const search = page.getByPlaceholder(/buscar/i).last()
      await expect(search).toBeVisible()
      await search.fill(fixture.student.nome_completo)
      await expect(page.getByRole('table')).toBeVisible()
      const detail = enrollmentDetailLink(page, fixture).first()
      await expect(detail).toBeVisible()
      await detail.click()
      await expect(page).toHaveURL(`/dashboard/matriculas/${fixture.enrollmentId}`)
    } finally {
      await cleanupEnrollmentFixture(fixture)
    }
  })

  test('detail shows student, class, status and management actions', async ({ page }, testInfo) => {
    const fixture = await createPersistedEnrollmentFixture(`E2E Enrollment Detail ${Date.now()}-${testInfo.workerIndex}`)

    try {
      await page.goto(`/dashboard/matriculas/${fixture.enrollmentId}`)
      await expect(page.getByText(fixture.student.nome_completo, { exact: true })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(fixture.turma.nome, { exact: true })).toBeVisible()
      await expect(page.getByText(/situação|situacao/i).first()).toBeVisible()
      await expect(page.getByRole('button', { name: 'Editar', exact: true })).toBeVisible()
    } finally {
      await cleanupEnrollmentFixture(fixture)
    }
  })

  test('edit action opens the existing enrollment detail workflow', async ({ page }, testInfo) => {
    const fixture = await createPersistedEnrollmentFixture(`E2E Enrollment Edit ${Date.now()}-${testInfo.workerIndex}`)

    try {
      await page.goto('/dashboard/matriculas')
      const search = page.getByPlaceholder(/buscar/i).last()
      await expect(search).toBeVisible({ timeout: 15_000 })
      await search.fill(fixture.student.nome_completo)
      const actionLinks = enrollmentDetailLink(page, fixture)

      await expect(actionLinks).toHaveCount(2)
      const editAction = actionLinks.nth(1)
      await expect(editAction).toHaveAttribute('href', `/dashboard/matriculas/${fixture.enrollmentId}`)

      await editAction.click()
      await expect(page).toHaveURL(`/dashboard/matriculas/${fixture.enrollmentId}`)
      await expect(page.getByRole('button', { name: 'Editar', exact: true })).toBeVisible()
    } finally {
      await cleanupEnrollmentFixture(fixture)
    }
  })
})
