/**
 * Attendance Session Store - Zustand State Management
 *
 * Manages the three-phase attendance workflow with optimistic updates:
 * 1. Planning - Session creation phase
 * 2. Attendance - Active marking phase
 * 3. Completion - Manual session closure
 * 4. Locked - Immutable state (manual or auto-lock at 18:00)
 *
 * Brazilian Compliance: Implements "não existe o esquecer" principle
 * Performance Target: <1s per student marking with optimistic updates
 */

'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Types for session state
export type SessionPhase = 'planning' | 'attendance' | 'completion' | 'locked'
export type SessionStatus = 'PLANEJADA' | 'ABERTA' | 'FECHADA' | 'travada' | 'CANCELADA'
export type LockReason = 'manual_close' | 'auto_lock' | null

export interface AttendanceSession {
  id: string
  turma_id: string
  professor_id: string
  data_aula: string
  status: SessionStatus
  aberta_em: string | null
  fechada_em: string | null
  travada_em: string | null
  auto_fechamento_agendado?: string
  conteudo_programatico?: string
  observacoes?: string
}

export interface AttendanceRecord {
  id?: string // undefined for optimistic records
  sessao_aula_id: string
  aluno_id: string
  presente: boolean
  data: string
  created_at?: string
  optimistic: boolean // true for pending API confirmation
}

export interface SessionStats {
  total: number
  present: number
  absent: number
  percentagePresent: number
}

interface AttendanceSessionState {
  // Core state
  currentPhase: SessionPhase
  sessionId: string | null
  activeSession: AttendanceSession | null
  isLocked: boolean
  lockReason: LockReason
  cutoffTime: Date
  error: string | null

  // Attendance records with optimistic support
  attendanceRecords: AttendanceRecord[]

  // Actions
  setActiveSession: (session: AttendanceSession) => void
  transitionPhase: (phase: SessionPhase) => void
  checkCutoffStatus: () => void
  isEditable: () => boolean
  getLockMessage: () => string

  // Optimistic updates
  optimisticMarkAttendance: (alunoId: string, presente: boolean) => void
  confirmAttendance: (record: AttendanceRecord) => void
  rollbackAttendance: (alunoId: string, errorMessage: string) => void

  // Error handling
  setError: (error: string) => void
  clearError: () => void

  // Lifecycle
  reset: () => void
  getSessionStats: () => SessionStats
}

// Helper: Determine phase from session status
const getPhaseFromSession = (session: AttendanceSession): SessionPhase => {
  if (session.status === 'FECHADA' || session.fechada_em) {
    return 'locked'
  }
  if (session.status === 'travada' || session.travada_em) {
    return 'locked'
  }
  if (session.status === 'ABERTA') {
    return 'attendance'
  }
  if (session.status === 'PLANEJADA') {
    return 'planning'
  }
  return 'planning'
}

// Helper: Determine lock reason from session
const getLockReasonFromSession = (session: AttendanceSession): LockReason => {
  if (session.travada_em) {
    return 'auto_lock'
  }
  if (session.fechada_em) {
    return 'manual_close'
  }
  return null
}

// Helper: Check if session is locked
const isSessionLocked = (session: AttendanceSession): boolean => {
  return !!(
    session.status === 'FECHADA' ||
    session.status === 'travada' ||
    session.fechada_em ||
    session.travada_em
  )
}

// Helper: Get cutoff time for session (18:00 São Paulo time)
const getCutoffTime = (sessionDate: string): Date => {
  const cutoff = new Date(sessionDate)
  cutoff.setHours(18, 0, 0, 0)
  return cutoff
}

// Create the store
export const useAttendanceSessionStore = create<AttendanceSessionState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentPhase: 'planning',
      sessionId: null,
      activeSession: null,
      isLocked: false,
      lockReason: null,
      cutoffTime: new Date(),
      error: null,
      attendanceRecords: [],

      // Set active session and update derived state
      setActiveSession: (session) => {
        const phase = getPhaseFromSession(session)
        const locked = isSessionLocked(session)
        const lockReason = getLockReasonFromSession(session)
        const cutoffTime = getCutoffTime(session.data_aula)

        set(
          {
            activeSession: session,
            sessionId: session.id,
            currentPhase: phase,
            isLocked: locked,
            lockReason,
            cutoffTime,
            error: null,
          },
          false,
          'setActiveSession'
        )
      },

      // Transition between phases with validation
      transitionPhase: (phase) => {
        const { currentPhase, isLocked } = get()

        // Prevent backwards transition from locked state
        if (isLocked && phase !== 'locked') {
          set(
            {
              error:
                'Frequência já finalizada. Não existe o esquecer. (Sessão bloqueada não pode ser editada)',
            },
            false,
            'transitionPhase/blocked'
          )
          return
        }

        // Valid transitions:
        // planning → attendance → completion → locked
        const validTransitions: Record<SessionPhase, SessionPhase[]> = {
          planning: ['attendance'],
          attendance: ['completion', 'locked'],
          completion: ['locked'],
          locked: [], // No transitions from locked
        }

        if (!validTransitions[currentPhase].includes(phase)) {
          set(
            {
              error: `Transição inválida: ${currentPhase} → ${phase}`,
            },
            false,
            'transitionPhase/invalid'
          )
          return
        }

        set(
          {
            currentPhase: phase,
            error: null,
          },
          false,
          'transitionPhase'
        )
      },

      // Check if current time has passed 18:00 cutoff
      checkCutoffStatus: () => {
        const { cutoffTime, activeSession, isLocked } = get()

        if (!activeSession || isLocked) {
          return
        }

        const now = new Date()

        if (now > cutoffTime) {
          // Auto-lock session
          set(
            {
              currentPhase: 'locked',
              isLocked: true,
              lockReason: 'auto_lock',
              error: null,
            },
            false,
            'checkCutoffStatus/autoLocked'
          )
        }
      },

      // Check if session is editable
      isEditable: () => {
        const { isLocked, activeSession } = get()

        if (!activeSession) {
          return false
        }

        if (isLocked) {
          return false
        }

        // Check cutoff time
        const now = new Date()
        const cutoff = getCutoffTime(activeSession.data_aula)

        if (now > cutoff) {
          return false
        }

        return activeSession.status === 'ABERTA'
      },

      // Get lock message for UI display
      getLockMessage: () => {
        const { lockReason, activeSession } = get()

        if (!lockReason || !activeSession) {
          return ''
        }

        if (lockReason === 'auto_lock') {
          return `Sessão bloqueada automaticamente às 18:00 (horário de São Paulo). Documento legal imutável - não existe o esquecer.`
        }

        if (lockReason === 'manual_close') {
          const fechadaEm = activeSession.fechada_em
            ? new Date(activeSession.fechada_em).toLocaleString('pt-BR')
            : 'data desconhecida'

          return `Aula encerrada pelo professor em ${fechadaEm}. Documento oficial - não existe o esquecer.`
        }

        return 'Sessão bloqueada.'
      },

      // Optimistic attendance marking (immediate UI update)
      optimisticMarkAttendance: (alunoId, presente) => {
        const { activeSession, isEditable } = get()

        if (!activeSession) {
          set(
            { error: 'Nenhuma sessão ativa para marcar frequência' },
            false,
            'optimisticMarkAttendance/noSession'
          )
          return
        }

        if (!isEditable()) {
          set(
            { error: 'Frequência já finalizada. Não existe o esquecer.' },
            false,
            'optimisticMarkAttendance/locked'
          )
          return
        }

        // Create optimistic record
        const optimisticRecord: AttendanceRecord = {
          sessao_aula_id: activeSession.id,
          aluno_id: alunoId,
          presente,
          data: activeSession.data_aula,
          optimistic: true,
        }

        // Add or update optimistic record
        set(
          (state) => {
            const filtered = state.attendanceRecords.filter(
              (r) => r.aluno_id !== alunoId
            )

            return {
              attendanceRecords: [...filtered, optimisticRecord],
              error: null,
            }
          },
          false,
          'optimisticMarkAttendance'
        )
      },

      // Confirm attendance record after successful API call
      confirmAttendance: (record) => {
        set(
          (state) => {
            // Remove optimistic record and add confirmed record
            const filtered = state.attendanceRecords.filter(
              (r) => r.aluno_id !== record.aluno_id || !r.optimistic
            )

            return {
              attendanceRecords: [...filtered, { ...record, optimistic: false }],
              error: null,
            }
          },
          false,
          'confirmAttendance'
        )
      },

      // Rollback optimistic update on error
      rollbackAttendance: (alunoId, errorMessage) => {
        set(
          (state) => ({
            attendanceRecords: state.attendanceRecords.filter(
              (r) => !(r.aluno_id === alunoId && r.optimistic)
            ),
            error: errorMessage,
          }),
          false,
          'rollbackAttendance'
        )
      },

      // Error handling
      setError: (error) => {
        set({ error }, false, 'setError')
      },

      clearError: () => {
        set({ error: null }, false, 'clearError')
      },

      // Reset store to initial state
      reset: () => {
        set(
          {
            currentPhase: 'planning',
            sessionId: null,
            activeSession: null,
            isLocked: false,
            lockReason: null,
            cutoffTime: new Date(),
            error: null,
            attendanceRecords: [],
          },
          false,
          'reset'
        )
      },

      // Calculate session statistics
      getSessionStats: () => {
        const { attendanceRecords } = get()

        // Only count confirmed records (non-optimistic)
        const confirmedRecords = attendanceRecords.filter((r) => !r.optimistic)

        const total = confirmedRecords.length
        const present = confirmedRecords.filter((r) => r.presente).length
        const absent = total - present
        const percentagePresent = total > 0 ? (present / total) * 100 : 0

        return {
          total,
          present,
          absent,
          percentagePresent,
        }
      },
    }),
    {
      name: 'attendance-session-store',
    }
  )
)

// Selectors for optimized component subscriptions
export const useCurrentPhase = () =>
  useAttendanceSessionStore((state) => state.currentPhase)

export const useActiveSession = () =>
  useAttendanceSessionStore((state) => state.activeSession)

export const useIsSessionLocked = () =>
  useAttendanceSessionStore((state) => state.isLocked)

export const useAttendanceRecords = () =>
  useAttendanceSessionStore((state) => state.attendanceRecords)

export const useSessionError = () =>
  useAttendanceSessionStore((state) => state.error)

export const useSessionStats = () =>
  useAttendanceSessionStore((state) => state.getSessionStats())