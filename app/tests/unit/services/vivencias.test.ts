import { describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/types/database'
import { VivenciasApiService } from '@/lib/api/vivencias'

const ROW: Tables<'vivencias'> = {
  id: '00000000-0000-0000-0000-000000000001',
  escola_id: '00000000-0000-0000-0000-000000000011',
  aluno_id: '00000000-0000-0000-0000-000000000021',
  matricula_id: '00000000-0000-0000-0000-000000000031',
  turma_id: '00000000-0000-0000-0000-000000000041',
  professor_id: '00000000-0000-0000-0000-000000000051',
  data_vivencia: '2026-08-20',
  campos_experiencia: ['eu', 'corpo'],
  descricao: 'A criança explorou movimentos e combinou gestos.',
  observacoes: null,
  escopo: 'individual',
  created_by: '00000000-0000-0000-0000-000000000051',
  updated_by: '00000000-0000-0000-0000-000000000051',
  created_at: '2026-08-20T12:00:00.000Z',
  updated_at: '2026-08-20T12:00:00.000Z',
}

interface ServiceFixture {
  service: VivenciasApiService
  requests: Request[]
}

type ResponseBody = Tables<'vivencias'> | Tables<'vivencias'>[]

function serviceFixture(responseBody: ResponseBody): ServiceFixture {
  const requests: Request[] = []
  const client = createClient<Database>('http://127.0.0.1:54321', 'synthetic-session-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init)
        requests.push(request.clone())
        return Response.json(responseBody)
      },
    },
  })

  return { service: new VivenciasApiService(client), requests }
}

describe('VivenciasApiService', () => {
  it('maps persisted rows to the canonical narrative shape', async () => {
    const fixture = serviceFixture([ROW])

    const data = await fixture.service.getByAluno(ROW.aluno_id)

    expect(data).toEqual([{
      ...ROW,
      campos_experiencia: ['eu', 'corpo'],
    }])
    expect(fixture.requests).toHaveLength(1)
    expect(new URL(fixture.requests[0].url).pathname).toBe('/rest/v1/vivencias')
  })

  it('rejects a database row with an unknown experience field', async () => {
    const fixture = serviceFixture([{ ...ROW, campos_experiencia: ['eu', 'desconhecido'] }])

    await expect(fixture.service.getByAluno(ROW.aluno_id)).rejects.toThrow(
      'VIVENCIA_INVALID_CAMPO',
    )
  })

  it('sends date bounds and the limit in the student query', async () => {
    const olderRow = { ...ROW, data_vivencia: '2026-08-01' }
    const fixture = serviceFixture([olderRow])

    const data = await fixture.service.getByAluno(
      ROW.aluno_id,
      '2026-08-01',
      '2026-08-01',
      50,
    )

    expect(data).toEqual([expect.objectContaining({ id: olderRow.id })])
    const url = new URL(fixture.requests[0].url)
    expect(url.searchParams.get('aluno_id')).toBe(`eq.${ROW.aluno_id}`)
    expect(url.searchParams.getAll('data_vivencia')).toEqual([
      'gte.2026-08-01',
      'lte.2026-08-01',
    ])
    expect(url.searchParams.get('limit')).toBe('50')
  })

  it('stamps actor-owned fields through the database service payload', async () => {
    const fixture = serviceFixture(ROW)

    await fixture.service.create({
      escola_id: ROW.escola_id,
      aluno_id: ROW.aluno_id,
      matricula_id: ROW.matricula_id,
      turma_id: ROW.turma_id,
      professor_id: ROW.professor_id,
      data_vivencia: ROW.data_vivencia,
      campos_experiencia: ['eu'],
      descricao: ROW.descricao,
      created_by: ROW.professor_id,
    })

    expect(fixture.requests).toHaveLength(1)
    const request = fixture.requests[0]
    expect(request.method).toBe('POST')
    expect(new URL(request.url).pathname).toBe('/rest/v1/vivencias')
    await expect(request.json()).resolves.toEqual(expect.objectContaining({
      professor_id: ROW.professor_id,
      created_by: ROW.professor_id,
      updated_by: ROW.professor_id,
      campos_experiencia: ['eu'],
    }))
  })

  it('persists an edited narrative date', async () => {
    const fixture = serviceFixture({ ...ROW, data_vivencia: '2026-08-19' })

    await fixture.service.update(ROW.id, {
      data_vivencia: '2026-08-19',
      updated_by: ROW.professor_id,
    })

    expect(fixture.requests).toHaveLength(1)
    const request = fixture.requests[0]
    const url = new URL(request.url)
    expect(request.method).toBe('PATCH')
    expect(url.pathname).toBe('/rest/v1/vivencias')
    expect(url.searchParams.get('id')).toBe(`eq.${ROW.id}`)
    await expect(request.json()).resolves.toEqual(expect.objectContaining({
      data_vivencia: '2026-08-19',
      updated_by: ROW.professor_id,
    }))
  })
})
