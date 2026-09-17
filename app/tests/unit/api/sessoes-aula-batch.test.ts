import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createAttendanceBatchPostHandler } from '@/lib/services/attendance-batch-route'
import { createMarkAttendanceBatchAction } from '@/lib/services/attendance-batch-action'
import { getSaoPauloDate } from '@/lib/services/attendance-module'
import { createFakeSupabase } from '../actions/fake-supabase'
import type { Json } from '@/types/database'

const SESSION_ID = '44444444-4444-4444-8444-444444444444'
const MATRICULA_ID = '33333333-3333-4333-8333-333333333333'
const PROFESSOR_ID = '20000000-0000-0000-0000-000000000001'
const SCHOOL_ID = '10000000-0000-0000-0000-000000000001'
const TURMA_ID = '30000000-0000-0000-0000-000000000001'

function request(body: Json): NextRequest {
  return new NextRequest(`http://test/api/sessoes/aula/${SESSION_ID}/frequencia/batch`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

function createRoute() {
  const client = createFakeSupabase({
    user: { id: PROFESSOR_ID }, isEditable: true,
    users: [{ id: PROFESSOR_ID, tipo_usuario: 'professor', escola_id: SCHOOL_ID, ativo: true }],
    sessions: [{
      id: SESSION_ID, turma_id: TURMA_ID, professor_id: PROFESSOR_ID,
      escola_id: SCHOOL_ID, data_aula: getSaoPauloDate(), status: 'ABERTA',
    }],
    turmas: [{ id: TURMA_ID, professor_id: PROFESSOR_ID, escola_id: SCHOOL_ID, ativo: true }],
    matriculas: [{ id: MATRICULA_ID, turma_id: TURMA_ID, situacao: 'ativa' }],
  })
  const action = createMarkAttendanceBatchAction({ createClient: async () => client, revalidatePath: vi.fn() })
  return { POST: createAttendanceBatchPostHandler(action), client }
}

const context = { params: Promise.resolve({ id: SESSION_ID }) }

describe('POST /api/sessoes/aula/[id]/frequencia/batch', () => {
  it('passes a canonical matricula/status payload through authorization and the real request builder', async () => {
    const { POST, client } = createRoute()
    const response = await POST(request({ attendance: [{ matricula_id: MATRICULA_ID, status: 'J', justificativa: 'Atestado' }] }), context)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, results: { processed_count: 1, total_requested: 1 } })
    expect(client.writes.upserts).toHaveLength(1)
    expect(client.writes.upserts[0]).toEqual([expect.objectContaining({
      sessao_id: SESSION_ID, matricula_id: MATRICULA_ID, status_presenca: 'J', justificativa: 'Atestado',
    })])
  })

  it('rejects the old aluno_id payload before any write', async () => {
    const { POST, client } = createRoute()
    expect((await POST(request({ attendance: [{ aluno_id: MATRICULA_ID, presente: true }] }), context)).status).toBe(400)
    expect(client.writes.upserts).toHaveLength(0)
  })

  it('returns 401 and does not mutate when there is no authenticated actor', async () => {
    const { POST, client } = createRoute()
    client.state.user = null
    const response = await POST(request({ attendance: [{ matricula_id: MATRICULA_ID, status: 'P' }] }), context)
    expect(response.status).toBe(401)
    expect(client.writes.upserts).toHaveLength(0)
  })
})
