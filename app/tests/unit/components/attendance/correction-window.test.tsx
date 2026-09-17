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
    expect(getSessionLockInfo('2026-09-07', 'ABERTA', DEADLINE, NOW, '2026-09-07T21:00:00Z')).toMatchObject({ canEdit: true })
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

describe('captured ordinary attendance deadline', () => {
  it('uses the persisted cutoff, including a school policy after 18h', () => {
    const time = new Date('2026-09-08T19:00:00-03:00')
    const cutoff = '2026-09-08T20:15:00-03:00'
    expect(getSessionLockInfo('2026-09-08', 'ABERTA', null, time, cutoff)).toMatchObject({
      canEdit: true, timeUntilLockMinutes: 75,
    })
    expect(getSessionLockInfo('2026-09-08', 'ABERTA', null, new Date(cutoff), cutoff)).toMatchObject({
      canEdit: false, lockReason: 'time_cutoff', timeUntilLockMinutes: 0,
    })
  })

  it('leaves legacy sessions without a deadline to the database date contract', () => {
    expect(getSessionLockInfo('2026-09-08', 'ABERTA', null, new Date('2026-09-08T19:00:00-03:00'))).toMatchObject({
      canEdit: true, timeUntilLockMinutes: null,
    })
    expect(getSessionLockInfo('2026-09-07', 'ABERTA', null, NOW)).toMatchObject({ canEdit: false, lockReason: 'past_date' })
    expect(getSessionLockInfo('2026-09-08', 'ABERTA', null, NOW, 'invalid')).toMatchObject({ canEdit: false })
  })

  it('refreshes the ordinary deadline in a mounted view at exact expiry', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const { result } = renderHook(() => useSessionLockInfo('2026-09-08', 'ABERTA', null, DEADLINE))
    expect(result.current.canEdit).toBe(true)
    act(() => vi.advanceTimersByTime(10000))
    expect(result.current).toMatchObject({ canEdit: false, lockReason: 'time_cutoff' })
  })
})
