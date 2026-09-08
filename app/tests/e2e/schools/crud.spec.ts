import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'
import { expect, test } from '../support/diagnostics'
import { waitForPageLoad } from '../utils/test-helpers'
import type { Database, Tables } from '@/types/database'
import { z } from 'zod'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SEEDED_SCHOOL = 'CEMEI Pequenos Passos'

type School = Tables<'escolas'>
const schoolMutationReceipt = z.array(z.object({
  school_id: z.string().uuid(),
  audit_id: z.string().uuid(),
})).length(1)

function localServiceClient(): SupabaseClient<Database> {
  if (!['127.0.0.1', 'localhost'].includes(new URL(SUPABASE_URL).hostname)) {
    throw new Error('Schools E2E requires a loopback Supabase URL')
  }
  if (!SUPABASE_SERVICE_KEY.startsWith('sb_secret_')) {
    throw new Error('Schools E2E requires the local Supabase service key')
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function seededSchool(): Promise<School> {
  const { data, error } = await localServiceClient()
    .from('escolas')
    .select('*')
    .eq('nome', SEEDED_SCHOOL)
    .single()
  if (error || !data) throw new Error(`School fixture is unavailable: ${error?.message || SEEDED_SCHOOL}`)
  return data
}

async function temporarySchool(codigo: string): Promise<School | null> {
  const { data, error } = await localServiceClient()
    .from('escolas')
    .select('*')
    .eq('codigo', codigo)
    .maybeSingle()
  if (error) throw new Error(`Temporary school lookup failed: ${error.message}`)
  return data
}

async function retireTemporarySchool(codigo: string) {
  const school = await temporarySchool(codigo)
  if (!school) return
  const service = localServiceClient()
  // Audit/configuration records retain the school until the disposable stack is removed.
  const { error } = await service.from('escolas').update({ ativo: false }).eq('id', school.id)
  if (error) throw new Error(`Temporary school cleanup failed: ${error.message}`)
  expect(await temporarySchool(codigo), 'temporary school retirement must be exact')
    .toMatchObject({ id: school.id, ativo: false })
}

async function verifySchoolAudit(auditId: string, schoolId: string, eventType: string) {
  const { data, error } = await localServiceClient().from('pilot_audit_log')
    .select('escola_id,entity_id,entity_type,event_type')
    .eq('id', auditId).single()
  expect(error).toBeNull()
  expect(data).toEqual({ escola_id: schoolId, entity_id: schoolId, entity_type: 'school', event_type: eventType })
}

async function openSchools(page: Page) {
  await page.goto('/dashboard/escolas')
  await waitForPageLoad(page)
  await expect(page.getByRole('heading', { name: 'Escolas', exact: true })).toBeVisible()
}

function schoolDetailLink(page: Page, schoolId: string) {
  return page.locator(`a[href="/dashboard/escolas/${schoolId}"]`).first()
}

function schoolCode(workerIndex: number) {
  return `9${String(Date.now()).slice(-6)}${workerIndex % 10}`
}

test.describe.serial('Escolas - contrato atual', () => {
  test('lista a escola sintética, combina busca e tipo, e abre seus detalhes', async ({ page }) => {
    const school = await seededSchool()
    await openSchools(page)

    const table = page.getByRole('table')
    await expect(table).toBeVisible()
    await expect(table.getByRole('columnheader')).toHaveText([
      'Escola',
      'Diretor',
      'Tipo',
      'Ocupação',
      'Contato',
      'Status',
      'Ações',
    ])

    const search = page.getByPlaceholder('Buscar por nome, código ou diretor...')
    await search.fill(school.codigo)
    await expect(table.locator('tbody tr')).toHaveCount(1)
    await expect(table.locator('tbody tr').first()).toContainText(SEEDED_SCHOOL)

    await page.getByRole('combobox', { name: 'Tipo', exact: true }).click()
    await page.getByRole('option', { name: 'Creche', exact: true }).click()
    await expect(table.locator('tbody tr')).toHaveCount(1)

    await schoolDetailLink(page, school.id).click()
    await expect(page).toHaveURL(`/dashboard/escolas/${school.id}`)
    await expect(page.getByRole('heading', { name: SEEDED_SCHOOL, exact: true })).toBeVisible()
    await expect(page.getByText(school.codigo, { exact: true })).toBeVisible()
  })

  test('cria, edita e desativa uma escola temporária com recibos de auditoria', async ({ page }) => {
    const suffix = `${Date.now()}-${test.info().workerIndex}`
    const codigo = schoolCode(test.info().workerIndex)
    const name = `Escola Contrato ${suffix}`
    const editedName = `${name} Inativa`

    await retireTemporarySchool(codigo)

    try {
      await page.goto('/dashboard/escolas/nova')
      await waitForPageLoad(page)
      await expect(page.getByRole('heading', { name: 'Nova Escola', exact: true })).toBeVisible()

      await page.getByLabel('Nome da Escola *', { exact: true }).fill(name)
      await page.getByLabel('Código INEP *', { exact: true }).fill(codigo)
      await page.locator('#tipo').click()
      await page.getByRole('option', { name: 'Creche (0-3 anos)', exact: true }).click()
      await page.getByRole('tab', { name: 'Endereço', exact: true }).click()
      await page.getByLabel('Logradouro *', { exact: true }).fill('Rua da Escola E2E, 100')
      await page.getByRole('tab', { name: 'Contato', exact: true }).click()
      await page.getByLabel('Telefone', { exact: true }).fill('34999990001')

      const createResponse = page.waitForResponse(response =>
        response.request().method() === 'POST' && response.url().includes('/rest/v1/rpc/create_governed_school'),
      )
      await page.getByRole('button', { name: 'Cadastrar Escola', exact: true }).click()
      const creation = await createResponse
      expect(creation.ok()).toBe(true)
      const [createdReceipt] = schoolMutationReceipt.parse(await creation.json())
      await expect(page.getByText('Escola cadastrada com sucesso!', { exact: true })).toBeVisible()
      await expect(page).toHaveURL('/dashboard/escolas')

      await expect.poll(() => temporarySchool(codigo)).not.toBeNull()
      const created = await temporarySchool(codigo)
      if (!created) throw new Error('Governed school creation returned no persisted record')
      expect(created).toMatchObject({ nome: name, codigo, tipo: 'creche', ativo: true })
      expect(created.id).toBe(createdReceipt.school_id)
      await verifySchoolAudit(createdReceipt.audit_id, created.id, 'school_created')

      const search = page.getByPlaceholder('Buscar por nome, código ou diretor...')
      await search.fill(name)
      await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1)
      await schoolDetailLink(page, created.id).click()
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()

      await page.getByRole('button', { name: 'Editar', exact: true }).click()
      await expect(page).toHaveURL(`/dashboard/escolas/${created.id}/editar`)
      await page.getByLabel('Nome da Escola *', { exact: true }).fill(editedName)
      await page.locator('#ativo').click()
      await expect(page.getByText('Escola inativa no sistema', { exact: true })).toBeVisible()

      const updateResponse = page.waitForResponse(response =>
        response.request().method() === 'POST' && response.url().includes('/rest/v1/rpc/update_governed_school'),
      )
      await page.getByRole('button', { name: /salvar alterações/i }).click()
      const update = await updateResponse
      expect(update.ok()).toBe(true)
      const [updatedReceipt] = schoolMutationReceipt.parse(await update.json())
      expect(updatedReceipt.school_id).toBe(created.id)
      await verifySchoolAudit(updatedReceipt.audit_id, created.id, 'school_updated')
      await expect(page.getByText('Escola atualizada com sucesso!', { exact: true })).toBeVisible()
      await expect(page).toHaveURL('/dashboard/escolas')

      const updated = await temporarySchool(codigo)
      expect(updated).toMatchObject({ id: created.id, nome: editedName, ativo: false })

      await page.reload()
      await waitForPageLoad(page)
      await expect(page.getByRole('heading', { name: 'Escolas', exact: true })).toBeVisible()
      await page.getByRole('combobox', { name: 'Status', exact: true }).click()
      await page.getByRole('option', { name: 'Inativas', exact: true }).click()
      const inactiveSearch = page.getByPlaceholder('Buscar por nome, código ou diretor...')
      await inactiveSearch.fill(editedName)
      // Canonical RLS hides inactive schools even from the municipal browser session.
      await expect(page.getByText('Nenhuma escola encontrada', { exact: true })).toBeVisible()
      await expect(schoolDetailLink(page, created.id)).toHaveCount(0)
    } finally {
      await retireTemporarySchool(codigo)
    }
  })
})
