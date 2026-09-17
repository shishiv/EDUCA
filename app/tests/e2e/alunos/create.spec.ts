import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'
import { expect, test } from '../support/diagnostics'
import { generateValidCPF, waitForPageLoad } from '../utils/test-helpers'
import type { Database, Tables } from '@/types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

type Student = Tables<'alunos'>
type Guardian = Tables<'responsaveis'>

function localServiceClient(): SupabaseClient<Database> {
  if (!['127.0.0.1', 'localhost'].includes(new URL(SUPABASE_URL).hostname)) {
    throw new Error('Student admission E2E requires a loopback Supabase URL')
  }
  if (!SUPABASE_SERVICE_KEY.startsWith('sb_secret_')) {
    throw new Error('Student admission E2E requires the local Supabase service key')
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function temporaryStudent(name: string): Promise<Student | null> {
  const { data, error } = await localServiceClient()
    .from('alunos')
    .select('*')
    .eq('nome_completo', name)
    .maybeSingle()
  if (error) throw new Error(`Temporary student lookup failed: ${error.message}`)
  return data
}

async function temporaryGuardian(name: string): Promise<Guardian | null> {
  const { data, error } = await localServiceClient()
    .from('responsaveis')
    .select('*')
    .eq('nome', name)
    .maybeSingle()
  if (error) throw new Error(`Temporary guardian lookup failed: ${error.message}`)
  return data
}

async function removeTemporaryAdmission(studentName: string, guardianName?: string) {
  const service = localServiceClient()
  const student = await temporaryStudent(studentName)
  if (student) {
    const { error: linkError } = await service.from('aluno_responsaveis').delete().eq('aluno_id', student.id)
    if (linkError) throw new Error(`Temporary student relationship cleanup failed: ${linkError.message}`)
    const { error: studentError } = await service.from('alunos').delete().eq('id', student.id)
    if (studentError) throw new Error(`Temporary student cleanup failed: ${studentError.message}`)
  }

  if (guardianName) {
    const guardian = await temporaryGuardian(guardianName)
    if (guardian) {
      const { error: guardianLinkError } = await service.from('aluno_responsaveis').delete().eq('responsavel_id', guardian.id)
      if (guardianLinkError) throw new Error(`Temporary guardian relationship cleanup failed: ${guardianLinkError.message}`)
      const { error: guardianError } = await service.from('responsaveis').delete().eq('id', guardian.id)
      if (guardianError) throw new Error(`Temporary guardian cleanup failed: ${guardianError.message}`)
    }
  }

  expect(await temporaryStudent(studentName), 'temporary student cleanup must be exact').toBeNull()
  if (guardianName) expect(await temporaryGuardian(guardianName), 'temporary guardian cleanup must be exact').toBeNull()
}

async function openStudentForm(page: Page) {
  await page.goto('/dashboard/alunos/novo')
  await waitForPageLoad(page)
  await expect(page.getByRole('heading', { name: 'Novo Aluno', exact: true })).toBeVisible()
}

async function fillRequiredStudentFields(page: Page, name: string, sex: 'Masculino' | 'Feminino') {
  await page.getByLabel('Nome Completo *', { exact: true }).fill(name)
  await page.getByLabel('Data de Nascimento *', { exact: true }).fill('2015-03-15')
  await page.locator('#sexo').click()
  await page.getByRole('option', { name: sex, exact: true }).click()
  await page.getByLabel('Nome da Mãe *', { exact: true }).fill('Mãe E2E')
  await page.getByLabel('Endereço Completo *', { exact: true }).fill('Rua E2E, 123, Centro')
}

test.describe('Alunos - formulário de admissão atual', () => {
  test.beforeEach(async ({ page }) => {
    await openStudentForm(page)
  })

  test('expõe os campos e abas que participam da admissão', async ({ page }) => {
    await expect(page.getByRole('tablist')).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Dados Pessoais', exact: true })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Responsável', exact: true })).toBeVisible()
    await expect(page.getByLabel('Nome Completo *', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Data de Nascimento *', { exact: true })).toHaveAttribute('type', 'date')
    await expect(page.locator('#sexo')).toBeVisible()
    await expect(page.getByLabel('Nome da Mãe *', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Endereço Completo *', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cadastrar Aluno', exact: true })).toBeEnabled()
  })

  test('bloqueia a submissão sem os campos obrigatórios implementados', async ({ page }) => {
    await page.getByRole('button', { name: 'Cadastrar Aluno', exact: true }).click()
    await expect(page.getByText('Corrija os campos obrigatórios destacados antes de continuar.', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Nome Completo *', { exact: true })).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Endereço Completo *', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  })

  test('preserva os dados pessoais ao navegar para o responsável e cancelar', async ({ page }) => {
    await page.getByLabel('Nome Completo *', { exact: true }).fill('Aluno de navegação E2E')
    await page.getByRole('tab', { name: 'Responsável', exact: true }).click()
    await expect(page.locator('#resp_nome')).toBeVisible()
    await expect(page.locator('#resp_telefone')).toBeVisible()
    await page.getByRole('tab', { name: 'Dados Pessoais', exact: true }).click()
    await expect(page.getByLabel('Nome Completo *', { exact: true })).toHaveValue('Aluno de navegação E2E')
    await page.getByRole('link', { name: 'Cancelar', exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard\/alunos$/)
  })
})

test.describe('Alunos - criações reais', () => {
  test('persiste os campos obrigatórios e telefone do aluno', async ({ page }) => {
    const studentName = `E2E Test Student ${Date.now()}`
    const cpf = generateValidCPF().replace(/\D/g, '')

    await removeTemporaryAdmission(studentName)
    try {
      await openStudentForm(page)
      await fillRequiredStudentFields(page, studentName, 'Masculino')
      await page.getByLabel('CPF', { exact: true }).fill(cpf)
      await page.getByLabel('Telefone', { exact: true }).fill('34999990003')
      await page.getByRole('button', { name: 'Cadastrar Aluno', exact: true }).click()
      await expect(page.getByText('Aluno cadastrado com sucesso!', { exact: true })).toBeVisible()
      await expect(page).toHaveURL(/\/dashboard\/alunos$/)

      await expect.poll(() => temporaryStudent(studentName)).not.toBeNull()
      expect(await temporaryStudent(studentName)).toMatchObject({
        nome_completo: studentName,
        cpf,
        telefone: '34999990003',
        nome_mae: 'Mãe E2E',
        endereco: 'Rua E2E, 123, Centro',
        sexo: 'M',
      })
    } finally {
      await removeTemporaryAdmission(studentName)
    }
  })

  test('persiste uma admissão sem CPF, pois CPF é opcional no formulário atual', async ({ page }) => {
    const studentName = `E2E No CPF ${Date.now()}`

    await removeTemporaryAdmission(studentName)
    try {
      await openStudentForm(page)
      await fillRequiredStudentFields(page, studentName, 'Feminino')
      await page.getByRole('button', { name: 'Cadastrar Aluno', exact: true }).click()
      await expect(page.getByText('Aluno cadastrado com sucesso!', { exact: true })).toBeVisible()
      await expect(page).toHaveURL(/\/dashboard\/alunos$/)

      await expect.poll(() => temporaryStudent(studentName)).not.toBeNull()
      expect(await temporaryStudent(studentName)).toMatchObject({ nome_completo: studentName, cpf: null, sexo: 'F' })
    } finally {
      await removeTemporaryAdmission(studentName)
    }
  })

  test('persiste aluno, responsável, telefones e vínculo pela fronteira de admissão', async ({ page }) => {
    const suffix = `${Date.now()}-${test.info().workerIndex}`
    const studentName = `E2E Admission Student ${suffix}`
    const guardianName = `E2E Admission Guardian ${suffix}`

    await removeTemporaryAdmission(studentName, guardianName)
    try {
      await openStudentForm(page)
      await fillRequiredStudentFields(page, studentName, 'Masculino')
      await page.getByLabel('Telefone', { exact: true }).fill('34999990011')
      await page.getByRole('tab', { name: 'Responsável', exact: true }).click()
      await page.locator('#resp_nome').fill(guardianName)
      await page.locator('#resp_parentesco').click()
      await page.getByRole('option', { name: 'Pai', exact: true }).click()
      await page.locator('#resp_telefone').fill('(34) 99999-0012')

      const admissionResponse = page.waitForResponse(response =>
        response.request().method() === 'POST' && response.url().includes('/rest/v1/rpc/create_student_admission'),
      )
      await page.getByRole('button', { name: 'Cadastrar Aluno', exact: true }).click()
      expect((await admissionResponse).ok()).toBe(true)
      await expect(page.getByText('Aluno cadastrado com sucesso!', { exact: true })).toBeVisible()

      await expect.poll(() => temporaryStudent(studentName)).not.toBeNull()
      await expect.poll(() => temporaryGuardian(guardianName)).not.toBeNull()
      const student = await temporaryStudent(studentName)
      const guardian = await temporaryGuardian(guardianName)
      if (!student || !guardian) throw new Error('Admission did not persist both temporary records')
      expect(student).toMatchObject({ nome_completo: studentName, telefone: '34999990011', sexo: 'M' })
      expect(guardian).toMatchObject({ nome: guardianName, parentesco: 'pai', telefone: '34999990012' })

      const { data: relationship, error: relationshipError } = await localServiceClient()
        .from('aluno_responsaveis')
        .select('aluno_id,responsavel_id')
        .eq('aluno_id', student.id)
        .eq('responsavel_id', guardian.id)
        .maybeSingle()
      if (relationshipError) throw new Error(`Admission relationship lookup failed: ${relationshipError.message}`)
      expect(relationship).toEqual({ aluno_id: student.id, responsavel_id: guardian.id })
    } finally {
      await removeTemporaryAdmission(studentName, guardianName)
    }
  })

  test('mostra o estado de envio enquanto a RPC de admissão está pendente', async ({ page }) => {
    const studentName = `Loading Test ${Date.now()}`
    let releaseAdmission = () => {}
    const admissionPaused = new Promise<void>(resolve => {
      releaseAdmission = resolve
    })
    await page.route('**/rest/v1/rpc/create_student_admission', async route => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      await admissionPaused
      await route.continue()
    })

    await removeTemporaryAdmission(studentName)
    try {
      await openStudentForm(page)
      await fillRequiredStudentFields(page, studentName, 'Masculino')
      const saveButton = page.getByRole('button', { name: 'Cadastrar Aluno', exact: true })
      const admissionRequest = page.waitForRequest(request =>
        request.method() === 'POST' && new URL(request.url()).pathname === '/rest/v1/rpc/create_student_admission',
      )
      await saveButton.click()
      await admissionRequest
      await expect(page.getByRole('button', { name: 'Cadastrando...', exact: true })).toBeDisabled()
      releaseAdmission()
      await expect(page).toHaveURL(/\/dashboard\/alunos$/, { timeout: 10_000 })
      await expect.poll(() => temporaryStudent(studentName)).not.toBeNull()
    } finally {
      releaseAdmission()
      await removeTemporaryAdmission(studentName)
    }
  })
})
