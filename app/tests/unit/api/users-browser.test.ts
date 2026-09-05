import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { query, from } = vi.hoisted(() => {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(),
  }
  return { query, from: vi.fn(() => query) }
})

vi.mock('@/lib/supabase', () => ({ supabase: { from } }))
vi.mock('@/lib/auth', () => ({ logAuthEvent: vi.fn() }))
vi.mock('@/lib/audit', () => ({ logUserEvent: vi.fn(), logAuditEvent: vi.fn() }))

import { usersApi } from '@/lib/api/users'

const userId = '00000000-0000-0000-0000-000000000001'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('browser user API contracts', () => {
  it('returns the persisted status from the governed route', async () => {
    const persisted = { id: userId, ativo: false }
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ user: persisted }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await usersApi.updateUserStatus(userId, false)).toEqual(persisted)
    expect(fetchMock).toHaveBeenCalledWith(`/api/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ativo: false }),
    })
  })

  it('preserves a status rejection from the server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      Response.json({ error: 'USER_STATUS_SCHOOL_DENIED' }, { status: 403 }),
    ))

    await expect(usersApi.updateUserStatus(userId, false)).rejects.toThrow('USER_STATUS_SCHOOL_DENIED')
  })

  it('reports an unsuccessful response even when the server omits an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({}, { status: 500 })))

    await expect(usersApi.updateUserStatus(userId, false)).rejects.toThrow('USER_STATUS_UPDATE_FAILED')
  })

  it('propagates the original transport failure instead of replacing it', async () => {
    const failure = new Error('synthetic transport failure')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(failure))

    await expect(usersApi.updateUserStatus(userId, false)).rejects.toBe(failure)
  })

  it('preserves structured read errors instead of returning an empty user list', async () => {
    const failure = { code: '42501', message: 'synthetic read denied' }
    query.order.mockResolvedValue({ data: null, error: failure })

    await expect(usersApi.getUsersWithSchool()).rejects.toBe(failure)
  })
})
