import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createDemoAuditPostHandler,
  type DemoAuditRouteDependencies,
} from '@/lib/demo-sandbox/demo-audit-route-handler'
import { demoSandboxSimulatedSuccessResponse, isDemoSandboxEnabled } from '@/lib/demo-sandbox/demo-sandbox'
import type {
  DemoActionAuditReceipt,
  DemoActionOperation,
} from '@/lib/demo-sandbox/demo-audit'
import type { PilotActor } from '@/lib/pilot/pilot-server-auth'

const ACTOR_SCHOOL_ID = '00000000-0000-0000-0000-000000000001'
const OTHER_SCHOOL_ID = '00000000-0000-0000-0000-000000000002'

interface DemoAuditRequestBody {
  operation: DemoActionOperation
  entityId?: string | null
  schoolId?: string | null
}

type DemoAuditDatabase = Pick<DemoAuditRouteDependencies, 'schoolExists' | 'writeAudit'>

function request(body: DemoAuditRequestBody): Request {
  return new Request('http://test/api/demo/audit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function actor(schoolId: string | null): PilotActor {
  return {
    id: 'actor-1',
    name: 'Admin Demo',
    role: 'admin',
    schoolId,
    email: 'demo@educa.app.br',
  }
}

function routePorts(
  pilotActor: PilotActor,
  database: DemoAuditDatabase,
): DemoAuditRouteDependencies {
  return {
    requireActor: vi.fn(async () => pilotActor),
    isDemoSandboxEnabled,
    simulatedSuccessResponse: demoSandboxSimulatedSuccessResponse,
    schoolExists: database.schoolExists,
    writeAudit: database.writeAudit,
  }
}

function database(schoolExists: DemoAuditDatabase['schoolExists']): DemoAuditDatabase {
  return {
    schoolExists,
    writeAudit: vi.fn(async (input): Promise<DemoActionAuditReceipt> => ({
      auditId: 'audit-1',
      correlationId: 'correlation-1',
      operation: input.operation,
      outcome: 'simulated_success',
      effectSuppressed: true,
    })),
  }
}

describe('demo audit route school checks', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('rejects a school mismatch before querying the database or recording an audit', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_SANDBOX', 'true')
    const ports = routePorts(actor(ACTOR_SCHOOL_ID), database(vi.fn(async () => true)))
    const post = createDemoAuditPostHandler(ports)

    const response = await post(request({
      operation: 'demo.config.update',
      schoolId: OTHER_SCHOOL_ID,
    }))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'DEMO_AUDIT_SCHOOL_DENIED' })
    expect(ports.schoolExists).not.toHaveBeenCalled()
    expect(ports.writeAudit).not.toHaveBeenCalled()
  })

  it('returns not found when the requested active school does not exist', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_SANDBOX', 'true')
    const auditDatabase = database(vi.fn(async () => false))
    const post = createDemoAuditPostHandler(routePorts(actor(null), auditDatabase))

    const response = await post(request({
      operation: 'demo.config.update',
      schoolId: OTHER_SCHOOL_ID,
    }))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'DEMO_AUDIT_SCHOOL_NOT_FOUND' })
    expect(auditDatabase.writeAudit).not.toHaveBeenCalled()
  })

  it('redacts an active-school query failure behind the route error code', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_SANDBOX', 'true')
    const auditDatabase = database(vi.fn(async () => {
      throw new Error('database relation details')
    }))
    const post = createDemoAuditPostHandler(routePorts(actor(null), auditDatabase))

    const response = await post(request({
      operation: 'demo.config.update',
      schoolId: OTHER_SCHOOL_ID,
    }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'DEMO_AUDIT_FAILED' })
    expect(JSON.stringify(body)).not.toContain('database relation details')
    expect(auditDatabase.writeAudit).not.toHaveBeenCalled()
  })
})
