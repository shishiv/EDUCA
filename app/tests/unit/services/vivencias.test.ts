import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { VivenciasApiService } from '@/lib/api/vivencias'

const ROW = {
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

function query(result: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(result)),
  }
  return chain
}

function filteringQuery(rows: typeof ROW[]) {
  let data = [...rows]
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((column: keyof typeof ROW, value: string) => {
      data = data.filter(row => row[column] === value)
      return chain
    }),
    order: vi.fn((column: keyof typeof ROW, { ascending }: { ascending: boolean }) => {
      data.sort((left, right) => String(left[column]).localeCompare(String(right[column])))
      if (!ascending) data.reverse()
      return chain
    }),
    gte: vi.fn((column: keyof typeof ROW, value: string) => {
      data = data.filter(row => String(row[column]) >= value)
      return chain
    }),
    lte: vi.fn((column: keyof typeof ROW, value: string) => {
      data = data.filter(row => String(row[column]) <= value)
      return chain
    }),
    limit: vi.fn((limit: number) => {
      data = data.slice(0, limit)
      return chain
    }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data, error: null })),
  }
  return chain
}

describe('VivenciasApiService', () => {
  it('maps persisted rows to the canonical narrative shape', async () => {
    const client = {
      from: vi.fn(() => query({ data: [ROW], error: null })),
    } as unknown as SupabaseClient<Database>

    const data = await new VivenciasApiService(client).getByAluno(ROW.aluno_id)

    expect(data).toEqual([{
      ...ROW,
      campos_experiencia: ['eu', 'corpo'],
    }])
  })

  it('applies date bounds before the limit so older matching rows are retained', async () => {
    const olderRow = { ...ROW, data_vivencia: '2026-08-01' }
    const newerRows = Array.from({ length: 50 }, (_, index) => ({
      ...ROW,
      id: `00000000-0000-0000-0001-${String(index).padStart(12, '0')}`,
      data_vivencia: '2026-09-01',
      created_at: `2026-09-01T12:${String(index).padStart(2, '0')}:00.000Z`,
    }))
    const chain = filteringQuery([...newerRows, olderRow])
    const client = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>

    const data = await new VivenciasApiService(client).getByAluno(
      ROW.aluno_id,
      '2026-08-01',
      '2026-08-01',
      50,
    )

    expect(data).toEqual([expect.objectContaining({ id: olderRow.id })])
    expect(chain.gte).toHaveBeenCalledWith('data_vivencia', '2026-08-01')
    expect(chain.lte).toHaveBeenCalledWith('data_vivencia', '2026-08-01')
    expect(chain.limit).toHaveBeenCalledWith(50)
    expect(chain.lte.mock.invocationCallOrder[0]).toBeLessThan(chain.limit.mock.invocationCallOrder[0])
  })

  it('stamps actor-owned fields through the database service payload', async () => {
    const chain = query({ data: ROW, error: null })
    const client = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>
    const service = new VivenciasApiService(client)

    await service.create({
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

    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      professor_id: ROW.professor_id,
      created_by: ROW.professor_id,
      updated_by: ROW.professor_id,
      campos_experiencia: ['eu'],
    }))
  })

  it('persists an edited narrative date', async () => {
    const chain = query({ data: { ...ROW, data_vivencia: '2026-08-19' }, error: null })
    const client = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>

    await new VivenciasApiService(client).update(ROW.id, {
      data_vivencia: '2026-08-19',
      updated_by: ROW.professor_id,
    })

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
      data_vivencia: '2026-08-19',
      updated_by: ROW.professor_id,
    }))
  })
})
