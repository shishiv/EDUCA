/**
 * useServiceWorker Hook - Task 4.6
 *
 * Client-side service worker registration and management
 * Enables offline attendance marking capability
 *
 * Usage:
 * ```tsx
 * const { isOnline, isInstalled, update } = useServiceWorker()
 * ```
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { logger } from '@/lib/logger'
import { isPilotModeEnabled } from '@/lib/pilot/pilot-scope'

interface ServiceWorkerState {
  isInstalled: boolean
  isOnline: boolean
  needsUpdate: boolean
  registration: ManagedServiceWorkerRegistration | null
}

interface ManagedServiceWorker {
  readonly state: string
  onStateChange(listener: () => void): () => void
  postMessage(message: { type: 'SKIP_WAITING' }): void
}

interface ManagedServiceWorkerRegistration {
  getInstalling(): ManagedServiceWorker | null
  getWaiting(): ManagedServiceWorker | null
  onUpdateFound(listener: () => void): () => void
  update(): Promise<void>
  registerAttendanceSync(): Promise<void> | null
}

export interface ServiceWorkerRuntime {
  isControlled(): boolean
  register(): Promise<ManagedServiceWorkerRegistration | null>
  whenReady(): Promise<void>
  onControllerChange(listener: () => void): () => void
}

function createManagedWorker(worker: ServiceWorker): ManagedServiceWorker {
  return {
    get state() {
      return worker.state
    },
    onStateChange(listener) {
      worker.addEventListener('statechange', listener)
      return () => worker.removeEventListener('statechange', listener)
    },
    postMessage(message) {
      worker.postMessage(message)
    },
  }
}

function createManagedRegistration(registration: ServiceWorkerRegistration): ManagedServiceWorkerRegistration {
  return {
    getInstalling: () => registration.installing ? createManagedWorker(registration.installing) : null,
    getWaiting: () => registration.waiting ? createManagedWorker(registration.waiting) : null,
    onUpdateFound(listener) {
      registration.addEventListener('updatefound', listener)
      return () => registration.removeEventListener('updatefound', listener)
    },
    update: async () => {
      await registration.update()
    },
    registerAttendanceSync: () => registration.sync?.register('attendance-sync') ?? null,
  }
}

function createBrowserServiceWorkerRuntime(container: ServiceWorkerContainer): ServiceWorkerRuntime {
  return {
    isControlled: () => container.controller !== null,
    async register() {
      const registration = await container.register('/sw.js', { scope: '/' })
      return registration ? createManagedRegistration(registration) : null
    },
    whenReady: async () => {
      await container.ready
    },
    onControllerChange(listener) {
      container.addEventListener('controllerchange', listener)
      return () => container.removeEventListener('controllerchange', listener)
    },
  }
}

export function useServiceWorker(runtime?: ServiceWorkerRuntime) {
  const hasController = useRef(false)
  const [state, setState] = useState<ServiceWorkerState>({
    isInstalled: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    needsUpdate: false,
    registration: null
  })
  const browserRuntime = useMemo(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
    return createBrowserServiceWorkerRuntime(navigator.serviceWorker)
  }, [])
  const serviceWorkerRuntime = runtime ?? browserRuntime

  // Register service worker
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (isPilotModeEnabled()) {
      Promise.all([
        'serviceWorker' in navigator
          ? navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(registrations.map(item => item.unregister())))
          : Promise.resolve([]),
        'caches' in window
          ? caches.keys().then(names => Promise.all(names.map(name => caches.delete(name))))
          : Promise.resolve([]),
        new Promise<void>(resolve => {
          if (!('indexedDB' in window)) return resolve()
          const deletion = indexedDB.deleteDatabase('GestaoEducacional')
          deletion.onsuccess = () => resolve()
          deletion.onerror = () => resolve()
          deletion.onblocked = () => resolve()
        }),
      ]).then(() => setState(previous => ({ ...previous, isInstalled: false, registration: null })))
      return
    }

    if (!serviceWorkerRuntime) return

    const serviceWorker = serviceWorkerRuntime

    let registration: ManagedServiceWorkerRegistration | null = null
    let removeInstallingStateChange: (() => void) | null = null
    let removeUpdateFound: (() => void) | null = null
    let disposed = false
    if (serviceWorker.isControlled()) {
      hasController.current = true
    }

    const handleInstallingStateChange = () => {
      if (registration?.getInstalling()?.state === 'installed' && serviceWorker.isControlled()) {
        logger.info('[SW Hook] New service worker available')
        setState(prev => ({ ...prev, needsUpdate: true }))
      }
    }

    const handleUpdateFound = () => {
      const newWorker = registration?.getInstalling()
      if (!newWorker) return

      removeInstallingStateChange?.()
      removeInstallingStateChange = newWorker.onStateChange(handleInstallingStateChange)
    }

    const handleControllerChange = () => {
      logger.info('[SW Hook] Service worker controller changed')
      setState(prev => ({ ...prev, needsUpdate: false }))
      if (hasController.current) {
        window.location.reload()
      }
      hasController.current = true
    }

    const removeControllerChange = serviceWorker.onControllerChange(handleControllerChange)
    void serviceWorker.whenReady().then(() => {
      if (!disposed && serviceWorker.isControlled()) {
        hasController.current = true
      }
    })

    const registerSW = async () => {
      try {
        logger.info('[SW Hook] Registering service worker...')

        const nextRegistration = await serviceWorker.register()

        if (disposed) return
        if (!nextRegistration) {
          logger.info('[SW Hook] Service worker registration unavailable in this browser context')
          return
        }

        registration = nextRegistration

        logger.info('[SW Hook] Service worker registered successfully')

        setState(prev => ({
          ...prev,
          isInstalled: true,
          registration
        }))

        removeUpdateFound = registration.onUpdateFound(handleUpdateFound)

        if (registration.getWaiting() && serviceWorker.isControlled()) {
          logger.info('[SW Hook] Existing service worker update available')
          setState(prev => ({ ...prev, needsUpdate: true }))
        }

      } catch (error) {
        logger.error('[SW Hook] Service worker registration failed:', error instanceof Error ? error : new Error(String(error)))
      }
    }

    registerSW()

    // Cleanup
    return () => {
      disposed = true
      removeControllerChange()
      removeUpdateFound?.()
      removeInstallingStateChange?.()
    }
  }, [serviceWorkerRuntime])

  // Monitor online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      logger.info('[SW Hook] Back online')
      setState(prev => ({ ...prev, isOnline: true }))

      // Trigger background sync for offline attendance
      const sync = state.registration?.registerAttendanceSync()
      if (sync) {
        void sync.catch(error => {
          logger.error('[SW Hook] Background sync registration failed:', error instanceof Error ? error : new Error(String(error)))
        })
      }
    }

    const handleOffline = () => {
      logger.info('[SW Hook] Went offline')
      setState(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [state.registration])

  // Update service worker
  const update = useCallback(async () => {
    if (!state.registration) return

    try {
      await state.registration.update()
      logger.info('[SW Hook] Service worker update triggered')
    } catch (error) {
      logger.error('[SW Hook] Service worker update failed:', error instanceof Error ? error : new Error(String(error)))
    }
  }, [state.registration])

  // Skip waiting and activate new service worker
  const activateUpdate = useCallback(() => {
    if (!state.registration) return

    const waiting = state.registration.getWaiting()

    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' })
      setState(prev => ({ ...prev, needsUpdate: false }))
    }
  }, [state.registration])

  // Clear all caches
  const clearCache = useCallback(async () => {
    if (!state.registration) return

    try {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
      logger.info('[SW Hook] All caches cleared')
    } catch (error) {
      logger.error('[SW Hook] Failed to clear caches:', error instanceof Error ? error : new Error(String(error)))
    }
  }, [state.registration])

  // Get offline attendance count from IndexedDB
  const getOfflineCount = useCallback(async (): Promise<number> => {
    if (isPilotModeEnabled()) return 0
    try {
      const db = await openIndexedDB()
      const transaction = db.transaction(['offline-attendance'], 'readonly')
      const store = transaction.objectStore('offline-attendance')
      const countRequest = store.count()

      return new Promise((resolve, reject) => {
        countRequest.onsuccess = () => resolve(countRequest.result)
        countRequest.onerror = () => reject(countRequest.error)
      })
    } catch (error) {
      logger.error('[SW Hook] Failed to get offline count:', error instanceof Error ? error : new Error(String(error)))
      return 0
    }
  }, [])

  return {
    isInstalled: state.isInstalled,
    isOnline: state.isOnline,
    needsUpdate: state.needsUpdate,
    registration: state.registration,
    update,
    activateUpdate,
    clearCache,
    getOfflineCount
  }
}

// Helper: Open IndexedDB
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GestaoEducacional', 1)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('offline-attendance')) {
        db.createObjectStore('offline-attendance', { keyPath: '_id' })
      }
    }
  })
}
