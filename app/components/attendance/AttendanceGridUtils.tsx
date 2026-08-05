/**
 * UI adapter for the canonical Attendance session lock projection.
 *
 * Status normalization, São Paulo date handling, and the 18:00 rule belong to
 * the canonical Attendance session module. This adapter keeps the component's
 * existing display type at the UI seam.
 */

import { getCanonicalSessionLockInfo } from '@/lib/services/attendance-module'
import type { SessionLockInfo } from './AttendanceGridTypes'

export function getSessionLockInfo(
  sessionDate?: string,
  sessionStatus?: string
): SessionLockInfo {
  return getCanonicalSessionLockInfo(sessionDate, sessionStatus)
}
