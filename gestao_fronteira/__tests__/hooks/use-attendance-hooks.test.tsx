/**
 * TanStack Query Hooks Tests for Attendance Management
 *
 * Tests cover:
 * - useAttendanceSession: Fetch session with lock status
 * - useMarkAttendance: Optimistic mutation for marking
 * - useCloseSession: Complete session mutation
 * - useSessionLockStatus: Real-time lock status polling
 *
 * Integration with Next.js 15 App Router Server Actions
 * Performance Target: 30s stale time, automatic refetch on window focus
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useAttendanceSession,
  useMarkAttendance,
  useCloseSession,
  useSessionLockStatus,
  useOpenSession,
} from '@/hooks/use-attendance-hooks'

// Mock server actions
jest.mock('@/app/actions/attendance/open-session', () => ({
  openSessionAction: jest.fn(),
}))

jest.mock('@/app/actions/attendance/mark-attendance', () => ({
  markAttendanceAction: jest.fn(),
}))

jest.mock('@/app/actions/attendance/close-session', () => ({
  closeSessionAction: jest.fn(),
}))

jest.mock('@/app/actions/attendance/check-lock-status', () => ({
  checkLockStatusAction: jest.fn(),
}))

import { openSessionAction } from '@/app/actions/attendance/open-session'
import { markAttendanceAction } from '@/app/actions/attendance/mark-attendance'
import { closeSessionAction } from '@/app/actions/attendance/close-session'
import { checkLockStatusAction } from '@/app/actions/attendance/check-lock-status'

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // Disable caching for tests
      },
      mutations: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useAttendanceSession - Fetch Session with Lock Status', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch current session for turma', async () => {
    const mockSession = {
      id: 'session-123',
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
      status: 'ABERTA' as const,
      aberta_em: new Date().toISOString(),
    }

    ;(checkLockStatusAction as jest.Mock).mockResolvedValue({
      success: true,
      session: mockSession,
      isLocked: false,
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useAttendanceSession('turma-456'), {
      wrapper,
    })

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    // Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.session).toEqual(mockSession)
    expect(result.current.data?.isLocked).toBe(false)
  })

  it('should handle no active session scenario', async () => {
    ;(checkLockStatusAction as jest.Mock).mockResolvedValue({
      success: true,
      session: null,
      isLocked: false,
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useAttendanceSession('turma-456'), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.session).toBeNull()
  })

  it('should refetch on window focus (stale time: 30s)', async () => {
    const mockSession = {
      id: 'session-123',
      status: 'ABERTA' as const,
    }

    ;(checkLockStatusAction as jest.Mock).mockResolvedValue({
      success: true,
      session: mockSession,
      isLocked: false,
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useAttendanceSession('turma-456'), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(checkLockStatusAction).toHaveBeenCalledTimes(1)

    // Simulate window focus event
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })

    // Should refetch after focus
    await waitFor(() => {
      expect(checkLockStatusAction).toHaveBeenCalledTimes(2)
    })
  })

  it('should handle error when fetching session', async () => {
    ;(checkLockStatusAction as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    )

    const wrapper = createWrapper()
    const { result } = renderHook(() => useAttendanceSession('turma-456'), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })
})

describe('useOpenSession - Create New Attendance Session', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully open new session', async () => {
    const mockNewSession = {
      id: 'session-new',
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
      status: 'ABERTA' as const,
      aberta_em: new Date().toISOString(),
    }

    ;(openSessionAction as jest.Mock).mockResolvedValue({
      success: true,
      session: mockNewSession,
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useOpenSession(), { wrapper })

    // Execute mutation
    act(() => {
      result.current.mutate({
        turma_id: 'turma-456',
        professor_id: 'prof-789',
        data_aula: '2025-09-30',
      })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.session).toEqual(mockNewSession)
    expect(openSessionAction).toHaveBeenCalledWith({
      turma_id: 'turma-456',
      professor_id: 'prof-789',
      data_aula: '2025-09-30',
    })
  })

  it('should handle error when session already exists', async () => {
    ;(openSessionAction as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Já existe uma aula aberta para esta turma hoje.',
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useOpenSession(), { wrapper })

    act(() => {
      result.current.mutate({
        turma_id: 'turma-456',
        professor_id: 'prof-789',
        data_aula: '2025-09-30',
      })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.success).toBe(false)
    expect(result.current.data?.error).toContain('Já existe uma aula aberta')
  })

  it('should invalidate session queries after successful open', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    ;(openSessionAction as jest.Mock).mockResolvedValue({
      success: true,
      session: { id: 'session-new' },
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useOpenSession(), { wrapper })

    act(() => {
      result.current.mutate({
        turma_id: 'turma-456',
        professor_id: 'prof-789',
        data_aula: '2025-09-30',
      })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Should invalidate attendance-session queries
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['attendance-session'],
    })
  })
})

describe('useMarkAttendance - Optimistic Mutation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should mark attendance with optimistic update', async () => {
    const mockAttendanceRecord = {
      id: 'freq-123',
      sessao_aula_id: 'session-456',
      aluno_id: 'student-789',
      presente: true,
      data: '2025-09-30',
      created_at: new Date().toISOString(),
    }

    ;(markAttendanceAction as jest.Mock).mockResolvedValue({
      success: true,
      record: mockAttendanceRecord,
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useMarkAttendance('session-456'), {
      wrapper,
    })

    // Execute mutation
    act(() => {
      result.current.mutate({
        aluno_id: 'student-789',
        presente: true,
      })
    })

    // Should immediately enter pending state (optimistic)
    expect(result.current.isPending).toBe(true)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.record).toEqual(mockAttendanceRecord)
  })

  it('should rollback optimistic update on error', async () => {
    ;(markAttendanceAction as jest.Mock).mockRejectedValue(
      new Error('Network timeout')
    )

    const wrapper = createWrapper()
    const { result } = renderHook(() => useMarkAttendance('session-456'), {
      wrapper,
    })

    act(() => {
      result.current.mutate({
        aluno_id: 'student-789',
        presente: true,
      })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })

  it('should handle locked session error', async () => {
    ;(markAttendanceAction as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Frequência já finalizada. Não existe o esquecer.',
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useMarkAttendance('session-456'), {
      wrapper,
    })

    act(() => {
      result.current.mutate({
        aluno_id: 'student-789',
        presente: true,
      })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.success).toBe(false)
    expect(result.current.data?.error).toContain('não existe o esquecer')
  })

  it('should achieve <1s marking performance target', async () => {
    const startTime = Date.now()

    ;(markAttendanceAction as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            record: { id: 'freq-123', presente: true },
          })
        }, 500) // 500ms mock network latency
      })
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useMarkAttendance('session-456'), {
      wrapper,
    })

    act(() => {
      result.current.mutate({
        aluno_id: 'student-789',
        presente: true,
      })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const elapsedTime = Date.now() - startTime

    // Should complete in <1s (1000ms) including optimistic update
    expect(elapsedTime).toBeLessThan(1000)
  })
})

describe('useCloseSession - Complete Session Mutation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully close session', async () => {
    const mockClosedSession = {
      id: 'session-456',
      status: 'FECHADA' as const,
      fechada_em: new Date().toISOString(),
    }

    ;(closeSessionAction as jest.Mock).mockResolvedValue({
      success: true,
      session: mockClosedSession,
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useCloseSession(), { wrapper })

    act(() => {
      result.current.mutate({
        session_id: 'session-456',
        observacoes: 'Aula sobre matemática básica',
      })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.session.status).toBe('FECHADA')
    expect(closeSessionAction).toHaveBeenCalledWith({
      session_id: 'session-456',
      observacoes: 'Aula sobre matemática básica',
    })
  })

  it('should handle already closed session error', async () => {
    ;(closeSessionAction as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Aula já encerrada. Documento oficial não pode ser alterado.',
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useCloseSession(), { wrapper })

    act(() => {
      result.current.mutate({
        session_id: 'session-456',
      })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.success).toBe(false)
    expect(result.current.data?.error).toContain('já encerrada')
  })

  it('should invalidate queries after successful close', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    ;(closeSessionAction as jest.Mock).mockResolvedValue({
      success: true,
      session: { id: 'session-456', status: 'FECHADA' },
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useCloseSession(), { wrapper })

    act(() => {
      result.current.mutate({ session_id: 'session-456' })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['attendance-session'],
    })
  })
})

describe('useSessionLockStatus - Real-time Lock Status Polling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should poll lock status with refetchInterval', async () => {
    ;(checkLockStatusAction as jest.Mock).mockResolvedValue({
      success: true,
      isLocked: false,
      session: { id: 'session-456', status: 'ABERTA' },
    })

    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useSessionLockStatus('session-456', 1000),
      { wrapper }
    ) // Poll every 1s

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.isLocked).toBe(false)

    // Wait for next poll cycle
    await waitFor(
      () => {
        expect(checkLockStatusAction).toHaveBeenCalledTimes(2)
      },
      { timeout: 1500 }
    )
  })

  it('should detect lock status change', async () => {
    // First call: unlocked
    ;(checkLockStatusAction as jest.Mock).mockResolvedValueOnce({
      success: true,
      isLocked: false,
    })

    // Second call: locked (simulating 18:00 auto-lock)
    ;(checkLockStatusAction as jest.Mock).mockResolvedValueOnce({
      success: true,
      isLocked: true,
      session: { status: 'travada', travada_em: new Date().toISOString() },
    })

    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useSessionLockStatus('session-456', 500),
      { wrapper }
    )

    // Initial state: unlocked
    await waitFor(() => {
      expect(result.current.data?.isLocked).toBe(false)
    })

    // After refetch: should be locked
    await waitFor(
      () => {
        expect(result.current.data?.isLocked).toBe(true)
      },
      { timeout: 1000 }
    )
  })

  it('should stop polling when session is locked', async () => {
    ;(checkLockStatusAction as jest.Mock).mockResolvedValue({
      success: true,
      isLocked: true,
      session: { status: 'FECHADA' },
    })

    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useSessionLockStatus('session-456', 1000),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.isLocked).toBe(true)

    // Should not poll again after locked
    const callCount = (checkLockStatusAction as jest.Mock).mock.calls.length

    await new Promise((resolve) => setTimeout(resolve, 1500))

    expect((checkLockStatusAction as jest.Mock).mock.calls.length).toBe(
      callCount
    ) // No additional calls
  })
})