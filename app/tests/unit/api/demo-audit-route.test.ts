import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDemoAuditPostHandler,
  type DemoAuditRouteDependencies,
} from '@/lib/demo-sandbox/demo-audit-route-handler'
import { demoSandboxSimulatedSuccessResponse } from '@/lib/demo-sandbox/demo-sandbox'

const SCHOOL_ID = '00000000-0000-0000-0000-000000000001'
type DemoAuditRequest = { operation: string; entityId?: string; schoolId?: string }

function request(body: DemoAuditRequest): Request {
  return new Request('http://test/api/demo/audit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/demo/audit', () => {
  const requireActor = vi.fn()
  const schoolExists = vi.fn()
  const writeAudit = vi.fn()
  let post: ReturnType<typeof createDemoAuditPostHandler>

  beforeEach(() => {
    requireActor.mockReset()
    schoolExists.mockReset()
    writeAudit.mockReset()
    requireActor.mockResolvedValue({ id: 'actor-1', name: 'Admin Demo', role: 'admin', schoolId: null, email: 'demo@educa.app.br' })
    schoolExists.mockResolvedValue(true)
    writeAudit.mockResolvedValue({
      auditId: 'audit-1',
      correlationId: 'correlation-1',
      operation: 'demo.config.update',
      outcome: 'simulated_success',
      effectSuppressed: true,
    })
    const dependencies: DemoAuditRouteDependencies = {
      isDemoSandboxEnabled: () => true,
      requireActor,
      schoolExists,
      writeAudit,
      simulatedSuccessResponse: (operation, data, options) => demoSandboxSimulatedSuccessResponse(
        operation,
        data,
        options,
        { NEXT_PUBLIC_DEMO_SANDBOX: 'true' },
      ),
    }
    post = createDemoAuditPostHandler(dependencies)
  })

  it('returns 2xx with a truthful simulated receipt and no business payload', async () => {
    const response = await post(request({
      operation: 'demo.config.update',
      entityId: 'config-1',
      schoolId: SCHOOL_ID,
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      demo: {
        operation: 'demo.config.update',
        outcome: 'simulated_success',
        effect_suppressed: true,
        audit_id: 'audit-1',
      },
    })
    expect(JSON.stringify(body)).not.toContain('password')
    expect(JSON.stringify(body)).not.toContain('cpf')
    expect(JSON.stringify(body)).not.toContain('NIS')
  })

  it('keeps the real role negative for feature flags', async () => {
    requireActor.mockResolvedValue({ id: 'director-1', name: 'Diretor Demo', role: 'diretor', schoolId: SCHOOL_ID, email: 'director@example.com' })

    const response = await post(request({
      operation: 'demo.feature_flag.toggle',
      entityId: 'flag-1',
      schoolId: SCHOOL_ID,
    }))

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('DEMO_AUDIT_ROLE_DENIED')
  })
})
