import { readFileSync, rmSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '@/types/database'
import type { AttendanceBands } from '@/lib/attendance/attendance-policy'
import { loadCanonicalAttendanceSummaries } from '@/lib/api/canonical-attendance-facts'
import { generateClassAttendanceReport } from '@/lib/reports/attendance-reports'
import { generateAttendanceReportExcel } from '@/lib/export/attendance-excel'
import { generateAttendanceReportPDF } from '@/lib/export/attendance-pdf'
const pdfClassName = `f10_unit_${process.pid}`
const pdfFilename = `frequencia_${pdfClassName}_2026-09-01_2026-09-30.pdf`

// Boundary fixtures only: authorization and override precedence run against PostgreSQL.
// This test exercises project calculations and export payloads through the real SDK.
function reportClient(bands: AttendanceBands | null) {
  return createClient<Database>('http://127.0.0.1:54321', 'synthetic-unit-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async input => {
      const url = new URL(String(input))
      switch (url.pathname) {
        case '/rest/v1/turmas':
          return Response.json({ id: 'class-a', nome: 'Turma A', serie: '1', escola_id: 'school-a' })
        case '/rest/v1/matriculas':
          return Response.json([{ id: 'enrollment-a', aluno_id: 'student-a', aluno: { id: 'student-a', nome_completo: 'Aluno A' }, turma: { escola_id: 'school-a' } }])
        case '/rest/v1/frequencia':
          return Response.json(Array.from({ length: 20 }, (_, index) => ({
            id: `fact-${index}`, matricula_id: 'enrollment-a', sessao_id: `session-${index}`,
            data_aula: '2026-09-01', presente: index < 17, status_presenca: index < 17 ? 'P' : 'F', justificativa: null,
          })))
        case '/rest/v1/rpc/get_municipal_settings':
          return Response.json([{ attendance_bands: bands }])
        default: throw new Error(`Unexpected request: ${url.pathname}`)
      }
    } },
  })
}

function blobBytes(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error('Workbook bytes missing'))
    reader.readAsArrayBuffer(blob)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  rmSync(pdfFilename, { force: true })
})

describe('one school resolution across attendance reads and exports', () => {
  it('classifies the same attendance below an override in dashboard reads, PDF and real Excel bytes', async () => {
    const bands = { reference: 90, attention: 95 }
    const client = reportClient(bands)
    const dashboard = (await loadCanonicalAttendanceSummaries(client, ['enrollment-a'])).get('enrollment-a')
    const result = await generateClassAttendanceReport(client, 'class-a', { startDate: '2026-09-01', endDate: '2026-09-30' })
    expect(result.error).toBeNull()
    if (!result.data) throw new Error('Report missing')
    expect(dashboard).toMatchObject({ percentual: 85, status: 'CRITICO', conforme: false, bands })
    expect(result.data).toMatchObject({ bands, alunosEmRisco: 1, students: [{ percentual: 85, status: 'CRITICO', emRisco: true }] })

    generateAttendanceReportPDF({ ...result.data, turmaNome: pdfClassName })
    const pdf = readFileSync(pdfFilename, 'latin1')
    expect(pdf).toContain('%PDF-')
    expect(pdf).toContain('Abaixo')
    expect(pdf).toContain('90%')
    expect(pdf).toContain('95%')

    const blobs: Blob[] = []
    vi.stubGlobal('URL', {
      createObjectURL: (blob: Blob) => { blobs.push(blob); return 'blob:workbook' },
      revokeObjectURL: vi.fn(),
    })
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    await generateAttendanceReportExcel(result.data)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await blobBytes(blobs[0]))
    const sheet = workbook.getWorksheet('Frequência')
    if (!sheet) throw new Error('Attendance sheet missing')
    const values: string[] = []
    sheet.eachRow(row => row.eachCell(cell => values.push(String(cell.value))))
    expect(values).toContain('Abaixo da referência municipal')
    expect(values).toContainEqual(expect.stringContaining('Referência municipal: 90%; atenção preventiva até 95%'))
  })

  it('does not generate a report when the persisted configuration is absent', async () => {
    const result = await generateClassAttendanceReport(reportClient(null), 'class-a', { startDate: '2026-09-01', endDate: '2026-09-30' })
    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
  })
})
