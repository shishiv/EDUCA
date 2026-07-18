/**
 * AttendanceGrid Shared Types
 * Extracted from AttendanceGrid.tsx (Phase 15-07)
 *
 * Contains type definitions shared between AttendanceGrid and its subcomponents:
 * - AttendanceGridHeader
 * - AttendanceGridRow
 * - AttendanceGridSummary
 */

import type { AttendanceStatus } from './AttendanceCell'

// ============================================================================
// Student Types
// ============================================================================

export interface Student {
  id: string
  nome_completo: string
  data_nascimento: string
  foto_url?: string
  matriculas: Array<{
    id: string
    turma_id: string
    situacao: string
  }>
}

// ============================================================================
// Attendance Types
// ============================================================================

export interface AttendanceRecord {
  id?: string
  aluno_id: string
  presente: boolean
  status_presenca?: AttendanceStatus
  observacoes?: string
  horario_marcacao: string
  is_locked?: boolean
  created_by?: string
  updated_by?: string
}

/**
 * Attendance statistics for the grid header
 * Used by AttendanceGridHeader and AttendanceGridSummary
 */
export interface AttendanceStats {
  /** Total number of students */
  total: number
  /** Number of students marked present */
  present: number
  /** Number of students marked absent */
  absent: number
  /** Number of students with excused absence (attestado) */
  attestado: number
  /** Number of students not yet marked */
  pending: number
  /** Number of locked records */
  locked: number
  /** Attendance rate: (present + attestado) / marked * 100 */
  attendanceRate: number
}

// ============================================================================
// Lock Types
// ============================================================================

/**
 * Session lock information for UI display
 * Task 1.3.2: Lock indicator implementation
 */
export interface SessionLockInfo {
  isLocked: boolean
  lockReason: 'time_18h' | 'session_closed' | 'past_date' | null
  canEdit: boolean
  message: string
  timeUntilLockMinutes: number | null
}

// ============================================================================
// Props Types
// ============================================================================

export interface AttendanceGridProps {
  /** Session ID for the attendance */
  sessionId: string
  /** Class/turma ID */
  turmaId: string
  /** Session date in ISO format (YYYY-MM-DD) for lock calculation */
  sessionDate?: string
  /** Session status (PLANEJADA, ABERTA, FECHADA, CANCELADA) */
  sessionStatus?: 'PLANEJADA' | 'ABERTA' | 'FECHADA' | 'CANCELADA'
  /** Whether the grid is readonly (locked session) */
  readonly?: boolean
  /** Show student photos */
  showPhotos?: boolean
  /** Callback when attendance statistics change */
  onAttendanceChange?: (stats: AttendanceStats) => void
}

// Re-export AttendanceStatus for convenience
export type { AttendanceStatus } from './AttendanceCell'
