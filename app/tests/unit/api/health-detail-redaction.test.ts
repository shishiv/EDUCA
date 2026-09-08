/**
 * Unit tests: redaction of unexpected internal errors on the operator
 * diagnostic endpoint.
 *
 * When the diagnostic battery itself throws (not an individual probe, which
 * already degrades gracefully), the response must stay a stable unhealthy
 * report and must never serialize the raw error text.
 */

import { describe, it, expect, vi } from 'vitest'

import type { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { createHealthChecks } from '@/lib/health/health-checks'
import { createHealthRouteHandlers } from '@/lib/health/health-route-handlers'

const authorize = vi.fn<typeof requirePilotActor>()
const checks = createHealthChecks()
const diagnostics = vi.fn<typeof checks.runHealthDiagnostics>()
const { detailGET } = createHealthRouteHandlers({ ...checks, runHealthDiagnostics: diagnostics }, authorize)

const adminActor = {
  id: 'operator-1',
  name: 'Admin de Teste',
  role: 'admin' as const,
  schoolId: null,
  email: 'admin@synthetic.invalid',
}

describe('diagnostic redaction of unexpected internal errors', () => {
  it('returns a stable unhealthy report without the raw exception text', async () => {
    authorize.mockResolvedValue(adminActor)
    diagnostics.mockRejectedValue(
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
