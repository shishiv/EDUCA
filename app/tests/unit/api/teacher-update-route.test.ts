import { beforeEach, describe, expect, it, vi } from 'vitest'

const { actorMock, serviceRoleMock } = vi.hoisted(() => ({
  actorMock: vi.fn(),
  serviceRoleMock: vi.fn(),
}))

vi.mock('@/lib/pilot/pilot-server-auth', () => ({ requirePilotActor: actorMock }))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: serviceRoleMock }))

import { PATCH } from '@/app/api/users/[userId]/route'

const USER_ID = '20000000-0000-0000-0000-000000000004'
const SCHOOL_A = '10000000-0000-0000-0000-000000000001'
const SCHOOL_B = '10000000-0000-0000-0000-000000000002'
const validInput = {
  nome: 'Professora Atualizada',
  email: 'professora.atualizada@synthetic.invalid',
  tipo_usuario: 'professor',
  escola_id: SCHOOL_A,
}

function request(body: unknown = validInput) {
  return PATCH(new Request(`http://test/api/users/${USER_ID}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }), { params: Promise.resolve({ userId: USER_ID }) })
}

function service(targetSchool = SCHOOL_A) {
  const target = { id: USER_ID, email: 'professora.a@synthetic.invalid', tipo_usuario: 'professor', escola_id: targetSchool }
  const persisted = { id: USER_ID, ...validInput, ativo: true, created_at: '2026-01-01T00:00:00Z' }
  const targetQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn(async () => ({ data: target, error: null })) }
  const schoolQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn(async () => ({ data: { id: SCHOOL_A }, error: null })) }
  const updateQuery = { eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), maybeSingle: vi.fn(async () => ({ data: persisted, error: null })) }
  const update = vi.fn().mockReturnValue(updateQuery)
  const updateUserById = vi.fn(async () => ({ error: null }))
  const client = {
    auth: { admin: { updateUserById } },
    from: vi.fn()
      .mockReturnValueOnce(targetQuery)
      .mockReturnValueOnce(schoolQuery)
      .mockReturnValueOnce({ update }),
  }
  serviceRoleMock.mockReturnValue(client)
  return { client, update, updateUserById }
}

describe('teacher update route', () => {
  beforeEach(() => {
    actorMock.mockReset()
    serviceRoleMock.mockReset()
    actorMock.mockResolvedValue({ id: 'admin-id', role: 'admin', schoolId: null })
  })

  it('persists validated teacher fields and synchronizes the Auth email', async () => {
    const { update, updateUserById } = service()

    const response = await request()

    expect(response.status).toBe(200)
    expect((await response.json()).user).toMatchObject(validInput)
    expect(updateUserById).toHaveBeenCalledWith(USER_ID, { email: validInput.email })
    expect(update).toHaveBeenCalledWith(validInput)
  })

  it('rejects unauthorized actors before opening the service boundary', async () => {
    actorMock.mockRejectedValue(new Error('PILOT_ROLE_DENIED'))

    const response = await request()

    expect(response.status).toBe(403)
    expect(serviceRoleMock).not.toHaveBeenCalled()
  })

  it('rejects cross-school targets without mutation', async () => {
    actorMock.mockResolvedValue({ id: 'admin-id', role: 'admin', schoolId: SCHOOL_A })
    const { update, updateUserById } = service(SCHOOL_B)

    const response = await request()

    expect(response.status).toBe(403)
    expect(update).not.toHaveBeenCalled()
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it('reports invalid fields without partial persistence', async () => {
    const response = await request({ ...validInput, email: 'invalid', ativo: false })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'TEACHER_UPDATE_INVALID' })
    expect(serviceRoleMock).not.toHaveBeenCalled()
  })
})
