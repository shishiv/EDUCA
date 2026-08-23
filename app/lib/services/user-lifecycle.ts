/**
 * User Lifecycle - invitation, first access, profile completion, and revocation.
 *
 * This module implements the full user registration lifecycle for the
 * synthetic pilot: invite → first access → password change → active profile.
 * It also owns the revocation path for synthetic identities.
 *
 * ## Authentication
 *
 * Operations use a **service-role** Supabase client (passed via ports) for
 * admin operations (invite, delete) and a **session** client for user-facing
 * operations (password change).  Never use the browser client directly.
 *
 * ## Error handling
 *
 * All lifecycle failures throw {@link UserLifecycleError} with a typed `code`.
 * The error preserves the Auth identity (`identityPreserved = true`) and
 * provides a `resumePath` for the UI to redirect the user.
 *
 * ## Mode availability
 *
 * Pilot only.  Revocation requires synthetic `.invalid` identities.
 *
 * @module services/user-lifecycle
 */
import { createHash } from 'node:crypto'

/**
 * User lifecycle orchestration for Auth identities, profiles, invitations, and first access.
 *
 * A pending invitation is the durable incomplete-registration marker. Auth identities
 * are never deleted when a profile write fails, so the same identity can resume.
 */

export type UserLifecycleRole = 'secretario' | 'diretor' | 'professor'

export interface UserLifecycleAuthUser {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

export type UserLifecycleAuthRemoval = 'removed' | 'already_missing'

export interface UserLifecycleInvitation {
  id: string
  auth_user_id: string
  email: string
  invited_role: UserLifecycleRole
  escola_id: string | null
  invited_by: string
  accepted_at: string | null
  created_at?: string | null
}

export interface UserLifecycleProfile {
  id: string
  email: string | null
  nome: string
  tipo_usuario: string
  escola_id: string | null
  ativo: boolean | null
  primeiro_login: boolean | null
  senha_padrao: boolean | null
  data_ultimo_acesso: string | null
}

export interface UserLifecycleRegistrationInput {
  email: string
  name: string
  role: UserLifecycleRole
  schoolId: string | null
  invitedBy: string
}

export interface UserLifecycleProfileInput {
  id: string
  email: string
  name: string
  role: UserLifecycleRole
  schoolId: string | null
}

export interface UserLifecycleAuthPort {
  inviteUserByEmail(input: {
    email: string
    redirectTo: string
    data: Record<string, unknown>
  }): Promise<UserLifecycleAuthUser>
  getUserById(userId: string): Promise<UserLifecycleAuthUser>
  deleteUser(userId: string): Promise<UserLifecycleAuthRemoval>
  updatePassword(password: string): Promise<void>
}

export interface UserLifecycleProfilePort {
  findById(userId: string): Promise<UserLifecycleProfile | null>
  createIncomplete(input: UserLifecycleProfileInput): Promise<UserLifecycleProfile>
  complete(userId: string, completedAt: string): Promise<UserLifecycleProfile>
  deactivate(userId: string): Promise<UserLifecycleProfile>
}

export interface UserLifecycleInvitationPort {
  findByEmail(email: string): Promise<UserLifecycleInvitation | null>
  findByAuthUserId(userId: string): Promise<UserLifecycleInvitation | null>
  create(input: {
    authUserId: string
    email: string
    role: UserLifecycleRole
    schoolId: string | null
    invitedBy: string
  }): Promise<UserLifecycleInvitation>
  accept(invitationId: string, acceptedAt: string): Promise<void>
}

export interface UserLifecyclePorts {
  auth: UserLifecycleAuthPort
  profile: UserLifecycleProfilePort
  invitation: UserLifecycleInvitationPort
}

interface SupabaseLifecycleQueryResult {
  data: unknown
  error: unknown | null
}

interface SupabaseLifecycleQuery {
  select(columns?: string): SupabaseLifecycleQuery
  eq(column: string, value: string | boolean | null): SupabaseLifecycleQuery
  order(column: string, options?: { ascending?: boolean }): SupabaseLifecycleQuery
  limit(count: number): SupabaseLifecycleQuery
  insert(values: Record<string, unknown>): SupabaseLifecycleQuery
  upsert(values: Record<string, unknown>, options?: { onConflict?: string }): SupabaseLifecycleQuery
  update(values: Record<string, unknown>): SupabaseLifecycleQuery
  maybeSingle(): Promise<SupabaseLifecycleQueryResult>
  single(): Promise<SupabaseLifecycleQueryResult>
}

interface SupabaseLifecycleClient {
  from(table: string): SupabaseLifecycleQuery
  auth: {
    admin: {
      inviteUserByEmail(
        email: string,
        options: { redirectTo: string; data: Record<string, unknown> },
      ): Promise<{ data: { user: UserLifecycleAuthUser | null }; error: unknown | null }>
      getUserById(userId: string): Promise<{ data: { user: UserLifecycleAuthUser | null }; error: unknown | null }>
      deleteUser(userId: string, shouldSoftDelete?: boolean): Promise<{ data: { user: UserLifecycleAuthUser | null }; error: unknown | null }>
    }
    updateUser(attributes: { password: string }): Promise<{ data: unknown; error: unknown | null }>
  }
}

/** Builds lifecycle ports over the server service client and the signed-in client. */
export function createSupabaseUserLifecyclePorts(clients: {
  serviceClient: unknown
  sessionClient: unknown
}): UserLifecyclePorts {
  const serviceClient = clients.serviceClient as SupabaseLifecycleClient
  const sessionClient = clients.sessionClient as SupabaseLifecycleClient

  return {
    auth: {
      async inviteUserByEmail(input) {
        const response = await serviceClient.auth.admin.inviteUserByEmail(input.email, {
          redirectTo: input.redirectTo,
          data: input.data,
        })
        if (response.error) throw response.error
        if (!response.data.user) {
          throw new UserLifecycleError('AUTH_USER_MISSING', 'O convite não retornou uma identidade Auth.')
        }
        return response.data.user
      },
      async getUserById(userId) {
        const response = await serviceClient.auth.admin.getUserById(userId)
        if (response.error) throw response.error
        if (!response.data.user) {
          throw new UserLifecycleError('AUTH_USER_MISSING', 'A identidade Auth do cadastro não existe.')
        }
        return response.data.user
      },
      async deleteUser(userId) {
        const response = await serviceClient.auth.admin.deleteUser(userId, false)
        if (response.error) {
          if (isAuthUserMissingError(response.error)) return 'already_missing'
          throw response.error
        }
        return response.data.user ? 'removed' : 'already_missing'
      },
      async updatePassword(password) {
        const response = await sessionClient.auth.updateUser({ password })
        if (response.error) throw response.error
      },
    },
    profile: {
      async findById(userId) {
        const response = await serviceClient
          .from('users')
          .select('id,email,nome,tipo_usuario,escola_id,ativo,primeiro_login,senha_padrao,data_ultimo_acesso')
          .eq('id', userId)
          .maybeSingle()
        return readSupabaseLifecycleData<UserLifecycleProfile | null>(response)
      },
      async createIncomplete(input) {
        const response = await serviceClient
          .from('users')
          .upsert({
            id: input.id,
            email: input.email,
            nome: input.name,
            tipo_usuario: input.role,
            escola_id: input.schoolId,
            ativo: true,
            primeiro_login: true,
            senha_padrao: true,
          }, { onConflict: 'id' })
          .select('id,email,nome,tipo_usuario,escola_id,ativo,primeiro_login,senha_padrao,data_ultimo_acesso')
          .single()
        const profile = readSupabaseLifecycleData<UserLifecycleProfile | null>(response)
        if (!profile) throw new Error('USER_LIFECYCLE_PROFILE_WRITE_EMPTY')
        return profile
      },
      async complete(userId, completedAt) {
        const response = await serviceClient
          .from('users')
          .update({ primeiro_login: false, senha_padrao: false, data_ultimo_acesso: completedAt })
          .eq('id', userId)
          .select('id,email,nome,tipo_usuario,escola_id,ativo,primeiro_login,senha_padrao,data_ultimo_acesso')
          .single()
        const profile = readSupabaseLifecycleData<UserLifecycleProfile | null>(response)
        if (!profile) throw new Error('USER_LIFECYCLE_PROFILE_UPDATE_EMPTY')
        return profile
      },
      async deactivate(userId) {
        const response = await serviceClient
          .from('users')
          .update({ ativo: false })
          .eq('id', userId)
          .select('id,email,nome,tipo_usuario,escola_id,ativo,primeiro_login,senha_padrao,data_ultimo_acesso')
          .maybeSingle()
        const profile = readSupabaseLifecycleData<UserLifecycleProfile | null>(response)
        if (!profile) throw new UserLifecycleError('PROFILE_NOT_FOUND', 'O perfil sintético não existe.')
        return profile
      },
    },
    invitation: {
      async findByEmail(email) {
        const response = await serviceClient
          .from('pilot_user_invitations')
          .select('id,auth_user_id,email,invited_role,escola_id,invited_by,accepted_at,created_at')
          .eq('email', email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        return readSupabaseLifecycleData<UserLifecycleInvitation | null>(response)
      },
      async findByAuthUserId(userId) {
        const response = await serviceClient
          .from('pilot_user_invitations')
          .select('id,auth_user_id,email,invited_role,escola_id,invited_by,accepted_at,created_at')
          .eq('auth_user_id', userId)
          .maybeSingle()
        return readSupabaseLifecycleData<UserLifecycleInvitation | null>(response)
      },
      async create(input) {
        const response = await serviceClient
          .from('pilot_user_invitations')
          .insert({
            auth_user_id: input.authUserId,
            email: input.email,
            invited_role: input.role,
            escola_id: input.schoolId,
            invited_by: input.invitedBy,
          })
          .select('id,auth_user_id,email,invited_role,escola_id,invited_by,accepted_at,created_at')
          .single()
        const invitation = readSupabaseLifecycleData<UserLifecycleInvitation | null>(response)
        if (!invitation) throw new Error('USER_LIFECYCLE_INVITATION_WRITE_EMPTY')
        return invitation
      },
      async accept(invitationId, acceptedAt) {
        const response = await serviceClient
          .from('pilot_user_invitations')
          .update({ accepted_at: acceptedAt })
          .eq('id', invitationId)
          .select('id')
          .maybeSingle()
        const accepted = readSupabaseLifecycleData<{ id: string } | null>(response)
        if (!accepted) throw new Error('USER_LIFECYCLE_INVITATION_UPDATE_EMPTY')
      },
    },
  }
}

function readSupabaseLifecycleData<T>(response: SupabaseLifecycleQueryResult): T {
  if (response.error) throw response.error
  return response.data as T
}

export type UserLifecycleErrorCode =
  | 'AUTH_USER_MISSING'
  | 'AUTH_USER_ALREADY_REGISTERED'
  | 'INVITATION_REQUIRED'
  | 'INVITATION_ALREADY_ACCEPTED'
  | 'INVITATION_PERSISTENCE_FAILED'
  | 'PROFILE_INCOMPLETE'
  | 'PROFILE_COMPLETION_FAILED'
  | 'INVITATION_COMPLETION_FAILED'
  | 'FIRST_ACCESS_PASSWORD_UNCHANGED'
  | 'PROFILE_NOT_FOUND'
  | 'PROFILE_REVOCATION_FAILED'
  | 'AUTH_IDENTITY_REVOCATION_FAILED'
  | 'SYNTHETIC_IDENTITY_REQUIRED'
  | 'USER_ROLE_NOT_REVOCABLE'
  | 'REVOCATION_RECEIPT_INVALID'
  | 'INVITATION_REVOKED'

/** Error for a lifecycle transition that preserves the real Auth identity. */
export class UserLifecycleError extends Error {
  readonly code: UserLifecycleErrorCode
  readonly identityPreserved = true
  readonly resumePath = '/primeiro-acesso'

  constructor(code: UserLifecycleErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'UserLifecycleError'
    this.code = code
  }
}

export interface UserLifecycleRegistrationResult {
  status: 'incomplete'
  invitation: UserLifecycleInvitation
  profile: UserLifecycleProfile | null
  created: boolean
  resumed: boolean
}

export interface UserLifecycleCompletionResult {
  completed: true
  invitation: UserLifecycleInvitation
  profile: UserLifecycleProfile
  resumedProfile: boolean
  idempotentReplay: boolean
}

export interface UserLifecycleRevocationInput {
  userId: string
  reason: string
  release: string
}

export interface UserLifecycleRevocationResult {
  revoked: true
  idempotent: boolean
  profileDeactivated: boolean
  authIdentity: UserLifecycleAuthRemoval
  identity: string
  role: UserLifecycleRole
  schoolId: string | null
  revokedAt: string
}

/** Returns true when the profile or first-access state still needs completion. */
export function isIncompleteUserProfile(profile: UserLifecycleProfile | null): boolean {
  return profile === null || profile.primeiro_login !== false
}

/**
 * Deactivates a synthetic pilot profile before removing its Auth identity.
 *
 * Supabase access JWTs cannot be assumed to invalidate immediately after Auth
 * deletion, so every observable boundary must continue checking ativo.
 */
export async function revokeSyntheticPilotIdentity(
  ports: UserLifecyclePorts,
  input: UserLifecycleRevocationInput,
  revokedAt = new Date().toISOString(),
): Promise<UserLifecycleRevocationResult> {
  if (!isSafeLifecycleReceiptCode(input.release) || !isSafeLifecycleReceiptCode(input.reason) || input.reason.length < 3) {
    throw new UserLifecycleError(
      'REVOCATION_RECEIPT_INVALID',
      'O recibo de revogação exige identificadores seguros.',
    )
  }

  const currentProfile = await ports.profile.findById(input.userId)
  if (!currentProfile) {
    throw new UserLifecycleError('PROFILE_NOT_FOUND', 'O perfil sintético não existe.')
  }

  let authUser: UserLifecycleAuthUser | null = null
  try {
    authUser = await ports.auth.getUserById(input.userId)
  } catch (error) {
    if (!isAuthUserMissingLifecycleError(error)) throw error
  }

  if (!isSyntheticPilotIdentity(authUser?.email ?? currentProfile.email)) {
    throw new UserLifecycleError(
      'SYNTHETIC_IDENTITY_REQUIRED',
      'A revogação exige uma identidade sintética .invalid.',
    )
  }

  if (!isRevocablePilotRole(currentProfile.tipo_usuario)) {
    throw new UserLifecycleError(
      'USER_ROLE_NOT_REVOCABLE',
      'A revogação exige um papel de usuário do piloto.',
    )
  }

  const profileDeactivated = currentProfile.ativo === true
  if (profileDeactivated) {
    try {
      await ports.profile.deactivate(input.userId)
    } catch (error) {
      throw new UserLifecycleError(
        'PROFILE_REVOCATION_FAILED',
        'O perfil sintético não foi desativado.',
        { cause: error },
      )
    }
  }

  let authIdentity: UserLifecycleAuthRemoval
  try {
    authIdentity = await ports.auth.deleteUser(input.userId)
  } catch (error) {
    throw new UserLifecycleError(
      'AUTH_IDENTITY_REVOCATION_FAILED',
      'A identidade Auth sintética não foi removida.',
      { cause: error },
    )
  }

  return {
    revoked: true,
    idempotent: !profileDeactivated && authIdentity === 'already_missing',
    profileDeactivated,
    authIdentity,
    identity: redactLifecycleIdentity(input.userId),
    role: currentProfile.tipo_usuario,
    schoolId: currentProfile.escola_id,
    revokedAt,
  }
}

/** Resolves a display name without using editable metadata for authorization. */
export function resolveUserLifecycleProfileName(
  authUser: UserLifecycleAuthUser,
  fallbackName: string,
): string {
  const metadataName = authUser.user_metadata?.nome
  if (typeof metadataName === 'string' && metadataName.trim().length >= 2) {
    return metadataName.trim()
  }

  return fallbackName.trim()
}

/** Starts an invitation or resumes its missing profile without creating another identity. */
export async function startOrResumeUserRegistration(
  ports: UserLifecyclePorts,
  input: UserLifecycleRegistrationInput,
  redirectTo: string,
): Promise<UserLifecycleRegistrationResult> {
  const existingInvitation = await ports.invitation.findByEmail(input.email)
  if (existingInvitation) {
    return resumeExistingInvitation(ports, existingInvitation, input.name)
  }

  let authUser: UserLifecycleAuthUser
  try {
    authUser = await ports.auth.inviteUserByEmail({
      email: input.email,
      redirectTo,
      data: {
        synthetic: true,
        pilot_role: input.role,
        pilot_school_id: input.schoolId,
        nome: input.name,
      },
    })
  } catch (error) {
    if (isAlreadyRegisteredError(error)) {
      throw new UserLifecycleError(
        'AUTH_USER_ALREADY_REGISTERED',
        'A identidade Auth já existe e não será apagada.',
        { cause: error },
      )
    }
    throw error
  }

  if (!authUser.id) {
    throw new UserLifecycleError('AUTH_USER_MISSING', 'O convite não retornou uma identidade Auth.')
  }

  let invitation: UserLifecycleInvitation
  try {
    invitation = await ports.invitation.create({
      authUserId: authUser.id,
      email: input.email,
      role: input.role,
      schoolId: input.schoolId,
      invitedBy: input.invitedBy,
    })
  } catch (error) {
    throw new UserLifecycleError(
      'INVITATION_PERSISTENCE_FAILED',
      'A identidade Auth foi preservada, mas o estado do cadastro não foi persistido.',
      { cause: error },
    )
  }

  const profile = await ensureIncompleteProfile(ports, authUser, invitation, input.name)
  return {
    status: 'incomplete',
    invitation,
    profile,
    created: true,
    resumed: false,
  }
}

/** Completes a pending first access, creating the missing profile before changing the password. */
export async function completePendingUserRegistration(
  ports: UserLifecyclePorts,
  authUser: UserLifecycleAuthUser,
  password: string,
  completedAt = new Date().toISOString(),
): Promise<UserLifecycleCompletionResult> {
  const invitation = await ports.invitation.findByAuthUserId(authUser.id)
  if (!invitation) {
    throw new UserLifecycleError(
      'INVITATION_REQUIRED',
      'O primeiro acesso exige um convite pendente.',
    )
  }

  if (invitation.accepted_at) {
    const profile = await ports.profile.findById(authUser.id)
    if (!profile) {
      throw new UserLifecycleError(
        'PROFILE_INCOMPLETE',
        'O convite foi aceito, mas o perfil não está disponível para a sessão.',
      )
    }
    if (profile.ativo !== true) {
      throw new UserLifecycleError(
        'INVITATION_REVOKED',
        'Este convite pertence a uma identidade revogada.',
      )
    }
    return {
      completed: true,
      invitation,
      profile,
      resumedProfile: false,
      idempotentReplay: true,
    }
  }

  const currentProfile = await ports.profile.findById(authUser.id)
  if (currentProfile?.ativo !== true && currentProfile !== null) {
    throw new UserLifecycleError(
      'INVITATION_REVOKED',
      'Este convite pertence a uma identidade revogada.',
    )
  }
  const profile = currentProfile ?? await ensureIncompleteProfile(ports, authUser, invitation, invitation.email)

  try {
    await ports.auth.updatePassword(password)
  } catch (error) {
    if (isSamePasswordError(error) && profile.primeiro_login === false && profile.senha_padrao === false) {
      await acceptInvitation(ports, invitation, completedAt)
      return {
        completed: true,
        invitation: { ...invitation, accepted_at: completedAt },
        profile,
        resumedProfile: currentProfile === null,
        idempotentReplay: true,
      }
    }

    if (isSamePasswordError(error)) {
      throw new UserLifecycleError(
        'FIRST_ACCESS_PASSWORD_UNCHANGED',
        'A nova senha precisa ser diferente da senha temporária.',
        { cause: error },
      )
    }
    throw error
  }

  let completedProfile: UserLifecycleProfile
  try {
    completedProfile = await ports.profile.complete(authUser.id, completedAt)
  } catch (error) {
    throw new UserLifecycleError(
      'PROFILE_COMPLETION_FAILED',
      'A identidade Auth foi preservada, mas o perfil continua incompleto.',
      { cause: error },
    )
  }

  await acceptInvitation(ports, invitation, completedAt)
  return {
    completed: true,
    invitation: { ...invitation, accepted_at: completedAt },
    profile: completedProfile,
    resumedProfile: currentProfile === null,
    idempotentReplay: false,
  }
}

async function resumeExistingInvitation(
  ports: UserLifecyclePorts,
  invitation: UserLifecycleInvitation,
  fallbackName: string,
): Promise<UserLifecycleRegistrationResult> {
  if (invitation.accepted_at) {
    throw new UserLifecycleError(
      'INVITATION_ALREADY_ACCEPTED',
      'Este cadastro já concluiu o primeiro acesso.',
    )
  }

  const profile = await ports.profile.findById(invitation.auth_user_id)
  if (profile) {
    if (profile.ativo !== true) {
      throw new UserLifecycleError(
        'INVITATION_REVOKED',
        'Este convite pertence a uma identidade revogada.',
      )
    }
    return {
      status: 'incomplete',
      invitation,
      profile,
      created: false,
      resumed: false,
    }
  }

  const authUser = await ports.auth.getUserById(invitation.auth_user_id)
  const resumedProfile = await ensureIncompleteProfile(ports, authUser, invitation, fallbackName)
  return {
    status: 'incomplete',
    invitation,
    profile: resumedProfile,
    created: false,
    resumed: true,
  }
}

async function ensureIncompleteProfile(
  ports: UserLifecyclePorts,
  authUser: UserLifecycleAuthUser,
  invitation: UserLifecycleInvitation,
  fallbackName: string,
): Promise<UserLifecycleProfile> {
  const existingProfile = await ports.profile.findById(authUser.id)
  if (existingProfile) return existingProfile

  try {
    return await ports.profile.createIncomplete({
      id: authUser.id,
      email: authUser.email ?? invitation.email,
      name: resolveUserLifecycleProfileName(authUser, fallbackName),
      role: invitation.invited_role,
      schoolId: invitation.escola_id,
    })
  } catch (error) {
    throw new UserLifecycleError(
      'PROFILE_INCOMPLETE',
      'A identidade Auth foi preservada, mas o perfil continua incompleto.',
      { cause: error },
    )
  }
}

async function acceptInvitation(
  ports: UserLifecyclePorts,
  invitation: UserLifecycleInvitation,
  acceptedAt: string,
): Promise<void> {
  try {
    await ports.invitation.accept(invitation.id, acceptedAt)
  } catch (error) {
    throw new UserLifecycleError(
      'INVITATION_COMPLETION_FAILED',
      'O perfil foi concluído, mas o estado do convite continua pendente.',
      { cause: error },
    )
  }
}

function isAlreadyRegisteredError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : readErrorMessage(error)
  return /already (been )?registered|already exists|email_exists/i.test(message)
}

function isAuthUserMissingLifecycleError(error: unknown): boolean {
  if (error instanceof UserLifecycleError) return error.code === 'AUTH_USER_MISSING'
  return isAuthUserMissingError(error)
}

function isAuthUserMissingError(error: unknown): boolean {
  const code = readErrorCode(error)
  const message = readErrorMessage(error)
  const status = readErrorStatus(error)
  return status === 404 || code === 'user_not_found' || /user not found|user does not exist/i.test(message)
}

function readErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = error.status
    return typeof status === 'number' ? status : undefined
  }
  return undefined
}

function isSyntheticPilotIdentity(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.toLowerCase().endsWith('@synthetic.invalid')
}

function isRevocablePilotRole(role: string): role is UserLifecycleRole {
  return role === 'secretario' || role === 'diretor' || role === 'professor'
}

function isSafeLifecycleReceiptCode(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(value)
}

function redactLifecycleIdentity(userId: string): string {
  return `synthetic-${createHash('md5').update(userId).digest('hex').slice(0, 16)}`
}

function isSamePasswordError(error: unknown): boolean {
  if (readErrorCode(error) === 'same_password') return true
  return /same password|senha temporária|password unchanged/i.test(readErrorMessage(error))
}

function readErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message
    return typeof message === 'string' ? message : ''
  }
  return ''
}
