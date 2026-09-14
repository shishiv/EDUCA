import { afterEach, expect, it, vi } from 'vitest'
import { generateAttendanceReportExcel } from '@/lib/export/attendance-excel'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('downloads the generated workbook with its explicit filename and releases the local blob', async () => {
  const create = vi.fn(() => 'blob:synthetic-workbook')
  const revoke = vi.fn()
  vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke })
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
  const filenames: string[] = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.isConnected).toBe(true)
    expect(this.href).toBe('blob:synthetic-workbook')
    filenames.push(this.download)
  })
  await generateAttendanceReportExcel({
    turmaId: 'synthetic-class', turmaNome: 'Turma sintética', totalAlunos: 0,
    mediaFrequencia: 0, alunosEmRisco: 0, students: [],
    periodo: { inicio: '2026-09-01', fim: '2026-09-30' },
  })
  expect(filenames).toEqual(['frequencia_Turma_sintetica_2026-09-01_2026-09-30.xlsx'])
  expect(create).toHaveBeenCalledWith(expect.any(Blob))
  expect(revoke).toHaveBeenCalledWith('blob:synthetic-workbook')
  expect(document.querySelector('a[download]')).toBeNull()
})
