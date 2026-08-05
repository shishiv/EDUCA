import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/demo/audit/route'

const { actorMock, createClientMock } = vi.hoisted(() => ({
  actorMock: vi.fn(),
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/pilot/pilot-server-auth', () => ({ requirePilotActor: actorMock }))
vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }))

const SCHOOL_ID = '00000000-0000-0000-0000-000000000001'

function request(body: unknown): Request {
  return new Request('http://test/api/demo/audit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function queryChain() {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: { id: SCHOOL_ID }, error: null })),
  }
  return chain
}

describe('POST /api/demo/audit', () => {
  const previousDemoSandbox = process.env.NEXT_PUBLIC_DEMO_SANDBOX

  beforeEach(() => {
    process.env.NEXT_PUBLIC_DEMO_SANDBOX = 'true'
    actorMock.mockReset()
    createClientMock.mockReset()
    actorMock.mockResolvedValue({ id: 'actor-1', role: 'admin', schoolId: null, email: 'demo@educa.app.br' })
    createClientMock.mockResolvedValue({
      from: vi.fn(() => queryChain()),
      rpc: vi.fn().mockResolvedValue({ data: 'audit-1', error: null }),
    })
  })

  afterEach(() => {
    if (previousDemoSandbox === undefined) delete process.env.NEXT_PUBLIC_DEMO_SANDBOX
    else process.env.NEXT_PUBLIC_DEMO_SANDBOX = previousDemoSandbox
  })

  it('returns 2xx with a truthful simulated receipt and no business payload', async () => {
    const response = await POST(request({
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
    actorMock.mockResolvedValue({ id: 'director-1', role: 'diretor', schoolId: SCHOOL_ID, email: 'director@example.com' })

    const response = await POST(request({
      operation: 'demo.feature_flag.toggle',
      entityId: 'flag-1',
      schoolId: SCHOOL_ID,
    }))

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('DEMO_AUDIT_ROLE_DENIED')
  })
})
