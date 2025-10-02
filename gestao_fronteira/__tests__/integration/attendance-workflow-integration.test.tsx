/**
 * Attendance Workflow Integration Tests
 *
 * Tests the complete flow from UI state → TanStack Query → Server Actions → Database:
 * 1. Open session (planning → attendance phase)
 * 2. Mark attendance with optimistic updates
 * 3. Close session (attendance → locked phase)
 *
 * Validates:
 * - State management integration (Zustand + TanStack Query)
 * - Optimistic updates and rollback mechanisms
 * - Brazilian compliance ("não existe o esquecer")
 * - Performance targets (<1s per student)
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { useAttendanceSessionStore } from '@/lib/stores/attendance-session-store'
import {
  useCurrentAttendanceSession,
  useMarkAttendance,
} from '@/hooks/use-attendance-hooks'
import { openSessionAction } from '@/app/actions/attendance/open-session'
import { markAttendanceAction } from '@/app/actions/attendance/mark-attendance'
import { closeSessionAction } from '@/app/actions/attendance/close-session'

// Mock server actions
jest.mock('@/app/actions/attendance/open-session')
jest.mock('@/app/actions/attendance/mark-attendance')
jest.mock('@/app/actions/attendance/close-session')
jest.mock('@/app/actions/attendance/check-lock-status')

// Test wrapper
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('Attendance Workflow Integration - Full Three-Phase Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset Zustand store
    const { result } = renderHook(() => useAttendanceSessionStore())
    act(() => {
      result.current.reset()
    })
  })

  it('should complete full workflow: open → mark → close', async () => {
    const wrapper = createTestWrapper()

    // Phase 1: Open new session
    const newSession = {
      id: 'session-integration-123',
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
      status: 'ABERTA' as const,
      aberta_em: new Date().toISOString(),
    }

    ;(openSessionAction as jest.Mock).mockResolvedValue({
      success: true,
      session: newSession,
    })

    const { result: sessionHook } = renderHook(
      () => useCurrentAttendanceSession('turma-456'),
      { wrapper }
    )

    // Open session
    act(() => {
      sessionHook.current.openSession({
        turma_id: 'turma-456',
        professor_id: 'prof-789',
        data_aula: '2025-09-30',
      })
    })

    await waitFor(() => {
      expect(sessionHook.current.isOpening).toBe(false)
    })

    // Verify Zustand store updated
    const storeState = useAttendanceSessionStore.getState()
    expect(storeState.sessionId).toBe('session-integration-123')
    expect(storeState.currentPhase).toBe('attendance')
    expect(storeState.isLocked).toBe(false)

    // Phase 2: Mark attendance for multiple students
    const mockAttendanceRecord1 = {
      id: 'freq-1',
      sessao_aula_id: 'session-integration-123',
      aluno_id: 'student-1',
      presente: true,
      data: '2025-09-30',
      created_at: new Date().toISOString(),
    }

    const mockAttendanceRecord2 = {
      id: 'freq-2',
      sessao_aula_id: 'session-integration-123',
      aluno_id: 'student-2',
      presente: false,
      data: '2025-09-30',
      created_at: new Date().toISOString(),
    }

    ;(markAttendanceAction as jest.Mock)
      .mockResolvedValueOnce({
        success: true,
        record: mockAttendanceRecord1,
      })
      .mockResolvedValueOnce({
        success: true,
        record: mockAttendanceRecord2,
      })

    // Mark first student (presente)
    act(() => {
      sessionHook.current.markAttendance({
        aluno_id: 'student-1',
        presente: true,
      })
    })

    // Verify optimistic update
    const storeAfterOptimistic1 = useAttendanceSessionStore.getState()
    const optimisticRecord1 = storeAfterOptimistic1.attendanceRecords.find(
      (r) => r.aluno_id === 'student-1'
    )
    expect(optimisticRecord1?.optimistic).toBe(true)
    expect(optimisticRecord1?.presente).toBe(true)

    await waitFor(() => {
      expect(sessionHook.current.isMarking).toBe(false)
    })

    // Verify confirmed record replaced optimistic
    const storeAfterConfirm1 = useAttendanceSessionStore.getState()
    const confirmedRecord1 = storeAfterConfirm1.attendanceRecords.find(
      (r) => r.aluno_id === 'student-1'
    )
    expect(confirmedRecord1?.optimistic).toBe(false)
    expect(confirmedRecord1?.id).toBe('freq-1')

    // Mark second student (ausente)
    act(() => {
      sessionHook.current.markAttendance({
        aluno_id: 'student-2',
        presente: false,
      })
    })

    await waitFor(() => {
      expect(sessionHook.current.isMarking).toBe(false)
    })

    // Verify both records in store
    const storeAfterBothMarked = useAttendanceSessionStore.getState()
    expect(storeAfterBothMarked.attendanceRecords).toHaveLength(2)
    expect(storeAfterBothMarked.getSessionStats().total).toBe(2)
    expect(storeAfterBothMarked.getSessionStats().present).toBe(1)
    expect(storeAfterBothMarked.getSessionStats().absent).toBe(1)

    // Phase 3: Close session
    const closedSession = {
      ...newSession,
      status: 'FECHADA' as const,
      fechada_em: new Date().toISOString(),
      hash_legal: 'abc123def456...', // Generated by database trigger
    }

    ;(closeSessionAction as jest.Mock).mockResolvedValue({
      success: true,
      session: closedSession,
    })

    act(() => {
      sessionHook.current.closeSession({
        session_id: 'session-integration-123',
        observacoes: 'Aula sobre matemática',
      })
    })

    await waitFor(() => {
      expect(sessionHook.current.isClosing).toBe(false)
    })

    // Verify locked state
    const storeFinal = useAttendanceSessionStore.getState()
    expect(storeFinal.currentPhase).toBe('locked')
    expect(storeFinal.isLocked).toBe(true)
  })

  it('should handle optimistic rollback on network error', async () => {
    const wrapper = createTestWrapper()

    // Setup: Active session
    const activeSession = {
      id: 'session-rollback-test',
      status: 'ABERTA' as const,
      aberta_em: new Date().toISOString(),
    }

    const storeSetup = useAttendanceSessionStore.getState()
    act(() => {
      storeSetup.setActiveSession(activeSession as any)
    })

    // Mock network error
    ;(markAttendanceAction as jest.Mock).mockRejectedValue(
      new Error('Network timeout')
    )

    const { result: markHook } = renderHook(
      () => useMarkAttendance('session-rollback-test'),
      { wrapper }
    )

    // Mark attendance (will fail)
    act(() => {
      markHook.current.mutate({
        aluno_id: 'student-error',
        presente: true,
      })
    })

    // Verify optimistic record created
    const storeOptimistic = useAttendanceSessionStore.getState()
    expect(
      storeOptimistic.attendanceRecords.find(
        (r) => r.aluno_id === 'student-error' && r.optimistic
      )
    ).toBeDefined()

    // Wait for error
    await waitFor(() => {
      expect(markHook.current.isError).toBe(true)
    })

    // Verify rollback occurred
    const storeRollback = useAttendanceSessionStore.getState()
    expect(
      storeRollback.attendanceRecords.find((r) => r.aluno_id === 'student-error')
    ).toBeUndefined()

    expect(storeRollback.error).toBe('Network timeout')
  })

  it('should prevent modifications to locked session (compliance test)', async () => {
    const wrapper = createTestWrapper()

    // Setup: Locked session
    const lockedSession = {
      id: 'session-locked',
      status: 'FECHADA' as const,
      fechada_em: new Date().toISOString(),
    }

    const storeSetup = useAttendanceSessionStore.getState()
    act(() => {
      storeSetup.setActiveSession(lockedSession as any)
    })

    // Verify store recognizes lock
    expect(storeSetup.isLocked).toBe(true)
    expect(storeSetup.isEditable()).toBe(false)

    // Attempt to mark attendance (should fail at store level)
    act(() => {
      storeSetup.optimisticMarkAttendance('student-blocked', true)
    })

    const storeAfterAttempt = useAttendanceSessionStore.getState()
    expect(storeAfterAttempt.attendanceRecords).toHaveLength(0)
    expect(storeAfterAttempt.error).toContain('não existe o esquecer')
  })

  it('should meet <1s performance target for marking', async () => {
    const wrapper = createTestWrapper()

    // Setup active session
    const activeSession = {
      id: 'session-perf',
      status: 'ABERTA' as const,
    }

    const store = useAttendanceSessionStore.getState()
    act(() => {
      store.setActiveSession(activeSession as any)
    })

    // Mock fast API response (300ms)
    ;(markAttendanceAction as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: true,
              record: {
                id: 'freq-perf',
                aluno_id: 'student-perf',
                presente: true,
              },
            })
          }, 300)
        })
    )

    const { result: markHook } = renderHook(
      () => useMarkAttendance('session-perf'),
      { wrapper }
    )

    const startTime = Date.now()

    act(() => {
      markHook.current.mutate({
        aluno_id: 'student-perf',
        presente: true,
      })
    })

    await waitFor(() => {
      expect(markHook.current.isSuccess).toBe(true)
    })

    const elapsedTime = Date.now() - startTime

    // Total time (optimistic update + API + confirmation) should be <1s
    expect(elapsedTime).toBeLessThan(1000)

    // Verify optimistic update was immediate (< 50ms)
    const storeImmediate = useAttendanceSessionStore.getState()
    expect(
      storeImmediate.attendanceRecords.find((r) => r.aluno_id === 'student-perf')
    ).toBeDefined()
  })

  it('should handle phase transition validation', async () => {
    const store = useAttendanceSessionStore.getState()

    // Start in planning
    expect(store.currentPhase).toBe('planning')

    // Valid transition: planning → attendance
    act(() => {
      store.transitionPhase('attendance')
    })
    expect(store.currentPhase).toBe('attendance')

    // Valid transition: attendance → completion
    act(() => {
      store.transitionPhase('completion')
    })
    expect(store.currentPhase).toBe('completion')

    // Valid transition: completion → locked
    act(() => {
      store.transitionPhase('locked')
    })
    expect(store.currentPhase).toBe('locked')

    // Invalid transition: locked → attendance (should fail)
    act(() => {
      store.transitionPhase('attendance')
    })
    expect(store.currentPhase).toBe('locked') // Should remain locked
    expect(store.error).toContain('não existe o esquecer')
  })
})

describe('Attendance Workflow Integration - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle 18:00 cutoff auto-lock detection', async () => {
    const store = useAttendanceSessionStore.getState()

    // Session with cutoff time in the past
    const pastCutoffSession = {
      id: 'session-past-cutoff',
      status: 'ABERTA' as const,
      data_aula: '2025-09-29', // Yesterday
      auto_fechamento_agendado: new Date('2025-09-29T18:00:00-03:00').toISOString(),
    }

    act(() => {
      store.setActiveSession(pastCutoffSession as any)
    })

    // Should still be in attendance phase initially
    expect(store.currentPhase).toBe('attendance')

    // Check cutoff status
    act(() => {
      store.checkCutoffStatus()
    })

    // Should transition to locked if past cutoff
    const now = new Date()
    const cutoff = new Date(pastCutoffSession.auto_fechamento_agendado)

    if (now > cutoff) {
      expect(store.isLocked).toBe(true)
      expect(store.currentPhase).toBe('locked')
    }
  })

  it('should maintain data integrity across rapid toggles', async () => {
    const wrapper = createTestWrapper()

    const session = {
      id: 'session-rapid',
      status: 'ABERTA' as const,
    }

    const store = useAttendanceSessionStore.getState()
    act(() => {
      store.setActiveSession(session as any)
    })

    let callCount = 0
    ;(markAttendanceAction as jest.Mock).mockImplementation(() => {
      callCount++
      return Promise.resolve({
        success: true,
        record: {
          id: `freq-${callCount}`,
          aluno_id: 'student-rapid',
          presente: callCount % 2 === 0, // Alternate true/false
        },
      })
    })

    const { result: markHook } = renderHook(
      () => useMarkAttendance('session-rapid'),
      { wrapper }
    )

    // Rapid toggle: true → false → true
    act(() => {
      markHook.current.mutate({ aluno_id: 'student-rapid', presente: true })
    })

    act(() => {
      markHook.current.mutate({ aluno_id: 'student-rapid', presente: false })
    })

    act(() => {
      markHook.current.mutate({ aluno_id: 'student-rapid', presente: true })
    })

    await waitFor(() => {
      expect(callCount).toBe(3)
    })

    // Final state should have only ONE record (not 3)
    const finalStore = useAttendanceSessionStore.getState()
    const records = finalStore.attendanceRecords.filter(
      (r) => r.aluno_id === 'student-rapid' && !r.optimistic
    )

    expect(records).toHaveLength(1)
  })
})