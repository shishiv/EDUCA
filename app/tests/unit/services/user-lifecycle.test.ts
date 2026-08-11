import { describe, expect, it, vi } from 'vitest'
import {
  completePendingUserRegistration,
  isIncompleteUserProfile,
  startOrResumeUserRegistration,
  type UserLifecycleAuthUser,
  type UserLifecycleInvitation,
  type UserLifecyclePorts,
  type UserLifecycleProfile,
} from '@/lib/services/user-lifecycle'

const AUTH_USER: UserLifecycleAuthUser = {
  id: '00000000-0000-0000-0000-000000000101',
  email: 'professor.c09@synthetic.invalid',
  user_metadata: { nome: 'Professora C09' },
}

const INPUT = {
  email: AUTH_USER.email!,
  name: 'Professora C09',
  role: 'professor' as const,
  schoolId: '00000000-0000-0000-0000-000000000001',
  invitedBy: '00000000-0000-0000-0000-000000000001',
}

function invitation(): UserLifecycleInvitation {
  return {
    id: '00000000-0000-0000-0000-000000000201',
    auth_user_id: AUTH_USER.id,
    email: INPUT.email,
    invited_role: INPUT.role,
    escola_id: INPUT.schoolId,
    invited_by: INPUT.invitedBy,
    accepted_at: null,
  }
}

function profile(overrides: Partial<UserLifecycleProfile> = {}): UserLifecycleProfile {
  return {
    id: AUTH_USER.id,
    email: INPUT.email,
    nome: INPUT.name,
    tipo_usuario: INPUT.role,
    escola_id: INPUT.schoolId,
    ativo: true,
    primeiro_login: true,
    senha_padrao: true,
    data_ultimo_acesso: null,
    ...overrides,
  }
}

function createFakePorts(options: { failProfileCreate?: boolean; existingProfile?: UserLifecycleProfile | null } = {}) {
  let pendingInvitation: UserLifecycleInvitation | null = null
  let storedProfile = options.existingProfile ?? null
  let failProfileCreate = options.failProfileCreate ?? false
  const inviteUserByEmail = vi.fn(async () => AUTH_USER)
  const getUserById = vi.fn(async () => AUTH_USER)
  const updatePassword = vi.fn(async () => undefined)
  const deletedIdentity = vi.fn()
  const auth = { inviteUserByEmail, getUserById, updatePassword, deleteUser: deletedIdentity }
  const createIncomplete = vi.fn(async () => {
    if (failProfileCreate) {
      failProfileCreate = false
      throw new Error('profile persistence unavailable')
    }
    storedProfile = profile()
    return storedProfile
  })
  const complete = vi.fn(async (_userId: string, completedAt: string) => {
    storedProfile = profile({ primeiro_login: false, senha_padrao: false, data_ultimo_acesso: completedAt })
    return storedProfile
  })

  const ports: UserLifecyclePorts = {
    auth,
    profile: {
      findById: vi.fn(async () => storedProfile),
      createIncomplete,
      complete,
    },
    invitation: {
      findByEmail: vi.fn(async () => pendingInvitation),
      findByAuthUserId: vi.fn(async () => pendingInvitation),
      create: vi.fn(async () => {
        pendingInvitation = invitation()
        return pendingInvitation
      }),
      accept: vi.fn(async (_invitationId: string, acceptedAt: string) => {
        if (pendingInvitation) pendingInvitation = { ...pendingInvitation, accepted_at: acceptedAt }
      }),
    },
  }

  return { ports, inviteUserByEmail, getUserById, updatePassword, createIncomplete, complete, deletedIdentity }
}

describe('user lifecycle profile recovery', () => {
  it('preserves the Auth identity and records an incomplete invitation when profile persistence fails', async () => {
    const fake = createFakePorts({ failProfileCreate: true })

    await expect(startOrResumeUserRegistration(fake.ports, INPUT, 'https://educa.invalid/primeiro-acesso'))
      .rejects.toMatchObject({ code: 'PROFILE_INCOMPLETE', identityPreserved: true })

    expect(fake.inviteUserByEmail).toHaveBeenCalledTimes(1)
    expect(fake.createIncomplete).toHaveBeenCalledWith(expect.objectContaining({
      id: AUTH_USER.id,
      role: INPUT.role,
      schoolId: INPUT.schoolId,
    }))
    expect(fake.deletedIdentity).not.toHaveBeenCalled()
    expect(fake.ports.invitation.findByEmail).toHaveBeenCalledTimes(1)
  })

  it('retries the missing profile without creating a second Auth identity', async () => {
    const fake = createFakePorts({ failProfileCreate: true })

    await expect(startOrResumeUserRegistration(fake.ports, INPUT, '/primeiro-acesso')).rejects.toMatchObject({
      code: 'PROFILE_INCOMPLETE',
    })
    const result = await startOrResumeUserRegistration(fake.ports, INPUT, '/primeiro-acesso')

    expect(result).toMatchObject({ created: false, resumed: true, status: 'incomplete' })
    expect(result.profile?.id).toBe(AUTH_USER.id)
    expect(fake.inviteUserByEmail).toHaveBeenCalledTimes(1)
    expect(fake.getUserById).toHaveBeenCalledWith(AUTH_USER.id)
  })

  it('treats duplicate pending submission as the same registration', async () => {
    const fake = createFakePorts()

    const first = await startOrResumeUserRegistration(fake.ports, INPUT, '/primeiro-acesso')
    const duplicate = await startOrResumeUserRegistration(fake.ports, INPUT, '/primeiro-acesso')

    expect(first.created).toBe(true)
    expect(duplicate).toMatchObject({ created: false, resumed: false, status: 'incomplete' })
    expect(fake.inviteUserByEmail).toHaveBeenCalledTimes(1)
    expect(fake.createIncomplete).toHaveBeenCalledTimes(1)
  })

  it('resumes first access with the same authenticated identity after a missing profile', async () => {
    const fake = createFakePorts({ failProfileCreate: true })
    await expect(startOrResumeUserRegistration(fake.ports, INPUT, '/primeiro-acesso')).rejects.toMatchObject({
      code: 'PROFILE_INCOMPLETE',
    })

    const result = await completePendingUserRegistration(fake.ports, AUTH_USER, 'New-Password-2026!', '2026-08-12T12:00:00.000Z')

    expect(result).toMatchObject({ completed: true, resumedProfile: true, idempotentReplay: false })
    expect(result.profile.id).toBe(AUTH_USER.id)
    expect(fake.updatePassword).toHaveBeenCalledTimes(1)
    expect(fake.inviteUserByEmail).toHaveBeenCalledTimes(1)
  })

  it('keeps a completed profile and invitation retry idempotent after the password already changed', async () => {
    const fake = createFakePorts({ existingProfile: profile({ primeiro_login: false, senha_padrao: false }) })
    await startOrResumeUserRegistration(fake.ports, INPUT, '/primeiro-acesso')
    fake.updatePassword.mockRejectedValueOnce({ code: 'same_password', message: 'same password' })

    const result = await completePendingUserRegistration(fake.ports, AUTH_USER, 'New-Password-2026!', '2026-08-12T12:00:00.000Z')

    expect(result).toMatchObject({ completed: true, idempotentReplay: true })
    expect(fake.ports.invitation.accept).toHaveBeenCalledTimes(1)
  })

  it('does not mistake an empty profile for an authorized profile', () => {
    expect(isIncompleteUserProfile(null)).toBe(true)
    expect(isIncompleteUserProfile(profile({ primeiro_login: true }))).toBe(true)
    expect(isIncompleteUserProfile(profile({ primeiro_login: false }))).toBe(false)
  })
})
