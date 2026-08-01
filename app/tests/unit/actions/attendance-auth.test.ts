/**
 * Regression tests: attendance server actions enforce authenticated actor,
 * role, school, class and session ownership (issue #30).
 *
 * These tests run against an in-memory fake of the SSR Supabase client.
 * They verify the APPLICATION-level authorization contract; the pilot RLS
 * policies remain defense in depth. The live exploit reproduction against a
 * real local Supabase stack lives in tests/live/attendance-auth.live.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createFakeSupabase,
  type FakeAttendanceDbState,
} from './fake-supabase'
import { markAttendanceAction } from '@/app/actions/attendance/mark-attendance'
import { openSessionAction } from '@/app/actions/attendance/open-session'
import { closeSessionAction } from '@/app/actions/attendance/close-session'
import { checkLockStatusAction } from '@/app/actions/attendance/check-lock-status'

// ---------------------------------------------------------------------------
// Test fixtures: two escolas, two turmas, two professors, one diretor per
// escola, one secretario (secretariat), one admin (secretariat).
// ---------------------------------------------------------------------------

const SCHOOL_A = '10000000-0000-0000-0000-000000000001'
const SCHOOL_B = '10000000-0000-0000-0000-000000000002'

const PROF_A = '20000000-0000-0000-0000-000000000001'
const PROF_B = '20000000-0000-0000-0000-000000000002'
const DIR_A = '20000000-0000-0000-0000-000000000003'
const DIR_B = '20000000-0000-0000-0000-000000000004'
const SECRETARIO = '20000000-0000-0000-0000-000000000005'
const ADMIN = '20000000-0000-0000-0000-000000000006'

const TURMA_A = '30000000-0000-0000-0000-000000000001'
const TURMA_B = '30000000-0000-0000-0000-000000000002'

const SESSION_A = '31000000-0000-0000-0000-000000000001'
const SESSION_B = '31000000-0000-0000-0000-000000000002'

const MATRICULA_A1 = '50000000-0000-0000-0000-000000000001'
const MATRICULA_A2 = '50000000-0000-0000-0000-000000000002'

const userRow = (id: string, tipo_usuario: string, escola_id: string | null) => ({
  id,
  tipo_usuario,
  escola_id,
  ativo: true,
})

const sessionRow = (
  id: string,
  turma_id: string,
  professor_id: string,
  escola_id: string,
  status = 'aberta'
) => ({
  id,
  turma_id,
  professor_id,
  escola_id,
  status,
  data_aula: '2026-08-01',
  auto_fechamento_agendado: '2026-08-01T21:00:00.000Z',
  fechada_em: null,
  travada_em: null,
})

const baseState = (): FakeAttendanceDbState => ({
  user: { id: PROF_A },
  users: [
    userRow(PROF_A, 'professor', SCHOOL_A),
    userRow(PROF_B, 'professor', SCHOOL_A),
    userRow(DIR_A, 'diretor', SCHOOL_A),
    userRow(DIR_B, 'diretor', SCHOOL_B),
    userRow(SECRETARIO, 'secretario', null),
    userRow(ADMIN, 'admin', null),
  ],
  sessions: [
    // Session A belongs to PROF_A, class TURMA_A, escola A.
    sessionRow(SESSION_A, TURMA_A, PROF_A, SCHOOL_A),
    // Session B belongs to PROF_B, class TURMA_B, escola B.
    sessionRow(SESSION_B, TURMA_B, PROF_B, SCHOOL_B),
  ],
  turmas: [
    { id: TURMA_A, escola_id: SCHOOL_A, professor_id: PROF_A, ativo: true },
    { id: TURMA_B, escola_id: SCHOOL_B, professor_id: PROF_B, ativo: true },
  ],
  matriculas: [
    { id: MATRICULA_A1, turma_id: TURMA_A },
    { id: MATRICULA_A2, turma_id: TURMA_B },
  ],
  isEditable: true,
})

// ---------------------------------------------------------------------------
// Mock the canonical SSR client factory and next/cache for the action imports.
// ---------------------------------------------------------------------------

const { fakeState, setFakeSupabase } = vi.hoisted(() => {
  let current: ReturnType<typeof createFakeSupabase> | null = null
  return {
    fakeState: {
      get current() {
        return current
      },
    },
    setFakeSupabase(fake: ReturnType<typeof createFakeSupabase> | null) {
      current = fake
    },
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(fakeState.current)),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const markParams = {
  sessao_id: SESSION_A,
  matricula_id: MATRICULA_A1,
  presente: true,
  data_aula: '2026-08-01',
}

const openParams = {
  turma_id: TURMA_A,
  data_aula: '2026-08-05',
  conteudo_programatico: 'Aula de teste',
}

beforeEach(() => {
  vi.clearAllMocks()
  setFakeSupabase(createFakeSupabase(baseState()))
})

const fake = () => fakeState.current!

describe('markAttendanceAction - authz', () => {
  it('rejects unauthenticated callers before any database write', async () => {
    fake().state.user = null
    const result = await markAttendanceAction(markParams)
    expect(result.success).toBe(false)
    expect(result.code).toBe('UNAUTHENTICATED')
    expect(fake().writes.upserts).toHaveLength(0)
  })

  it('rejects callers without a users profile row', async () => {
    fake().state.users = []
    const result = await markAttendanceAction(markParams)
    expect(result.success).toBe(false)
    expect(result.code).toBe('PROFILE_NOT_FOUND')
  })

  it('rejects inactive profiles', async () => {
    fake().state.users[0].ativo = false
    const result = await markAttendanceAction(markParams)
    expect(result.success).toBe(false)
    expect(result.code).toBe('PROFILE_INACTIVE')
  })

  it('rejects secretario (wrong role)', async () => {
    fake().state.user = { id: SECRETARIO }
    const result = await markAttendanceAction(markParams)
    expect(result.success).toBe(false)
    expect(result.code).toBe('FORBIDDEN_ROLE')
    expect(fake().writes.upserts).toHaveLength(0)
  })

  it('rejects admin (view-only role, cannot record)', async () => {
    fake().state.user = { id: ADMIN }
    const result = await markAttendanceAction(markParams)
    expect(result.success).toBe(false)
    expect(result.code).toBe('FORBIDDEN_ROLE')
    expect(fake().writes.upserts).toHaveLength(0)
  })

  it('allows a professor to mark attendance in their own session', async () => {
    const result = await markAttendanceAction(markParams)
    expect(result.success).toBe(true)
    expect(fake().writes.upserts).toHaveLength(1)
    // professor_id comes from the session owner, marcado_por from the actor.
    expect(fake().writes.upserts[0].professor_id).toBe(PROF_A)
    expect(fake().writes.upserts[0].marcado_por).toBe(PROF_A)
  })

  it('rejects a professor marking another professor session (session ownership)', async () => {
    // PROF_B owns SESSION_B; make PROF_A (school A) target it.
    fake().state.user = { id: PROF_A }
    const result = await markAttendanceAction({
      ...markParams,
      sessao_id: SESSION_B,
    })
    expect(result.success).toBe(false)
    expect(result.code).toBe('SESSION_NOT_OWNED')
    expect(fake().writes.upserts).toHaveLength(0)
  })

  it('rejects a diretor marking a session from another escola (school ownership)', async () => {
    fake().state.user = { id: DIR_B }
    const result = await markAttendanceAction(markParams)
    expect(result.success).toBe(false)
    expect(result.code).toBe('SCHOOL_MISMATCH')
    expect(fake().writes.upserts).toHaveLength(0)
  })

  it('allows a diretor to mark attendance in a session of their escola', async () => {
    fake().state.user = { id: DIR_A }
    const result = await markAttendanceAction(markParams)
    expect(result.success).toBe(true)
    expect(fake().writes.upserts[0].marcado_por).toBe(DIR_A)
    // professor_id still the session owner, never the diretor.
    expect(fake().writes.upserts[0].professor_id).toBe(PROF_A)
  })

  it('rejects a matricula from another class of the same escola (class ownership)', async () => {
    // MATRICULA_A2 belongs to TURMA_B; SESSION_A belongs to TURMA_A.
    fake().state.user = { id: DIR_A }
    const result = await markAttendanceAction({
      ...markParams,
      matricula_id: MATRICULA_A2,
    })
    expect(result.success).toBe(false)
    expect(result.code).toBe('MATRICULA_NOT_IN_TURMA')
    expect(fake().writes.upserts).toHaveLength(0)
  })

  it('rejects a forged attendance date that differs from the session date', async () => {
    const result = await markAttendanceAction({
      ...markParams,
      data_aula: '2026-09-01',
    })
    expect(result.success).toBe(false)
    expect(result.code).toBe('DATA_MISMATCH')
    expect(fake().writes.upserts).toHaveLength(0)
  })

  it('rejects a nonexistent session id', async () => {
    fake().state.sessions = []
    const result = await markAttendanceAction(markParams)
    expect(result.success).toBe(false)
    expect(result.code).toBe('SESSION_NOT_FOUND')
  })

  it('rejects a locked session without writing', async () => {
    fake().state.isEditable = false
    const result = await markAttendanceAction(markParams)
    expect(result.success).toBe(false)
    expect(fake().writes.upserts).toHaveLength(0)
    expect(result.error).toContain('bloqueada')
  })
})

describe('openSessionAction - authz and identity derivation', () => {
  it('ignores a forged client professor_id for a professor actor', async () => {
    // Client tries to attribute the session to PROF_B.
    const result = await openSessionAction({
      ...openParams,
      professor_id: PROF_B,
      escola_id: SCHOOL_B,
    })
    expect(result.success).toBe(true)
    const inserted = fake().writes.inserts[0]
    expect(inserted.professor_id).toBe(PROF_A) // actor wins
    expect(inserted.escola_id).toBe(SCHOOL_A) // turma wins
  })

  it('rejects a professor opening a turma they do not own (class ownership)', async () => {
    fake().state.user = { id: PROF_B }
    const result = await openSessionAction(openParams)
    expect(result.success).toBe(false)
    expect(result.code).toBe('TURMA_NOT_OWNED')
    expect(fake().writes.inserts).toHaveLength(0)
  })

  it('ignores a forged client professor_id for a diretor actor', async () => {
    fake().state.user = { id: DIR_A }
    const result = await openSessionAction({
      ...openParams,
      professor_id: SECRETARIO,
      escola_id: SCHOOL_B,
    })
    expect(result.success).toBe(true)
    const inserted = fake().writes.inserts[0]
    // The turma's assigned professor wins, never the client value.
    expect(inserted.professor_id).toBe(PROF_A)
    expect(inserted.escola_id).toBe(SCHOOL_A)
  })

  it('rejects a diretor opening a turma from another escola', async () => {
    fake().state.user = { id: DIR_B }
    const result = await openSessionAction(openParams)
    expect(result.success).toBe(false)
    expect(result.code).toBe('SCHOOL_MISMATCH')
    expect(fake().writes.inserts).toHaveLength(0)
  })

  it('rejects a diretor opening a turma without an assigned professor', async () => {
    fake().state.user = { id: DIR_A }
    fake().state.turmas[0].professor_id = null
    const result = await openSessionAction(openParams)
    expect(result.success).toBe(false)
    expect(result.code).toBe('TURMA_WITHOUT_PROFESSOR')
    expect(fake().writes.inserts).toHaveLength(0)
  })

  it('rejects secretario (wrong role)', async () => {
    fake().state.user = { id: SECRETARIO }
    const result = await openSessionAction(openParams)
    expect(result.success).toBe(false)
    expect(result.code).toBe('FORBIDDEN_ROLE')
  })

  it('rejects unauthenticated callers', async () => {
    fake().state.user = null
    const result = await openSessionAction(openParams)
    expect(result.success).toBe(false)
    expect(result.code).toBe('UNAUTHENTICATED')
    expect(fake().writes.inserts).toHaveLength(0)
  })

  it('rejects a duplicate open session for the same turma and date', async () => {
    fake().state.sessions.push(
      sessionRow('31000000-0000-0000-0000-000000000009', TURMA_A, PROF_A, SCHOOL_A, 'aberta')
    )
    // Session pushed above uses data_aula 2026-08-01; openParams targets
    // 2026-08-05, so move the pushed session to that date to collide.
    fake().state.sessions[fake().state.sessions.length - 1].data_aula = openParams.data_aula
    const result = await openSessionAction(openParams)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Já existe uma aula aberta')
    expect(fake().writes.inserts).toHaveLength(0)
  })
})

describe('closeSessionAction - authz', () => {
  it('allows a professor to close their own session', async () => {
    const result = await closeSessionAction({ session_id: SESSION_A })
    expect(result.success).toBe(true)
    expect(fake().writes.updates).toHaveLength(1)
    expect(fake().writes.updates[0].status).toBe('FECHADA')
  })

  it('rejects a professor closing another professor session', async () => {
    fake().state.user = { id: PROF_B }
    const result = await closeSessionAction({ session_id: SESSION_A })
    expect(result.success).toBe(false)
    expect(result.code).toBe('SESSION_NOT_OWNED')
    expect(fake().writes.updates).toHaveLength(0)
  })

  it('allows a diretor to close a session of their escola', async () => {
    fake().state.user = { id: DIR_A }
    const result = await closeSessionAction({ session_id: SESSION_A })
    expect(result.success).toBe(true)
  })

  it('rejects a diretor closing a session from another escola', async () => {
    fake().state.user = { id: DIR_A }
    const result = await closeSessionAction({ session_id: SESSION_B })
    expect(result.success).toBe(false)
    expect(result.code).toBe('SCHOOL_MISMATCH')
    expect(fake().writes.updates).toHaveLength(0)
  })

  it('rejects secretario (wrong role)', async () => {
    fake().state.user = { id: SECRETARIO }
    const result = await closeSessionAction({ session_id: SESSION_A })
    expect(result.success).toBe(false)
    expect(result.code).toBe('FORBIDDEN_ROLE')
  })

  it('rejects unauthenticated callers', async () => {
    fake().state.user = null
    const result = await closeSessionAction({ session_id: SESSION_A })
    expect(result.success).toBe(false)
    expect(result.code).toBe('UNAUTHENTICATED')
    expect(fake().writes.updates).toHaveLength(0)
  })
})

describe('checkLockStatusAction - authz', () => {
  it('allows a professor to check their own session', async () => {
    const result = await checkLockStatusAction(SESSION_A)
    expect(result.success).toBe(true)
    expect(result.isLocked).toBe(false)
  })

  it('rejects a professor checking another professor session', async () => {
    fake().state.user = { id: PROF_B }
    const result = await checkLockStatusAction(SESSION_A)
    expect(result.success).toBe(false)
    expect(result.code).toBe('SESSION_NOT_OWNED')
  })

  it('allows a diretor to check a session of their escola', async () => {
    fake().state.user = { id: DIR_A }
    const result = await checkLockStatusAction(SESSION_A)
    expect(result.success).toBe(true)
  })

  it('rejects a diretor checking a session from another escola', async () => {
    fake().state.user = { id: DIR_A }
    const result = await checkLockStatusAction(SESSION_B)
    expect(result.success).toBe(false)
    expect(result.code).toBe('SCHOOL_MISMATCH')
  })

  it('allows a professor to check their own turma by turma_id + date', async () => {
    const result = await checkLockStatusAction(TURMA_A, '2026-08-01')
    expect(result.success).toBe(true)
    expect(result.isLocked).toBe(false)
  })

  it('rejects a professor checking another turma by turma_id + date', async () => {
    fake().state.user = { id: PROF_B }
    const result = await checkLockStatusAction(TURMA_A, '2026-08-01')
    expect(result.success).toBe(false)
    expect(result.code).toBe('TURMA_NOT_OWNED')
  })

  it('allows secretario (view-only role) to read lock status in scope', async () => {
    fake().state.user = { id: SECRETARIO }
    const result = await checkLockStatusAction(SESSION_A)
    expect(result.success).toBe(true)
  })

  it('allows secretariat admin to read lock status of any escola', async () => {
    fake().state.user = { id: ADMIN }
    const result = await checkLockStatusAction(SESSION_B)
    expect(result.success).toBe(true)
  })

  it('rejects unauthenticated callers', async () => {
    fake().state.user = null
    const result = await checkLockStatusAction(SESSION_A)
    expect(result.success).toBe(false)
    expect(result.code).toBe('UNAUTHENTICATED')
  })
})
