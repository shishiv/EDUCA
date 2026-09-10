import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import {
  createSchoolAcademicYearRouteHandlers,
  type SchoolAcademicYearHandlerDependencies,
} from '@/app/api/school-settings/academic-year/handler'

const SCHOOL_ID = '00000000-0000-0000-0000-000000000001'
const OTHER_SCHOOL_ID = '00000000-0000-0000-0000-000000000002'
const YEAR = 2026
const academicYear = {
  id: '00000000-0000-0000-0000-000000000101',
  escola_id: SCHOOL_ID,
  ano: YEAR,
  data_inicio: `${YEAR}-02-02`,
  data_fim: `${YEAR}-12-18`,
  created_at: '2026-08-26T00:00:00.000Z',
  updated_at: '2026-08-26T00:00:00.000Z',
}

interface AcademicYearPatchPayload {
  readonly startDate: string
  readonly endDate: string
  readonly schoolId?: string
}

const actor = vi.fn<typeof requirePilotActor>()
const transport = vi.fn<typeof fetch>()
const client = createClient<Database>('http://127.0.0.1:54321', 'synthetic-anon', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: transport },
})

const dependencies: SchoolAcademicYearHandlerDependencies = {
  createClient: async () => client,
  currentYear: () => YEAR,
  requireActor: actor,
}

const handlers = createSchoolAcademicYearRouteHandlers(dependencies)

function patch(body: AcademicYearPatchPayload): Promise<Response> {
  return handlers.PATCH(new Request('http://test/api/school-settings/academic-year', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

async function sentRpcRequest(): Promise<Request> {
  const call = transport.mock.calls[0]
  if (!call) throw new Error('Expected an academic-year RPC request')
  return new Request(call[0], call[1])
}

async function expectRpc(name: string, payload: Record<string, string | number>): Promise<void> {
  const request = await sentRpcRequest()
  expect(new URL(request.url).pathname).toBe(`/rest/v1/rpc/${name}`)
  await expect(request.json()).resolves.toEqual(payload)
}

describe('/api/school-settings/academic-year', () => {
  beforeEach(() => {
    actor.mockReset()
    transport.mockReset()
    actor.mockResolvedValue({
      id: 'director-1',
      name: 'Diretor sintético',
      email: 'director@synthetic.invalid',
      role: 'diretor',
      schoolId: SCHOOL_ID,
    })
  })

  it('lets a director read the current academic year for their school', async () => {
    transport.mockResolvedValue(Response.json([academicYear]))

    const response = await handlers.GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ academicYear })
    expect(actor).toHaveBeenCalledWith(['diretor'])
    await expectRpc('get_school_academic_year', {
      p_escola_id: SCHOOL_ID,
      p_ano: YEAR,
    })
  })

  it('returns 404 when the director school has no persisted year for the current year', async () => {
    transport.mockResolvedValue(Response.json([]))

    const response = await handlers.GET()

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: 'O ano letivo atual não está cadastrado para esta escola.',
    })
  })

  it('lets a director update the dates for their school', async () => {
    const updated = { ...academicYear, data_inicio: `${YEAR}-02-09`, data_fim: `${YEAR}-12-20` }
    transport.mockResolvedValue(Response.json([updated]))

    const response = await patch({ startDate: updated.data_inicio, endDate: updated.data_fim })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ academicYear: updated })
    await expectRpc('set_school_academic_year', {
      p_escola_id: SCHOOL_ID,
      p_ano: YEAR,
      p_data_inicio: updated.data_inicio,
      p_data_fim: updated.data_fim,
    })
  })

  it('denies roles outside the school-management boundary', async () => {
    actor.mockRejectedValue(new Error('PILOT_ROLE_DENIED'))

    const readResponse = await handlers.GET()
    const updateResponse = await patch({ startDate: `${YEAR}-02-02`, endDate: `${YEAR}-12-18` })

    expect(readResponse.status).toBe(403)
    expect(updateResponse.status).toBe(403)
    expect(transport).not.toHaveBeenCalled()
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
    expect(transport).not.toHaveBeenCalled()
  })

  it('rejects attempts to target another school', async () => {
    const response = await patch({
      schoolId: OTHER_SCHOOL_ID,
      startDate: `${YEAR}-02-02`,
      endDate: `${YEAR}-12-18`,
    })

    expect(response.status).toBe(400)
    expect(transport).not.toHaveBeenCalled()
  })
})
