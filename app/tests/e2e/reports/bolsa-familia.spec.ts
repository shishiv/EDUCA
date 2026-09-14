import { execFile as execFileCallback } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import type ExcelJS from 'exceljs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'
import type { Database } from '@/types/database'
import { test, expect } from '../support/diagnostics'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const CLASS_NAME = '1º Ano A E2E'
const SCHOOL_NAME = 'CEMEI Pequenos Passos'
const FIXTURE_RUN_ID = randomUUID()
const STUDENT_ID = randomUUID()
const ENROLLMENT_ID = randomUUID()
const STUDENT_NAME = `Bolsa Família C14 E2E ${FIXTURE_RUN_ID.slice(0, 8)}`
const STUDENT_NIS = FIXTURE_RUN_ID.replace(/\D/g, '').padEnd(11, '0').slice(0, 11)
const FIXTURE_DATES = ['2026-09-05', '2026-09-06', '2026-09-07'] as const
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

type ConditionalityRow =
  Database['public']['Functions']['get_attendance_conditionality']['Returns'][number]

const execFile = promisify(execFileCallback)

function exportedRowValues(row: ExcelJS.Row) {
  if (!Array.isArray(row.values)) throw new Error('BOLSA_FAMILIA_EXPORT_ROW_VALUES_INVALID')
  return row.values.slice(1)
}

let admin: SupabaseClient<Database>
let classId = ''
let schoolId = ''
let expectedRow: ConditionalityRow

function getLocalAdminClient(): SupabaseClient<Database> {
  if (!new URL(SUPABASE_URL).hostname.match(/^(127\.0\.0\.1|localhost)$/)) {
    throw new Error('Bolsa Família report E2E requires a loopback Supabase URL')
  }
  if (!SERVICE_ROLE_KEY.startsWith('sb_secret_')) {
    throw new Error('Bolsa Família report E2E requires the local Supabase service key')
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
  requireDatabaseSuccess('Bolsa fixture attendance cleanup failed', attendance.error)
  const sessions = await client.from('sessoes_aula').delete().in('id', [...SESSION_IDS])
  requireDatabaseSuccess('Bolsa fixture session cleanup failed', sessions.error)
  const enrollment = await client.from('matriculas').delete().eq('id', ENROLLMENT_ID)
  requireDatabaseSuccess('Bolsa fixture enrollment cleanup failed', enrollment.error)
  const student = await client.from('alunos').delete().eq('id', STUDENT_ID)
  requireDatabaseSuccess('Bolsa fixture student cleanup failed', student.error)
}

async function seedFixture(client: SupabaseClient<Database>): Promise<void> {
  // The conditionality projection counts marked facts independently of session
  // finalization. Keep this disposable fixture open so cleanup remains legal.
  await cleanupFixture(client)
  const [turmaResult, teacherResult] = await Promise.all([
    client.from('turmas').select('id, escola_id').eq('nome', CLASS_NAME).single(),
    client.from('users').select('id').eq('email', 'professor@test.com').single(),
  ])
  requireDatabaseSuccess('Bolsa fixture class lookup failed', turmaResult.error)
  requireDatabaseSuccess('Bolsa fixture teacher lookup failed', teacherResult.error)
  if (!turmaResult.data || !teacherResult.data) throw new Error('BOLSA_FIXTURE_SCOPE_MISSING')
  classId = turmaResult.data.id
  schoolId = turmaResult.data.escola_id

  const student = await client.from('alunos').insert({
    id: STUDENT_ID,
    escola_id: schoolId,
    nome_completo: STUDENT_NAME,
    data_nascimento: '2018-01-10',
    sexo: 'M',
    ativo: true,
    bolsa_familia: true,
    nis: STUDENT_NIS,
  })
  requireDatabaseSuccess('Bolsa fixture student insert failed', student.error)

  const enrollment = await client.from('matriculas').insert({
    id: ENROLLMENT_ID,
    aluno_id: STUDENT_ID,
    turma_id: classId,
    ano_letivo: 2026,
    situacao: 'ativa',
    data_matricula: '2026-02-02',
    observacoes: `Fixture persistida do relatório Bolsa Família C14 ${FIXTURE_RUN_ID}`,
  })
  requireDatabaseSuccess('Bolsa fixture enrollment insert failed', enrollment.error)

  const sessions = await client.from('sessoes_aula').insert(SESSION_IDS.map((id, index) => ({
    id,
    turma_id: classId,
    escola_id: schoolId,
    professor_id: teacherResult.data.id,
    data_aula: FIXTURE_DATES[index],
    conteudo_programatico: `Bolsa Família C14 ${FIXTURE_RUN_ID} ${index + 1}`,
    status: 'ABERTA',
    aberta_em: `${FIXTURE_DATES[index]}T08:00:00-03:00`,
  })))
  requireDatabaseSuccess('Bolsa fixture sessions insert failed', sessions.error)

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
  requireDatabaseSuccess('Bolsa fixture attendance insert failed', attendance.error)
}

async function loadExpectedConditionality(): Promise<ConditionalityRow> {
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const signIn = await client.auth.signInWithPassword({
    email: 'admin@test.com',
    password: 'test123456',
  })
  requireDatabaseSuccess('Bolsa expected-row authentication failed', signIn.error)

  const result = await client.rpc('get_attendance_conditionality', {
    p_start_date: '2026-08-01',
    p_end_date: '2026-09-30',
    p_escola_id: schoolId,
    p_turma_id: classId,
  })
  requireDatabaseSuccess('Bolsa expected-row RPC failed', result.error)
  const row = result.data?.find(candidate => candidate.aluno_id === STUDENT_ID)
  if (!row) throw new Error('BOLSA_CANONICAL_ROW_MISSING')
  return row
}

async function openReport(page: Page): Promise<void> {
  await page.goto('/relatorios/bolsa-familia')
  await expect(page.getByRole('heading', { name: 'Relatório Bolsa Família', exact: true })).toBeVisible()
  await expect(page.getByLabel('Escola', { exact: true })).toBeVisible()
}

async function filterToFixture(page: Page): Promise<void> {
  const schoolSelect = page.getByLabel('Escola', { exact: true })
  await schoolSelect.click()
  await page.getByRole('option', { name: SCHOOL_NAME, exact: true }).click()

  const classSelect = page.getByLabel('Turma', { exact: true })
  await expect(classSelect).toBeEnabled()
  await classSelect.click()
  await page.getByRole('option', { name: `${CLASS_NAME} (1º Ano)`, exact: true }).click()

  await page.getByLabel('Período', { exact: true }).click()
  await page.getByRole('option', { name: '3º Bimestre', exact: true }).click()
  await page.getByRole('tab', { name: /Tabela/ }).click()
  await expect(page.getByRole('row').filter({ hasText: STUDENT_NAME })).toBeVisible()
}

function legalStatusDisplay(row: ConditionalityRow): string {
  return row.piso_legal_percent === null
    ? row.condicionalidade_legal_status
    : `${row.condicionalidade_legal_status} (${row.piso_legal_percent}%)`
}

function municipalStatusDisplay(row: ConditionalityRow): string {
  const hasResolvedMargin = row.margem_municipal_critica_percent !== null
    && row.margem_municipal_alerta_percent !== null
  return hasResolvedMargin
    ? `${row.margem_municipal_status} (${row.margem_municipal_critica_percent}/${row.margem_municipal_alerta_percent}%)`
    : row.margem_municipal_status
}

function exportMunicipalStatus(row: ConditionalityRow): string {
  const status = row.margem_municipal_status === 'CRITICO'
    ? 'NÃO CONFORME'
    : row.margem_municipal_status === 'ALERTA'
      ? 'ALERTA MUNICIPAL'
      : 'CONFORME'
  return `${status} (${row.margem_municipal_origem ?? 'sem origem'})`
}

function exportLegalFloor(row: ConditionalityRow): string {
  return row.piso_legal_percent === null ? '-' : `${row.piso_legal_percent}%`
}

function exportMunicipalMargin(row: ConditionalityRow): string {
  return row.margem_municipal_critica_percent !== null && row.margem_municipal_alerta_percent !== null
    ? `${row.margem_municipal_critica_percent}%/${row.margem_municipal_alerta_percent}%`
    : 'não configurada'
}

function expectedInAlertView(row: ConditionalityRow): boolean {
  return row.condicionalidade_legal_status === 'CRITICO'
    || row.margem_municipal_status !== 'CONFORME'
}

test.beforeAll(async () => {
  admin = getLocalAdminClient()
  await seedFixture(admin)
  expectedRow = await loadExpectedConditionality()
})

test.afterAll(async () => {
  if (admin) await cleanupFixture(admin)
})

test.describe('Relatório Bolsa Família', () => {
  test('shows governed filters and reveals the implemented custom date controls', async ({ page }) => {
    await openReport(page)

    await expect(page.getByText('Monitoramento de frequência para alunos do programa', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Filtros', exact: true })).toBeVisible()
    await expect(page.getByLabel('Turma', { exact: true })).toBeDisabled()
    await expect(page.getByLabel('Período', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Atualizar relatório', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Exportar para Excel', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Exportar para PDF', exact: true })).toBeVisible()

    await page.getByLabel('Período', { exact: true }).click()
    await page.getByRole('option', { name: 'Personalizado', exact: true }).click()
    const customDates = page.getByText('Datas', { exact: true }).locator('..')
    await expect(customDates.getByRole('button', { name: 'Inicio', exact: true })).toBeVisible()
    await expect(customDates.getByRole('button', { name: 'Fim', exact: true })).toBeVisible()

    await page.getByLabel('Escola', { exact: true }).click()
    await page.getByRole('option', { name: SCHOOL_NAME, exact: true }).click()
    await expect(page.getByLabel('Turma', { exact: true })).toBeEnabled()
  })

  test('renders the authorized canonical row, resolved statuses, tabs, and refresh', async ({ page }) => {
    await openReport(page)
    await filterToFixture(page)

    await expect(page.getByText('Alunos Bolsa Família', { exact: true })).toBeVisible()
    await expect(page.getByText('Conformes na margem municipal', { exact: true })).toBeVisible()
    await expect(page.getByText('Em alerta municipal', { exact: true })).toBeVisible()
    await expect(page.getByText('Críticos na margem municipal', { exact: true })).toBeVisible()

    const table = page.getByRole('table')
    const row = table.getByRole('row').filter({ hasText: STUDENT_NAME })
    const cells = row.getByRole('cell')
    await expect(cells.nth(1)).toHaveText(STUDENT_NIS)
    await expect(cells.nth(2)).toHaveText(CLASS_NAME)
    await expect(cells.nth(3)).toHaveText(SCHOOL_NAME)
    await expect(cells.nth(4)).toHaveText(String(expectedRow.presencas - expectedRow.atestados))
    await expect(cells.nth(5)).toHaveText(String(expectedRow.faltas))
    await expect(cells.nth(6)).toHaveText(String(expectedRow.total_aulas))
    await expect(cells.nth(7)).toHaveText(`${Math.round(expectedRow.percentual_frequencia)}%`)
    await expect(cells.nth(8)).toHaveText(legalStatusDisplay(expectedRow))
    await expect(cells.nth(9)).toHaveText(municipalStatusDisplay(expectedRow))
    await expect(cells.nth(10)).toHaveText(expectedRow.margem_municipal_status === 'CRITICO'
      ? 'Critico'
      : expectedRow.margem_municipal_status === 'ALERTA' ? 'Alerta' : 'OK')
    await expect(page.getByText('Margens municipais:', { exact: true })).toBeVisible()
    await expect(page.getByText(/Gerado em: \d{2}\/\d{2}\/\d{4}/)).toBeVisible()

    const refreshResponsePromise = page.waitForResponse(response => {
      return response.url().includes('/rest/v1/rpc/get_attendance_conditionality')
        && response.request().method() === 'POST'
    })
    await page.getByRole('button', { name: 'Atualizar relatório', exact: true }).click()
    expect((await refreshResponsePromise).status()).toBe(200)
    await expect(row).toBeVisible()

    await page.getByRole('tab', { name: /Alerta/ }).click()
    const alertPanel = page.getByRole('tabpanel')
    if (expectedInAlertView(expectedRow)) {
      await expect(alertPanel.getByText(STUDENT_NAME, { exact: true })).toBeVisible()
      await expect(alertPanel.getByText(`NIS: ${STUDENT_NIS}`, { exact: true })).toBeVisible()
    } else {
      await expect(alertPanel.getByText('Bolsa Família: Sem Alertas', { exact: true })).toBeVisible()
    }
  })

  test('downloads Excel and PDF exports with the generated conditionality row', async ({ page }, testInfo) => {
    await openReport(page)
    await filterToFixture(page)

    const expectedPresences = expectedRow.presencas - expectedRow.atestados
    const expectedPercentage = Math.round(expectedRow.percentual_frequencia)
    const expectedMunicipalStatus = exportMunicipalStatus(expectedRow)
    const expectedLegalFloor = exportLegalFloor(expectedRow)
    const expectedMunicipalMargin = exportMunicipalMargin(expectedRow)

    const excelDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar para Excel', exact: true }).click()
    const excelDownload = await excelDownloadPromise
    expect(excelDownload.suggestedFilename()).toMatch(/^bolsa_familia_.*\.xlsx$/)
    const excelPath = testInfo.outputPath(excelDownload.suggestedFilename())
    await excelDownload.saveAs(excelPath)
    const excelBytes = await readFile(excelPath)
    expect(excelBytes.subarray(0, 2).toString('ascii')).toBe('PK')
    expect(excelBytes.length).toBeGreaterThan(1000)

    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(excelPath)
    expect(workbook.worksheets.map((worksheet) => worksheet.name)).toEqual(['Resumo', 'Alunos'])
    const summarySheet = workbook.getWorksheet('Resumo')
    const studentsSheet = workbook.getWorksheet('Alunos')
    if (!summarySheet || !studentsSheet) throw new Error('BOLSA_FAMILIA_EXPORT_WORKSHEET_MISSING')
    expect(summarySheet.getCell('A1').text).toBe('Relatório Bolsa Família - Resumo')
    expect(summarySheet.getCell('A3').text).toBe(`Escola: ${SCHOOL_NAME}`)
    expect(exportedRowValues(studentsSheet.getRow(4))).toEqual([
      'Nome', 'NIS', 'Turma', 'Escola', 'P', 'F', 'A', 'Total', '%',
      'Piso legal', 'Status legal', 'Margem crítica', 'Margem alerta', 'Status municipal',
    ])

    let excelStudentRow: ExcelJS.Row | undefined
    studentsSheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 5 && row.getCell(1).text === STUDENT_NAME) excelStudentRow = row
    })
    if (!excelStudentRow) throw new Error('BOLSA_FAMILIA_EXPORT_STUDENT_ROW_MISSING')
    expect(exportedRowValues(excelStudentRow)).toEqual([
      STUDENT_NAME,
      STUDENT_NIS,
      CLASS_NAME,
      SCHOOL_NAME,
      expectedPresences,
      expectedRow.faltas,
      expectedRow.atestados,
      expectedRow.total_aulas,
      expectedPercentage,
      expectedRow.piso_legal_percent ?? '-',
      expectedRow.condicionalidade_legal_status,
      expectedRow.margem_municipal_critica_percent ?? '-',
      expectedRow.margem_municipal_alerta_percent ?? '-',
      expectedMunicipalStatus,
    ])

    const pdfDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar para PDF', exact: true }).click()
    const pdfDownload = await pdfDownloadPromise
    expect(pdfDownload.suggestedFilename()).toMatch(/^bolsa_familia_.*\.pdf$/)
    const pdfPath = testInfo.outputPath(pdfDownload.suggestedFilename())
    await pdfDownload.saveAs(pdfPath)
    const pdfBytes = await readFile(pdfPath)
    const { stdout } = await execFile('pdftotext', [pdfPath, '-'])
    const pdfText = stdout.toString()
    const compactPdfText = pdfText.replace(/\s+/g, ' ')
    expect(pdfBytes.subarray(0, 4).toString('ascii')).toBe('%PDF')
    expect(pdfBytes.length).toBeGreaterThan(1000)
    expect(compactPdfText).toContain('Relatório Bolsa Família')
    expect(compactPdfText).toContain(SCHOOL_NAME)
    expect(compactPdfText).toContain('Nome NIS Turma Escola P F A % Piso legal Status legal Margem municipal Status')
    expect(compactPdfText).toContain(
      `${STUDENT_NAME} ${STUDENT_NIS} ${CLASS_NAME} ${SCHOOL_NAME} ${expectedPresences} ${expectedRow.faltas} ${expectedRow.atestados} ${expectedPercentage}% ${expectedLegalFloor} ${expectedRow.condicionalidade_legal_status} ${expectedMunicipalMargin} ${expectedMunicipalStatus.split(' (')[0]}`,
    )
  })

  test('keeps the filtered report usable at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openReport(page)
    await filterToFixture(page)

    const excelButton = page.getByRole('button', { name: 'Exportar para Excel', exact: true })
    const buttonBox = await excelButton.boundingBox()
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
