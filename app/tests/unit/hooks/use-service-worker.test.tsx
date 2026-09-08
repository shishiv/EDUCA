import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { type ServiceWorkerRuntime, useServiceWorker } from '@/hooks/use-service-worker'

class FakeWorker {
  state = 'installing'
  readonly messages: Array<{ type: 'SKIP_WAITING' }> = []
  private readonly stateListeners = new Set<() => void>()

  onStateChange(listener: () => void) {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  postMessage(message: { type: 'SKIP_WAITING' }) {
    this.messages.push(message)
  }

  setState(state: string) {
    this.state = state
    for (const listener of this.stateListeners) listener()
  }
}

class FakeRegistration {
  installing: FakeWorker | null = null
  waiting: FakeWorker | null = null
  readonly update = vi.fn(async () => undefined)
  private readonly updateListeners = new Set<() => void>()

  getInstalling() {
    return this.installing
  }

  getWaiting() {
    return this.waiting
  }

  onUpdateFound(listener: () => void) {
    this.updateListeners.add(listener)
    return () => this.updateListeners.delete(listener)
  }

  registerAttendanceSync() {
    return null
  }

  announceUpdate() {
    for (const listener of this.updateListeners) listener()
  }
}

class FakeServiceWorkerRuntime implements ServiceWorkerRuntime {
  controlled = false
  registration: FakeRegistration | null
  readonly register = vi.fn(async () => this.registration)
  private readonly controllerListeners = new Set<() => void>()

  constructor(registration: FakeRegistration | null) {
    this.registration = registration
  }

  isControlled() {
    return this.controlled
  }

  async whenReady() {
    return undefined
  }

  onControllerChange(listener: () => void) {
    this.controllerListeners.add(listener)
    return () => this.controllerListeners.delete(listener)
  }

  announceControllerChange() {
    this.controlled = true
    for (const listener of this.controllerListeners) listener()
  }

  controllerListenerCount() {
    return this.controllerListeners.size
  }
}

const originalNextPublicPilotMode = process.env.NEXT_PUBLIC_PILOT_MODE
const originalPilotMode = process.env.PILOT_MODE

beforeEach(() => {
  process.env.NEXT_PUBLIC_PILOT_MODE = 'false'
  process.env.PILOT_MODE = 'false'
})

afterEach(() => {
  cleanup()
  process.env.NEXT_PUBLIC_PILOT_MODE = originalNextPublicPilotMode
  process.env.PILOT_MODE = originalPilotMode
})

describe('useServiceWorker lifecycle', () => {
  it('keeps the first controller change in-page and removes lifecycle listeners on unmount', async () => {
    const runtime = new FakeServiceWorkerRuntime(new FakeRegistration())
    const { result, unmount } = renderHook(() => useServiceWorker(runtime))

    await waitFor(() => expect(result.current.isInstalled).toBe(true))
    runtime.announceControllerChange()
    expect(result.current.needsUpdate).toBe(false)

    unmount()
    expect(runtime.controllerListenerCount()).toBe(0)
  })

  it('advertises an update that was already waiting at registration and activates it only through the explicit hook action', async () => {
    const registration = new FakeRegistration()
    const replacement = new FakeWorker()
    registration.waiting = replacement
    const runtime = new FakeServiceWorkerRuntime(registration)
    runtime.controlled = true
    const { result } = renderHook(() => useServiceWorker(runtime))

    await waitFor(() => expect(result.current.isInstalled).toBe(true))
    await waitFor(() => expect(result.current.needsUpdate).toBe(true))

    act(() => result.current.activateUpdate())
    expect(replacement.messages).toEqual([{ type: 'SKIP_WAITING' }])
    expect(result.current.needsUpdate).toBe(false)
  })

  it('treats an unavailable registration as a blocked browser capability', async () => {
    const runtime = new FakeServiceWorkerRuntime(null)
    const { result } = renderHook(() => useServiceWorker(runtime))

    await waitFor(() => expect(runtime.register).toHaveBeenCalledOnce())
    expect(result.current).toMatchObject({ isInstalled: false, registration: null })
  })

  it('does not register again when rerendered with the same runtime', async () => {
    const runtime = new FakeServiceWorkerRuntime(new FakeRegistration())
    const { rerender } = renderHook(({ currentRuntime }) => useServiceWorker(currentRuntime), {
      initialProps: { currentRuntime: runtime },
    })

    await waitFor(() => expect(runtime.register).toHaveBeenCalledOnce())
    rerender({ currentRuntime: runtime })
    expect(runtime.register).toHaveBeenCalledOnce()
  })
})
