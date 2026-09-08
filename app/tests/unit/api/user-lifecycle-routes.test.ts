import { describe, expect, it } from 'vitest'
import {
  createInvitationHandler,
  type DemoInvitationAdapter,
  type InvitationHandlerDependencies,
  type InvitationRouteInput,
  type PilotInvitationAdapter,
} from '@/app/api/pilot/invitations/handler'
import type { DemoActionAuditReceipt } from '@/lib/demo-sandbox/demo-audit'
import type { PilotActor, PilotUserRole } from '@/lib/pilot/pilot-server-auth'
import {
  startOrResumeUserRegistration,
  type UserLifecycleInvitation,
  type UserLifecycleRegistrationResult,
} from '@/lib/services/user-lifecycle'
import { createMemoryUserLifecycleFixture } from './user-lifecycle-fixtures'

const ACTOR_ID = '00000000-0000-0000-0000-000000000001'
const AUTH_USER_ID = '00000000-0000-0000-0000-000000000101'
const SCHOOL_ID = '00000000-0000-0000-0000-000000000301'
const AUTH_USER = {
  id: AUTH_USER_ID,
  email: 'c09-route@synthetic.invalid',
  user_metadata: { nome: 'Usuário C09' },
}
const MUNICIPAL_SECRETARY: PilotActor = {
  id: ACTOR_ID,
  name: 'Secretaria',
  role: 'secretario',
  schoolId: null,
  email: 'secretaria@synthetic.invalid',
}

class MemoryPilotInvitationAdapter implements PilotInvitationAdapter {
  readonly auditInputs: UserLifecycleInvitation[] = []
  readonly registrationInputs: Array<{ input: InvitationRouteInput; invitedBy: string }> = []

  constructor(
    private readonly schoolIds: ReadonlySet<string>,
    private readonly lifecycle = createMemoryUserLifecycleFixture({ authUser: AUTH_USER, profile: null, invitation: null }),
    private auditSucceeds = true,
  ) {}

  async hasActiveSchool(schoolId: string): Promise<boolean> {
    return this.schoolIds.has(schoolId)
  }

  async startRegistration(input: InvitationRouteInput, invitedBy: string): Promise<UserLifecycleRegistrationResult> {
    this.registrationInputs.push({ input, invitedBy })
    return startOrResumeUserRegistration(
      this.lifecycle.ports,
      { ...input, invitedBy },
      'http://127.0.0.1:3000/primeiro-acesso',
    )
  }

  async ensureInvitationAudit(invitation: UserLifecycleInvitation): Promise<boolean> {
    this.auditInputs.push(invitation)
    return this.auditSucceeds
  }

  recoverAuditStorage() {
    this.auditSucceeds = true
  }

  currentProfile() {
    return this.lifecycle.currentProfile()
  }

  activity() {
    return this.lifecycle.activity
  }
}

class MemoryDemoInvitationAdapter implements DemoInvitationAdapter {
  async hasActiveSchool(): Promise<boolean> {
    return false
  }

  async recordInterceptedInvitation(): Promise<DemoActionAuditReceipt> {
    return {
      auditId: 'demo-audit',
      correlationId: 'demo-correlation',
      operation: 'demo.auth.invitation',
      outcome: 'simulated_success',
      effectSuppressed: true,
    }
  }
}

function request(input: InvitationRouteInput): Request {
  return new Request('http://test/api/pilot/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
}

function createActorResolver(actor: PilotActor): InvitationHandlerDependencies['requireActor'] {
  return async (allowedRoles: PilotUserRole[]) => {
    if (!allowedRoles.includes(actor.role)) throw new Error('PILOT_ROLE_DENIED')
    return actor
  }
}

function createRoute(adapter: MemoryPilotInvitationAdapter, actor: PilotActor = MUNICIPAL_SECRETARY) {
  const controls = { safetyChecks: 0 }
  const route = createInvitationHandler({
    isDemoSandboxEnabled: () => false,
    enforcePilotSafety: () => { controls.safetyChecks += 1 },
    requireActor: createActorResolver(actor),
    createPilotAdapter: () => adapter,
    createDemoAdapter: () => new MemoryDemoInvitationAdapter(),
  })
  return { route, controls }
}

describe('user lifecycle invitation handler', () => {
  it('preserves the Auth identity after profile failure, resumes its active profile, and rejects a duplicate', async () => {
    const adapter = new MemoryPilotInvitationAdapter(
      new Set<string>(),
      createMemoryUserLifecycleFixture({ authUser: AUTH_USER, profile: null, invitation: null, profileCreationFailures: 1 }),
    )
    const { route, controls } = createRoute(adapter)
    const input: InvitationRouteInput = {
      email: AUTH_USER.email,
      name: 'Usuário C09',
      role: 'secretario',
      schoolId: null,
    }

    const incomplete = await route(request(input))
    const resumed = await route(request(input))
    const duplicate = await route(request(input))

    expect(incomplete.status).toBe(503)
    expect(await incomplete.json()).toMatchObject({
      error: 'PILOT_INVITE_PROFILE_INCOMPLETE',
      completed: false,
      identityPreserved: true,
      registration: { status: 'incomplete', resumePath: '/primeiro-acesso' },
    })
    expect(resumed.status).toBe(200)
    expect(await resumed.json()).toMatchObject({ resumed: true, invitation: { email: AUTH_USER.email } })
    expect(duplicate.status).toBe(409)
    expect(await duplicate.json()).toMatchObject({ error: 'PILOT_INVITE_ALREADY_PENDING' })
    expect(adapter.currentProfile()).toMatchObject({ ativo: true, escola_id: null, tipo_usuario: 'secretario' })
    expect(adapter.activity()).toMatchObject({ invitationsCreated: 1, profileCreationAttempts: 2, identitiesDeleted: 0 })
    expect(controls.safetyChecks).toBe(3)
    expect(adapter.auditInputs).toHaveLength(2)
  })

  it('enforces municipal operator and role-to-school constraints before the lifecycle adapter', async () => {
    const adapter = new MemoryPilotInvitationAdapter(new Set([SCHOOL_ID]))
    const scopedActor: PilotActor = { ...MUNICIPAL_SECRETARY, schoolId: SCHOOL_ID }
    const scopedRoute = createRoute(adapter, scopedActor).route
    const directorWithoutSchool = request({
      email: AUTH_USER.email,
      name: 'Usuário C09',
      role: 'diretor',
      schoolId: null,
    })
    const directorWithSchool = request({
      email: AUTH_USER.email,
      name: 'Usuário C09',
      role: 'diretor',
      schoolId: SCHOOL_ID,
    })

    expect((await scopedRoute(directorWithSchool)).status).toBe(403)
    expect((await createRoute(adapter).route(directorWithoutSchool)).status).toBe(400)
    expect(adapter.registrationInputs).toEqual([])
  })

  it('requires an active school and a persisted audit receipt before reporting invitation success', async () => {
    const missingSchoolAdapter = new MemoryPilotInvitationAdapter(new Set<string>())
    const auditFailureAdapter = new MemoryPilotInvitationAdapter(new Set([SCHOOL_ID]), undefined, false)
    const input: InvitationRouteInput = {
      email: AUTH_USER.email,
      name: 'Usuário C09',
      role: 'diretor',
      schoolId: SCHOOL_ID,
    }

    const missingSchool = await createRoute(missingSchoolAdapter).route(request(input))
    const auditFailure = await createRoute(auditFailureAdapter).route(request(input))

    expect(missingSchool.status).toBe(404)
    expect(await missingSchool.json()).toEqual({ error: 'PILOT_INVITE_SCHOOL_NOT_FOUND' })
    expect(missingSchoolAdapter.registrationInputs).toEqual([])
    expect(auditFailure.status).toBe(503)
    expect(await auditFailure.json()).toEqual({ error: 'PILOT_INVITE_AUDIT_INCOMPLETE', completed: false })
    expect(auditFailureAdapter.auditInputs).toHaveLength(1)
    expect(auditFailureAdapter.currentProfile()).toMatchObject({ ativo: true, escola_id: SCHOOL_ID, tipo_usuario: 'diretor' })
  })

  it('repairs an audit failure on retry and never bypasses another failed audit write', async () => {
    const adapter = new MemoryPilotInvitationAdapter(new Set<string>(), undefined, false)
    const { route } = createRoute(adapter)
    const input: InvitationRouteInput = { email: AUTH_USER.email, name: 'Usuário C09', role: 'secretario', schoolId: null }
    expect((await route(request(input))).status).toBe(503)
    expect((await route(request(input))).status).toBe(503)
    adapter.recoverAuditStorage()
    expect((await route(request(input))).status).toBe(409)
    expect(adapter.auditInputs).toHaveLength(3)
    expect(adapter.activity()).toMatchObject({ invitationsCreated: 1, profileCreationAttempts: 1, identitiesDeleted: 0 })
  })

})
