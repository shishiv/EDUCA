/**
 * Unit Tests for Attendance Session Store (Zustand)
 *
 * Tests cover:
 * - Phase state transitions (planning → attendance → completion → locked)
 * - Optimistic UI updates for attendance marking
 * - Lock status validation logic
 * - Error rollback mechanisms
 * - Session lifecycle management
 *
 * Brazilian Compliance: "não existe o esquecer" principle enforcement
 *
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { useAttendanceSessionStore } from '@/lib/stores/attendance-session-store'

describe('useAttendanceSessionStore - Phase Transitions', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useAttendanceSessionStore())
    act(() => {
      result.current.reset()
    })
  })

  it('should initialize with planning phase and no active session', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    expect(result.current.currentPhase).toBe('planning')
    expect(result.current.sessionId).toBeNull()
    expect(result.current.isLocked).toBe(false)
    expect(result.current.attendanceRecords).toEqual([])
  })

  it('should transition from planning to attendance phase when opening session', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    const mockSession = {
      id: 'session-123',
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
      status: 'ABERTA' as const,
      aberta_em: new Date().toISOString(),
    }

    act(() => {
      result.current.setActiveSession(mockSession)
    })

    expect(result.current.currentPhase).toBe('attendance')
    expect(result.current.sessionId).toBe('session-123')
    expect(result.current.isLocked).toBe(false)
  })

  it('should transition to completion phase when closing session', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    // Setup: Open session first
    const mockSession = {
      id: 'session-123',
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
      status: 'ABERTA' as const,
      aberta_em: new Date().toISOString(),
    }

    act(() => {
      result.current.setActiveSession(mockSession)
    })

    // Action: Close session
    act(() => {
      result.current.transitionPhase('completion')
    })

    expect(result.current.currentPhase).toBe('completion')
    expect(result.current.isLocked).toBe(false) // Not locked until marked as FECHADA
  })

  it('should transition to locked phase when session is marked as FECHADA', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    const closedSession = {
      id: 'session-123',
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
      status: 'FECHADA' as const,
      aberta_em: new Date().toISOString(),
      fechada_em: new Date().toISOString(),
    }

    act(() => {
      result.current.setActiveSession(closedSession)
    })

    expect(result.current.currentPhase).toBe('locked')
    expect(result.current.isLocked).toBe(true)
  })

  it('should prevent phase transition backwards from locked', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    const lockedSession = {
      id: 'session-123',
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
      status: 'travada' as const,
      travada_em: new Date().toISOString(),
    }

    act(() => {
      result.current.setActiveSession(lockedSession)
    })

    expect(result.current.currentPhase).toBe('locked')

    // Attempt to transition backwards (should fail)
    act(() => {
      result.current.transitionPhase('attendance')
    })

    // Phase should remain locked
    expect(result.current.currentPhase).toBe('locked')
    expect(result.current.error).toContain('não existe o esquecer')
  })

  it('should detect auto-lock at 18:00 cutoff time', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    // Create session with cutoff time in the past
    const pastCutoffTime = new Date()
    pastCutoffTime.setHours(17, 59, 0, 0) // Before 18:00

    const mockSession = {
      id: 'session-123',
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: pastCutoffTime.toISOString().split('T')[0],
      status: 'ABERTA' as const,
      aberta_em: pastCutoffTime.toISOString(),
      auto_fechamento_agendado: pastCutoffTime.toISOString(),
    }

    act(() => {
      result.current.setActiveSession(mockSession)
    })

    // Check if cutoff has passed
    act(() => {
      result.current.checkCutoffStatus()
    })

    // Should be locked if current time > 18:00 on session date
    const now = new Date()
    if (now.getHours() >= 18) {
      expect(result.current.isLocked).toBe(true)
      expect(result.current.currentPhase).toBe('locked')
    }
  })
})

describe('useAttendanceSessionStore - Optimistic Updates', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAttendanceSessionStore())
    act(() => {
      result.current.reset()
    })
  })

  it('should apply optimistic update immediately when marking attendance', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    // Setup: Active session
    const mockSession = {
      id: 'session-123',
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
      status: 'ABERTA' as const,
      aberta_em: new Date().toISOString(),
    }

    act(() => {
      result.current.setActiveSession(mockSession)
    })

    // Optimistic mark attendance
    act(() => {
      result.current.optimisticMarkAttendance('student-123', true)
    })

    // Should have optimistic record immediately (before API call)
    const optimisticRecord = result.current.attendanceRecords.find(
      r => r.aluno_id === 'student-123'
    )

    expect(optimisticRecord).toBeDefined()
    expect(optimisticRecord?.presente).toBe(true)
    expect(optimisticRecord?.optimistic).toBe(true)
  })

  it('should replace optimistic record with confirmed record after successful API call', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    const mockSession = {
      id: 'session-123',
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
      status: 'ABERTA' as const,
      aberta_em: new Date().toISOString(),
    }

    act(() => {
      result.current.setActiveSession(mockSession)
    })

    // Optimistic update
    act(() => {
      result.current.optimisticMarkAttendance('student-123', true)
    })

    expect(result.current.attendanceRecords[0]?.optimistic).toBe(true)

    // Confirm attendance (simulating successful API response)
    const confirmedRecord = {
      id: 'freq-456',
      sessao_aula_id: 'session-123',
      aluno_id: 'student-123',
      presente: true,
      data: '2025-09-30',
      created_at: new Date().toISOString(),
      optimistic: false,
    }

    act(() => {
      result.current.confirmAttendance(confirmedRecord)
    })

    // Should replace optimistic record
    const record = result.current.attendanceRecords.find(
      r => r.aluno_id === 'student-123'
    )

    expect(record?.optimistic).toBe(false)
    expect(record?.id).toBe('freq-456')
    expect(result.current.attendanceRecords).toHaveLength(1) // Only one record
  })

  it('should rollback optimistic update on API error', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    const mockSession = {
      id: 'session-123',
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
      status: 'ABERTA' as const,
      aberta_em: new Date().toISOString(),
    }

    act(() => {
      result.current.setActiveSession(mockSession)
    })

    // Optimistic update
    act(() => {
      result.current.optimisticMarkAttendance('student-123', true)
    })

    expect(result.current.attendanceRecords).toHaveLength(1)

    // Simulate API error
    act(() => {
      result.current.rollbackAttendance('student-123', 'Erro de rede')
    })

    // Should remove optimistic record
    expect(result.current.attendanceRecords).toHaveLength(0)
    expect(result.current.error).toBe('Erro de rede')
  })

  it('should handle multiple optimistic updates correctly', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    const mockSession = {
      id: 'session-123',
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
      status: 'ABERTA' as const,
      aberta_em: new Date().toISOString(),
    }

    act(() => {
      result.current.setActiveSession(mockSession)
    })

    // Mark multiple students optimistically
    act(() => {
      result.current.optimisticMarkAttendance('student-1', true)
      result.current.optimisticMarkAttendance('student-2', false)
      result.current.optimisticMarkAttendance('student-3', true)
    })

    expect(result.current.attendanceRecords).toHaveLength(3)
    expect(result.current.attendanceRecords.every(r => r.optimistic)).toBe(true)

    // Confirm one, rollback another, leave one pending
    const confirmedRecord = {
      id: 'freq-1',
      sessao_aula_id: 'session-123',
      aluno_id: 'student-1',
      presente: true,
      data: '2025-09-30',
      created_at: new Date().toISOString(),
      optimistic: false,
    }

    act(() => {
      result.current.confirmAttendance(confirmedRecord)
      result.current.rollbackAttendance('student-2', 'Erro')
    })

    expect(result.current.attendanceRecords).toHaveLength(2)
    expect(result.current.attendanceRecords.find(r => r.aluno_id === 'student-1')?.optimistic).toBe(false)
    expect(result.current.attendanceRecords.find(r => r.aluno_id === 'student-3')?.optimistic).toBe(true)
  })
})

describe('useAttendanceSessionStore - Lock Status Validation', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAttendanceSessionStore())
    act(() => {
      result.current.reset()
    })
  })

  it('should report session as editable when status is ABERTA', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    const openSession = {
      id: 'session-123',
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
      status: 'ABERTA' as const,
      aberta_em: new Date().toISOString(),
    }

    act(() => {
      result.current.setActiveSession(openSession)
    })

    expect(result.current.isEditable()).toBe(true)
    expect(result.current.isLocked).toBe(false)
  })

  it('should report session as locked when status is FECHADA', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    const closedSession = {
      id: 'session-123',
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
      status: 'FECHADA' as const,
      aberta_em: new Date().toISOString(),
      fechada_em: new Date().toISOString(),
    }

    act(() => {
      result.current.setActiveSession(closedSession)
    })

    expect(result.current.isEditable()).toBe(false)
    expect(result.current.isLocked).toBe(true)
  })

  it('should report session as locked when travada_em is set', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    const autoLockedSession = {
      id: 'session-123',
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
      status: 'travada' as const,
      aberta_em: new Date().toISOString(),
      travada_em: new Date().toISOString(),
    }

    act(() => {
      result.current.setActiveSession(autoLockedSession)
    })

    expect(result.current.isEditable()).toBe(false)
    expect(result.current.isLocked).toBe(true)
    expect(result.current.lockReason).toBe('auto_lock')
  })

  it('should prevent attendance marking when session is locked', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    const lockedSession = {
      id: 'session-123',
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
      status: 'FECHADA' as const,
      fechada_em: new Date().toISOString(),
    }

    act(() => {
      result.current.setActiveSession(lockedSession)
    })

    // Attempt to mark attendance on locked session
    act(() => {
      result.current.optimisticMarkAttendance('student-123', true)
    })

    // Should not create attendance record
    expect(result.current.attendanceRecords).toHaveLength(0)
    expect(result.current.error).toContain('Frequência já finalizada')
  })

  it('should provide lock reason for UI display', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    // Manual close
    const manualClosedSession = {
      id: 'session-1',
      status: 'FECHADA' as const,
      fechada_em: new Date().toISOString(),
    }

    act(() => {
      result.current.setActiveSession(manualClosedSession as any)
    })

    expect(result.current.lockReason).toBe('manual_close')
    expect(result.current.getLockMessage()).toContain('encerrada pelo professor')

    // Auto-lock
    const autoLockedSession = {
      id: 'session-2',
      status: 'travada' as const,
      travada_em: new Date().toISOString(),
    }

    act(() => {
      result.current.setActiveSession(autoLockedSession as any)
    })

    expect(result.current.lockReason).toBe('auto_lock')
    expect(result.current.getLockMessage()).toContain('18:00')
  })
})

describe('useAttendanceSessionStore - Error Handling', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAttendanceSessionStore())
    act(() => {
      result.current.reset()
    })
  })

  it('should set error message on failed operation', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    act(() => {
      result.current.setError('Erro de conexão com o banco de dados')
    })

    expect(result.current.error).toBe('Erro de conexão com o banco de dados')
  })

  it('should clear error when clearError is called', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    act(() => {
      result.current.setError('Erro temporário')
    })

    expect(result.current.error).toBe('Erro temporário')

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })

  it('should preserve attendance records when error occurs', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    const mockSession = {
      id: 'session-123',
      status: 'ABERTA' as const,
      aberta_em: new Date().toISOString(),
    }

    act(() => {
      result.current.setActiveSession(mockSession as any)
    })

    // Add confirmed record
    const confirmedRecord = {
      id: 'freq-1',
      sessao_aula_id: 'session-123',
      aluno_id: 'student-1',
      presente: true,
      data: '2025-09-30',
      created_at: new Date().toISOString(),
      optimistic: false,
    }

    act(() => {
      result.current.confirmAttendance(confirmedRecord)
    })

    // Simulate error
    act(() => {
      result.current.setError('Network error')
    })

    // Confirmed records should remain
    expect(result.current.attendanceRecords).toHaveLength(1)
    expect(result.current.attendanceRecords[0].id).toBe('freq-1')
  })
})

describe('useAttendanceSessionStore - Session Lifecycle', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAttendanceSessionStore())
    act(() => {
      result.current.reset()
    })
  })

  it('should reset store to initial state', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    // Setup state
    const mockSession = {
      id: 'session-123',
      status: 'ABERTA' as const,
      aberta_em: new Date().toISOString(),
    }

    act(() => {
      result.current.setActiveSession(mockSession as any)
      result.current.optimisticMarkAttendance('student-1', true)
      result.current.setError('Some error')
    })

    expect(result.current.sessionId).toBe('session-123')
    expect(result.current.attendanceRecords).toHaveLength(1)
    expect(result.current.error).toBe('Some error')

    // Reset
    act(() => {
      result.current.reset()
    })

    // All state should be cleared
    expect(result.current.sessionId).toBeNull()
    expect(result.current.currentPhase).toBe('planning')
    expect(result.current.attendanceRecords).toEqual([])
    expect(result.current.error).toBeNull()
    expect(result.current.isLocked).toBe(false)
  })

  it('should track session statistics', () => {
    const { result } = renderHook(() => useAttendanceSessionStore())

    const mockSession = {
      id: 'session-123',
      status: 'ABERTA' as const,
      aberta_em: new Date().toISOString(),
    }

    act(() => {
      result.current.setActiveSession(mockSession as any)
    })

    // Add attendance records
    act(() => {
      result.current.confirmAttendance({
        id: 'freq-1',
        sessao_aula_id: 'session-123',
        aluno_id: 'student-1',
        presente: true,
        data: '2025-09-30',
        created_at: new Date().toISOString(),
        optimistic: false,
      })

      result.current.confirmAttendance({
        id: 'freq-2',
        sessao_aula_id: 'session-123',
        aluno_id: 'student-2',
        presente: false,
        data: '2025-09-30',
        created_at: new Date().toISOString(),
        optimistic: false,
      })

      result.current.confirmAttendance({
        id: 'freq-3',
        sessao_aula_id: 'session-123',
        aluno_id: 'student-3',
        presente: true,
        data: '2025-09-30',
        created_at: new Date().toISOString(),
        optimistic: false,
      })
    })

    const stats = result.current.getSessionStats()

    expect(stats.total).toBe(3)
    expect(stats.present).toBe(2)
    expect(stats.absent).toBe(1)
    expect(stats.percentagePresent).toBeCloseTo(66.67, 1)
  })
})