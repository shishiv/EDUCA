import { execFile as execFileCallback } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import ExcelJS from 'exceljs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'
import type { Database } from '@/types/database'
import { test, expect } from '../support/diagnostics'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const CLASS_NAME = '1º Ano A E2E'
const SCHOOL_NAME = 'CEMEI Pequenos Passos'
const FIXTURE_RUN_ID = randomUUID()
const STUDENT_ID = randomUUID()
const ENROLLMENT_ID = randomUUID()
const STUDENT_NAME = `Frequência C14 E2E ${FIXTURE_RUN_ID.slice(0, 8)}`
const FIXTURE_DATES = ['2026-09-02', '2026-09-03', '2026-09-04'] as const
const SESSION_IDS = [
  randomUUID(),
  randomUUID(),
  randomUUID(),
] as const
const ATTENDANCE_IDS = [
  randomUUID(),
  randomUUID(),
  randomUUID(),
] as const

const execFile = promisify(execFileCallback)

function exportedRowValues(row: ExcelJS.Row) {
  if (!Array.isArray(row.values)) throw new Error('FREQUENCY_EXPORT_ROW_VALUES_INVALID')
  return row.values.slice(1)
}

let admin: SupabaseClient<Database>
let classId = ''

function getLocalAdminClient(): SupabaseClient<Database> {
  if (!new URL(SUPABASE_URL).hostname.match(/^(127\.0\.0\.1|localhost)$/)) {
    throw new Error('Frequency report E2E requires a loopback Supabase URL')
  }
  if (!SERVICE_ROLE_KEY.startsWith('sb_secret_')) {
    throw new Error('Frequency report E2E requires the local Supabase service key')
  }
  return createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function requireDatabaseSuccess(label: string, error: { message: string } | null): void {
  if (error) throw new Error(`${label}: ${error.message}`)
}

async function cleanupFixture(client: SupabaseClient<Database>): Promise<void> {
  const attendance = await client.from('frequencia').delete().in('id', [...ATTENDANCE_IDS])
  requireDatabaseSuccess('frequency fixture attendance cleanup failed', attendance.error)
  const sessions = await client.from('sessoes_aula').delete().in('id', [...SESSION_IDS])
  requireDatabaseSuccess('frequency fixture session cleanup failed', sessions.error)
  const enrollment = await client.from('matriculas').delete().eq('id', ENROLLMENT_ID)
  requireDatabaseSuccess('frequency fixture enrollment cleanup failed', enrollment.error)
  const student = await client.from('alunos').delete().eq('id', STUDENT_ID)
  requireDatabaseSuccess('frequency fixture student cleanup failed', student.error)
}

async function seedFixture(client: SupabaseClient<Database>): Promise<void> {
  // Reports consume marked canonical facts without requiring finalization. Keep
  // this disposable fixture open so cleanup honors closed-session immutability.
  await cleanupFixture(client)
  const [turmaResult, teacherResult] = await Promise.all([
    client.from('turmas').select('id, escola_id').eq('nome', CLASS_NAME).single(),
    client.from('users').select('id').eq('email', 'professor@test.com').single(),
  ])
  requireDatabaseSuccess('frequency fixture class lookup failed', turmaResult.error)
  requireDatabaseSuccess('frequency fixture teacher lookup failed', teacherResult.error)
  if (!turmaResult.data || !teacherResult.data) throw new Error('FREQUENCY_FIXTURE_SCOPE_MISSING')
  classId = turmaResult.data.id

  const student = await client.from('alunos').insert({
    id: STUDENT_ID,
    escola_id: turmaResult.data.escola_id,
    nome_completo: STUDENT_NAME,
    data_nascimento: '2018-04-10',
    sexo: 'F',
    ativo: true,
    bolsa_familia: false,
  })
  requireDatabaseSuccess('frequency fixture student insert failed', student.error)

  const enrollment = await client.from('matriculas').insert({
    id: ENROLLMENT_ID,
    aluno_id: STUDENT_ID,
    turma_id: classId,
    ano_letivo: 2026,
    situacao: 'ativa',
    data_matricula: '2026-02-02',
    observacoes: `Fixture persistida do relatório de frequência C14 ${FIXTURE_RUN_ID}`,
  })
  requireDatabaseSuccess('frequency fixture enrollment insert failed', enrollment.error)

  const sessions = await client.from('sessoes_aula').insert(SESSION_IDS.map((id, index) => ({
    id,
    turma_id: classId,
    escola_id: turmaResult.data.escola_id,
    professor_id: teacherResult.data.id,
    data_aula: FIXTURE_DATES[index],
    conteudo_programatico: `Frequência C14 ${FIXTURE_RUN_ID} ${index + 1}`,
    status: 'ABERTA',
    aberta_em: `${FIXTURE_DATES[index]}T08:00:00-03:00`,
  })))
  requireDatabaseSuccess('frequency fixture sessions insert failed', sessions.error)

  const statuses = ['P', 'F', 'A'] as const
  const attendance = await client.from('frequencia').insert(ATTENDANCE_IDS.map((id, index) => ({
    id,
    matricula_id: ENROLLMENT_ID,
    sessao_id: SESSION_IDS[index],
    data_aula: FIXTURE_DATES[index],
    presente: statuses[index] !== 'F',
    status_presenca: statuses[index],
    professor_id: teacherResult.data.id,
    marcado_por: teacherResult.data.id,
    marcado_em: `${FIXTURE_DATES[index]}T08:15:00-03:00`,
  })))
  requireDatabaseSuccess('frequency fixture attendance insert failed', attendance.error)
}

async function openReport(page: Page): Promise<void> {
  await page.goto('/relatorios/frequencia')
  await expect(page.getByRole('heading', { name: 'Relatórios de Frequência', exact: true })).toBeVisible()
  await expect(page.getByLabel('Turma', { exact: true })).toBeVisible()
}

async function generateFixtureReport(page: Page): Promise<void> {
  const classSelect = page.getByLabel('Turma', { exact: true })
  await classSelect.click()
  await page.getByRole('option', { name: new RegExp(`1º Ano - ${CLASS_NAME}`) }).click()

  await page.getByLabel('Período', { exact: true }).click()
  await page.getByRole('option', { name: '3º Bimestre', exact: true }).click()
  await page.getByRole('button', { name: 'Gerar Relatorio', exact: true }).click()
  await expect(page.getByRole('row').filter({ hasText: STUDENT_NAME })).toBeVisible()
}

test.beforeAll(async () => {
  admin = getLocalAdminClient()
  await seedFixture(admin)
})

test.afterAll(async () => {
  if (admin) await cleanupFixture(admin)
})

test.describe('Relatório de frequência', () => {
  test('shows the implemented filters, custom dates, and pre-generation export guard', async ({ page }) => {
    await openReport(page)

    await expect(page.getByText('Visualize e exporte relatórios de frequência por turma e período', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Filtros', exact: true })).toBeVisible()
    await expect(page.getByLabel('Período', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Gerar Relatorio', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Excel', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'PDF', exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Excel', exact: true }).click()
    await expect(page.getByText('Gere um relatorio primeiro', { exact: true })).toBeVisible()

    await page.getByLabel('Período', { exact: true }).click()
    await page.getByRole('option', { name: 'Personalizado', exact: true }).click()
    await expect(page.getByText('Data Início', { exact: true }).locator('..').getByRole('button')).toBeVisible()
    await expect(page.getByText('Data Fim', { exact: true }).locator('..').getByRole('button')).toBeVisible()
  })

  test('renders persisted canonical attendance and the implemented table and chart states', async ({ page }) => {
    await openReport(page)
    await generateFixtureReport(page)

    const table = page.getByRole('table')
    await expect(table.getByRole('columnheader', { name: 'Aluno', exact: true })).toBeVisible()
    await expect(table.getByRole('columnheader', { name: 'Presencas', exact: true })).toBeVisible()
    await expect(table.getByRole('columnheader', { name: 'Faltas', exact: true })).toBeVisible()
    await expect(table.getByRole('columnheader', { name: 'Atestados', exact: true })).toBeVisible()

    const row = table.getByRole('row').filter({ hasText: STUDENT_NAME })
    const cells = row.getByRole('cell')
    await expect(cells.nth(2)).toHaveText('1')
    await expect(cells.nth(3)).toHaveText('1')
    await expect(cells.nth(4)).toHaveText('1')
    await expect(cells.nth(5)).toHaveText('3')
    await expect(cells.nth(6)).toHaveText('67,0%')
    await expect(page.getByRole('region', { name: 'Resumo da frequência' })).toBeVisible()
    await expect(page.getByText(`1º Ano - ${CLASS_NAME}`, { exact: true })).toBeVisible()

    await page.getByRole('tab', { name: 'Gráfico', exact: true }).click()
    await expect(page.getByText('Gráfico em desenvolvimento', { exact: true })).toBeVisible()
    await page.getByRole('tab', { name: 'Tabela', exact: true }).click()
    await expect(table).toBeVisible()
  })

  test('downloads Excel and PDF exports with the generated attendance row', async ({ page }, testInfo) => {
    await openReport(page)
    await generateFixtureReport(page)

    const excelDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Excel', exact: true }).click()
    const excelDownload = await excelDownloadPromise
    expect(excelDownload.suggestedFilename()).toMatch(/^frequencia_.*\.xlsx$/)
    const excelPath = testInfo.outputPath(excelDownload.suggestedFilename())
    await excelDownload.saveAs(excelPath)
    const excelBytes = await readFile(excelPath)
    expect(excelBytes.subarray(0, 2).toString('ascii')).toBe('PK')
    expect(excelBytes.length).toBeGreaterThan(1000)

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(excelPath)
    expect(workbook.worksheets.map((worksheet) => worksheet.name)).toEqual(['Frequência'])
    const worksheet = workbook.getWorksheet('Frequência')
    if (!worksheet) throw new Error('FREQUENCY_EXPORT_WORKSHEET_MISSING')
    expect(worksheet.getCell('A1').text).toBe('Relatório de Frequência')
    expect(worksheet.getCell('A2').text).toBe(`${CLASS_NAME} - 1º Ano`)
    expect(worksheet.getCell('A4').text).toBe(`Escola: ${SCHOOL_NAME}`)
    expect(exportedRowValues(worksheet.getRow(8))).toEqual(['Nome', 'P', 'F', 'A', 'Total', '%', 'Status'])

    let excelStudentRow: ExcelJS.Row | undefined
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 9 && row.getCell(1).text === STUDENT_NAME) excelStudentRow = row
    })
    if (!excelStudentRow) throw new Error('FREQUENCY_EXPORT_STUDENT_ROW_MISSING')
    expect(exportedRowValues(excelStudentRow)).toEqual([
      STUDENT_NAME,
      1,
      1,
      1,
      3,
      67,
      'Abaixo da referência municipal',
    ])

    const pdfDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'PDF', exact: true }).first().click()
    const pdfDownload = await pdfDownloadPromise
    expect(pdfDownload.suggestedFilename()).toMatch(/^frequencia_.*\.pdf$/)
    const pdfPath = testInfo.outputPath(pdfDownload.suggestedFilename())
    await pdfDownload.saveAs(pdfPath)
    const pdfBytes = await readFile(pdfPath)
    const { stdout } = await execFile('pdftotext', [pdfPath, '-'])
    const pdfText = stdout.toString()
    const compactPdfText = pdfText.replace(/\s+/g, ' ')
    expect(pdfBytes.subarray(0, 4).toString('ascii')).toBe('%PDF')
    expect(pdfBytes.length).toBeGreaterThan(1000)
    expect(compactPdfText).toContain('Relatório de Frequência')
    expect(compactPdfText).toContain(`${CLASS_NAME} - 1º Ano`)
    expect(compactPdfText).toContain(SCHOOL_NAME)
    expect(compactPdfText).toContain('Nome P F A Total % Status')
    expect(compactPdfText).toContain(
      `${STUDENT_NAME} 1 1 1 3 67% Abaixo da referência municipal`,
    )
  })

  test('keeps filters and the real report usable at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openReport(page)
    await generateFixtureReport(page)

    const generateButton = page.getByRole('button', { name: 'Gerar Relatorio', exact: true })
    const buttonBox = await generateButton.boundingBox()
    expect(buttonBox).not.toBeNull()
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44)

    const table = page.getByRole('table')
    const scrollContainer = table.locator('..')
    await expect(scrollContainer).toHaveCSS('overflow-x', 'auto')
    const tableScrollsInsideContainer = await scrollContainer.evaluate(
      element => element.scrollWidth > element.clientWidth,
    )
    expect(tableScrollsInsideContainer).toBe(true)
    const documentOverflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(documentOverflows).toBe(false)
  })
})
