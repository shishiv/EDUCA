import { describe, expect, it, vi } from 'vitest'
import { createStatusHandler } from '@/app/api/users/[userId]/status/handler'
import type { PilotActor } from '@/lib/pilot/pilot-server-auth'

const USER_ID = '20000000-0000-0000-0000-000000000004'
const RECEIPT_ID = '30000000-0000-4000-8000-000000000004'
const ADMIN: PilotActor = {
  id: 'session-admin', name: 'Admin', email: 'admin@synthetic.invalid', role: 'admin', schoolId: null,
}
const context = { params: Promise.resolve({ userId: USER_ID }) }
type StatusInput = { ativo?: boolean | string; actorId?: string; escola_id?: string; schoolId?: string }
function request(body: StatusInput = { ativo: false }): Request {
  return new Request(`http://test/api/users/${USER_ID}/status`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}
function setup() {
  const requireActor = vi.fn(async () => ADMIN)
  const mutate = vi.fn(async (_id: string, ativo: boolean) => ({ user_id: USER_ID, ativo, audit_id: RECEIPT_ID }))
  return { requireActor, mutate, route: createStatusHandler({ requireActor, mutate }) }
}

describe('user status transactional handler', () => {
  it('calls one session-owned mutation with only target and desired state', async () => {
    const { route, requireActor, mutate } = setup()
    const response = await route(request(), context)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ user: { id: USER_ID, ativo: false }, receipt: RECEIPT_ID })
    expect(requireActor).toHaveBeenCalledWith(['admin'])
    expect(mutate.mock.calls).toEqual([[USER_ID, false]])
  })

  it('does not report success when receipt persistence rolls back', async () => {
    const { route, mutate } = setup()
    mutate.mockRejectedValue({ message: 'injected receipt failure', code: 'P0001' })
    const response = await route(request(), context)
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'USER_STATUS_UPDATE_FAILED' })
    expect(mutate).toHaveBeenCalledOnce()
    // Persistence rollback is exercised in user_status_atomic.test.sql, not simulated here.
  })

  it.each(['PILOT_AUTH_REQUIRED', 'PILOT_ROLE_DENIED'])('denies %s before mutation', async message => {
    const { route, requireActor, mutate } = setup()
    requireActor.mockRejectedValue(new Error(message))
    const response = await route(request(), context)
    expect(response.status).toBe(message === 'PILOT_AUTH_REQUIRED' ? 401 : 403)
    expect(mutate).not.toHaveBeenCalled()
  })

  it.each([
    ['PILOT_USER_STATUS_ROLE_DENIED', 403, 'USER_STATUS_ROLE_DENIED'],
    ['PILOT_USER_STATUS_SCHOOL_DENIED', 403, 'USER_STATUS_SCHOOL_DENIED'],
    ['PILOT_USER_STATUS_TARGET_NOT_FOUND', 404, 'USER_STATUS_TARGET_NOT_FOUND'],
  ])('preserves the database revalidation failure %s', async (message, status, code) => {
    const { route, mutate } = setup()
    mutate.mockRejectedValue({ message })
    const response = await route(request(), context)
    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({ error: code })
  })

  it.each([
    { ativo: false, actorId: USER_ID }, { ativo: false, escola_id: USER_ID },
    { ativo: false, schoolId: USER_ID }, { ativo: 'false' }, {},
  ])('rejects forged or invalid fields %j', async body => {
    const { route, mutate } = setup()
    expect((await route(request(body), context)).status).toBe(400)
    expect(mutate).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON and target IDs', async () => {
    const { route, mutate } = setup()
    expect((await route(new Request('http://test', { method: 'PATCH', body: '{' }), context)).status).toBe(400)
    expect((await route(request(), { params: Promise.resolve({ userId: 'forged' }) })).status).toBe(400)
    expect(mutate).not.toHaveBeenCalled()
  })

  it.each([
    { user_id: USER_ID, ativo: false, audit_id: '' },
    { user_id: RECEIPT_ID, ativo: false, audit_id: RECEIPT_ID },
    { user_id: USER_ID, ativo: true, audit_id: RECEIPT_ID },
  ])('refuses success with missing or mismatched committed result %j', async result => {
    const { route, mutate } = setup()
    mutate.mockResolvedValue(result)
    const response = await route(request(), context)
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'USER_STATUS_AUDIT_INCOMPLETE' })
  })

  it('retries the desired value rather than toggling stale state', async () => {
    const { route, mutate } = setup()
    expect((await route(request(), context)).status).toBe(200)
    expect((await route(request(), context)).status).toBe(200)
    expect(mutate.mock.calls).toEqual([[USER_ID, false], [USER_ID, false]])
  })
})
