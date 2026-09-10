import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'
import { z } from 'zod'
import { schoolSelectionStorageKey } from '@/contexts/escola-selection'
import type { Database, Tables } from '@/types/database'
import { expect, test } from '../support/diagnostics'
import { authenticatedUserId } from '../support/authenticated-user'
import { loginAs } from '../utils/test-helpers'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const PRIMARY_SCHOOL_NAME = 'CEMEI Pequenos Passos'
const SECONDARY_SCHOOL_NAME = 'EMEI Jardim da Infância'
const PROFESSOR_EMAIL = 'professor@test.com'
const DIRECTOR_EMAIL = 'diretor@test.com'

const governedClassReceiptSchema = z.object({
  audit_id: z.string().uuid(),
  escola_id: z.string().uuid(),
  turma_id: z.string().uuid(),
})
const governedClassReceiptsSchema = z.tuple([governedClassReceiptSchema]).rest(governedClassReceiptSchema)

type SchoolFixture = Pick<Tables<'escolas'>, 'id' | 'nome' | 'tipo'>
type ProfessorFixture = Pick<Tables<'users'>, 'id' | 'nome' | 'email' | 'escola_id'>
type TemporaryClass = Tables<'turmas'>

interface ClassFixtures {
  primarySchool: SchoolFixture
  secondarySchool: SchoolFixture
  professor: ProfessorFixture
}

interface FixtureQueryError {
  message: string
}

let fixtures: ClassFixtures

function localServiceClient(): SupabaseClient<Database> {
  if (!['127.0.0.1', 'localhost'].includes(new URL(SUPABASE_URL).hostname)) {
    throw new Error('Class creation E2E requires a loopback Supabase URL')
  }
  if (!SUPABASE_SERVICE_KEY.startsWith('sb_secret_')) {
    throw new Error('Class creation E2E requires the local Supabase service key')
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function requireFixture<T>(data: T | null, error: FixtureQueryError | null, label: string): T {
  if (error || !data) throw new Error(`${label} fixture is unavailable: ${error?.message || label}`)
  return data
}

function validateClassFixtures(fixturesToValidate: ClassFixtures): ClassFixtures {
  const { primarySchool, secondarySchool, professor } = fixturesToValidate
  if (primarySchool.tipo !== 'creche' || secondarySchool.tipo !== 'pre_escola') {
    throw new Error('Class creation E2E school fixtures have unexpected types')
  }
  if (professor.escola_id !== primarySchool.id) {
    throw new Error('Class creation E2E professor fixture belongs to an unexpected school')
  }
  return fixturesToValidate
}

async function loadClassFixtures(): Promise<ClassFixtures> {
  const service = localServiceClient()
  const [primaryResult, secondaryResult, professorResult] = await Promise.all([
    service.from('escolas').select('id, nome, tipo').eq('nome', PRIMARY_SCHOOL_NAME).single(),
    service.from('escolas').select('id, nome, tipo').eq('nome', SECONDARY_SCHOOL_NAME).single(),
    service.from('users').select('id, nome, email, escola_id').eq('email', PROFESSOR_EMAIL).single(),
  ])

  return validateClassFixtures({
    primarySchool: requireFixture(primaryResult.data, primaryResult.error, PRIMARY_SCHOOL_NAME),
    secondarySchool: requireFixture(secondaryResult.data, secondaryResult.error, SECONDARY_SCHOOL_NAME),
    professor: requireFixture(professorResult.data, professorResult.error, PROFESSOR_EMAIL),
  })
}

async function installSchoolSelection(page: Page, schoolId: string | null): Promise<string> {
  const userId = authenticatedUserId(await page.context().cookies())
  if (!userId) throw new Error('Class creation E2E authenticated user cookie is unavailable')

  const storageKey = schoolSelectionStorageKey(userId)
  await page.addInitScript(({ key, selectedSchoolId }) => {
    if (selectedSchoolId) window.sessionStorage.setItem(key, selectedSchoolId)
    else window.sessionStorage.removeItem(key)
  }, { key: storageKey, selectedSchoolId: schoolId })

  return storageKey
}

async function openClassForm(page: Page, schoolId: string | null = fixtures.primarySchool.id): Promise<string> {
  const storageKey = await installSchoolSelection(page, schoolId)
  await page.goto('/dashboard/turmas/nova')
  await expect(page.getByRole('heading', { name: 'Nova Turma', exact: true })).toBeVisible()
  return storageKey
}

async function temporaryClassById(classId: string): Promise<TemporaryClass | null> {
  const { data, error } = await localServiceClient()
    .from('turmas')
    .select('*')
    .eq('id', classId)
    .maybeSingle()
  if (error) throw new Error(`Temporary class lookup by id failed: ${error.message}`)
  return data
}

async function temporaryClassByName(name: string): Promise<TemporaryClass | null> {
  const { data, error } = await localServiceClient()
    .from('turmas')
    .select('*')
    .eq('nome', name)
    .maybeSingle()
  if (error) throw new Error(`Temporary class lookup by name failed: ${error.message}`)
  return data
}

async function removeTemporaryClass(classId: string) {
  const { error } = await localServiceClient().from('turmas').delete().eq('id', classId)
  if (error) throw new Error(`Temporary class cleanup failed: ${error.message}`)
  expect(await temporaryClassById(classId), 'temporary class cleanup must use the exact id').toBeNull()
}

test.beforeAll(async () => {
  fixtures = await loadClassFixtures()
})

test.describe('Turmas - contrato atual de criação', () => {
  test('expõe somente os campos implementados e navega pelos links do formulário', async ({ page }) => {
    await openClassForm(page)

    await expect(page.getByText('Crie uma nova turma no sistema', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Voltar', exact: true })).toHaveAttribute('href', '/dashboard/turmas')
    await expect(page.getByText('Dados da Turma', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Nome da Turma *', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Ano Letivo *', { exact: true })).toHaveValue(String(new Date().getFullYear()))
    await expect(page.locator('#escola_id')).toContainText(PRIMARY_SCHOOL_NAME)
    await expect(page.locator('#serie')).toBeVisible()
    await expect(page.locator('#turno')).toBeVisible()
    await expect(page.locator('#professor_id')).toBeVisible()

    const capacity = page.getByLabel('Capacidade Máxima *', { exact: true })
    await expect(capacity).toBeEnabled()
    await expect(capacity).toHaveAttribute('min', '1')
    await expect(capacity).toHaveAttribute('max', '50')
    await expect(page.getByLabel('Observações', { exact: true })).toHaveCount(0)

    const active = page.getByRole('switch', { name: 'Turma ativa', exact: true })
    await expect(active).toBeChecked()
    await active.click()
    await expect(active).not.toBeChecked()
    await active.click()
    await expect(active).toBeChecked()

    await expect(page.getByText('Recomendações', { exact: true })).toBeVisible()
    await expect(page.getByText('• Berçário/Maternal: 15-20 alunos', { exact: true })).toBeVisible()
    await expect(page.getByText('• Pré-escola: 20-25 alunos', { exact: true })).toBeVisible()
    await expect(page.getByText('• Fundamental: 25-30 alunos', { exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'Cancelar', exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard\/turmas$/)
  })

  test('aplica as validações nativas e as regras obrigatórias do formulário', async ({ page }) => {
    await openClassForm(page)

    const name = page.getByLabel('Nome da Turma *', { exact: true })
    const year = page.getByLabel('Ano Letivo *', { exact: true })
    const submit = page.getByRole('button', { name: 'Criar Turma', exact: true })
    await expect(page.getByLabel('Capacidade Máxima *', { exact: true })).toBeEnabled()
    await expect(submit).toBeEnabled()

    await submit.click()
    expect(await name.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true)

    await name.fill('Turma de validação E2E')
    await year.fill('2010')
    await submit.click()
    expect(await year.evaluate((input: HTMLInputElement) => input.validity.rangeUnderflow)).toBe(true)

    await year.fill(String(new Date().getFullYear()))
    await submit.click()
    await expect(
      page.getByLabel('Notifications alt+T').getByText('Selecione a série', { exact: true })
    ).toBeVisible()

    await page.locator('#serie').click()
    await page.getByRole('option', { name: 'Berçário I', exact: true }).click()
    await submit.click()
    await expect(
      page.getByLabel('Notifications alt+T').getByText('Selecione o turno', { exact: true })
    ).toBeVisible()

    await page.locator('#turno').click()
    await expect(page.getByRole('option', { name: 'Matutino', exact: true })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Vespertino', exact: true })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Integral', exact: true })).toBeVisible()
  })

  test('limpa escola, série e professor usando a chave de sessão do usuário autenticado', async ({ page }) => {
    const storageKey = await openClassForm(page, null)
    await expect.poll(() => page.evaluate(key => window.sessionStorage.getItem(key), storageKey)).toBeNull()

    const school = page.locator('#escola_id')
    const series = page.locator('#serie')
    const professor = page.locator('#professor_id')
    await expect(school).toContainText('Selecione a escola')
    await expect(series).toBeDisabled()
    await expect(professor).toBeDisabled()
    await expect(page.getByLabel('Capacidade Máxima *', { exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Criar Turma', exact: true })).toBeDisabled()

    await school.click()
    await page.getByRole('option', { name: PRIMARY_SCHOOL_NAME, exact: true }).click()
    await expect(series).toBeEnabled()
    await series.click()
    await page.getByRole('option', { name: 'Berçário I', exact: true }).click()
    await expect(professor).toBeEnabled()
    await professor.click()
    await page.getByRole('option', { name: fixtures.professor.nome, exact: true }).click()

    await school.click()
    await page.getByRole('option', { name: SECONDARY_SCHOOL_NAME, exact: true }).click()
    await expect(series).toContainText('Selecione a série')
    await expect(professor).toContainText('Selecione o professor')

    await series.click()
    await expect(page.getByRole('option', { name: 'Pré I', exact: true })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Berçário I', exact: true })).toHaveCount(0)
    await page.keyboard.press('Escape')

    await professor.click()
    await expect(page.getByRole('option', { name: 'Nenhum professor nesta escola', exact: true })).toBeVisible()
  })

  test('persiste a turma pela mutação governada, recarrega a lista e limpa pelo id recebido', async ({ page }) => {
    const className = `Turma Governada E2E ${Date.now()}-${test.info().workerIndex}`
    let classId: string | null = null

    try {
      await loginAs(page, DIRECTOR_EMAIL)
      await openClassForm(page)
      await page.getByLabel('Nome da Turma *', { exact: true }).fill(className)
      await page.locator('#serie').click()
      await page.getByRole('option', { name: 'Berçário I', exact: true }).click()
      await page.locator('#turno').click()
      await page.getByRole('option', { name: 'Matutino', exact: true }).click()
      await page.locator('#professor_id').click()
      await page.getByRole('option', { name: fixtures.professor.nome, exact: true }).click()
      const capacity = page.getByLabel('Capacidade Máxima *', { exact: true })
      await expect(capacity).toBeEnabled()
      await capacity.fill('18')

      const mutationResponse = page.waitForResponse(response =>
        response.request().method() === 'POST'
        && new URL(response.url()).pathname === '/rest/v1/rpc/write_governed_turma',
      )
      await page.getByRole('button', { name: 'Criar Turma', exact: true }).click()

      const response = await mutationResponse
      expect(response.ok()).toBe(true)
      const [receipt] = governedClassReceiptsSchema.parse(await response.json())
      const createdClassId = receipt.turma_id
      classId = createdClassId
      expect(receipt).toMatchObject({
        escola_id: fixtures.primarySchool.id,
        turma_id: createdClassId,
      })
      expect(receipt.audit_id).not.toBe('')

      await expect(page.getByText('Turma criada com sucesso!', { exact: true })).toBeVisible()
      await expect(page).toHaveURL(/\/dashboard\/turmas$/)

      await expect.poll(() => temporaryClassById(createdClassId)).not.toBeNull()
      expect(await temporaryClassById(createdClassId)).toMatchObject({
        id: createdClassId,
        nome: className,
        serie: 'Berçário I',
        ano_letivo: new Date().getFullYear(),
        escola_id: fixtures.primarySchool.id,
        professor_id: fixtures.professor.id,
        capacidade: 18,
        turno: 'matutino',
        ativo: true,
      })

      await page.reload()
      await expect(page.getByRole('heading', { name: 'Turmas', exact: true })).toBeVisible()
      await expect(page.getByText(className, { exact: true })).toBeVisible()
    } finally {
      if (!classId) classId = (await temporaryClassByName(className))?.id ?? null
      if (classId) await removeTemporaryClass(classId)
    }
  })
})
