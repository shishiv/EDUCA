/**
 * Server Actions Tests for Attendance Management
 *
 * Tests Next.js 15 App Router Server Actions:
 * - openSessionAction: Create new session with validation
 * - markAttendanceAction: Mark individual attendance
 * - closeSessionAction: Complete session with immutability
 * - checkLockStatusAction: Validate session editability
 *
 * Brazilian Compliance: "não existe o esquecer" enforcement
 * Security: RLS policy enforcement, timezone handling (São Paulo)
 */

import { openSessionAction } from '@/app/actions/attendance/open-session'
import { markAttendanceAction } from '@/app/actions/attendance/mark-attendance'
import { closeSessionAction } from '@/app/actions/attendance/close-session'
import { checkLockStatusAction } from '@/app/actions/attendance/check-lock-status'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('openSessionAction - Create New Session', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      rpc: jest.fn(),
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  it('should successfully create new session', async () => {
    // Mock: No existing session today
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    // Mock: Insert new session
    const newSession = {
      id: 'session-new-123',
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
      status: 'ABERTA',
      aberta_em: new Date().toISOString(),
      auto_fechamento_agendado: new Date('2025-09-30T18:00:00-03:00').toISOString(),
    }

    mockSupabase.select.mockResolvedValueOnce({
      data: newSession,
      error: null,
    })

    const result = await openSessionAction({
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
    })

    expect(result.success).toBe(true)
    expect(result.session?.id).toBe('session-new-123')
    expect(result.session?.status).toBe('ABERTA')
  })

  it('should prevent opening duplicate session for same day', async () => {
    // Mock: Existing open session
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'existing-session',
        status: 'ABERTA',
        data_aula: '2025-09-30',
      },
      error: null,
    })

    const result = await openSessionAction({
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Já existe uma aula aberta')
  })

  it('should set auto_fechamento_agendado to 18:00 São Paulo time', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

    mockSupabase.select.mockResolvedValueOnce({
      data: {
        id: 'session-new',
        auto_fechamento_agendado: new Date('2025-09-30T18:00:00-03:00').toISOString(),
      },
      error: null,
    })

    const result = await openSessionAction({
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
    })

    expect(result.success).toBe(true)

    // Verify 18:00 São Paulo time
    const cutoffTime = new Date(result.session?.auto_fechamento_agendado!)
    expect(cutoffTime.getHours()).toBe(18) // 18:00 or adjusted for UTC
  })

  it('should handle database error gracefully', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Connection timeout' },
    })

    const result = await openSessionAction({
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should validate required parameters', async () => {
    const result = await openSessionAction({
      turma_id: '',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
    } as any)

    expect(result.success).toBe(false)
    expect(result.error).toContain('obrigatório')
  })
})

describe('markAttendanceAction - Mark Individual Attendance', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      rpc: jest.fn(),
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  it('should successfully mark student attendance', async () => {
    // Mock: Session is editable
    mockSupabase.rpc.mockResolvedValueOnce({
      data: true,
      error: null,
    })

    // Mock: Insert attendance record
    const attendanceRecord = {
      id: 'freq-new-123',
      sessao_aula_id: 'session-456',
      aluno_id: 'student-789',
      presente: true,
      data: '2025-09-30',
      created_at: new Date().toISOString(),
    }

    mockSupabase.select.mockResolvedValueOnce({
      data: attendanceRecord,
      error: null,
    })

    const result = await markAttendanceAction({
      sessao_aula_id: 'session-456',
      aluno_id: 'student-789',
      presente: true,
      data: '2025-09-30',
    })

    expect(result.success).toBe(true)
    expect(result.record?.presente).toBe(true)
    expect(result.record?.aluno_id).toBe('student-789')
  })

  it('should prevent marking on locked session', async () => {
    // Mock: Session is NOT editable (locked)
    mockSupabase.rpc.mockResolvedValueOnce({
      data: false,
      error: null,
    })

    const result = await markAttendanceAction({
      sessao_aula_id: 'session-456',
      aluno_id: 'student-789',
      presente: true,
      data: '2025-09-30',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('não existe o esquecer')
  })

  it('should update existing attendance record (toggle)', async () => {
    // Mock: Session is editable
    mockSupabase.rpc.mockResolvedValueOnce({
      data: true,
      error: null,
    })

    // Mock: Upsert (update existing or insert new)
    const updatedRecord = {
      id: 'freq-existing-123',
      presente: false, // Changed from true to false
      updated_at: new Date().toISOString(),
    }

    mockSupabase.select.mockResolvedValueOnce({
      data: updatedRecord,
      error: null,
    })

    const result = await markAttendanceAction({
      sessao_aula_id: 'session-456',
      aluno_id: 'student-789',
      presente: false,
      data: '2025-09-30',
    })

    expect(result.success).toBe(true)
    expect(result.record?.presente).toBe(false)
  })

  it('should achieve <1s performance target', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })
    mockSupabase.select.mockResolvedValueOnce({
      data: { id: 'freq-123', presente: true },
      error: null,
    })

    const startTime = Date.now()

    await markAttendanceAction({
      sessao_aula_id: 'session-456',
      aluno_id: 'student-789',
      presente: true,
      data: '2025-09-30',
    })

    const elapsedTime = Date.now() - startTime

    // Server action should complete in <500ms (half of 1s target)
    // The remaining time is for network latency
    expect(elapsedTime).toBeLessThan(500)
  })

  it('should validate required parameters', async () => {
    const result = await markAttendanceAction({
      sessao_aula_id: '',
      aluno_id: 'student-789',
      presente: true,
      data: '2025-09-30',
    } as any)

    expect(result.success).toBe(false)
    expect(result.error).toContain('obrigatório')
  })
})

describe('closeSessionAction - Complete Session', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      rpc: jest.fn(),
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  it('should successfully close open session', async () => {
    // Mock: Session is editable
    mockSupabase.rpc.mockResolvedValueOnce({
      data: true,
      error: null,
    })

    // Mock: Update session to FECHADA
    const closedSession = {
      id: 'session-456',
      status: 'FECHADA',
      fechada_em: new Date().toISOString(),
      hash_legal: 'abc123...', // Legal compliance hash
    }

    mockSupabase.single.mockResolvedValueOnce({
      data: closedSession,
      error: null,
    })

    const result = await closeSessionAction({
      session_id: 'session-456',
      observacoes: 'Aula completa sobre frações',
    })

    expect(result.success).toBe(true)
    expect(result.session?.status).toBe('FECHADA')
    expect(result.session?.fechada_em).toBeDefined()
    expect(result.session?.hash_legal).toBeDefined()
  })

  it('should prevent closing already locked session', async () => {
    // Mock: Session is NOT editable (already closed)
    mockSupabase.rpc.mockResolvedValueOnce({
      data: false,
      error: null,
    })

    const result = await closeSessionAction({
      session_id: 'session-456',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('já encerrada')
  })

  it('should generate legal compliance hash on close', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'session-456',
        status: 'FECHADA',
        hash_legal: 'sha256_hash_here',
      },
      error: null,
    })

    const result = await closeSessionAction({
      session_id: 'session-456',
    })

    expect(result.success).toBe(true)
    expect(result.session?.hash_legal).toBeDefined()
    expect(result.session?.hash_legal?.length).toBeGreaterThan(10)
  })

  it('should set fechada_em with current timestamp', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

    const now = new Date()

    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'session-456',
        status: 'FECHADA',
        fechada_em: now.toISOString(),
      },
      error: null,
    })

    const result = await closeSessionAction({
      session_id: 'session-456',
    })

    expect(result.success).toBe(true)
    expect(result.session?.fechada_em).toBeDefined()

    const fechadaEm = new Date(result.session!.fechada_em!)
    const diff = Math.abs(fechadaEm.getTime() - now.getTime())

    // Timestamp should be within 5 seconds of current time
    expect(diff).toBeLessThan(5000)
  })

  it('should validate session_id parameter', async () => {
    const result = await closeSessionAction({
      session_id: '',
    } as any)

    expect(result.success).toBe(false)
    expect(result.error).toContain('obrigatório')
  })
})

describe('checkLockStatusAction - Validate Session Editability', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      rpc: jest.fn(),
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  it('should report session as editable when status is ABERTA', async () => {
    const openSession = {
      id: 'session-456',
      turma_id: 'turma-789',
      status: 'ABERTA',
      aberta_em: new Date().toISOString(),
      fechada_em: null,
      travada_em: null,
    }

    mockSupabase.single.mockResolvedValueOnce({
      data: openSession,
      error: null,
    })

    // Mock: is_session_editable returns true
    mockSupabase.rpc.mockResolvedValueOnce({
      data: true,
      error: null,
    })

    const result = await checkLockStatusAction('turma-789', '2025-09-30')

    expect(result.success).toBe(true)
    expect(result.isLocked).toBe(false)
    expect(result.session?.status).toBe('ABERTA')
  })

  it('should report session as locked when status is FECHADA', async () => {
    const closedSession = {
      id: 'session-456',
      status: 'FECHADA',
      fechada_em: new Date().toISOString(),
    }

    mockSupabase.single.mockResolvedValueOnce({
      data: closedSession,
      error: null,
    })

    mockSupabase.rpc.mockResolvedValueOnce({
      data: false,
      error: null,
    })

    const result = await checkLockStatusAction('session-456')

    expect(result.success).toBe(true)
    expect(result.isLocked).toBe(true)
  })

  it('should report session as locked when travada_em is set', async () => {
    const autoLockedSession = {
      id: 'session-456',
      status: 'travada',
      travada_em: new Date().toISOString(),
    }

    mockSupabase.single.mockResolvedValueOnce({
      data: autoLockedSession,
      error: null,
    })

    mockSupabase.rpc.mockResolvedValueOnce({
      data: false,
      error: null,
    })

    const result = await checkLockStatusAction('session-456')

    expect(result.success).toBe(true)
    expect(result.isLocked).toBe(true)
  })

  it('should handle no session found (no session today)', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const result = await checkLockStatusAction('turma-789', '2025-09-30')

    expect(result.success).toBe(true)
    expect(result.session).toBeNull()
    expect(result.isLocked).toBe(false)
  })

  it('should check 18:00 cutoff time for auto-lock detection', async () => {
    // Session opened but not manually closed
    const sessionBeforeCutoff = {
      id: 'session-456',
      status: 'ABERTA',
      data_aula: '2025-09-30',
      aberta_em: new Date('2025-09-30T14:00:00').toISOString(),
      auto_fechamento_agendado: new Date('2025-09-30T18:00:00-03:00').toISOString(),
    }

    mockSupabase.single.mockResolvedValueOnce({
      data: sessionBeforeCutoff,
      error: null,
    })

    // Simulate current time after 18:00
    const mockNow = new Date('2025-09-30T19:00:00-03:00')
    jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any)

    mockSupabase.rpc.mockResolvedValueOnce({
      data: false, // Not editable after 18:00
      error: null,
    })

    const result = await checkLockStatusAction('session-456')

    expect(result.success).toBe(true)
    expect(result.isLocked).toBe(true)

    jest.restoreAllMocks()
  })
})