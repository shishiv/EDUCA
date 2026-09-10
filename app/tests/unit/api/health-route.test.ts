/**
 * Unit tests: public liveness and operator diagnostic health endpoints.
 *
 * Guards issue #34: unauthenticated GET /api/health must expose only
 * `{ status, timestamp }` - no version, environment, metrics, timings,
 * dependency details, or internal error text. The diagnostic report at
 * GET /api/health/detail is the only surface for full detail and is gated
 * by the established admin session policy.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { createHealthChecks } from '@/lib/health/health-checks'
import { createHealthRouteHandlers } from '@/lib/health/health-route-handlers'

const createClient = vi.fn<() => Promise<SupabaseClient<Database>>>()
const authorize = vi.fn<typeof requirePilotActor>()
const checks = createHealthChecks(createClient)
const { GET: publicGET, HEAD: publicHEAD, detailGET } = createHealthRouteHandlers(checks, authorize)

type QueryResult = {
  data: never[] | null
  error: { message: string } | null
  count?: number
}

function fakeSupabase(result: QueryResult) {
  return createSupabaseClient<Database>('http://127.0.0.1:54321', 'synthetic-anon', {
    auth: {
      persistSession: false, autoRefreshToken: false,
      detectSessionInUrl: false, storageKey: crypto.randomUUID(),
    },
    global: {
      fetch: async () => result.error
        ? Response.json(result.error, { status: 403 })
        : Response.json(result.data, { headers: { 'content-range': `0-6/${result.count ?? 0}` } }),
    },
  })
}

const healthyResult: QueryResult = { data: [], error: null, count: 7 }
const failingResult: QueryResult = {
  data: null,
  error: { message: 'permission denied for table escolas' },
}

const adminActor = {
  id: 'operator-1',
  name: 'Admin de Teste',
  role: 'admin' as const,
  schoolId: null,
  email: 'admin@synthetic.invalid',
}

describe('public GET /api/health (liveness)', () => {
  beforeEach(() => {
    createClient.mockReset()
  })

  it('returns only status and timestamp when healthy', async () => {
    createClient.mockResolvedValue(fakeSupabase(healthyResult))

    const res = await publicGET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toEqual({ status: 'healthy', timestamp: expect.any(String) })

    for (const secretKey of ['responseTime', 'checks', 'metrics', 'version', 'environment', 'error']) {
      expect(body).not.toHaveProperty(secretKey)
    }
  })

  it('returns a stable unhealthy body with no internal error text', async () => {
    createClient.mockResolvedValue(fakeSupabase(failingResult))

    const res = await publicGET()
    expect(res.status).toBe(503)

    const body = await res.json()
    expect(body.status).toBe('unhealthy')
    expect(body).not.toHaveProperty('error')
    expect(body).not.toHaveProperty('checks')
    expect(JSON.stringify(body)).not.toContain('permission denied')
  })

  it('redacts raw exceptions and never leaks env, version, or metrics', async () => {
    createClient.mockRejectedValue(new Error('boom: connection refused'))

    const res = await publicGET()
    expect(res.status).toBe(503)

    const body = await res.json()
    expect(body).toEqual({ status: 'unhealthy', timestamp: expect.any(String) })
    expect(JSON.stringify(body)).not.toContain('boom')
    expect(JSON.stringify(body)).not.toContain('NODE_ENV')
  })
})

describe('HEAD /api/health (unchanged contract)', () => {
  beforeEach(() => {
    createClient.mockReset()
  })

  it('returns 200 when the database answers', async () => {
    createClient.mockResolvedValue(fakeSupabase(healthyResult))

    const res = await publicHEAD()
    expect(res.status).toBe(200)
  })

  it('returns 503 when the database errors or throws', async () => {
    createClient.mockResolvedValue(fakeSupabase(failingResult))
    expect((await publicHEAD()).status).toBe(503)

    createClient.mockRejectedValue(new Error('unreachable'))
    expect((await publicHEAD()).status).toBe(503)
  })
})

describe('diagnostic GET /api/health/detail (operator gated)', () => {
  beforeEach(() => {
    createClient.mockReset()
    authorize.mockReset()
  })

  it('denies unauthenticated callers with 401 and no report detail', async () => {
    authorize.mockRejectedValue(new Error('PILOT_AUTH_REQUIRED'))

    const res = await detailGET()
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.error).toBe('PILOT_AUTH_REQUIRED')
    expect(body).not.toHaveProperty('checks')
    expect(body).not.toHaveProperty('metrics')
  })

  it('denies non-admin sessions with 403', async () => {
    authorize.mockRejectedValue(new Error('PILOT_ROLE_DENIED'))

    const res = await detailGET()
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('PILOT_ROLE_DENIED')
  })

  it('returns the full report to an authenticated admin', async () => {
    authorize.mockResolvedValue(adminActor)
    createClient.mockResolvedValue(fakeSupabase(healthyResult))

    const res = await detailGET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.status).toBe('healthy')
    expect(body.timestamp).toEqual(expect.any(String))
    expect(body.responseTime).toEqual(expect.any(String))
    expect(body.checks).toHaveLength(2)
    expect(body.checks[0]).toMatchObject({ name: 'database', status: 'healthy' })
    expect(body.checks[1]).toMatchObject({ name: 'compliance_metrics', status: 'healthy' })
    expect(body.metrics).toEqual({
      totalStudents: 7,
      activeTeachers: 7,
      openSessionsToday: 7,
    })
    expect(body.version).toEqual(expect.any(String))
    expect(body.environment).toEqual(expect.any(String))
  })

  it('surfaces check-level failure detail only to the authenticated operator', async () => {
    authorize.mockResolvedValue(adminActor)
    createClient.mockResolvedValue(fakeSupabase(failingResult))

    const res = await detailGET()
    expect(res.status).toBe(503)

    const body = await res.json()
    expect(body.status).toBe('unhealthy')
    expect(body.checks[0].error).toBe('permission denied for table escolas')
  })
})
