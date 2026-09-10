import { beforeEach, describe, expect, it } from 'vitest'
import { createMarkAttendanceBatchAction } from '@/lib/services/attendance-batch-action'
import { getSaoPauloDate } from '@/lib/services/attendance-module'
import { createFakeSupabase, type FakeAttendanceDbState } from './fake-supabase'

const SCHOOL_A = '10000000-0000-0000-0000-000000000001'
const SCHOOL_B = '10000000-0000-0000-0000-000000000002'
const PROF_A = '20000000-0000-0000-0000-000000000001'
const DIR_A = '20000000-0000-0000-0000-000000000003'
const SECRETARIO = '20000000-0000-0000-0000-000000000005'
const ADMIN = '20000000-0000-0000-0000-000000000006'
const TURMA_A = '30000000-0000-0000-0000-000000000001'
const TURMA_B = '30000000-0000-0000-0000-000000000002'
const SESSION_A = '31000000-0000-0000-0000-000000000001'
const SESSION_B = '31000000-0000-0000-0000-000000000002'
const MATRICULA_A = '50000000-0000-0000-0000-000000000001'
const MATRICULA_B = '50000000-0000-0000-0000-000000000002'
const TEST_DATE = getSaoPauloDate()

function baseState(): FakeAttendanceDbState {
  return {
    user: { id: PROF_A },
    users: [
      { id: PROF_A, tipo_usuario: 'professor', escola_id: SCHOOL_A, ativo: true },
      { id: DIR_A, tipo_usuario: 'diretor', escola_id: SCHOOL_A, ativo: true },
      { id: SECRETARIO, tipo_usuario: 'secretario', escola_id: null, ativo: true },
      { id: ADMIN, tipo_usuario: 'admin', escola_id: null, ativo: true },
    ],
    sessions: [
      { id: SESSION_A, turma_id: TURMA_A, professor_id: PROF_A, escola_id: SCHOOL_A, status: 'ABERTA', data_aula: TEST_DATE },
      { id: SESSION_B, turma_id: TURMA_B, professor_id: PROF_A, escola_id: SCHOOL_B, status: 'ABERTA', data_aula: TEST_DATE },
    ],
    turmas: [
      { id: TURMA_A, escola_id: SCHOOL_A, professor_id: PROF_A, ativo: true },
      { id: TURMA_B, escola_id: SCHOOL_B, professor_id: PROF_A, ativo: true },
    ],
    matriculas: [
      { id: MATRICULA_A, turma_id: TURMA_A, situacao: 'ativa' },
      { id: MATRICULA_B, turma_id: TURMA_B, situacao: 'ativa' },
    ],
    isEditable: true,
  }
}

let fakeClient: ReturnType<typeof createFakeSupabase>
let markAttendanceBatchAction: ReturnType<typeof createMarkAttendanceBatchAction>

beforeEach(() => {
  fakeClient = createFakeSupabase(baseState())
  markAttendanceBatchAction = createMarkAttendanceBatchAction({
    // SAFETY: the deterministic fake implements the same narrow query/RPC
    // interface consumed by createAttendanceModule.
    createClient: async () => fakeClient as never,
    revalidatePath: () => undefined,
  })
})

const records = [{ matricula_id: MATRICULA_A, status: 'P' as const, justificativa: null }]

function fake() {
  return fakeClient
}

describe('markAttendanceBatchAction', () => {
  it('records one canonical row for a professor', async () => {
    const result = await markAttendanceBatchAction({ sessao_id: SESSION_A, records })
    expect(result).toEqual({ success: true, processed_count: 1 })
    expect(fake().writes.upserts).toHaveLength(1)
    expect(fake().writes.upserts[0]).toEqual([
      expect.objectContaining({
        sessao_id: SESSION_A,
        matricula_id: MATRICULA_A,
        data_aula: TEST_DATE,
        status_presenca: 'P',
        professor_id: PROF_A,
        marcado_por: PROF_A,
      }),
    ])
  })

  it('allows a director to record within the own school', async () => {
    fake().state.user = { id: DIR_A }
    const result = await markAttendanceBatchAction({ sessao_id: SESSION_A, records })
    expect(result.success).toBe(true)
    expect(fake().writes.upserts[0][0].marcado_por).toBe(DIR_A)
  })

  it.each([
    ['secretario', SECRETARIO],
    ['admin', ADMIN],
  ])('keeps %s view-only', async (_role, userId) => {
    fake().state.user = { id: userId }
    const result = await markAttendanceBatchAction({ sessao_id: SESSION_A, records })
    expect(result.success).toBe(false)
    expect(result.code).toBe('FORBIDDEN_ROLE')
    expect(fake().writes.upserts).toHaveLength(0)
  })

  it('rejects a session from another school', async () => {
    fake().state.user = { id: DIR_A }
    const result = await markAttendanceBatchAction({ sessao_id: SESSION_B, records })
    expect(result.success).toBe(false)
    expect(result.code).toBe('SCHOOL_MISMATCH')
    expect(fake().writes.upserts).toHaveLength(0)
  })

  it('rejects a matricula from another class', async () => {
    const result = await markAttendanceBatchAction({
      sessao_id: SESSION_A,
      records: [{ matricula_id: MATRICULA_B, status: 'F', justificativa: null }],
    })
    expect(result.success).toBe(false)
    expect(result.code).toBe('MATRICULA_NOT_IN_TURMA')
    expect(fake().writes.upserts).toHaveLength(0)
  })

  it('rejects an inactive enrollment before writing', async () => {
    fake().state.matriculas[0].situacao = 'transferida'
    const result = await markAttendanceBatchAction({ sessao_id: SESSION_A, records })
    expect(result.success).toBe(false)
    expect(result.code).toBe('MATRICULA_INACTIVE')
    expect(fake().writes.upserts).toHaveLength(0)
  })

  it('rejects a closed session before writing', async () => {
    fake().state.isEditable = false
    const result = await markAttendanceBatchAction({ sessao_id: SESSION_A, records })
    expect(result.success).toBe(false)
    expect(result.code).toBe('SESSION_CLOSED')
    expect(fake().writes.upserts).toHaveLength(0)
  })

  it('requires justification for status J', async () => {
    const result = await markAttendanceBatchAction({
      sessao_id: SESSION_A,
      records: [{ matricula_id: MATRICULA_A, status: 'J', justificativa: '   ' }],
    })
    expect(result.success).toBe(false)
    expect(result.code).toBe('JUSTIFICATION_REQUIRED')
  })

  it('rejects duplicate enrollments in one batch', async () => {
    const result = await markAttendanceBatchAction({
      sessao_id: SESSION_A,
      records: [records[0], records[0]],
    })
    expect(result.success).toBe(false)
    expect(result.code).toBe('DUPLICATE_ENROLLMENT')
  })
})
