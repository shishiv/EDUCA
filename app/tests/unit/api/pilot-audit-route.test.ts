import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { createPilotAuditPostHandler } from '@/lib/pilot/audit-route-handler'

const SCHOOL_A = '10000000-0000-0000-0000-000000000001'
const SCHOOL_B = '10000000-0000-0000-0000-000000000002'
const USER_ID = '20000000-0000-0000-0000-000000000001'
const AUDIT_ID = '30000000-0000-0000-0000-000000000001'
const actor = vi.fn<typeof requirePilotActor>()
const transport = vi.fn<typeof fetch>()
const client = createClient<Database>('http://127.0.0.1:54321', 'synthetic-anon', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: transport },
})
const POST = createPilotAuditPostHandler({ requireActor: actor, createClient: async () => client })
const actorProfile = { id: USER_ID, name: 'Operador sintético', email: 'operator@synthetic.invalid' }

function request(schoolId?: string): Request {
  return new Request('http://test/api/pilot/audit', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventType: 'login', entityType: 'auth_session', entityId: USER_ID, metadata: {}, schoolId,
    }),
  })
}

async function sentPayload() {
  const call = transport.mock.calls[0]
  if (!call) throw new Error('Expected an audit RPC request')
  const sent = new Request(call[0], call[1])
  expect(new URL(sent.url).pathname).toBe('/rest/v1/rpc/write_pilot_audit_event')
  return sent.json()
}

describe('POST /api/pilot/audit', () => {
  beforeEach(() => {
    actor.mockReset()
    transport.mockReset()
    transport.mockResolvedValue(Response.json(AUDIT_ID))
    actor.mockResolvedValue({ ...actorProfile, role: 'diretor', schoolId: SCHOOL_A })
  })

  it('derives a director login school from the active profile', async () => {
    const response = await POST(request())
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ auditId: AUDIT_ID })
    expect(await sentPayload()).toMatchObject({ p_escola_id: SCHOOL_A })
  })

  it('keeps municipal login events global', async () => {
    actor.mockResolvedValue({ ...actorProfile, role: 'secretario', schoolId: null })
    expect((await POST(request())).status).toBe(201)
    expect(await sentPayload()).not.toHaveProperty('p_escola_id')
  })

  it('rejects a forged school before writing', async () => {
    expect((await POST(request(SCHOOL_B))).status).toBe(403)
    expect(transport).not.toHaveBeenCalled()
  })

  it('does not report success when the RPC returns no receipt', async () => {
    transport.mockResolvedValue(Response.json(null))
    const response = await POST(request())
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'PILOT_AUDIT_RECEIPT_MISSING' })
  })

  it('denies unauthenticated callers before accessing the database', async () => {
    actor.mockRejectedValue(new Error('PILOT_AUTH_REQUIRED'))
    expect((await POST(request())).status).toBe(401)
    expect(transport).not.toHaveBeenCalled()
  })
})
