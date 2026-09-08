import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { getSessionLockInfo, useSessionLockInfo } from '@/components/attendance/AttendanceGridUtils'

const NOW = new Date('2026-09-08T15:00:00.000Z')
const DEADLINE = '2026-09-08T15:00:10.000Z'

afterEach(() => { cleanup(); vi.useRealTimers() })

describe('captured attendance correction window', () => {
  it('allows a historical date inside the window and locks at the exact deadline', () => {
    expect(getSessionLockInfo('2026-09-07', 'ABERTA', DEADLINE, NOW)).toMatchObject({ canEdit: true, isLocked: false })
    expect(getSessionLockInfo('2026-09-08', 'ABERTA', DEADLINE, new Date(DEADLINE))).toMatchObject({ canEdit: false, lockReason: 'correction_expired' })
  })

  it('keeps closed states and invalid deadlines locked', () => {
    expect(getSessionLockInfo('2026-09-07', 'FECHADA', DEADLINE, NOW)).toMatchObject({ canEdit: false, lockReason: 'session_closed' })
    expect(getSessionLockInfo('2026-09-07', 'CANCELADA', DEADLINE, NOW)).toMatchObject({ canEdit: false })
    expect(getSessionLockInfo('2026-09-08', 'ABERTA', 'invalid', NOW)).toMatchObject({ canEdit: false })
    expect(getSessionLockInfo('2026-09-07', 'ABERTA', null, NOW)).toMatchObject({ canEdit: false, lockReason: 'past_date' })
  })

  it('updates an already mounted view on expiry without a reload', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const { result } = renderHook(() => useSessionLockInfo('2026-09-07', 'ABERTA', DEADLINE))
    expect(result.current.canEdit).toBe(true)
    act(() => vi.advanceTimersByTime(10000))
    expect(result.current).toMatchObject({ canEdit: false, lockReason: 'correction_expired' })
  })

  it('replaces the scheduled deadline when another session is selected', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const { result, rerender } = renderHook(({ deadline }) => useSessionLockInfo('2026-09-07', 'ABERTA', deadline), { initialProps: { deadline: DEADLINE } })
    rerender({ deadline: '2026-09-08T15:00:20.000Z' })
    act(() => vi.advanceTimersByTime(10000))
    expect(result.current.canEdit).toBe(true)
    act(() => vi.advanceTimersByTime(10000))
    expect(result.current.canEdit).toBe(false)
  })
})
