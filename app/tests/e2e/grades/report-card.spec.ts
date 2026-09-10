import { execFile as execFileCallback } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { test, expect } from '../support/diagnostics'
import type { Database, Tables } from '@/types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const STUDENT_NAME = 'Pedro Silva E2E'
const CLASS_NAME = '1º Ano A E2E'
const CLASS_DISPLAY = '1º Ano - 1º Ano A E2E'
const SCHOOL_NAME = 'CEMEI Pequenos Passos'
const DISCIPLINE = 'Matemática'
const BIMESTER = 1
const REPORT_GRADE = 8.4
const ACADEMIC_YEAR = 2026
const execFile = promisify(execFileCallback)

type GradeSnapshot = Tables<'notas'> | null

interface ReportTarget {
  readonly studentId: string
  readonly matriculaId: string
}

function getLocalServiceClient() {
  if (!new URL(SUPABASE_URL).hostname.match(/^(127\.0\.0\.1|localhost)$/)) {
    throw new Error('Report card E2E requires a loopback Supabase URL')
  }
  if (!SUPABASE_SERVICE_KEY.startsWith('sb_secret_')) {
    throw new Error('Report card E2E requires the local Supabase service key')
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function getReportTarget(): Promise<ReportTarget> {
  const service = getLocalServiceClient()
  const { data: student, error: studentError } = await service
    .from('alunos')
    .select('id')
    .eq('nome_completo', STUDENT_NAME)
    .single()
  if (studentError || !student) {
    throw new Error(`Report card E2E student fixture is unavailable: ${studentError?.message || STUDENT_NAME}`)
  }

  const { data: enrollment, error: enrollmentError } = await service
    .from('matriculas')
    .select('id')
    .eq('aluno_id', student.id)
    .eq('situacao', 'ativa')
    .single()
  if (enrollmentError || !enrollment) {
    throw new Error(`Report card E2E enrollment fixture is unavailable: ${enrollmentError?.message || STUDENT_NAME}`)
  }

  return { studentId: student.id, matriculaId: enrollment.id }
}

async function readGradeSnapshot(target: ReportTarget): Promise<GradeSnapshot> {
  const { data, error } = await getLocalServiceClient()
    .from('notas')
    .select('*')
    .eq('matricula_id', target.matriculaId)
    .eq('disciplina', DISCIPLINE)
    .eq('bimestre', BIMESTER)
    .maybeSingle()
  if (error) throw new Error(`Report card E2E snapshot failed: ${error.message}`)
  return data
}

async function setReportGrade(target: ReportTarget) {
  const service = getLocalServiceClient()
  const { error: deleteError } = await service
    .from('notas')
    .delete()
    .eq('matricula_id', target.matriculaId)
    .eq('disciplina', DISCIPLINE)
    .eq('bimestre', BIMESTER)
  if (deleteError) throw new Error(`Report card E2E fixture delete failed: ${deleteError.message}`)

  const { error: insertError } = await service.from('notas').insert({
    matricula_id: target.matriculaId,
    disciplina: DISCIPLINE,
    bimestre: BIMESTER,
    nota: REPORT_GRADE,
    tipo_avaliacao: 'prova e2e',
    data_avaliacao: '2026-03-15',
    observacoes: 'Fixture sintético para o boletim individual.',
  })
  if (insertError) throw new Error(`Report card E2E fixture insert failed: ${insertError.message}`)
}

async function restoreGradeSnapshot(target: ReportTarget, snapshot: GradeSnapshot) {
  const service = getLocalServiceClient()
  const { error: deleteError } = await service
    .from('notas')
    .delete()
    .eq('matricula_id', target.matriculaId)
    .eq('disciplina', DISCIPLINE)
    .eq('bimestre', BIMESTER)
  if (deleteError) throw new Error(`Report card E2E recovery delete failed: ${deleteError.message}`)

  if (snapshot) {
    const { error: insertError } = await service.from('notas').insert(snapshot)
    if (insertError) throw new Error(`Report card E2E recovery insert failed: ${insertError.message}`)
  }

  const restored = await readGradeSnapshot(target)
  expect(restored).toEqual(snapshot)
}

/**
 * The implemented report-card route is individual:
 * /dashboard/alunos/[id]/boletim. There is no turma-level boletim route, so
 * this suite never invents or probes /dashboard/turmas/[id]/boletim.
 */
test.describe.serial('Individual report card', () => {
  test('renders seeded student data and exports the individual report PDF', async ({ page }, testInfo) => {
    const target = await getReportTarget()
    const snapshot = await readGradeSnapshot(target)

    try {
      await setReportGrade(target)
      await page.goto(`/dashboard/alunos/${target.studentId}/boletim`)

      await expect(page).toHaveURL(`/dashboard/alunos/${target.studentId}/boletim`)
      await expect(page.getByRole('heading', { name: 'Boletim Escolar', exact: true, level: 1 })).toBeVisible()
      await expect(page.getByText(STUDENT_NAME, { exact: true })).toBeVisible()
      await expect(page.getByText(CLASS_DISPLAY, { exact: true })).toBeVisible()
      await expect(page.getByRole('table')).toBeVisible()
      await expect(page.getByRole('row', { name: new RegExp(`${DISCIPLINE}.*${REPORT_GRADE.toFixed(1)}`) })).toBeVisible()

      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: 'PDF', exact: true }).click()
      const download = await downloadPromise
      expect(download.suggestedFilename()).toBe('boletim-pedro-silva-e2e.pdf')
      const artifactPath = testInfo.outputPath(download.suggestedFilename())
      await download.saveAs(artifactPath)
      const pdf = await readFile(artifactPath)
      const { stdout: extractedText } = await execFile('pdftotext', [artifactPath, '-'])
      const pdfText = extractedText.toString()
      expect(pdf.subarray(0, 4).toString('ascii')).toBe('%PDF')
      expect(pdf.length).toBeGreaterThan(1000)
      expect(pdfText).toContain(STUDENT_NAME)
      expect(pdfText).toContain(CLASS_NAME)
      expect(pdfText).toContain(SCHOOL_NAME)
      expect(pdfText).toContain(DISCIPLINE)
      expect(pdfText).toContain(REPORT_GRADE.toFixed(1))
      expect(pdfText).toContain(String(ACADEMIC_YEAR))
    } finally {
      await restoreGradeSnapshot(target, snapshot)
    }
  })
})
