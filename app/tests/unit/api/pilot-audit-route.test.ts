import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/pilot/audit/route'

const { actorMock, createClientMock, rpcMock } = vi.hoisted(() => ({
  actorMock: vi.fn(),
  createClientMock: vi.fn(),
  rpcMock: vi.fn(),
}))

vi.mock('@/lib/pilot/pilot-server-auth', () => ({ requirePilotActor: actorMock }))
vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }))

const SCHOOL_A = '10000000-0000-0000-0000-000000000001'
const SCHOOL_B = '10000000-0000-0000-0000-000000000002'
const USER_ID = '20000000-0000-0000-0000-000000000001'

function request(schoolId?: string): Request {
  return new Request('http://test/api/pilot/audit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventType: 'login',
      entityType: 'auth_session',
      entityId: USER_ID,
      metadata: {},
      ...(schoolId ? { schoolId } : {}),
    }),
  })
}

describe('POST /api/pilot/audit', () => {
  beforeEach(() => {
    actorMock.mockReset()
    createClientMock.mockReset()
    rpcMock.mockReset()
    createClientMock.mockResolvedValue({ rpc: rpcMock })
    rpcMock.mockResolvedValue({ data: 'audit-1', error: null })
  })

  it('derives a director login school from the active profile', async () => {
    actorMock.mockResolvedValue({ id: USER_ID, role: 'diretor', schoolId: SCHOOL_A })

    const response = await POST(request())

    expect(response.status).toBe(201)
    expect(rpcMock).toHaveBeenCalledWith('write_pilot_audit_event', expect.objectContaining({
      p_escola_id: SCHOOL_A,
    }))
  })

  it('keeps municipal login events global', async () => {
    actorMock.mockResolvedValue({ id: USER_ID, role: 'secretario', schoolId: null })

    const response = await POST(request())

    expect(response.status).toBe(201)
    expect(rpcMock).toHaveBeenCalledWith('write_pilot_audit_event', expect.objectContaining({
      p_escola_id: undefined,
    }))
  })

  it('rejects a forged school before writing', async () => {
    actorMock.mockResolvedValue({ id: USER_ID, role: 'diretor', schoolId: SCHOOL_A })

    const response = await POST(request(SCHOOL_B))

    expect(response.status).toBe(403)
    expect(rpcMock).not.toHaveBeenCalled()
  })
})
