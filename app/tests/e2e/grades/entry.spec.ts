import { createClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'
import { test, expect } from '../support/diagnostics'
import { loginAs, waitForPageLoad } from '../utils/test-helpers'
import type { Database, Tables } from '@/types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const STUDENT_NAME = 'Pedro Silva E2E'
const CLASS_OPTION = '1º Ano A E2E - 1º Ano'
const DISCIPLINE = 'Matemática'
const BIMESTER = 1
const FIXTURE_GRADE = 8.4

type GradeSnapshot = Tables<'notas'> | null

interface GradeTarget {
  readonly matriculaId: string
}

function getLocalServiceClient() {
  if (!new URL(SUPABASE_URL).hostname.match(/^(127\.0\.0\.1|localhost)$/)) {
    throw new Error('Grades entry E2E requires a loopback Supabase URL')
  }
  if (!SUPABASE_SERVICE_KEY.startsWith('sb_secret_')) {
    throw new Error('Grades entry E2E requires the local Supabase service key')
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function getGradeTarget(): Promise<GradeTarget> {
  const service = getLocalServiceClient()
  const { data: student, error: studentError } = await service
    .from('alunos')
    .select('id')
    .eq('nome_completo', STUDENT_NAME)
    .single()
  if (studentError || !student) {
    throw new Error(`Grades entry E2E student fixture is unavailable: ${studentError?.message || STUDENT_NAME}`)
  }

  const { data: enrollment, error: enrollmentError } = await service
    .from('matriculas')
    .select('id')
    .eq('aluno_id', student.id)
    .eq('situacao', 'ativa')
    .single()
  if (enrollmentError || !enrollment) {
    throw new Error(`Grades entry E2E enrollment fixture is unavailable: ${enrollmentError?.message || STUDENT_NAME}`)
  }

  return { matriculaId: enrollment.id }
}

async function readGradeSnapshot(target: GradeTarget): Promise<GradeSnapshot> {
  const { data, error } = await getLocalServiceClient()
    .from('notas')
    .select('*')
    .eq('matricula_id', target.matriculaId)
    .eq('disciplina', DISCIPLINE)
    .eq('bimestre', BIMESTER)
    .maybeSingle()
  if (error) throw new Error(`Grades entry E2E snapshot failed: ${error.message}`)
  return data
}

async function restoreGradeSnapshot(target: GradeTarget, snapshot: GradeSnapshot) {
  const service = getLocalServiceClient()
  const { error: deleteError } = await service
    .from('notas')
    .delete()
    .eq('matricula_id', target.matriculaId)
    .eq('disciplina', DISCIPLINE)
    .eq('bimestre', BIMESTER)
  if (deleteError) throw new Error(`Grades entry E2E recovery delete failed: ${deleteError.message}`)

  if (snapshot) {
    const { error: insertError } = await service.from('notas').insert(snapshot)
    if (insertError) throw new Error(`Grades entry E2E recovery insert failed: ${insertError.message}`)
  }

  const restored = await readGradeSnapshot(target)
  expect(restored).toEqual(snapshot)
}

async function setFixtureGrade(target: GradeTarget, grade: number) {
  const service = getLocalServiceClient()
  const { error: deleteError } = await service
    .from('notas')
    .delete()
    .eq('matricula_id', target.matriculaId)
    .eq('disciplina', DISCIPLINE)
    .eq('bimestre', BIMESTER)
  if (deleteError) throw new Error(`Grades entry E2E fixture delete failed: ${deleteError.message}`)

  const { error: insertError } = await service.from('notas').insert({
    matricula_id: target.matriculaId,
    disciplina: DISCIPLINE,
    bimestre: BIMESTER,
    nota: grade,
    tipo_avaliacao: 'prova e2e',
    data_avaliacao: '2026-03-15',
    observacoes: 'Fixture sintético para a grade de notas.',
  })
  if (insertError) throw new Error(`Grades entry E2E fixture insert failed: ${insertError.message}`)
}

async function openGradeGrid(page: Page) {
  const studentRequests: string[] = []
  page.on('request', request => {
    if (request.url().includes('/rest/v1/alunos?')) studentRequests.push(request.url())
  })

  await page.goto('/dashboard/notas')
  await waitForPageLoad(page)
  await expect(page.getByRole('heading', { name: /sistema de notas|grades/i })).toBeVisible()
  await expect(page.getByLabel('Turma', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Disciplina', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Bimestre', { exact: true })).toBeVisible()
  await expect(page.getByRole('table').first()).toBeVisible()

  return studentRequests
}

async function selectFixtureClass(page: Page) {
  await page.getByLabel('Turma', { exact: true }).click()
  const classOption = page.getByRole('option', { name: CLASS_OPTION, exact: true })
  await expect(classOption).toBeVisible()
  await classOption.click()
  await expect(page.getByRole('heading', { name: CLASS_OPTION, exact: true })).toBeVisible()
}

function fixtureGradeButton(page: Page, bimestre = BIMESTER) {
  return page.getByRole('button', {
    name: `Editar nota de ${STUDENT_NAME} em ${DISCIPLINE}, ${bimestre}º bimestre`,
    exact: true,
  })
}

async function openFixtureGradeEditor(page: Page) {
  const gradeButton = fixtureGradeButton(page)
  await expect(gradeButton).toBeVisible()
  await gradeButton.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const gradeInput = dialog.getByLabel('Nota (0 a 10)', { exact: true })
  await expect(gradeInput).toBeVisible()
  return { dialog, gradeInput }
}

test.describe.serial('Grades entry', () => {
  test('loads the real grid with the authorized student projection', async ({ page }) => {
    const studentRequests = await openGradeGrid(page)
    await expect.poll(() => studentRequests.length).toBeGreaterThan(0)

    const gradeGridRequest = studentRequests
      .map(url => decodeURIComponent(url))
      .find(url => url.includes('select=id,nome_completo'))
    expect(gradeGridRequest).toBeTruthy()
    expect(gradeGridRequest).not.toContain('select=*')
  })

  test('filters the seeded class and a single bimestre', async ({ page }) => {
    const target = await getGradeTarget()
    const snapshot = await readGradeSnapshot(target)

    try {
      await setFixtureGrade(target, FIXTURE_GRADE)
      await openGradeGrid(page)
      await selectFixtureClass(page)
      await expect(page.getByRole('row', { name: new RegExp(STUDENT_NAME) })).toBeVisible()
      await expect(fixtureGradeButton(page)).toHaveText(FIXTURE_GRADE.toFixed(1))

      await page.getByLabel('Bimestre', { exact: true }).click()
      await page.getByRole('option', { name: '1 Bim', exact: true }).click()
      await expect(fixtureGradeButton(page)).toHaveText(FIXTURE_GRADE.toFixed(1))
      await expect(fixtureGradeButton(page, 2)).toHaveCount(0)
    } finally {
      await restoreGradeSnapshot(target, snapshot)
    }
  })

  test('rejects a grade outside the 0–10 range before any write', async ({ page }) => {
    const target = await getGradeTarget()
    const snapshot = await readGradeSnapshot(target)
    const gradeMutations: string[] = []
    const collectGradeMutation = (request: import('@playwright/test').Request) => {
      if (request.url().includes('/rest/v1/notas') && ['POST', 'PATCH', 'DELETE'].includes(request.method())) {
        gradeMutations.push(`${request.method()} ${request.url()}`)
      }
    }
    page.on('request', collectGradeMutation)

    try {
      await openGradeGrid(page)
      await selectFixtureClass(page)
      const { dialog, gradeInput } = await openFixtureGradeEditor(page)

      await gradeInput.fill('15')
      await dialog.getByRole('button', { name: /salvar/i }).click()
      await expect(page.getByText('Nota deve ser um número entre 0 e 10', { exact: true })).toBeVisible()
      expect(gradeMutations).toEqual([])
      expect(await readGradeSnapshot(target)).toEqual(snapshot)
    } finally {
      page.off('request', collectGradeMutation)
      await restoreGradeSnapshot(target, snapshot)
    }
  })

  test('persists, reloads, and restores the exact synthetic grade record', async ({ page }) => {
    const target = await getGradeTarget()
    const snapshot = await readGradeSnapshot(target)
    const writtenGrade = snapshot?.nota === 8.4 ? 8.3 : 8.4

    try {
      await loginAs(page, 'diretor@test.com')
      await openGradeGrid(page)
      await selectFixtureClass(page)
      const { dialog, gradeInput } = await openFixtureGradeEditor(page)

      await gradeInput.fill(String(writtenGrade))
      await dialog.getByRole('button', { name: /salvar/i }).click()
      await expect(page.getByText('Nota salva com sucesso!', { exact: true })).toBeVisible()
      await expect(fixtureGradeButton(page)).toHaveText(writtenGrade.toFixed(1))

      await page.reload()
      await waitForPageLoad(page)
      await selectFixtureClass(page)
      await expect(fixtureGradeButton(page)).toHaveText(writtenGrade.toFixed(1))
    } finally {
      await restoreGradeSnapshot(target, snapshot)
    }
  })
})
