import { beforeEach, describe, expect, it, vi } from 'vitest'

const { actorMock, serviceRoleMock } = vi.hoisted(() => ({
  actorMock: vi.fn(),
  serviceRoleMock: vi.fn(),
}))

vi.mock('@/lib/pilot/pilot-server-auth', () => ({ requirePilotActor: actorMock }))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: serviceRoleMock }))

import { PATCH } from '@/app/api/users/[userId]/status/route'

const USER_ID = '20000000-0000-0000-0000-000000000004'
const SCHOOL_A = '10000000-0000-0000-0000-000000000001'
const SCHOOL_B = '10000000-0000-0000-0000-000000000002'

function request(body: unknown = { ativo: false }, userId = USER_ID) {
  return PATCH(new Request(`http://test/api/users/${userId}/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }), { params: Promise.resolve({ userId }) })
}

function service(target: { id: string; escola_id: string | null } | null) {
  let ativo = true
  const targetQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => ({ data: target, error: null })),
  }
  const updateQuery = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => ({ data: target ? { id: target.id, ativo } : null, error: null })),
  }
  const client = {
    from: vi.fn()
      .mockReturnValueOnce(targetQuery)
      .mockImplementation(() => ({
        update: vi.fn((values: { ativo: boolean }) => {
          ativo = values.ativo
          return updateQuery
        }),
      })),
  }
  serviceRoleMock.mockReturnValue(client)
  return { client, updateQuery }
}

describe('user status route', () => {
  beforeEach(() => {
    actorMock.mockReset()
    serviceRoleMock.mockReset()
    actorMock.mockResolvedValue({ id: 'admin-id', role: 'admin', schoolId: null })
  })

  it('updates an authorized target and returns its persisted status', async () => {
    service({ id: USER_ID, escola_id: SCHOOL_A })

    const response = await request()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ user: { id: USER_ID, ativo: false } })
  })

  it('denies non-admin actors before opening the service boundary', async () => {
    actorMock.mockRejectedValue(new Error('PILOT_ROLE_DENIED'))

    const response = await request()

    expect(response.status).toBe(403)
    expect(serviceRoleMock).not.toHaveBeenCalled()
  })

  it('denies a school-scoped admin targeting another school', async () => {
    actorMock.mockResolvedValue({ id: 'admin-id', role: 'admin', schoolId: SCHOOL_A })
    const { client } = service({ id: USER_ID, escola_id: SCHOOL_B })

    const response = await request()

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'USER_STATUS_SCHOOL_DENIED' })
    expect(client.from).toHaveBeenCalledTimes(1)
  })

  it('rejects malformed and unknown targets without updating users', async () => {
    expect((await request({ ativo: false, schoolId: SCHOOL_A })).status).toBe(400)
    expect((await request({ ativo: false }, 'forged-user')).status).toBe(400)

    service(null)
    const missing = await request()
    expect(missing.status).toBe(404)
    expect(await missing.json()).toEqual({ error: 'USER_STATUS_TARGET_NOT_FOUND' })
  })
})
