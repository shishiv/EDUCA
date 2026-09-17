import { describe, expect, it } from 'vitest'
import {
  createRevocationHandler,
  type PilotIdentityRevocationAdapter,
  type RevocationHandlerDependencies,
} from '@/app/api/pilot/users/[userId]/revoke/handler'
import type { PilotActor, PilotUserRole } from '@/lib/pilot/pilot-server-auth'
import {
  revokeSyntheticPilotIdentity,
  type UserLifecycleRevocationInput,
  type UserLifecycleRevocationResult,
} from '@/lib/services/user-lifecycle'
import { createMemoryUserLifecycleFixture } from './user-lifecycle-fixtures'

const ACTOR_ID = '00000000-0000-0000-0000-000000000001'
const USER_ID = '00000000-0000-0000-0000-000000000701'
const SCHOOL_ID = '00000000-0000-0000-0000-000000000301'
const MUNICIPAL_SECRETARY: PilotActor = {
  id: ACTOR_ID,
  name: 'Secretaria',
  role: 'secretario',
  schoolId: null,
  email: 'secretaria@synthetic.invalid',
}
const AUTH_USER = {
  id: USER_ID,
  email: 't07-route@synthetic.invalid',
  user_metadata: { synthetic: true },
}
const PROFILE = {
  id: USER_ID,
  email: AUTH_USER.email,
  nome: 'T07 Route Sintético',
  tipo_usuario: 'diretor',
  escola_id: SCHOOL_ID,
  ativo: true,
  primeiro_login: false,
  senha_padrao: false,
  data_ultimo_acesso: null,
}
const INVITATION = {
  id: '00000000-0000-0000-0000-000000000702',
  auth_user_id: USER_ID,
  email: AUTH_USER.email,
  invited_role: 'diretor' as const,
  escola_id: SCHOOL_ID,
  invited_by: ACTOR_ID,
  accepted_at: null,
}

class MemoryRevocationAdapter implements PilotIdentityRevocationAdapter {
  readonly auditInputs: Array<{ input: UserLifecycleRevocationInput; result: UserLifecycleRevocationResult }> = []
  readonly lifecycle = createMemoryUserLifecycleFixture({ authUser: AUTH_USER, profile: PROFILE, invitation: INVITATION })
  revocationCalls = 0

  constructor(private readonly auditSucceeds = true) {}

  async revoke(input: UserLifecycleRevocationInput): Promise<UserLifecycleRevocationResult> {
    this.revocationCalls += 1
    return revokeSyntheticPilotIdentity(this.lifecycle.ports, input, '2026-09-08T12:00:00.000Z')
  }

  async recordRevocationAudit(input: UserLifecycleRevocationInput, result: UserLifecycleRevocationResult): Promise<void> {
    this.auditInputs.push({ input, result })
    if (!this.auditSucceeds) throw new Error('Synthetic audit persistence failure')
  }
}

function request(): Request {
  return new Request('http://test/api/pilot/users/target/revoke', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ release: 't07-local', reason: 'synthetic-boundary-test' }),
  })
}

function createActorResolver(actor: PilotActor): RevocationHandlerDependencies['requireActor'] {
  return async (allowedRoles: PilotUserRole[]) => {
    if (!allowedRoles.includes(actor.role)) throw new Error('PILOT_ROLE_DENIED')
    return actor
  }
}

function createRoute(
  adapter: MemoryRevocationAdapter,
  options: { actor?: PilotActor; demo?: boolean; safetyFailure?: boolean } = {},
) {
  const controls = { safetyChecks: 0 }
  const route = createRevocationHandler({
    isDemoSandboxEnabled: () => options.demo === true,
    enforcePilotSafety: () => {
      controls.safetyChecks += 1
      if (options.safetyFailure === true) throw new Error('PILOT_SAFETY_GATE: synthetic-only pilot mode is required')
    },
    requireActor: createActorResolver(options.actor ?? MUNICIPAL_SECRETARY),
    createAdapter: () => adapter,
  })
  return { route, controls }
}

describe('pilot auth revocation handler', () => {
  it('deactivates the active profile, removes the synthetic identity, and returns a redacted receipt', async () => {
    const adapter = new MemoryRevocationAdapter()
    const response = await createRoute(adapter).route(request(), { params: Promise.resolve({ userId: USER_ID }) })
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
        timestamp: '2026-09-08T12:00:00.000Z',
      },
    })
    expect(Object.keys(body.receipt).sort()).toEqual(['identity', 'reason', 'release', 'role', 'school', 'timestamp'])
    expect(JSON.stringify(body)).not.toMatch(/@|password|senha|token|jwt|phone|telefone|header/i)
    expect(adapter.lifecycle.currentProfile()).toMatchObject({ ativo: false, escola_id: SCHOOL_ID, tipo_usuario: 'diretor' })
    expect(adapter.lifecycle.activity).toMatchObject({ profilesDeactivated: 1, identitiesDeleted: 1 })
    expect(adapter.auditInputs).toHaveLength(1)
  })

  it('keeps demo, safety, municipal scope, and self-revocation gates ahead of the lifecycle adapter', async () => {
    const demoAdapter = new MemoryRevocationAdapter()
    const demo = await createRoute(demoAdapter, { demo: true }).route(request(), { params: Promise.resolve({ userId: USER_ID }) })
    const unsafeAdapter = new MemoryRevocationAdapter()
    const unsafe = await createRoute(unsafeAdapter, { safetyFailure: true }).route(request(), { params: Promise.resolve({ userId: USER_ID }) })
    const scopedAdapter = new MemoryRevocationAdapter()
    const scopedActor: PilotActor = { ...MUNICIPAL_SECRETARY, schoolId: SCHOOL_ID }
    const scoped = await createRoute(scopedAdapter, { actor: scopedActor }).route(request(), { params: Promise.resolve({ userId: USER_ID }) })
    const selfAdapter = new MemoryRevocationAdapter()
    const selfActor: PilotActor = { ...MUNICIPAL_SECRETARY, id: USER_ID }
    const self = await createRoute(selfAdapter, { actor: selfActor }).route(request(), { params: Promise.resolve({ userId: USER_ID }) })

    expect(demo.status).toBe(404)
    expect(unsafe.status).toBe(403)
    expect(scoped.status).toBe(403)
    expect(self.status).toBe(403)
    expect(demoAdapter.revocationCalls).toBe(0)
    expect(unsafeAdapter.revocationCalls).toBe(0)
    expect(scopedAdapter.revocationCalls).toBe(0)
    expect(selfAdapter.revocationCalls).toBe(0)
  })

  it('never reports revocation success when the audit receipt cannot be persisted', async () => {
    const adapter = new MemoryRevocationAdapter(false)
    const response = await createRoute(adapter).route(request(), { params: Promise.resolve({ userId: USER_ID }) })

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'PILOT_AUTH_REVOCATION_FAILED' })
    expect(adapter.revocationCalls).toBe(1)
    expect(adapter.auditInputs).toHaveLength(1)
  })
})
