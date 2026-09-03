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
})
