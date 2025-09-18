'use client'

// Service Worker registration for educational management system
// Provides offline attendance marking capability

let swRegistration: ServiceWorkerRegistration | null = null

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    try {
      // console.log('[SW] Registering service worker for educational system')

      swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      })

      // console.log('[SW] Service worker registered successfully')

      // Handle updates
      swRegistration.addEventListener('updatefound', () => {
        const newWorker = swRegistration?.installing

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              showUpdateNotification()
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'OFFLINE_ATTENDANCE_STORED') {
          showOfflineNotification(event.data.message)
        }
      })

      // Register for background sync if supported
      if ('sync' in window.ServiceWorkerRegistration.prototype) {
        // console.log('[SW] Background sync supported')
      }

      return swRegistration

    } catch (error) {
      // console.error('[SW] Service worker registration failed:', error)
      return null
    }
  }

  return null
}

export async function unregisterServiceWorker() {
  if (swRegistration) {
    try {
      await swRegistration.unregister()
      // console.log('[SW] Service worker unregistered')
      return true
    } catch (error) {
      // console.error('[SW] Service worker unregistration failed:', error)
      return false
    }
  }
  return false
}

// Request background sync for offline attendance
export async function requestAttendanceSync() {
  if (swRegistration && 'sync' in window.ServiceWorkerRegistration.prototype) {
    try {
      await swRegistration.sync.register('attendance-sync')
      // console.log('[SW] Background sync registered for attendance')
      return true
    } catch (error) {
      // console.error('[SW] Background sync registration failed:', error)
      return false
    }
  }
  return false
}

// Check if app is currently offline
export function isOffline(): boolean {
  return !navigator.onLine
}

// Listen for online/offline changes
export function setupOfflineDetection(
  onOnline?: () => void,
  onOffline?: () => void
) {
  const handleOnline = () => {
    // console.log('[SW] Connection restored')
    if (onOnline) onOnline()

    // Trigger sync when back online
    requestAttendanceSync()
  }

  const handleOffline = () => {
    // console.log('[SW] Connection lost')
    if (onOffline) onOffline()
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

// Show notification for app updates
function showUpdateNotification() {
  // You can integrate this with your notification system
  if (window.confirm('Nova versão disponível! Recarregar a página?')) {
    window.location.reload()
  }
}

// Show notification for offline attendance saved
function showOfflineNotification(message: string) {
  // Integration with toast system
  // console.log('[SW] Offline notification:', message)

  // Dispatch custom event for toast notifications
  window.dispatchEvent(new CustomEvent('offline-attendance-saved', {
    detail: { message }
  }))
}

// Get offline attendance count
export async function getOfflineAttendanceCount(): Promise<number> {
  return new Promise((resolve) => {
    if (!('indexedDB' in window)) {
      resolve(0)
      return
    }

    const request = indexedDB.open('GestaoEducacional', 1)

    request.onsuccess = () => {
      const db = request.result

      if (!db.objectStoreNames.contains('offline-attendance')) {
        resolve(0)
        return
      }

      const transaction = db.transaction(['offline-attendance'], 'readonly')
      const store = transaction.objectStore('offline-attendance')
      const countRequest = store.count()

      countRequest.onsuccess = () => {
        resolve(countRequest.result)
      }

      countRequest.onerror = () => {
        resolve(0)
      }
    }

    request.onerror = () => {
      resolve(0)
    }
  })
}

// Clear all offline data (admin function)
export async function clearOfflineData(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!('indexedDB' in window)) {
      resolve(false)
      return
    }

    const request = indexedDB.open('GestaoEducacional', 1)

    request.onsuccess = () => {
      const db = request.result

      if (!db.objectStoreNames.contains('offline-attendance')) {
        resolve(true)
        return
      }

      const transaction = db.transaction(['offline-attendance'], 'readwrite')
      const store = transaction.objectStore('offline-attendance')
      const clearRequest = store.clear()

      clearRequest.onsuccess = () => {
        // console.log('[SW] Offline data cleared successfully')
        resolve(true)
      }

      clearRequest.onerror = () => {
        // console.error('[SW] Failed to clear offline data')
        resolve(false)
      }
    }

    request.onerror = () => {
      resolve(false)
    }
  })
}

// Educational system specific functions
export interface OfflineAttendanceRecord {
  _id: string
  _timestamp: string
  _offline: boolean
  turmaId: string
  data: string
  frequencias: Array<{
    alunoId: string
    presente: boolean
    justificada?: boolean
    observacao?: string
  }>
}

// Get all offline attendance records
export async function getOfflineAttendanceRecords(): Promise<OfflineAttendanceRecord[]> {
  return new Promise((resolve) => {
    if (!('indexedDB' in window)) {
      resolve([])
      return
    }

    const request = indexedDB.open('GestaoEducacional', 1)

    request.onsuccess = () => {
      const db = request.result

      if (!db.objectStoreNames.contains('offline-attendance')) {
        resolve([])
        return
      }

      const transaction = db.transaction(['offline-attendance'], 'readonly')
      const store = transaction.objectStore('offline-attendance')
      const getAllRequest = store.getAll()

      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result)
      }

      getAllRequest.onerror = () => {
        resolve([])
      }
    }

    request.onerror = () => {
      resolve([])
    }
  })
}