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

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/pilot/pilot-server-auth', () => ({
  requirePilotActor: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    critical: vi.fn(),
  },
}))

import { createClient } from '@/lib/supabase/server'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { GET as publicGET, HEAD as publicHEAD } from '@/app/api/health/route'
import { GET as detailGET } from '@/app/api/health/detail/route'

type QueryResult = {
  data: unknown[] | null
  error: { message: string } | null
  count?: number
}

interface QueryBuilder extends PromiseLike<QueryResult> {
  select: (...args: unknown[]) => QueryBuilder
  limit: (...args: unknown[]) => QueryBuilder
  eq: (...args: unknown[]) => QueryBuilder
  in: (...args: unknown[]) => QueryBuilder
}

/** Chainable fake that resolves every query with the same result. */
function queryChain(result: QueryResult): QueryBuilder {
  const builder: QueryBuilder = {
    select: () => builder,
    limit: () => builder,
    eq: () => builder,
    in: () => builder,
    then: <TResult1 = QueryResult, TResult2 = never>(
      onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null | undefined
    ): PromiseLike<TResult1 | TResult2> =>
      Promise.resolve(onfulfilled ? onfulfilled(result) : (result as TResult1)),
  }
  return builder
}

/** Minimal fake supabase client surface used by the health probes. */
function fakeSupabase(result: QueryResult) {
  return { from: () => queryChain(result) } as unknown as Awaited<ReturnType<typeof createClient>>
}

const healthyResult: QueryResult = { data: [], error: null, count: 7 }
const failingResult: QueryResult = {
  data: null,
  error: { message: 'permission denied for table escolas' },
}

const adminActor = {
  id: 'operator-1',
  role: 'admin' as const,
  schoolId: null,
  email: 'admin@example.com',
}

describe('public GET /api/health (liveness)', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
  })

  it('returns only status and timestamp when healthy', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase(healthyResult))

    const res = await publicGET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toEqual({ status: 'healthy', timestamp: expect.any(String) })

    for (const secretKey of ['responseTime', 'checks', 'metrics', 'version', 'environment', 'error']) {
      expect(body).not.toHaveProperty(secretKey)
    }
  })

  it('returns a stable unhealthy body with no internal error text', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase(failingResult))

    const res = await publicGET()
    expect(res.status).toBe(503)

    const body = await res.json()
    expect(body.status).toBe('unhealthy')
    expect(body).not.toHaveProperty('error')
    expect(body).not.toHaveProperty('checks')
    expect(JSON.stringify(body)).not.toContain('permission denied')
  })

  it('redacts raw exceptions and never leaks env, version, or metrics', async () => {
    vi.mocked(createClient).mockRejectedValue(new Error('boom: connection refused'))

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
    vi.mocked(createClient).mockReset()
  })

  it('returns 200 when the database answers', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase(healthyResult))

    const res = await publicHEAD()
    expect(res.status).toBe(200)
  })

  it('returns 503 when the database errors or throws', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase(failingResult))
    expect((await publicHEAD()).status).toBe(503)

    vi.mocked(createClient).mockRejectedValue(new Error('unreachable'))
    expect((await publicHEAD()).status).toBe(503)
  })
})

describe('diagnostic GET /api/health/detail (operator gated)', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    vi.mocked(requirePilotActor).mockReset()
  })

  it('denies unauthenticated callers with 401 and no report detail', async () => {
    vi.mocked(requirePilotActor).mockRejectedValue(new Error('PILOT_AUTH_REQUIRED'))

    const res = await detailGET()
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.error).toBe('PILOT_AUTH_REQUIRED')
    expect(body).not.toHaveProperty('checks')
    expect(body).not.toHaveProperty('metrics')
  })

  it('denies non-admin sessions with 403', async () => {
    vi.mocked(requirePilotActor).mockRejectedValue(new Error('PILOT_ROLE_DENIED'))

    const res = await detailGET()
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('PILOT_ROLE_DENIED')
  })

  it('returns the full report to an authenticated admin', async () => {
    vi.mocked(requirePilotActor).mockResolvedValue(adminActor)
    vi.mocked(createClient).mockResolvedValue(fakeSupabase(healthyResult))

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
    vi.mocked(requirePilotActor).mockResolvedValue(adminActor)
    vi.mocked(createClient).mockResolvedValue(fakeSupabase(failingResult))

    const res = await detailGET()
    expect(res.status).toBe(503)

    const body = await res.json()
    expect(body.status).toBe('unhealthy')
    expect(body.checks[0].error).toBe('permission denied for table escolas')
  })
})
