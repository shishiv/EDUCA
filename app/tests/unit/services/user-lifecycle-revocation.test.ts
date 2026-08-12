import { describe, expect, it, vi } from 'vitest'
import {
  revokeSyntheticPilotIdentity,
  startOrResumeUserRegistration,
  UserLifecycleError,
  type UserLifecycleAuthUser,
  type UserLifecycleInvitation,
  type UserLifecyclePorts,
  type UserLifecycleProfile,
} from '@/lib/services/user-lifecycle'

const USER_ID = '00000000-0000-0000-0000-000000000701'
const ACTOR_ID = '00000000-0000-0000-0000-000000000001'
const SCHOOL_ID = '00000000-0000-0000-0000-000000000001'
const EMAIL = 't07-revocation@synthetic.invalid'
const AUTH_USER: UserLifecycleAuthUser = {
  id: USER_ID,
  email: EMAIL,
  user_metadata: { synthetic: true, pilot_role: 'diretor' },
}
const INVITATION: UserLifecycleInvitation = {
  id: '00000000-0000-0000-0000-000000000702',
  auth_user_id: USER_ID,
  email: EMAIL,
  invited_role: 'diretor',
  escola_id: SCHOOL_ID,
  invited_by: ACTOR_ID,
  accepted_at: null,
}

function profile(overrides: Partial<UserLifecycleProfile> = {}): UserLifecycleProfile {
  return {
    id: USER_ID,
    email: EMAIL,
    nome: 'T07 Sintético',
    tipo_usuario: 'diretor',
    escola_id: SCHOOL_ID,
    ativo: true,
    primeiro_login: false,
    senha_padrao: false,
    data_ultimo_acesso: null,
    ...overrides,
  }
}

function createPorts(options: { inactive?: boolean; authMissing?: boolean } = {}) {
  let storedProfile = profile({ ativo: options.inactive ? false : true })
  let removed = options.authMissing ?? false
  const auth = {
    inviteUserByEmail: vi.fn(async () => AUTH_USER),
    getUserById: vi.fn(async () => {
      if (removed) throw new UserLifecycleError('AUTH_USER_MISSING', 'synthetic identity missing')
      return AUTH_USER
    }),
    updatePassword: vi.fn(async () => undefined),
    deleteUser: vi.fn(async () => {
      if (removed) return 'already_missing' as const
      removed = true
      return 'removed' as const
    }),
  }
  const profilePort = {
    findById: vi.fn(async () => storedProfile),
    deactivate: vi.fn(async () => {
      storedProfile = profile({ ativo: false })
      return storedProfile
    }),
    createIncomplete: vi.fn(async () => storedProfile),
    complete: vi.fn(async () => storedProfile),
  }
  const invitation = {
    findByEmail: vi.fn(async () => INVITATION),
    findByAuthUserId: vi.fn(async () => INVITATION),
    create: vi.fn(async () => INVITATION),
    accept: vi.fn(async () => undefined),
  }
  return { ports: { auth, profile: profilePort, invitation } as UserLifecyclePorts, auth, profile: profilePort }
}

describe('synthetic pilot identity revocation', () => {
  it('deactivates the profile before removing Auth and returns a redacted receipt', async () => {
    const fake = createPorts()
    const result = await revokeSyntheticPilotIdentity(fake.ports, {
      userId: USER_ID,
      reason: 'synthetic-boundary-test',
      release: 't07-local',
    }, '2026-08-13T12:00:00.000Z')

    expect(result).toMatchObject({
      revoked: true,
      idempotent: false,
      profileDeactivated: true,
      authIdentity: 'removed',
      revokedAt: '2026-08-13T12:00:00.000Z',
    })
    expect(fake.profile.deactivate).toHaveBeenCalledWith(USER_ID)
    expect(fake.auth.deleteUser).toHaveBeenCalledWith(USER_ID)
    expect(fake.profile.deactivate.mock.invocationCallOrder[0]).toBeLessThan(fake.auth.deleteUser.mock.invocationCallOrder[0])
    expect(result.identity).toMatch(/^synthetic-[a-f0-9]+$/)
    expect(result).not.toHaveProperty('email')
  })

  it('is safe to repeat after the profile and Auth identity are already gone', async () => {
    const fake = createPorts({ inactive: true, authMissing: true })
    const result = await revokeSyntheticPilotIdentity(fake.ports, {
      userId: USER_ID,
      reason: 'synthetic-boundary-test',
      release: 't07-local',
    }, '2026-08-13T12:00:00.000Z')

    expect(result).toMatchObject({ revoked: true, idempotent: true, profileDeactivated: false, authIdentity: 'already_missing' })
    expect(fake.profile.deactivate).not.toHaveBeenCalled()
    expect(fake.auth.deleteUser).toHaveBeenCalledWith(USER_ID)
  })

  it('refuses a non-synthetic identity before changing the profile', async () => {
    const fake = createPorts()
    fake.auth.getUserById.mockResolvedValue({ ...AUTH_USER, email: 'real@example.com' })

    await expect(revokeSyntheticPilotIdentity(fake.ports, {
      userId: USER_ID,
      reason: 'synthetic-boundary-test',
      release: 't07-local',
    })).rejects.toMatchObject({ code: 'SYNTHETIC_IDENTITY_REQUIRED' })
    expect(fake.profile.deactivate).not.toHaveBeenCalled()
    expect(fake.auth.deleteUser).not.toHaveBeenCalled()
  })

  it('rejects replay through the invitation seam after profile deactivation', async () => {
    const fake = createPorts({ inactive: true })

    await expect(startOrResumeUserRegistration(fake.ports, {
      email: EMAIL,
      name: 'T07 Sintético',
      role: 'diretor',
      schoolId: SCHOOL_ID,
      invitedBy: ACTOR_ID,
    }, '/primeiro-acesso')).rejects.toMatchObject({ code: 'INVITATION_REVOKED' })
  })
})
