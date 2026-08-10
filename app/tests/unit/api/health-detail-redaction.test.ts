/**
 * Unit tests: redaction of unexpected internal errors on the operator
 * diagnostic endpoint.
 *
 * When the diagnostic battery itself throws (not an individual probe, which
 * already degrades gracefully), the response must stay a stable unhealthy
 * report and must never serialize the raw error text.
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/pilot/pilot-server-auth', () => ({
  requirePilotActor: vi.fn(),
}))

vi.mock('@/lib/health/health-checks', () => ({
  runHealthDiagnostics: vi.fn(),
  buildRedactedUnhealthyReport: vi.fn(() => ({
    status: 'unhealthy',
    timestamp: '2026-08-01T00:00:00.000Z',
    responseTime: '0ms',
    checks: [],
    metrics: null,
    version: '1.0.0',
    environment: 'test',
  })),
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

import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { runHealthDiagnostics } from '@/lib/health/health-checks'
import { GET as detailGET } from '@/app/api/health/detail/route'

const adminActor = {
  id: 'operator-1',
  name: 'Admin de Teste',
  role: 'admin' as const,
  schoolId: null,
  email: 'admin@example.com',
}

describe('diagnostic redaction of unexpected internal errors', () => {
  it('returns a stable unhealthy report without the raw exception text', async () => {
    vi.mocked(requirePilotActor).mockResolvedValue(adminActor)
    vi.mocked(runHealthDiagnostics).mockRejectedValue(
      new Error('connection to supabase failed: FATAL: password authentication failed')
    )

    const res = await detailGET()
    expect(res.status).toBe(503)

    const body = await res.json()
    expect(body).toEqual({
      status: 'unhealthy',
      timestamp: expect.any(String),
      responseTime: '0ms',
      checks: [],
      metrics: null,
      version: expect.any(String),
      environment: expect.any(String),
    })
    expect(JSON.stringify(body)).not.toContain('FATAL')
    expect(JSON.stringify(body)).not.toContain('password authentication')
  })
})
