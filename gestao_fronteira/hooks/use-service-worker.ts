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

import { useEffect, useState } from 'react'
import { logger } from '@/lib/logger'

interface ServiceWorkerState {
  isInstalled: boolean
  isOnline: boolean
  needsUpdate: boolean
  registration: ServiceWorkerRegistration | null
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isInstalled: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    needsUpdate: false,
    registration: null
  })

  // Register service worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    let registration: ServiceWorkerRegistration | null = null

    const registerSW = async () => {
      try {
        logger.info('[SW Hook] Registering service worker...')

        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })

        logger.info('[SW Hook] Service worker registered successfully')

        setState(prev => ({
          ...prev,
          isInstalled: true,
          registration
        }))

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration!.installing

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                logger.info('[SW Hook] New service worker available')
                setState(prev => ({ ...prev, needsUpdate: true }))
              }
            })
          }
        })

        // Listen for controller changes
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          logger.info('[SW Hook] Service worker controller changed')
          window.location.reload()
        })

      } catch (error) {
        logger.error('[SW Hook] Service worker registration failed:', error as Error)
      }
    }

    registerSW()

    // Cleanup
    return () => {
      registration?.unregister()
    }
  }, [])

  // Monitor online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      logger.info('[SW Hook] Back online')
      setState(prev => ({ ...prev, isOnline: true }))

      // Trigger background sync for offline attendance
      if (state.registration && 'sync' in state.registration) {
        // SyncManager is part of Background Sync API - use unknown cast for compatibility
        const syncManager = (state.registration as ServiceWorkerRegistration & { sync: unknown }).sync as {
          register(tag: string): Promise<void>
        }
        syncManager.register('attendance-sync').catch((err: unknown) => {
          logger.error('[SW Hook] Background sync registration failed:', err instanceof Error ? err : new Error(String(err)))
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
  const update = async () => {
    if (!state.registration) return

    try {
      await state.registration.update()
      logger.info('[SW Hook] Service worker update triggered')
    } catch (error) {
      logger.error('[SW Hook] Service worker update failed:', error as Error)
    }
  }

  // Skip waiting and activate new service worker
  const activateUpdate = () => {
    if (!state.registration) return

    const waiting = state.registration.waiting

    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' })
      setState(prev => ({ ...prev, needsUpdate: false }))
    }
  }

  // Clear all caches
  const clearCache = async () => {
    if (!state.registration) return

    try {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
      logger.info('[SW Hook] All caches cleared')

      // Notify service worker
      if (state.registration.active) {
        state.registration.active.postMessage({ type: 'CLEAR_CACHE' })
      }
    } catch (error) {
      logger.error('[SW Hook] Failed to clear caches:', error as Error)
    }
  }

  // Get offline attendance count from IndexedDB
  const getOfflineCount = async (): Promise<number> => {
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
  }

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
