import { describe, expect, it } from 'vitest'
import { createStatusHandler, type UserStatusStore } from '@/app/api/users/[userId]/status/handler'
import type { PilotActor, PilotUserRole } from '@/lib/pilot/pilot-server-auth'

const USER_ID = '20000000-0000-0000-0000-000000000004'
const SCHOOL_A = '10000000-0000-0000-0000-000000000001'
const SCHOOL_B = '10000000-0000-0000-0000-000000000002'
const ADMIN: PilotActor = {
  id: 'admin-id',
  name: 'Admin',
  email: 'admin@synthetic.invalid',
  role: 'admin',
  schoolId: null,
}

type StatusTarget = { id: string; escola_id: string | null }
type StatusBody = { ativo: boolean; schoolId?: string }

class MemoryUserStatusStore implements UserStatusStore {
  auditCalls = 0
  findCalls = 0
  updateCalls = 0

  constructor(
    private target: StatusTarget | null,
    private readonly auditReceipt: string | null = 'audit-id',
  ) {}

  async find(): Promise<StatusTarget | null> {
    this.findCalls += 1
    return this.target
  }

  async update(userId: string, ativo: boolean): Promise<{ id: string; ativo: boolean } | null> {
    this.updateCalls += 1
    if (!this.target || this.target.id !== userId) return null
    return { id: userId, ativo }
  }

  async audit(): Promise<string | null> {
    this.auditCalls += 1
    return this.auditReceipt
  }
}

function request(body: StatusBody = { ativo: false }, userId = USER_ID): Request {
  return new Request(`http://test/api/users/${userId}/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createActorResolver(actor: PilotActor): (roles: PilotUserRole[]) => Promise<PilotActor> {
  return async roles => {
    if (!roles.includes(actor.role)) throw new Error('PILOT_ROLE_DENIED')
    return actor
  }
}

function createRoute(store: MemoryUserStatusStore, actor: PilotActor = ADMIN) {
  return createStatusHandler({
    requireActor: createActorResolver(actor),
    store: () => store,
  })
}

describe('user status route', () => {
  it('updates an authorized target and returns its persisted status', async () => {
    const store = new MemoryUserStatusStore({ id: USER_ID, escola_id: SCHOOL_A })
    const response = await createRoute(store)(request(), { params: Promise.resolve({ userId: USER_ID }) })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ user: { id: USER_ID, ativo: false }, receipt: 'audit-id' })
    expect(store).toMatchObject({ findCalls: 1, updateCalls: 1, auditCalls: 1 })
  })

  it('does not report success when the audit receipt fails', async () => {
    const store = new MemoryUserStatusStore({ id: USER_ID, escola_id: SCHOOL_A }, null)
    const response = await createRoute(store)(request(), { params: Promise.resolve({ userId: USER_ID }) })

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'USER_STATUS_AUDIT_INCOMPLETE', completed: false })
    expect(store).toMatchObject({ updateCalls: 1, auditCalls: 1 })
  })

  it('denies non-admin actors before opening the store seam', async () => {
    const store = new MemoryUserStatusStore({ id: USER_ID, escola_id: SCHOOL_A })
    const director: PilotActor = { ...ADMIN, role: 'diretor' }
    const response = await createRoute(store, director)(request(), { params: Promise.resolve({ userId: USER_ID }) })

    expect(response.status).toBe(403)
    expect(store).toMatchObject({ findCalls: 0, updateCalls: 0, auditCalls: 0 })
  })

  it('denies a school-scoped admin targeting another school', async () => {
    const store = new MemoryUserStatusStore({ id: USER_ID, escola_id: SCHOOL_B })
    const scopedAdmin: PilotActor = { ...ADMIN, schoolId: SCHOOL_A }
    const response = await createRoute(store, scopedAdmin)(request(), { params: Promise.resolve({ userId: USER_ID }) })

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'USER_STATUS_SCHOOL_DENIED' })
    expect(store).toMatchObject({ findCalls: 1, updateCalls: 0, auditCalls: 0 })
  })

  it('rejects malformed and unknown targets without updating users', async () => {
    const store = new MemoryUserStatusStore(null)
    const route = createRoute(store)

    expect((await route(request({ ativo: false, schoolId: SCHOOL_A }), { params: Promise.resolve({ userId: USER_ID }) })).status).toBe(400)
    expect((await route(request({ ativo: false }), { params: Promise.resolve({ userId: 'forged-user' }) })).status).toBe(400)
    expect((await route(request(), { params: Promise.resolve({ userId: USER_ID }) })).status).toBe(404)
    expect(store).toMatchObject({ findCalls: 1, updateCalls: 0, auditCalls: 0 })
  })
})
