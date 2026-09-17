// Service Worker for Educational Management System
// Focused on offline attendance marking capability

const CACHE_NAME = 'educa-v4'
const OFFLINE_PAGE = '/offline'

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll([OFFLINE_PAGE])
      })
      .catch((error) => {
        console.error('[SW] Failed to cache educational resources:', error)
      })
  )
})

// A replacement worker waits until the user accepts the in-app update prompt.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('educa-') && cacheName !== CACHE_NAME) {
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        return self.clients.claim()
      })
  )
})

// Fetch event - handle offline attendance requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle attendance API requests with offline capability
  if (url.origin === self.location.origin && /^\/api\/sessoes\/aula\/[^/]+\/frequencia\/batch$/.test(url.pathname) && request.method === 'POST') {
    event.respondWith(handleAttendanceRequest(request))
    return
  }

  // Handle navigation requests (pages)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request))
    return
  }

  // Handle other requests with cache-first strategy for educational data
  if (shouldCache(request)) {
    event.respondWith(handleCachedRequest(request))
    return
  }

  // Default: network-first for everything else
  event.respondWith(fetch(request))
})

// Handle attendance marking requests with offline support
async function handleAttendanceRequest(request) {
  try {
    // A server denial (including an expired correction window) stays a denial.
    // Only transport failure can queue this request for a later server decision.
    return await fetch(request.clone())
  } catch {
    return storeAttendanceOffline(request)
  }
}

// Store attendance data for offline sync
async function storeAttendanceOffline(request) {
  try {
    const attendanceData = await request.json()
    const endpoint = new URL(request.url).pathname
    const timestamp = new Date().toISOString()

    // Add metadata for offline tracking
    const offlineEntry = {
      ...attendanceData,
      _endpoint: endpoint,
      _offline: true,
      _timestamp: timestamp,
      _id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Store in IndexedDB for persistence
    await storeInIndexedDB('offline-attendance', offlineEntry)

    // Return a success response to the app
    return new Response(
      JSON.stringify({
        success: true,
        offline: true,
        message: 'Frequência salva offline. Será sincronizada quando a conexão for restabelecida.',
        id: offlineEntry._id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('[SW] Failed to store attendance offline:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Falha ao salvar frequência offline',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handle page navigation with offline support
async function handleNavigationRequest(request) {
  try {
    return await fetch(request)
  } catch {
    // Authenticated pages are never served from a previous user's cache.
    const offlinePage = await caches.match(OFFLINE_PAGE)
    return offlinePage || new Response('Sem conexão. Reconecte-se para acessar o sistema.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}

// Handle cached requests with cache-first strategy
async function handleCachedRequest(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) return cachedResponse

  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(request, response.clone())
  }
  return response
}

// Check if request should be cached
function shouldCache(request) {
  if (request.method !== 'GET') return false
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return false
  return url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/favicon.ico' || url.pathname === OFFLINE_PAGE
}

// IndexedDB operations for offline data
async function storeInIndexedDB(storeName, data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GestaoEducacional', 1)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)

      const addRequest = store.add(data)
      addRequest.onsuccess = () => resolve(addRequest.result)
      addRequest.onerror = () => reject(addRequest.error)
    }

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: '_id' })
      }
    }
  })
}

// Background sync for offline attendance when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'attendance-sync') {
    event.waitUntil(syncOfflineAttendance())
  }
})

// Sync offline attendance data
async function syncOfflineAttendance() {
  try {

    // Retrieve offline attendance data
    const offlineData = await getOfflineAttendance()

    for (const attendanceRecord of offlineData) {
      try {
        // Remove offline metadata before sending
        const { _endpoint, _offline, _timestamp, _id, ...cleanData } = attendanceRecord

        const response = await fetch(_endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanData)
        })

        if (response.ok) {
          // Remove synced record from offline storage
          await removeOfflineRecord(_id)
        }

      } catch (error) {
        console.error('[SW] Failed to sync attendance record:', error)
      }
    }

  } catch (error) {
    console.error('[SW] Failed to sync offline attendance:', error)
  }
}

// Get offline attendance data
async function getOfflineAttendance() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GestaoEducacional', 1)

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['offline-attendance'], 'readonly')
      const store = transaction.objectStore('offline-attendance')

      const getAllRequest = store.getAll()
      getAllRequest.onsuccess = () => resolve(getAllRequest.result)
      getAllRequest.onerror = () => reject(getAllRequest.error)
    }

    request.onerror = () => reject(request.error)
  })
}

// Remove synced offline record
async function removeOfflineRecord(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GestaoEducacional', 1)

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['offline-attendance'], 'readwrite')
      const store = transaction.objectStore('offline-attendance')

      const deleteRequest = store.delete(id)
      deleteRequest.onsuccess = () => resolve()
      deleteRequest.onerror = () => reject(deleteRequest.error)
    }

    request.onerror = () => reject(request.error)
  })
}
