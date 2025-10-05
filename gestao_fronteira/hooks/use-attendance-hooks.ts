/**
 * TanStack Query Hooks for Attendance Management
 *
 * Integrates with Next.js 15 App Router Server Actions for:
 * - Fetching current session with lock status
 * - Opening new attendance sessions
 * - Marking attendance with optimistic updates
 * - Closing sessions with validation
 * - Real-time lock status polling
 *
 * Performance: 30s stale time, automatic refetch on window focus
 * Target: <1s per student marking with optimistic updates
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { openSessionAction } from '@/app/actions/attendance/open-session'
import { markAttendanceAction } from '@/app/actions/attendance/mark-attendance'
import { closeSessionAction } from '@/app/actions/attendance/close-session'
import { checkLockStatusAction } from '@/app/actions/attendance/check-lock-status'
import { useAttendanceSessionStore } from '@/lib/stores/attendance-session-store'
import { logger } from '@/lib/logger'

// Query keys for cache management
export const attendanceKeys = {
  all: ['attendance-session'] as const,
  session: (turmaId: string) => ['attendance-session', turmaId] as const,
  lockStatus: (sessionId: string) => ['attendance-lock-status', sessionId] as const,
}

// Types
interface SessionData {
  success: boolean
  session: any | null
  isLocked: boolean
  error?: string
}

interface OpenSessionParams {
  turma_id: string
  professor_id: string
  data_aula: string
  conteudo_programatico?: string
}

interface MarkAttendanceParams {
  aluno_id: string
  presente: boolean
}

interface CloseSessionParams {
  session_id: string
  observacoes?: string
}

/**
 * Fetch current attendance session for a class (turma)
 *
 * Features:
 * - 30s stale time for performance
 * - Automatic refetch on window focus
 * - Integrates with Zustand store for UI state
 */
export function useAttendanceSession(turmaId: string | null) {
  const setActiveSession = useAttendanceSessionStore((state) => state.setActiveSession)

  return useQuery({
    queryKey: attendanceKeys.session(turmaId || ''),
    queryFn: async (): Promise<SessionData> => {
      if (!turmaId) {
        return { success: true, session: null, isLocked: false }
      }

      const result = await checkLockStatusAction(turmaId, new Date().toISOString().split('T')[0])

      // Update Zustand store with session data
      if (result.success && result.session) {
        setActiveSession(result.session)
      }

      return result
    },
    enabled: !!turmaId,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}

/**
 * Open new attendance session
 *
 * Features:
 * - Validates no existing open session for today
 * - Invalidates session queries on success
 * - Returns session with auto_fechamento_agendado (18:00)
 */
export function useOpenSession() {
  const queryClient = useQueryClient()
  const setActiveSession = useAttendanceSessionStore((state) => state.setActiveSession)

  return useMutation({
    mutationFn: async (params: OpenSessionParams) => {
      const result = await openSessionAction(params)
      return result
    },
    onSuccess: (data) => {
      if (data.success && data.session) {
        // Update Zustand store
        setActiveSession(data.session)

        // Invalidate all session queries to refetch
        queryClient.invalidateQueries({
          queryKey: attendanceKeys.all,
        })
      }
    },
    onError: (error) => {
      logger.error('Erro ao abrir sessão:', { error: error })
    },
  })
}

/**
 * Mark student attendance with optimistic updates
 *
 * Features:
 * - Immediate optimistic UI update via Zustand
 * - <1s performance target with background API call
 * - Automatic rollback on error
 * - Validates session is not locked before marking
 */
export function useMarkAttendance(sessionId: string) {
  const queryClient = useQueryClient()
  const {
    optimisticMarkAttendance,
    confirmAttendance,
    rollbackAttendance,
    isEditable,
  } = useAttendanceSessionStore()

  return useMutation({
    mutationFn: async (params: MarkAttendanceParams) => {
      // Check if session is editable before API call
      if (!isEditable()) {
        return {
          success: false,
          error: 'Frequência já finalizada. Não existe o esquecer.',
        }
      }

      const result = await markAttendanceAction({
        sessao_aula_id: sessionId,
        aluno_id: params.aluno_id,
        presente: params.presente,
        data: new Date().toISOString().split('T')[0],
      })

      return result
    },
    onMutate: async (params) => {
      // Optimistic update: immediate UI feedback
      optimisticMarkAttendance(params.aluno_id, params.presente)
    },
    onSuccess: (data, params) => {
      if (data.success && data.record) {
        // Replace optimistic record with confirmed record
        confirmAttendance(data.record)

        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: attendanceKeys.all,
        })
      } else if (!data.success) {
        // Rollback on server-side validation error
        rollbackAttendance(
          params.aluno_id,
          data.error || 'Erro ao marcar frequência'
        )
      }
    },
    onError: (error: Error, params) => {
      // Rollback optimistic update on network error
      rollbackAttendance(params.aluno_id, error.message)
    },
  })
}

/**
 * Close attendance session (manual completion)
 *
 * Features:
 * - Sets status to FECHADA with fechada_em timestamp
 * - Generates legal compliance hash
 * - Makes session immutable (não existe o esquecer)
 * - Invalidates queries to reflect locked state
 */
export function useCloseSession() {
  const queryClient = useQueryClient()
  const { transitionPhase, reset } = useAttendanceSessionStore()

  return useMutation({
    mutationFn: async (params: CloseSessionParams) => {
      const result = await closeSessionAction(params)
      return result
    },
    onSuccess: (data) => {
      if (data.success) {
        // Transition to locked phase
        transitionPhase('locked')

        // Invalidate all session queries
        queryClient.invalidateQueries({
          queryKey: attendanceKeys.all,
        })

        // Reset store after successful close
        // (User will navigate away or start new session)
      }
    },
    onError: (error) => {
      logger.error('Erro ao fechar sessão:', { error: error })
    },
  })
}

/**
 * Real-time lock status polling
 *
 * Features:
 * - Polls server to detect 18:00 auto-lock
 * - Configurable refetch interval (default 60s)
 * - Stops polling when session is locked
 * - Updates Zustand store on lock detection
 */
export function useSessionLockStatus(
  sessionId: string | null,
  refetchInterval: number = 60 * 1000 // 60 seconds default
) {
  const { checkCutoffStatus } = useAttendanceSessionStore()

  return useQuery({
    queryKey: attendanceKeys.lockStatus(sessionId || ''),
    queryFn: async (): Promise<SessionData> => {
      if (!sessionId) {
        return { success: true, session: null, isLocked: false }
      }

      // Check server-side lock status
      const result = await checkLockStatusAction(sessionId)

      // Update local store with cutoff check
      checkCutoffStatus()

      return result
    },
    enabled: !!sessionId,
    refetchInterval: (query) => {
      // Stop polling if session is locked
      const data = query.state.data as SessionData | undefined
      if (data?.isLocked) {
        return false
      }
      return refetchInterval
    },
    staleTime: 0, // Always consider stale for real-time updates
    refetchOnWindowFocus: true,
  })
}

/**
 * Batch mark attendance for multiple students
 *
 * Optimizes network requests by sending multiple attendance records
 * in a single API call. Target: <2s for 30 students.
 */
export function useBatchMarkAttendance(sessionId: string) {
  const queryClient = useQueryClient()
  const { confirmAttendance, rollbackAttendance } = useAttendanceSessionStore()

  return useMutation({
    mutationFn: async (records: MarkAttendanceParams[]) => {
      // This will call a batch server action (to be implemented)
      // For now, we'll call individual actions in parallel
      const promises = records.map((record) =>
        markAttendanceAction({
          sessao_aula_id: sessionId,
          aluno_id: record.aluno_id,
          presente: record.presente,
          data: new Date().toISOString().split('T')[0],
        })
      )

      const results = await Promise.allSettled(promises)
      return results
    },
    onSuccess: (results, records) => {
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          confirmAttendance(result.value.record)
        } else {
          rollbackAttendance(
            records[index].aluno_id,
            result.status === 'rejected'
              ? result.reason.message
              : 'Erro ao marcar frequência'
          )
        }
      })

      queryClient.invalidateQueries({
        queryKey: attendanceKeys.all,
      })
    },
  })
}

/**
 * Custom hook to get current session with all features
 *
 * Combines session fetching, lock status, and actions in a single hook
 * for convenient component usage.
 */
export function useCurrentAttendanceSession(turmaId: string | null) {
  const sessionQuery = useAttendanceSession(turmaId)
  const openMutation = useOpenSession()
  const markMutation = useMarkAttendance(sessionQuery.data?.session?.id || '')
  const closeMutation = useCloseSession()

  const sessionId = sessionQuery.data?.session?.id || null
  const lockStatusQuery = useSessionLockStatus(
    sessionId,
    30 * 1000 // Poll every 30s
  )

  return {
    // Data
    session: sessionQuery.data?.session,
    isLocked: sessionQuery.data?.isLocked || false,

    // Loading states
    isLoading: sessionQuery.isLoading,
    isOpening: openMutation.isPending,
    isMarking: markMutation.isPending,
    isClosing: closeMutation.isPending,

    // Actions
    openSession: openMutation.mutate,
    markAttendance: markMutation.mutate,
    closeSession: closeMutation.mutate,

    // Lock monitoring
    lockStatus: lockStatusQuery.data,

    // Errors
    error:
      sessionQuery.error ||
      openMutation.error ||
      markMutation.error ||
      closeMutation.error,
  }
}