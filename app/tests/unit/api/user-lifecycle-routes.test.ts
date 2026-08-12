import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
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
  lifecyclePortsFactoryMock,
} = vi.hoisted(() => ({
  actorMock: vi.fn(),
  createClientMock: vi.fn(),
  serviceRoleMock: vi.fn(),
  safetyMock: vi.fn(),
  lifecyclePortsFactoryMock: vi.fn(),
}))

vi.mock('@/lib/pilot/pilot-server-auth', () => ({ requirePilotActor: actorMock }))
vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: serviceRoleMock }))
vi.mock('@/lib/pilot/pilot-safety-gate', () => ({
  assertSyntheticPilotSafety: safetyMock,
  PILOT_PROOF_SYNTHETIC_MARKER: 'SYNTHETIC-EDUCA-PILOT',
}))
vi.mock('@/lib/pilot/pilot-api-error', () => ({
  pilotErrorResponse: vi.fn((error: unknown) => new Response(JSON.stringify({ error: String(error) }), { status: 500 })),
}))
vi.mock('@/lib/demo-sandbox/demo-sandbox', () => ({
  isDemoSandboxEnabled: vi.fn(() => false),
  demoSandboxSimulatedSuccessResponse: vi.fn(),
  isDemoSandboxHardBlockedPath: vi.fn(() => false),
  getDemoSandboxBlockedReason: vi.fn(),
  isDemoSandboxPilotPathAllowed: vi.fn(() => true),
  demoSandboxGuardResponse: vi.fn(),
}))
vi.mock('@/lib/services/user-lifecycle', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/user-lifecycle')>('@/lib/services/user-lifecycle')
  return { ...actual, createSupabaseUserLifecyclePorts: lifecyclePortsFactoryMock }
})

import { POST as invitationPOST } from '@/app/api/pilot/invitations/route'

const AUTH_USER: UserLifecycleAuthUser = {
  id: '00000000-0000-0000-0000-000000000101',
  email: 'c09-route@synthetic.invalid',
  user_metadata: { nome: 'Usuário C09' },
}
const INVITATION: UserLifecycleInvitation = {
  id: '00000000-0000-0000-0000-000000000201',
  auth_user_id: AUTH_USER.id,
  email: AUTH_USER.email!,
  invited_role: 'secretario',
  escola_id: null,
  invited_by: '00000000-0000-0000-0000-000000000001',
  accepted_at: null,
}
const PROFILE: UserLifecycleProfile = {
  id: AUTH_USER.id,
  email: AUTH_USER.email!,
  nome: 'Usuário C09',
  tipo_usuario: 'secretario',
  escola_id: INVITATION.escola_id,
  ativo: true,
  primeiro_login: true,
  senha_padrao: true,
  data_ultimo_acesso: null,
}

function request() {
  return new NextRequest('http://test/api/pilot/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: AUTH_USER.email,
      name: 'Usuário C09',
      role: 'secretario',
      schoolId: null,
    }),
  })
}

function fakeLifecyclePorts() {
  let storedInvitation: UserLifecycleInvitation | null = null
  let storedProfile: UserLifecycleProfile | null = null
  let failProfileCreate = true
  const deleteIdentity = vi.fn()
  const auth = {
    inviteUserByEmail: vi.fn(async () => AUTH_USER),
    getUserById: vi.fn(async () => AUTH_USER),
    updatePassword: vi.fn(async () => undefined),
    deleteUser: deleteIdentity,
  }
  const ports: UserLifecyclePorts = {
    auth,
    profile: {
      findById: vi.fn(async () => storedProfile),
      createIncomplete: vi.fn(async () => {
        if (failProfileCreate) {
          failProfileCreate = false
          throw new Error('synthetic profile persistence failure')
        }
        storedProfile = PROFILE
        return PROFILE
      }),
      complete: vi.fn(async () => PROFILE),
    },
    invitation: {
      findByEmail: vi.fn(async () => storedInvitation),
      findByAuthUserId: vi.fn(async () => storedInvitation),
      create: vi.fn(async () => {
        storedInvitation = INVITATION
        return INVITATION
      }),
      accept: vi.fn(async () => undefined),
    },
  }
  return { ports, auth, deleteIdentity }
}

describe('user lifecycle invitation route', () => {
  beforeEach(() => {
    actorMock.mockReset()
    createClientMock.mockReset()
    serviceRoleMock.mockReset()
    safetyMock.mockReset()
    lifecyclePortsFactoryMock.mockReset()
    actorMock.mockResolvedValue({ id: INVITATION.invited_by, name: 'Admin', role: 'admin', schoolId: null })
    createClientMock.mockResolvedValue({ rpc: vi.fn().mockResolvedValue({ data: null, error: null }) })
    serviceRoleMock.mockReturnValue({})
    safetyMock.mockImplementation(() => undefined)
  })

  it('returns an incomplete-registration receipt after profile failure without deleting Auth', async () => {
    const fake = fakeLifecyclePorts()
    lifecyclePortsFactoryMock.mockReturnValue(fake.ports)

    const response = await invitationPOST(request())
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toMatchObject({
      error: 'PILOT_INVITE_PROFILE_INCOMPLETE',
      completed: false,
      identityPreserved: true,
      registration: { status: 'incomplete', resumePath: '/primeiro-acesso' },
    })
    expect(fake.auth.inviteUserByEmail).toHaveBeenCalledTimes(1)
    expect(fake.deleteIdentity).not.toHaveBeenCalled()
  })

  it('retries and resumes the same pending registration, then rejects duplicates', async () => {
    const fake = fakeLifecyclePorts()
    lifecyclePortsFactoryMock.mockReturnValue(fake.ports)

    await invitationPOST(request())
    const resumedResponse = await invitationPOST(request())
    const resumedBody = await resumedResponse.json()
    const duplicateResponse = await invitationPOST(request())
    const duplicateBody = await duplicateResponse.json()

    expect(resumedResponse.status).toBe(200)
    expect(resumedBody).toMatchObject({
      resumed: true,
      registration: { status: 'incomplete', resumePath: '/primeiro-acesso' },
      invitation: { id: INVITATION.id, email: INVITATION.email },
    })
    expect(duplicateResponse.status).toBe(409)
    expect(duplicateBody.error).toBe('PILOT_INVITE_ALREADY_PENDING')
    expect(fake.auth.inviteUserByEmail).toHaveBeenCalledTimes(1)
    expect(fake.auth.getUserById).toHaveBeenCalledWith(AUTH_USER.id)
  })
})
