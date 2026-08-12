import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  UserLifecycleAuthUser,
  UserLifecycleInvitation,
  UserLifecyclePorts,
  UserLifecycleProfile,
} from '@/lib/services/user-lifecycle'

const {
  actorMock,
  createClientMock,
  serviceRoleMock,
  safetyMock,
  demoMock,
  lifecyclePortsFactoryMock,
} = vi.hoisted(() => ({
  actorMock: vi.fn(),
  createClientMock: vi.fn(),
  serviceRoleMock: vi.fn(),
  safetyMock: vi.fn(),
  demoMock: vi.fn(),
  lifecyclePortsFactoryMock: vi.fn(),
}))

vi.mock('@/lib/pilot/pilot-server-auth', () => ({ requirePilotActor: actorMock }))
vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: serviceRoleMock }))
vi.mock('@/lib/pilot/pilot-safety-gate', () => ({ assertSyntheticPilotSafety: safetyMock }))
vi.mock('@/lib/demo-sandbox/demo-sandbox', () => ({ isDemoSandboxEnabled: demoMock }))
vi.mock('@/lib/pilot/pilot-api-error', () => ({
  pilotErrorResponse: vi.fn((error: unknown) => new Response(JSON.stringify({ error: String(error) }), { status: 500 })),
}))
vi.mock('@/lib/services/user-lifecycle', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/user-lifecycle')>('@/lib/services/user-lifecycle')
  return { ...actual, createSupabaseUserLifecyclePorts: lifecyclePortsFactoryMock }
})

import { POST } from '@/app/api/pilot/users/[userId]/revoke/route'

const USER_ID = '00000000-0000-0000-0000-000000000701'
const SCHOOL_ID = '00000000-0000-0000-0000-000000000001'
const ACTOR_ID = '00000000-0000-0000-0000-000000000001'
const AUTH_USER: UserLifecycleAuthUser = {
  id: USER_ID,
  email: 't07-route@synthetic.invalid',
  user_metadata: { synthetic: true },
}
const PROFILE: UserLifecycleProfile = {
  id: USER_ID,
  email: AUTH_USER.email!,
  nome: 'T07 Route Sintetico',
  tipo_usuario: 'diretor',
  escola_id: SCHOOL_ID,
  ativo: true,
  primeiro_login: false,
  senha_padrao: false,
  data_ultimo_acesso: null,
}
const INVITATION: UserLifecycleInvitation = {
  id: '00000000-0000-0000-0000-000000000702',
  auth_user_id: USER_ID,
  email: AUTH_USER.email!,
  invited_role: 'diretor',
  escola_id: SCHOOL_ID,
  invited_by: ACTOR_ID,
  accepted_at: null,
}

function createPorts(): UserLifecyclePorts {
  let currentProfile = PROFILE
  return {
    auth: {
      inviteUserByEmail: vi.fn(async () => AUTH_USER),
      getUserById: vi.fn(async () => AUTH_USER),
      deleteUser: vi.fn(async () => 'removed' as const),
      updatePassword: vi.fn(async () => undefined),
    },
    profile: {
      findById: vi.fn(async () => currentProfile),
      createIncomplete: vi.fn(async () => currentProfile),
      complete: vi.fn(async () => currentProfile),
      deactivate: vi.fn(async () => {
        currentProfile = { ...currentProfile, ativo: false }
        return currentProfile
      }),
    },
    invitation: {
      findByEmail: vi.fn(async () => INVITATION),
      findByAuthUserId: vi.fn(async () => INVITATION),
      create: vi.fn(async () => INVITATION),
      accept: vi.fn(async () => undefined),
    },
  }
}

describe('pilot auth revocation route', () => {
  beforeEach(() => {
    actorMock.mockReset()
    createClientMock.mockReset()
    serviceRoleMock.mockReset()
    safetyMock.mockReset()
    demoMock.mockReset()
    lifecyclePortsFactoryMock.mockReset()
    actorMock.mockResolvedValue({ id: ACTOR_ID, name: 'Secretaria', role: 'secretario', schoolId: null })
    createClientMock.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: 'audit-id', error: null }),
    })
    serviceRoleMock.mockReturnValue({})
    safetyMock.mockImplementation(() => undefined)
    demoMock.mockReturnValue(false)
    lifecyclePortsFactoryMock.mockReturnValue(createPorts())
  })

  it('returns only a redacted synthetic receipt after the lifecycle operation', async () => {
    const response = await POST(
      new Request('http://test/api/pilot/users/target/revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ release: 't07-local', reason: 'synthetic-boundary-test' }),
      }),
      { params: Promise.resolve({ userId: USER_ID }) },
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      revoked: true,
      idempotent: false,
      receipt: {
        identity: expect.stringMatching(/^synthetic-[a-f0-9]+$/),
        role: 'diretor',
        school: SCHOOL_ID,
        release: 't07-local',
        reason: 'synthetic-boundary-test',
        timestamp: expect.any(String),
      },
    })
    expect(Object.keys(body.receipt).sort()).toEqual(['identity', 'reason', 'release', 'role', 'school', 'timestamp'])
    expect(JSON.stringify(body)).not.toMatch(/@|password|senha|token|jwt|phone|telefone|header/i)
  })

  it('does not operate in the demo sandbox', async () => {
    demoMock.mockReturnValue(true)

    const response = await POST(
      new Request('http://test/api/pilot/users/target/revoke', { method: 'POST' }),
      { params: Promise.resolve({ userId: USER_ID }) },
    )

    expect(response.status).toBe(404)
    expect(lifecyclePortsFactoryMock).not.toHaveBeenCalled()
  })
})
