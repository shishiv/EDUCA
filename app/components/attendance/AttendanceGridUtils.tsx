/** UI projection of the canonical attendance lock contract. */
'use client'

import { useEffect, useState } from 'react'
import { getCanonicalSessionLockInfo } from '@/lib/services/attendance-module'
import type { SessionLockInfo } from './AttendanceGridTypes'

export function getSessionLockInfo(
  sessionDate?: string,
  sessionStatus?: string,
  correctionDeadlineAt?: string | null,
  currentTime: Date = new Date()
): SessionLockInfo {
  return getCanonicalSessionLockInfo(sessionDate, sessionStatus, currentTime, correctionDeadlineAt)
}

/** Refresh on the captured deadline, on focus, and across ordinary cutoffs. */
export function useSessionLockInfo(
  sessionDate?: string,
  sessionStatus?: string,
  correctionDeadlineAt?: string | null
): SessionLockInfo {
  const [, setClockTick] = useState(0)
  useEffect(() => {
    const refresh = () => setClockTick(tick => tick + 1)
    const interval = setInterval(refresh, 60000)
    const remaining = correctionDeadlineAt ? Date.parse(correctionDeadlineAt) - Date.now() : 0
    const expiry = remaining > 0 ? setTimeout(refresh, remaining) : undefined
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(interval)
      clearTimeout(expiry)
      window.removeEventListener('focus', refresh)
    }
  }, [sessionDate, sessionStatus, correctionDeadlineAt])
  return getSessionLockInfo(sessionDate, sessionStatus, correctionDeadlineAt)
}
