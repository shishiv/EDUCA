import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
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

const transport = vi.fn<typeof fetch>()
const client = createClient<Database>('http://127.0.0.1:54321', 'synthetic-anon', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: transport },
})

function service() {
  return createAcademicYearService(client)
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

describe('academic year service', () => {
  beforeEach(() => {
    transport.mockReset()
  })

  it('reads the persisted school year through the governed interface', async () => {
    transport.mockResolvedValue(Response.json([academicYear]))

    await expect(service().get(academicYear.escola_id, 2026)).resolves.toEqual(academicYear)
    await expectRpc('get_school_academic_year', {
      p_escola_id: academicYear.escola_id,
      p_ano: 2026,
    })
  })

  it('resolves the persisted current year', async () => {
    transport.mockResolvedValue(Response.json([academicYear]))

    await expect(service().resolveCurrent(academicYear.escola_id, '2026-08-26')).resolves.toEqual({
      year: 2026,
      startDate: academicYear.data_inicio,
      endDate: academicYear.data_fim,
      configured: true,
    })
  })

  it('uses the calendar-year default when configuration is missing', async () => {
    transport.mockResolvedValue(Response.json([]))

    await expect(service().resolveCurrent(academicYear.escola_id, '2028-06-10')).resolves.toEqual({
      year: 2028,
      startDate: '2028-01-01',
      endDate: '2028-12-31',
      configured: false,
    })
  })

  it('resolves January to the new configured year', async () => {
    const januaryYear: AcademicYear = {
      ...academicYear,
      ano: 2027,
      data_inicio: '2027-01-01',
      data_fim: '2027-12-31',
    }
    transport.mockResolvedValue(Response.json([januaryYear]))

    await expect(service().resolveCurrent(academicYear.escola_id, '2027-01-01')).resolves.toMatchObject({
      year: 2027,
      startDate: '2027-01-01',
      endDate: '2027-12-31',
    })
    await expectRpc('get_school_academic_year', {
      p_escola_id: academicYear.escola_id,
      p_ano: 2027,
    })
  })

  it('updates configurable dates through the governed interface', async () => {
    const updated: AcademicYear = {
      ...academicYear,
      data_inicio: '2026-02-09',
      data_fim: '2026-12-21',
    }
    transport.mockResolvedValue(Response.json([updated]))

    await expect(service().set({
      schoolId: academicYear.escola_id,
      year: 2026,
      startDate: updated.data_inicio,
      endDate: updated.data_fim,
    })).resolves.toEqual(updated)
    await expectRpc('set_school_academic_year', {
      p_escola_id: academicYear.escola_id,
      p_ano: 2026,
      p_data_inicio: updated.data_inicio,
      p_data_fim: updated.data_fim,
    })
  })

  it('propagates authorization failures from the database boundary', async () => {
    transport.mockResolvedValue(Response.json(
      { message: 'ACADEMIC_YEAR_WRITE_DENIED' },
      { status: 403 },
    ))

    await expect(service().set({
      schoolId: academicYear.escola_id,
      year: 2026,
      startDate: academicYear.data_inicio,
      endDate: academicYear.data_fim,
    })).rejects.toThrow('ACADEMIC_YEAR_WRITE_DENIED')
  })
})
