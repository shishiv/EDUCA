import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SessionRealtimeManager,
  type SessionRealtimeObserver,
  type SessionRealtimeSource,
  type SessionWatchScope,
} from '@/lib/realtime/session-realtime'

function createStream() {
  const subscriptions: {
    scope: SessionWatchScope
    observer: SessionRealtimeObserver
    closed: boolean
  }[] = []
  const source: SessionRealtimeSource = (scope, observer) => {
    const subscription = { scope, observer, closed: false }
    subscriptions.push(subscription)
    return async () => { subscription.closed = true }
  }
  const observer = { onConnectionStatus: vi.fn(), onSessionLocked: vi.fn() }
  return { subscriptions, observer, manager: new SessionRealtimeManager(source, observer) }
}

const scope = { schoolId: 'school-a', teacherId: 'teacher-a' }
afterEach(() => vi.useRealTimers())

describe('session realtime lifecycle', () => {
  it('only reports connected after the stream acknowledges the subscription', async () => {
    const { manager, observer, subscriptions } = createStream()
    await manager.subscribe(scope)
    expect(observer.onConnectionStatus).toHaveBeenLastCalledWith('disconnected')
    expect(observer.onConnectionStatus).not.toHaveBeenCalledWith('connected')
    subscriptions[0].observer.onConnectionStatus('connected')
    expect(observer.onConnectionStatus).toHaveBeenLastCalledWith('connected')
    await manager.dispose()
  })

  it('closes the old school subscription and ignores events delivered after its replacement', async () => {
    const { manager, observer, subscriptions } = createStream()
    await manager.subscribe(scope)
    await manager.subscribe({ schoolId: 'school-b', teacherId: null })
    expect(subscriptions[0].closed).toBe(true)
    expect(subscriptions[1].scope).toEqual({ schoolId: 'school-b', teacherId: null })

    subscriptions[0].observer.onConnectionStatus('connected')
    subscriptions[0].observer.onSessionLocked('old-session', '2026-09-08T12:00:00Z')
    expect(observer.onSessionLocked).not.toHaveBeenCalled()
    expect(observer.onConnectionStatus).toHaveBeenLastCalledWith('disconnected')
    subscriptions[1].observer.onSessionLocked('new-session', '2026-09-08T13:00:00Z')
    expect(observer.onSessionLocked).toHaveBeenCalledWith('new-session', '2026-09-08T13:00:00Z')
    await manager.dispose()
  })

  it('retries with the same scope and never declares success merely because the timer elapsed', async () => {
    vi.useFakeTimers()
    const { manager, observer, subscriptions } = createStream()
    await manager.subscribe(scope)
    subscriptions[0].observer.onConnectionStatus('error')
    await vi.advanceTimersByTimeAsync(1000)
    expect(subscriptions).toHaveLength(2)
    expect(subscriptions[0].closed).toBe(true)
    expect(subscriptions[1].scope).toEqual(scope)
    expect(observer.onConnectionStatus).not.toHaveBeenCalledWith('connected')
    subscriptions[1].observer.onConnectionStatus('connected')
    await vi.advanceTimersByTimeAsync(30_000)
    expect(subscriptions).toHaveLength(2)
    await manager.dispose()
  })

  it('cancels pending retries and late callbacks on disposal', async () => {
    vi.useFakeTimers()
    const { manager, observer, subscriptions } = createStream()
    await manager.subscribe(scope)
    subscriptions[0].observer.onConnectionStatus('error')
    await manager.dispose()
    subscriptions[0].observer.onConnectionStatus('connected')
    subscriptions[0].observer.onSessionLocked('old-session', '2026-09-08T12:00:00Z')
    await vi.advanceTimersByTimeAsync(30_000)
    expect(subscriptions).toHaveLength(1)
    expect(subscriptions[0].closed).toBe(true)
    expect(observer.onConnectionStatus).not.toHaveBeenCalledWith('connected')
    expect(observer.onSessionLocked).not.toHaveBeenCalled()
  })
})
