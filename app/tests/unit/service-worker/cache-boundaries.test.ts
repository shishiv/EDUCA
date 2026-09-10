// @vitest-environment node
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8')
type WorkerRequest = Pick<Request, 'method' | 'mode' | 'url' | 'clone'>
interface WorkerEvent {
  data?: { type?: string }
  request?: WorkerRequest
  respondWith?: (response: Promise<Response>) => void
  waitUntil?: (work: Promise<void>) => void
}

function createWorker(fetchResponse: () => Promise<Response>) {
  const listeners = new Map<string, (event: WorkerEvent) => void>()
  const cached = new Map<string, Response>()
  const reads: string[] = []
  const writes: string[] = []
  const precached: string[] = []
  const skipWaiting = vi.fn(async () => undefined)
  const indexedDB = { open: vi.fn(() => { throw new Error('Unexpected offline write') }) }
  runInNewContext(source, {
    Request, Response, URL, console, fetch: fetchResponse, indexedDB,
    self: {
      location: { origin: 'https://educa.synthetic.invalid' },
      addEventListener: (name: string, listener: (event: WorkerEvent) => void) => listeners.set(name, listener),
      skipWaiting,
      clients: { claim: async () => undefined },
    },
    caches: {
      match: async (request: string | WorkerRequest) => {
        const key = request instanceof Object ? request.url : request
        reads.push(key)
        return cached.get(key)
      },
      open: async () => ({
        addAll: async (paths: string[]) => { precached.push(...paths) },
        put: async (request: WorkerRequest, response: Response) => {
          writes.push(request.url)
          cached.set(request.url, response)
        },
      }),
    },
  })

  function listener(name: string) {
    const handler = listeners.get(name)
    if (!handler) throw new Error(`Missing service worker handler: ${name}`)
    return handler
  }

  async function fetchRequest(path: string, method = 'GET', mode: RequestMode = 'cors') {
    const request = new Request(new URL(path, 'https://educa.synthetic.invalid'), { method })
    const eventRequest: WorkerRequest = { url: request.url, method, mode, clone: () => request.clone() }
    let response: Promise<Response> | undefined
    listener('fetch')({ request: eventRequest, respondWith: result => { response = result } })
    if (!response) throw new Error('Request was not handled')
    return response
  }

  async function install() {
    let work: Promise<void> | undefined
    listener('install')({ waitUntil: result => { work = result } })
    if (!work) throw new Error('Install work was not registered')
    await work
  }
  function message(data: WorkerEvent['data']) {
    listener('message')({ data })
  }
  return { cached, reads, writes, precached, indexedDB, fetchRequest, install, message, skipWaiting }
}

describe('service worker data boundaries', () => {
  it('precaches only the public offline page', async () => {
    const worker = createWorker(async () => new Response('online'))
    await worker.install()
    expect(worker.precached).toEqual(['/offline'])
  })

  it('waits for the explicit update message before activating a replacement worker', async () => {
    const worker = createWorker(async () => new Response('online'))
    await worker.install()
    expect(worker.skipWaiting).not.toHaveBeenCalled()

    worker.message({ type: 'SKIP_WAITING' })
    expect(worker.skipWaiting).toHaveBeenCalledOnce()
  })

  it.each([403, 409, 500])('preserves server rejection %i without queueing or claiming offline success', async status => {
    const worker = createWorker(async () => Response.json({ success: false, error: 'DENIED' }, { status }))
    const response = await worker.fetchRequest('/api/sessoes/aula/session-a/frequencia/batch', 'POST')
    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({ success: false, error: 'DENIED' })
    expect(worker.indexedDB.open).not.toHaveBeenCalled()
  })

  it('does not erase pending offline entries after an unrelated successful online write', async () => {
    const worker = createWorker(async () => Response.json({ success: true }))
    expect((await worker.fetchRequest('/api/sessoes/aula/session-a/frequencia/batch', 'POST')).status).toBe(200)
    expect(worker.indexedDB.open).not.toHaveBeenCalled()
  })

  it.each(['/dashboard', '/dashboard/alunos', '/api/alunos', '/api/turmas', 'https://outside.invalid/_next/static/chunk.js'])(
    'never caches authenticated pages, API data or another origin: %s', async path => {
      const worker = createWorker(async () => new Response('current response'))
      await worker.fetchRequest(path)
      expect(worker.reads).toEqual([])
      expect(worker.writes).toEqual([])
    },
  )

  it('caches only the current origin static asset', async () => {
    const worker = createWorker(async () => new Response('static asset'))
    await worker.fetchRequest('/_next/static/chunk.js')
    expect(worker.writes).toEqual(['https://educa.synthetic.invalid/_next/static/chunk.js'])
  })

  it('does not serve a cached authenticated page when the browser is offline', async () => {
    const worker = createWorker(async () => { throw new TypeError('Failed to fetch') })
    worker.cached.set('https://educa.synthetic.invalid/dashboard', new Response('previous user data'))
    worker.cached.set('/offline', new Response('public offline page'))
    const response = await worker.fetchRequest('/dashboard', 'GET', 'navigate')
    expect(await response.text()).toBe('public offline page')
    expect(worker.reads).toEqual(['/offline'])
  })

  it('returns a 503 fallback when no offline page has been cached', async () => {
    const worker = createWorker(async () => { throw new TypeError('Failed to fetch') })
    const response = await worker.fetchRequest('/dashboard', 'GET', 'navigate')
    expect(response.status).toBe(503)
    expect(await response.text()).toContain('Sem conexão')
  })
})
