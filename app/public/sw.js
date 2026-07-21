// Service Worker for Educational Management System
// Focused on offline attendance marking capability

const CACHE_NAME = 'educa-v2'
const OFFLINE_PAGE = '/offline'

// Critical educational data patterns to cache
const CACHE_PATTERNS = [
  // Core app shell
  '/',
  '/dashboard',
  '/diario/frequencia',
  '/offline',

  // Static assets
  '/_next/static/',
  '/favicon.ico',

  // API patterns for educational data
  '/api/alunos',
  '/api/turmas',
  '/api/escolas',
  '/api/frequencia'
]

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker for educational system')

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching critical educational resources')
        return cache.addAll([
          '/',
          '/dashboard',
          '/diario/frequencia',
          '/offline'
        ])
      })
      .then(() => {
        console.log('[SW] Educational app shell cached successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[SW] Failed to cache educational resources:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker for educational system')

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Service worker activated for educational system')
        return self.clients.claim()
      })
  )
})

// Fetch event - handle offline attendance requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle attendance API requests with offline capability
  if (url.pathname.includes('/api/frequencia') && request.method === 'POST') {
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
    console.log('[SW] Attempting to submit attendance online')
    const response = await fetch(request.clone())

    if (response.ok) {
      console.log('[SW] Attendance submitted successfully online')
      // Clear any stored offline attendance data
      await clearOfflineAttendance()
      return response
    }

    throw new Error('Network request failed')

  } catch (error) {
    console.log('[SW] Network failed, storing attendance offline')
    return await storeAttendanceOffline(request)
  }
}

// Store attendance data for offline sync
async function storeAttendanceOffline(request) {
  try {
    const attendanceData = await request.json()
    const timestamp = new Date().toISOString()

    // Add metadata for offline tracking
    const offlineEntry = {
      ...attendanceData,
      _offline: true,
      _timestamp: timestamp,
      _id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Store in IndexedDB for persistence
    await storeInIndexedDB('offline-attendance', offlineEntry)

    console.log('[SW] Attendance stored offline successfully')

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
    // Try network first for fresh content
    const response = await fetch(request)

    if (response.ok) {
      // Cache successful navigation responses
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }

    return response

  } catch (error) {
    console.log('[SW] Navigation offline, serving from cache')

    // Try to serve from cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Serve offline page for educational users
    return caches.match('/offline') || new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Sistema Offline - Gestão Educacional</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline-message { max-width: 400px; margin: 0 auto; }
            .icon { font-size: 64px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <div class="icon">📚</div>
            <h1>Sistema Educacional Offline</h1>
            <p>Você está offline, mas ainda pode marcar frequência.</p>
            <p>Os dados serão sincronizados quando a conexão for restabelecida.</p>
            <button onclick="window.location.reload()">Tentar Novamente</button>
          </div>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}

// Handle cached requests with cache-first strategy
async function handleCachedRequest(request) {
  try {
    const cachedResponse = await caches.match(request)

    if (cachedResponse) {
      console.log('[SW] Serving educational data from cache')
      return cachedResponse
    }

    console.log('[SW] Fetching and caching educational data')
    const response = await fetch(request)

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }

    return response

  } catch (error) {
    console.log('[SW] Failed to fetch educational data:', error)
    throw error
  }
}

// Check if request should be cached
function shouldCache(request) {
  const url = new URL(request.url)

  return CACHE_PATTERNS.some(pattern =>
    url.pathname.startsWith(pattern) ||
    url.pathname.includes(pattern)
  )
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

// Clear offline attendance after successful sync
async function clearOfflineAttendance() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GestaoEducacional', 1)

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['offline-attendance'], 'readwrite')
      const store = transaction.objectStore('offline-attendance')

      const clearRequest = store.clear()
      clearRequest.onsuccess = () => {
        console.log('[SW] Offline attendance data cleared')
        resolve()
      }
      clearRequest.onerror = () => reject(clearRequest.error)
    }

    request.onerror = () => reject(request.error)
  })
}

// Background sync for offline attendance when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'attendance-sync') {
    console.log('[SW] Background sync triggered for attendance')
    event.waitUntil(syncOfflineAttendance())
  }
})

// Sync offline attendance data
async function syncOfflineAttendance() {
  try {
    console.log('[SW] Starting offline attendance sync')

    // Retrieve offline attendance data
    const offlineData = await getOfflineAttendance()

    for (const attendanceRecord of offlineData) {
      try {
        // Remove offline metadata before sending
        const { _offline, _timestamp, _id, ...cleanData } = attendanceRecord

        const response = await fetch('/api/frequencia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanData)
        })

        if (response.ok) {
          console.log('[SW] Successfully synced offline attendance record')
          // Remove synced record from offline storage
          await removeOfflineRecord(_id)
        }

      } catch (error) {
        console.error('[SW] Failed to sync attendance record:', error)
      }
    }

    console.log('[SW] Offline attendance sync completed')

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