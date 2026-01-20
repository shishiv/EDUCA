/**
 * AttendanceGrid Utility Functions
 * Extracted from AttendanceGrid.tsx (Phase 15-07)
 *
 * Contains lock status helper functions for Brazilian educational compliance:
 * - 18:00 Sao Paulo timezone lock
 * - Session status-based locking
 * - Past date immutability
 */

import type { SessionLockInfo } from './AttendanceGridTypes'

/**
 * Check if current time is before 18:00 in Sao Paulo timezone
 */
export function isBefore18hSaoPaulo(): boolean {
  const now = new Date()
  const saoPauloTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false
  }).format(now)
  const currentHour = parseInt(saoPauloTime, 10)
  return currentHour < 18
}

/**
 * Calculate time until 18:00 lock in minutes
 */
export function getTimeUntilLock(): number {
  const now = new Date()
  const saoPauloFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  })
  const parts = saoPauloFormatter.formatToParts(now)
  const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)
  const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)

  const lockHour = 18
  const minutesUntilLock = (lockHour - currentHour) * 60 - currentMinute
  return Math.max(0, minutesUntilLock)
}

/**
 * Format time until lock in human-readable format
 */
export function formatTimeUntilLock(minutes: number): string {
  if (minutes <= 0) return 'Bloqueado'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}min`
}

/**
 * Get the current date in Sao Paulo timezone (YYYY-MM-DD format)
 */
export function getTodaySaoPaulo(): string {
  const now = new Date()
  const saoPauloFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return saoPauloFormatter.format(now)
}

/**
 * Determine session lock status based on time and session state
 * Implements Brazilian educational compliance: "nao existe o esquecer"
 */
export function getSessionLockInfo(
  sessionDate?: string,
  sessionStatus?: string
): SessionLockInfo {
  const today = getTodaySaoPaulo()

  // Session already closed
  if (sessionStatus === 'FECHADA') {
    return {
      isLocked: true,
      lockReason: 'session_closed',
      canEdit: false,
      message: 'Sessao finalizada. Frequencia nao pode ser modificada.',
      timeUntilLockMinutes: null
    }
  }

  // Past date - immutable
  if (sessionDate && sessionDate < today) {
    return {
      isLocked: true,
      lockReason: 'past_date',
      canEdit: false,
      message: 'Data passada. Frequencia bloqueada para garantir integridade dos registros.',
      timeUntilLockMinutes: null
    }
  }

  // Today - check 18:00 lock
  if (sessionDate === today || !sessionDate) {
    const isBefore18h = isBefore18hSaoPaulo()
    const timeUntilLock = getTimeUntilLock()

    if (!isBefore18h) {
      return {
        isLocked: true,
        lockReason: 'time_18h',
        canEdit: false,
        message: 'Frequencia bloqueada apos 18:00. Principio "nao existe o esquecer" da legislacao educacional brasileira.',
        timeUntilLockMinutes: 0
      }
    }

    return {
      isLocked: false,
      lockReason: null,
      canEdit: true,
      message: timeUntilLock <= 60
        ? `Atencao: Bloqueio automatico em ${formatTimeUntilLock(timeUntilLock)}`
        : '',
      timeUntilLockMinutes: timeUntilLock
    }
  }

  // Future date - editable
  return {
    isLocked: false,
    lockReason: null,
    canEdit: true,
    message: '',
    timeUntilLockMinutes: null
  }
}
