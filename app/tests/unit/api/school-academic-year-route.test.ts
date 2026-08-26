import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, PATCH } from '@/app/api/school-settings/academic-year/route'

const { actorMock, createClientMock } = vi.hoisted(() => ({
  actorMock: vi.fn(),
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/pilot/pilot-server-auth', () => ({ requirePilotActor: actorMock }))
vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }))

const SCHOOL_ID = '00000000-0000-0000-0000-000000000001'
const OTHER_SCHOOL_ID = '00000000-0000-0000-0000-000000000002'
const YEAR = new Date().getUTCFullYear()
const academicYear = {
  id: '00000000-0000-0000-0000-000000000101',
  escola_id: SCHOOL_ID,
  ano: YEAR,
  data_inicio: `${YEAR}-02-02`,
  data_fim: `${YEAR}-12-18`,
  created_at: '2026-08-26T00:00:00.000Z',
  updated_at: '2026-08-26T00:00:00.000Z',
}

function patch(body: unknown) {
  return PATCH(new Request('http://test/api/school-settings/academic-year', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

describe('/api/school-settings/academic-year', () => {
  const rpc = vi.fn()

  beforeEach(() => {
    actorMock.mockReset()
    createClientMock.mockReset()
    rpc.mockReset()
    actorMock.mockResolvedValue({ id: 'director-1', role: 'diretor', schoolId: SCHOOL_ID })
    createClientMock.mockResolvedValue({ rpc })
  })

  it('lets a director read the current academic year for their school', async () => {
    rpc.mockResolvedValue({ data: [academicYear], error: null })

    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ academicYear })
    expect(actorMock).toHaveBeenCalledWith(['diretor'])
    expect(rpc).toHaveBeenCalledWith('get_school_academic_year', {
      p_escola_id: SCHOOL_ID,
      p_ano: YEAR,
    })
  })

  it('lets a director update the dates for their school', async () => {
    const updated = { ...academicYear, data_inicio: `${YEAR}-02-09`, data_fim: `${YEAR}-12-20` }
    rpc.mockResolvedValue({ data: [updated], error: null })

    const response = await patch({ startDate: updated.data_inicio, endDate: updated.data_fim })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ academicYear: updated })
    expect(rpc).toHaveBeenCalledWith('set_school_academic_year', {
      p_escola_id: SCHOOL_ID,
      p_ano: YEAR,
      p_data_inicio: updated.data_inicio,
      p_data_fim: updated.data_fim,
    })
  })

  it('denies roles outside the school-management boundary', async () => {
    actorMock.mockRejectedValue(new Error('PILOT_ROLE_DENIED'))

    const readResponse = await GET()
    const updateResponse = await patch({ startDate: `${YEAR}-02-02`, endDate: `${YEAR}-12-18` })

    expect(readResponse.status).toBe(403)
    expect(updateResponse.status).toBe(403)
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each([
    { startDate: `${YEAR}-02-30`, endDate: `${YEAR}-12-18` },
    { startDate: `${YEAR}-12-19`, endDate: `${YEAR}-02-02` },
  ])('rejects invalid dates at the route boundary', async body => {
    const response = await patch(body)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Informe datas válidas. A data de término não pode ser anterior à data de início.',
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects attempts to target another school', async () => {
    const response = await patch({
      schoolId: OTHER_SCHOOL_ID,
      startDate: `${YEAR}-02-02`,
      endDate: `${YEAR}-12-18`,
    })

    expect(response.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })
})
