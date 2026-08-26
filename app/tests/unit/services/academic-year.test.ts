import { describe, expect, it, vi } from 'vitest'
import {
  createAcademicYearService,
  type AcademicYear,
} from '@/lib/services/academic-year'

const academicYear: AcademicYear = {
  id: '00000000-0000-0000-0000-000000000101',
  escola_id: '00000000-0000-0000-0000-000000000001',
  ano: 2026,
  data_inicio: '2026-02-02',
  data_fim: '2026-12-18',
  created_at: '2026-08-26T00:00:00.000Z',
  updated_at: '2026-08-26T00:00:00.000Z',
}

describe('academic year service', () => {
  it('reads the persisted school year through the governed interface', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [academicYear], error: null })
    const service = createAcademicYearService({ rpc } as never)

    await expect(service.get(academicYear.escola_id, 2026)).resolves.toEqual(academicYear)
    expect(rpc).toHaveBeenCalledWith('get_school_academic_year', {
      p_escola_id: academicYear.escola_id,
      p_ano: 2026,
    })
  })

  it('updates configurable dates through the governed interface', async () => {
    const updated = { ...academicYear, data_inicio: '2026-02-09', data_fim: '2026-12-21' }
    const rpc = vi.fn().mockResolvedValue({ data: [updated], error: null })
    const service = createAcademicYearService({ rpc } as never)

    await expect(service.set({
      schoolId: academicYear.escola_id,
      year: 2026,
      startDate: updated.data_inicio,
      endDate: updated.data_fim,
    })).resolves.toEqual(updated)
    expect(rpc).toHaveBeenCalledWith('set_school_academic_year', {
      p_escola_id: academicYear.escola_id,
      p_ano: 2026,
      p_data_inicio: updated.data_inicio,
      p_data_fim: updated.data_fim,
    })
  })

  it('propagates authorization failures from the database boundary', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'ACADEMIC_YEAR_WRITE_DENIED' },
    })
    const service = createAcademicYearService({ rpc } as never)

    await expect(service.set({
      schoolId: academicYear.escola_id,
      year: 2026,
      startDate: academicYear.data_inicio,
      endDate: academicYear.data_fim,
    })).rejects.toThrow('ACADEMIC_YEAR_WRITE_DENIED')
  })
})
