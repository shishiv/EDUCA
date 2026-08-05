import { describe, expect, it } from 'vitest'
import {
  createAttendanceModule,
  getCanonicalSessionLockInfo,
  getSaoPauloDate,
  normalizeAttendanceStatus,
  normalizeSessionStatus,
} from '@/lib/services/attendance-module'
import { createFakeSupabase, type FakeAttendanceDbState } from '../actions/fake-supabase'

const SCHOOL_A = '10000000-0000-0000-0000-000000000001'
const SCHOOL_B = '10000000-0000-0000-0000-000000000002'
const PROF_A = '20000000-0000-0000-0000-000000000001'
const PROF_B = '20000000-0000-0000-0000-000000000002'
const DIR_A = '20000000-0000-0000-0000-000000000003'
const DIR_B = '20000000-0000-0000-0000-000000000004'
const TURMA_A = '30000000-0000-0000-0000-000000000001'
const TURMA_B = '30000000-0000-0000-0000-000000000002'
const SESSION_A = '31000000-0000-0000-0000-000000000001'
const SESSION_B = '31000000-0000-0000-0000-000000000002'
const MATRICULA_A = '50000000-0000-0000-0000-000000000001'
const MATRICULA_B = '50000000-0000-0000-0000-000000000002'
const TEST_NOW = new Date('2026-08-05T12:00:00-03:00')
const TEST_DATE = getSaoPauloDate(TEST_NOW)

function baseState(): FakeAttendanceDbState {
  return {
    user: { id: PROF_A },
    users: [
      { id: PROF_A, tipo_usuario: 'professor', escola_id: SCHOOL_A, ativo: true },
      { id: PROF_B, tipo_usuario: 'professor', escola_id: SCHOOL_B, ativo: true },
      { id: DIR_A, tipo_usuario: 'diretor', escola_id: SCHOOL_A, ativo: true },
      { id: DIR_B, tipo_usuario: 'diretor', escola_id: SCHOOL_B, ativo: true },
    ],
    sessions: [
      {
        id: SESSION_A,
        turma_id: TURMA_A,
        professor_id: PROF_A,
        escola_id: SCHOOL_A,
        status: 'aberta',
        data_aula: TEST_DATE,
        auto_fechamento_agendado: null,
        travada_em: null,
        fechada_em: null,
        created_at: '2026-08-05T10:00:00.000Z',
      },
      {
        id: SESSION_B,
        turma_id: TURMA_B,
        professor_id: PROF_B,
        escola_id: SCHOOL_B,
        status: 'ABERTA',
        data_aula: TEST_DATE,
        auto_fechamento_agendado: null,
        travada_em: null,
        fechada_em: null,
        created_at: '2026-08-05T10:01:00.000Z',
      },
    ],
    turmas: [
      { id: TURMA_A, escola_id: SCHOOL_A, professor_id: PROF_A, ativo: true },
      { id: TURMA_B, escola_id: SCHOOL_B, professor_id: PROF_B, ativo: true },
    ],
    matriculas: [
      { id: MATRICULA_A, turma_id: TURMA_A, situacao: 'ativa', aluno_id: '40000000-0000-0000-0000-000000000001' },
      { id: MATRICULA_B, turma_id: TURMA_B, situacao: 'ativa', aluno_id: '40000000-0000-0000-0000-000000000002' },
    ],
    attendance: [],
    isEditable: true,
  }
}

function createSubject(state = baseState()) {
  const fake = createFakeSupabase(state)
  const subject = createAttendanceModule(fake as never, { now: () => TEST_NOW })
  return { fake, subject }
}

describe('canonical Attendance session module', () => {
  it('normalizes canonical and legacy status vocabulary without changing the source identity', () => {
    expect(normalizeSessionStatus('aberta')).toBe('ABERTA')
    expect(normalizeSessionStatus('travada')).toBe('FECHADA')
    expect(normalizeAttendanceStatus('presente')).toBe('P')
    expect(normalizeAttendanceStatus('atestado_medico')).toBe('A')
    expect(normalizeAttendanceStatus('NAO_MARCADO')).toBe('NAO_MARCADO')
  })

  it('centralizes lock state and current-date normalization for UI adapters', () => {
    expect(getCanonicalSessionLockInfo(TEST_DATE, 'aberta', new Date('2026-08-05T16:00:00-03:00'))).toEqual(expect.objectContaining({
      isLocked: false,
      lockReason: null,
      canEdit: true,
    }))
    expect(getCanonicalSessionLockInfo('2026-08-04', 'ABERTA', TEST_NOW)).toEqual(expect.objectContaining({
      isLocked: true,
      lockReason: 'past_date',
    }))
    expect(getCanonicalSessionLockInfo(TEST_DATE, 'FECHADA', TEST_NOW)).toEqual(expect.objectContaining({
      isLocked: true,
      lockReason: 'session_closed',
    }))
  })

  it('rejects an invalid opening date before touching the database', async () => {
    const { fake, subject } = createSubject()

    const result = await subject.openSession({ turma_id: TURMA_A, data_aula: '2026-02-30' })

    expect(result).toEqual(expect.objectContaining({ success: false, code: 'DATE_INVALID' }))
    expect(fake.writes.inserts).toHaveLength(0)
  })

  it('rejects a non-current São Paulo opening date', async () => {
    const { fake, subject } = createSubject()

    const result = await subject.openSession({ turma_id: TURMA_A, data_aula: '2026-08-04' })

    expect(result).toEqual(expect.objectContaining({ success: false, code: 'DATE_NOT_CURRENT' }))
    expect(fake.writes.inserts).toHaveLength(0)
  })

  it('rejects a duplicate planned or open session for the same class and date', async () => {
    const { fake, subject } = createSubject()
    fake.state.sessions.push({
      id: '31000000-0000-0000-0000-000000000009',
      turma_id: TURMA_A,
      professor_id: PROF_A,
      escola_id: SCHOOL_A,
      status: 'PLANEJADA',
      data_aula: TEST_DATE,
    })

    const result = await subject.openSession({ turma_id: TURMA_A, data_aula: TEST_DATE })

    expect(result).toEqual(expect.objectContaining({ success: false, code: 'SESSION_ALREADY_OPEN' }))
    expect(fake.writes.inserts).toHaveLength(0)
  })

  it('derives professor and school from the turma instead of forged input fields', async () => {
    const { fake, subject } = createSubject()
    fake.state.sessions = []

    const result = await subject.openSession({
      turma_id: TURMA_A,
      data_aula: TEST_DATE,
      professor_id: PROF_B,
      escola_id: SCHOOL_B,
    })

    expect(result.success).toBe(true)
    expect(fake.writes.inserts[0]).toEqual(expect.objectContaining({
      professor_id: PROF_A,
      escola_id: SCHOOL_A,
      data_aula: TEST_DATE,
      status: 'ABERTA',
    }))
  })

  it('marks one enrollment with canonical status, date, teacher, and actor', async () => {
    const { fake, subject } = createSubject()

    const result = await subject.markAttendance({
      sessao_id: SESSION_A,
      matricula_id: MATRICULA_A,
      status: 'presente',
      data_aula: TEST_DATE,
    })

    expect(result.success).toBe(true)
    expect(fake.writes.upserts).toHaveLength(1)
    expect(fake.writes.upserts[0]).toEqual(expect.objectContaining({
      sessao_id: SESSION_A,
      matricula_id: MATRICULA_A,
      data_aula: TEST_DATE,
      status_presenca: 'P',
      presente: true,
      professor_id: PROF_A,
      marcado_por: PROF_A,
    }))
  })

  it('marks a batch with the same canonical payload as repeated individual writes', async () => {
    const individual = createSubject()
    await individual.subject.markAttendance({ sessao_id: SESSION_A, matricula_id: MATRICULA_A, status: 'J', justificativa: 'Atestado' })

    const batch = createSubject()
    const result = await batch.subject.markAttendanceBatch({
      sessao_id: SESSION_A,
      records: [{ matricula_id: MATRICULA_A, status: 'J', justificativa: 'Atestado' }],
    })

    expect(result).toEqual(expect.objectContaining({ success: true, processed_count: 1 }))
    expect(batch.fake.writes.upserts[0]).toEqual([
      expect.objectContaining({
        sessao_id: SESSION_A,
        matricula_id: MATRICULA_A,
        data_aula: TEST_DATE,
        status_presenca: 'J',
        presente: true,
        professor_id: PROF_A,
        marcado_por: PROF_A,
      }),
    ])
    expect(batch.fake.writes.upserts[0]).toEqual([
      expect.objectContaining(individual.fake.writes.upserts[0] as Record<string, unknown>),
    ])
  })

  it('persists an unmarked (null) status as NAO_MARCADO with the same payload as an individual write', async () => {
    const individual = createSubject()
    await individual.subject.markAttendance({ sessao_id: SESSION_A, matricula_id: MATRICULA_A, status: null })

    const batch = createSubject()
    const result = await batch.subject.markAttendanceBatch({
      sessao_id: SESSION_A,
      records: [{ matricula_id: MATRICULA_A, status: null, justificativa: null }],
    })

    expect(result).toEqual(expect.objectContaining({ success: true, processed_count: 1 }))
    expect(batch.fake.writes.upserts[0]).toEqual([
      expect.objectContaining({
        sessao_id: SESSION_A,
        matricula_id: MATRICULA_A,
        data_aula: TEST_DATE,
        status_presenca: 'NAO_MARCADO',
        presente: false,
        professor_id: PROF_A,
        marcado_por: PROF_A,
      }),
    ])
    expect(batch.fake.writes.upserts[0]).toEqual([
      expect.objectContaining(individual.fake.writes.upserts[0] as Record<string, unknown>),
    ])
  })

  it('rejects an enrollment mismatch before a batch write', async () => {
    const { fake, subject } = createSubject()

    const result = await subject.markAttendanceBatch({
      sessao_id: SESSION_A,
      records: [{ matricula_id: MATRICULA_B, status: 'F' }],
    })

    expect(result).toEqual(expect.objectContaining({ success: false, code: 'MATRICULA_NOT_IN_TURMA' }))
    expect(fake.writes.upserts).toHaveLength(0)
  })

  it('denies a professor and director outside the authorized session school', async () => {
    const professor = createSubject()
    professor.fake.state.user = { id: PROF_A }
    const professorResult = await professor.subject.markAttendance({
      sessao_id: SESSION_B,
      matricula_id: MATRICULA_B,
      status: 'P',
    })

    const director = createSubject()
    director.fake.state.user = { id: DIR_A }
    const directorResult = await director.subject.markAttendance({
      sessao_id: SESSION_B,
      matricula_id: MATRICULA_B,
      status: 'P',
    })

    expect(professorResult.code).toBe('SESSION_NOT_OWNED')
    expect(directorResult.code).toBe('SCHOOL_MISMATCH')
  })

  it('rejects current-date writes when the session is locked or closed', async () => {
    const { fake, subject } = createSubject()
    fake.state.isEditable = false

    const result = await subject.markAttendance({
      sessao_id: SESSION_A,
      matricula_id: MATRICULA_A,
      status: 'F',
    })

    expect(result).toEqual(expect.objectContaining({ success: false, code: 'SESSION_CLOSED' }))
    expect(fake.writes.upserts).toHaveLength(0)
  })

  it('rejects a session date that is not the current São Paulo date', async () => {
    const state = baseState()
    state.sessions[0].data_aula = '2026-08-04'
    const { fake, subject } = createSubject(state)

    const result = await subject.closeSession({ session_id: SESSION_A })

    expect(result).toEqual(expect.objectContaining({ success: false, code: 'SESSION_DATE_NOT_CURRENT' }))
    expect(fake.writes.updates).toHaveLength(0)
  })

  it('closes an open session through the one-way canonical transition', async () => {
    const { fake, subject } = createSubject()

    const result = await subject.closeSession({ session_id: SESSION_A, observacoes: 'Fechamento de teste' })

    expect(result.success).toBe(true)
    expect(fake.writes.updates[0]).toEqual({
      status: 'FECHADA',
      fechada_em: TEST_NOW.toISOString(),
      observacoes_fechamento: 'Fechamento de teste',
      updated_at: TEST_NOW.toISOString(),
    })
  })

  it('reads canonical sessions, active students, and normalized frequency facts', async () => {
    const state = baseState()
    state.attendance = [
      { matricula_id: MATRICULA_A, sessao_id: SESSION_A, data_aula: TEST_DATE, status_presenca: 'presente', presente: true, justificativa: null },
      { matricula_id: MATRICULA_A, sessao_id: SESSION_A, data_aula: TEST_DATE, status_presenca: 'A', presente: true, justificativa: null },
    ]
    state.matriculas[0].aluno = { id: '40000000-0000-0000-0000-000000000001', nome_completo: 'Aluno A' }
    const { subject } = createSubject(state)

    const sessions = await subject.getSessionsForChamada(TURMA_A, TEST_DATE)
    const students = await subject.getStudentsForChamada(TURMA_A)
    const records = await subject.getAttendanceForSession(SESSION_A)

    expect(sessions[0].status).toBe('ABERTA')
    expect(students).toEqual([{ id: '40000000-0000-0000-0000-000000000001', nome: 'Aluno A', matriculaId: MATRICULA_A, frequencia: 100 }])
    expect(records.get(MATRICULA_A)).toEqual({
      matricula_id: MATRICULA_A,
      status: 'A',
      justificativa: null,
    })
  })

  it('returns a stable lock state for a missing session without creating a write', async () => {
    const { subject } = createSubject()

    const result = await subject.checkLockStatus({ sessionIdOrTurmaId: '31000000-0000-0000-0000-000000000099' })

    expect(result).toEqual({ success: true, session: null, isLocked: false, lockReason: null })
  })
})
