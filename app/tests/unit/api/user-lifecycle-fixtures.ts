import {
  UserLifecycleError,
  type UserLifecycleAuthRemoval,
  type UserLifecycleAuthUser,
  type UserLifecycleInvitation,
  type UserLifecyclePorts,
  type UserLifecycleProfile,
} from '@/lib/services/user-lifecycle'

export interface MemoryUserLifecycleFixtureOptions {
  authUser: UserLifecycleAuthUser
  profile: UserLifecycleProfile | null
  invitation: UserLifecycleInvitation | null
  profileCreationFailures?: number
}

export interface MemoryUserLifecycleActivity {
  invitationsCreated: number
  profileCreationAttempts: number
  profilesDeactivated: number
  identitiesDeleted: number
}

export interface MemoryUserLifecycleFixture {
  ports: UserLifecyclePorts
  activity: MemoryUserLifecycleActivity
  currentProfile(): UserLifecycleProfile | null
}

/** Faithful in-memory lifecycle adapter for handler seams. */
export function createMemoryUserLifecycleFixture(options: MemoryUserLifecycleFixtureOptions): MemoryUserLifecycleFixture {
  let profile = options.profile
  let invitation = options.invitation
  let identityAvailable = true
  let remainingProfileCreationFailures = options.profileCreationFailures ?? 0
  const activity: MemoryUserLifecycleActivity = {
    invitationsCreated: 0,
    profileCreationAttempts: 0,
    profilesDeactivated: 0,
    identitiesDeleted: 0,
  }

  const ports: UserLifecyclePorts = {
    auth: {
      async inviteUserByEmail() {
        if (!identityAvailable) throw new UserLifecycleError('AUTH_USER_MISSING', 'Synthetic identity was revoked.')
        return options.authUser
      },
      async getUserById() {
        if (!identityAvailable) throw new UserLifecycleError('AUTH_USER_MISSING', 'Synthetic identity was revoked.')
        return options.authUser
      },
      async deleteUser(): Promise<UserLifecycleAuthRemoval> {
        activity.identitiesDeleted += 1
        if (!identityAvailable) return 'already_missing'
        identityAvailable = false
        return 'removed'
      },
      async updatePassword() {},
    },
    profile: {
      async findById() {
        return profile
      },
      async createIncomplete(input) {
        activity.profileCreationAttempts += 1
        if (remainingProfileCreationFailures > 0) {
          remainingProfileCreationFailures -= 1
          throw new Error('Synthetic profile persistence failure')
        }
        profile = {
          id: input.id,
          email: input.email,
          nome: input.name,
          tipo_usuario: input.role,
          escola_id: input.schoolId,
          ativo: true,
          primeiro_login: true,
          senha_padrao: true,
          data_ultimo_acesso: null,
        }
        return profile
      },
      async complete(userId, completedAt) {
        if (!profile || profile.id !== userId) throw new UserLifecycleError('PROFILE_NOT_FOUND', 'Synthetic profile is missing.')
        profile = {
          ...profile,
          primeiro_login: false,
          senha_padrao: false,
          data_ultimo_acesso: completedAt,
        }
        return profile
      },
      async deactivate(userId) {
        if (!profile || profile.id !== userId) throw new UserLifecycleError('PROFILE_NOT_FOUND', 'Synthetic profile is missing.')
        activity.profilesDeactivated += 1
        profile = { ...profile, ativo: false }
        return profile
      },
    },
    invitation: {
      async findByEmail() {
        return invitation
      },
      async findByAuthUserId() {
        return invitation
      },
      async create(input) {
        activity.invitationsCreated += 1
        invitation = {
          id: '00000000-0000-0000-0000-000000000201',
          auth_user_id: input.authUserId,
          email: input.email,
          invited_role: input.role,
          escola_id: input.schoolId,
          invited_by: input.invitedBy,
          accepted_at: null,
        }
        return invitation
      },
      async accept(invitationId, acceptedAt) {
        if (!invitation || invitation.id !== invitationId) {
          throw new UserLifecycleError('INVITATION_REQUIRED', 'Synthetic invitation is missing.')
        }
        invitation = { ...invitation, accepted_at: acceptedAt }
      },
    },
  }

  return { ports, activity, currentProfile: () => profile }
}
