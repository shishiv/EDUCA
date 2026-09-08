import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'
import { expect, test } from '../support/diagnostics'
import { authenticatedUserId } from '../support/authenticated-user'
import { loginAs, waitForPageLoad } from '../utils/test-helpers'
import type { Database, Tables } from '@/types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SEEDED_GUARDIAN = 'Jose da Silva E2E'
const DIRECTOR_EMAIL = 'diretor@test.com'
const PRIMARY_SCHOOL_NAME = 'CEMEI Pequenos Passos'

type Guardian = Tables<'responsaveis'>
type DirectorFixture = Pick<Tables<'users'>, 'id' | 'email' | 'tipo_usuario' | 'escola_id'>
type SchoolFixture = Pick<Tables<'escolas'>, 'id' | 'nome'>

interface GuardianFixtures {
  director: DirectorFixture
  school: SchoolFixture
}

interface FixtureQueryError {
  message: string
}

let fixtures: GuardianFixtures

function localServiceClient(): SupabaseClient<Database> {
  if (!['127.0.0.1', 'localhost'].includes(new URL(SUPABASE_URL).hostname)) {
    throw new Error('Guardians E2E requires a loopback Supabase URL')
  }
  if (!SUPABASE_SERVICE_KEY.startsWith('sb_secret_')) {
    throw new Error('Guardians E2E requires the local Supabase service key')
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function requireFixture<T>(data: T | null, error: FixtureQueryError | null, label: string): T {
  if (error || !data) throw new Error(`${label} fixture is unavailable: ${error?.message || label}`)
  return data
}

function validateGuardianFixtures(fixturesToValidate: GuardianFixtures): GuardianFixtures {
  const { director, school } = fixturesToValidate
  if (director.tipo_usuario !== 'diretor') {
    throw new Error('Guardians E2E director fixture has an unexpected role')
  }
  if (!director.escola_id) {
    throw new Error('Guardians E2E director fixture has no school')
  }
  if (director.escola_id !== school.id) {
    throw new Error('Guardians E2E director fixture belongs to an unexpected school')
  }
  return fixturesToValidate
}

async function loadGuardianFixtures(): Promise<GuardianFixtures> {
  const service = localServiceClient()
  const [directorResult, schoolResult] = await Promise.all([
    service.from('users').select('id, email, tipo_usuario, escola_id').eq('email', DIRECTOR_EMAIL).single(),
    service.from('escolas').select('id, nome').eq('nome', PRIMARY_SCHOOL_NAME).single(),
  ])

  return validateGuardianFixtures({
    director: requireFixture(directorResult.data, directorResult.error, DIRECTOR_EMAIL),
    school: requireFixture(schoolResult.data, schoolResult.error, PRIMARY_SCHOOL_NAME),
  })
}

async function seededGuardian(): Promise<Guardian> {
  const { data, error } = await localServiceClient()
    .from('responsaveis')
    .select('*')
    .eq('nome', SEEDED_GUARDIAN)
    .single()
  if (error || !data) throw new Error(`Guardian fixture is unavailable: ${error?.message || SEEDED_GUARDIAN}`)
  if (data.escola_id !== fixtures.school.id) {
    throw new Error('Seeded guardian belongs to an unexpected school')
  }
  return data
}

async function temporaryGuardian(cpf: string): Promise<Guardian | null> {
  const { data, error } = await localServiceClient()
    .from('responsaveis')
    .select('*')
    .eq('cpf', cpf)
    .maybeSingle()
  if (error) throw new Error(`Temporary guardian lookup failed: ${error.message}`)
  return data
}

async function removeTemporaryGuardian(cpf: string) {
  const service = localServiceClient()
  const { error } = await service.from('responsaveis').delete().eq('cpf', cpf)
  if (error) throw new Error(`Temporary guardian cleanup failed: ${error.message}`)
  expect(await temporaryGuardian(cpf), 'temporary guardian cleanup must be exact').toBeNull()
}

function cpfFor(workerIndex: number) {
  const base = `${String(Date.now()).slice(-8)}${workerIndex % 10}`.slice(-9).padStart(9, '1')
  const digits = base.split('').map(Number)
  const checkDigit = (weights: number[]) => {
    const sum = digits.reduce((total, digit, index) => total + digit * weights[index], 0)
    const remainder = 11 - (sum % 11)
    return remainder >= 10 ? 0 : remainder
  }
  digits.push(checkDigit([10, 9, 8, 7, 6, 5, 4, 3, 2]))
  digits.push(checkDigit([11, 10, 9, 8, 7, 6, 5, 4, 3, 2]))
  return digits.join('')
}

async function openGuardians(page: Page) {
  await page.goto('/dashboard/responsaveis')
  await waitForPageLoad(page)
  await expect(page.getByRole('heading', { name: 'Responsáveis', exact: true })).toBeVisible()
}

function guardianDetailLink(page: Page, guardianId: string) {
  return page.locator(`a[href="/dashboard/responsaveis/${guardianId}"]`).first()
}

test.beforeAll(async () => {
  fixtures = await loadGuardianFixtures()
})

test.describe.serial('Responsáveis - contrato atual', () => {
  test('lista o responsável sintético, combina busca e parentesco, e abre os detalhes', async ({ page }) => {
    const guardian = await seededGuardian()
    await openGuardians(page)

    const table = page.getByRole('table')
    await expect(table).toBeVisible()
    await expect(table.getByRole('columnheader')).toHaveText([
      'Responsável',
      'CPF',
      'Parentesco',
      'Contato',
      'Alunos Vinculados',
      'Ações',
    ])

    const search = page.getByPlaceholder('Buscar por nome, CPF, telefone ou e-mail...')
    await search.fill('98765432100')
    await expect(table.locator('tbody tr')).toHaveCount(1)
    await expect(table.locator('tbody tr').first()).toContainText(SEEDED_GUARDIAN)

    await page.locator('#parentesco_filter').click()
    await page.getByRole('option', { name: 'Pai', exact: true }).click()
    await expect(table.locator('tbody tr')).toHaveCount(1)

    await guardianDetailLink(page, guardian.id).click()
    await expect(page).toHaveURL(`/dashboard/responsaveis/${guardian.id}`)
    await expect(page.getByRole('heading', { name: SEEDED_GUARDIAN, exact: true })).toBeVisible()
    await expect(page.getByText('987.654.321-00', { exact: true })).toBeVisible()
  })

  test('cria, edita e remove um responsável temporário pela jornada autorizada', async ({ page }) => {
    const suffix = `${Date.now()}-${test.info().workerIndex}`
    const cpf = cpfFor(test.info().workerIndex)
    const name = `Responsável Contrato ${suffix}`
    const email = `responsavel.contrato.${suffix}@synthetic.invalid`
    const updatedEmail = `responsavel.editado.${suffix}@synthetic.invalid`

    await removeTemporaryGuardian(cpf)

    try {
      await loginAs(page, DIRECTOR_EMAIL)
      expect(authenticatedUserId(await page.context().cookies())).toBe(fixtures.director.id)

      await page.goto('/dashboard/responsaveis/novo')
      await waitForPageLoad(page)
      await expect(page.getByRole('heading', { name: 'Novo Responsável', exact: true })).toBeVisible()
      await page.getByLabel('Nome Completo *', { exact: true }).fill(name)
      await page.getByLabel('CPF *', { exact: true }).fill(cpf)
      await page.locator('#parentesco').click()
      await page.getByRole('option', { name: 'Mãe', exact: true }).click()
      await page.getByLabel('Telefone', { exact: true }).fill('34999990001')
      await page.getByLabel('E-mail', { exact: true }).fill(email)
      await page.getByRole('checkbox', { name: 'Comunicações opcionais', exact: true }).check()

      const createResponse = page.waitForResponse(response =>
        response.request().method() === 'POST' && response.url().includes('/rest/v1/responsaveis'),
      )
      await page.getByRole('button', { name: 'Salvar Responsável', exact: true }).click()
      const response = await createResponse
      const createRequest = response.request()
      const payload: unknown = createRequest.postDataJSON()
      expect(response.status()).toBe(201)
      expect(payload).toEqual([
        expect.objectContaining({
          escola_id: fixtures.school.id,
          lgpd_consentimento: true,
          lgpd_data_consentimento: expect.stringMatching(/\S/),
        }),
      ])
      await expect(page.getByText('Responsável cadastrado com sucesso!', { exact: true })).toBeVisible()
      await expect(page).toHaveURL('/dashboard/responsaveis')

      await expect.poll(() => temporaryGuardian(cpf)).not.toBeNull()
      const created = await temporaryGuardian(cpf)
      if (!created) throw new Error('Guardian creation returned no persisted record')
      expect(created).toMatchObject({
        nome: name,
        cpf,
        parentesco: 'Mae',
        email,
        escola_id: fixtures.school.id,
        lgpd_consentimento: true,
        lgpd_data_consentimento: expect.any(String),
      })

      const search = page.getByPlaceholder('Buscar por nome, CPF, telefone ou e-mail...')
      await search.fill(name)
      await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1)
      await guardianDetailLink(page, created.id).click()
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()

      await page.getByRole('button', { name: 'Editar', exact: true }).click()
      await page.getByLabel('Telefone', { exact: true }).fill('34988887777')
      await page.getByLabel('E-mail', { exact: true }).fill(updatedEmail)
      const updateResponse = page.waitForResponse(response =>
        response.request().method() === 'PATCH' && response.url().includes('/rest/v1/responsaveis'),
      )
      await page.getByRole('button', { name: 'Salvar', exact: true }).click()
      expect((await updateResponse).ok()).toBe(true)
      await expect(page.getByText('Responsável atualizado com sucesso!', { exact: true })).toBeVisible()

      await page.reload()
      await expect(page.getByText(updatedEmail, { exact: true })).toBeVisible()
      await expect(page.getByText('(34) 98888-7777', { exact: true })).toBeVisible()
      const updated = await temporaryGuardian(cpf)
      expect(updated).toMatchObject({
        id: created.id,
        email: updatedEmail,
        telefone: '34988887777',
        escola_id: fixtures.school.id,
        lgpd_consentimento: true,
        lgpd_data_consentimento: created.lgpd_data_consentimento,
      })
    } finally {
      await removeTemporaryGuardian(cpf)
    }
  })
})
