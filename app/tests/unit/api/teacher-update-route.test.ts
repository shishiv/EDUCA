import { describe, expect, it } from 'vitest'
import {
  createManagedTeacherHandler,
  type ManagedTeacherHandlerDependencies,
  type ManagedTeacherInput,
  type ManagedTeacherPersistResult,
  type ManagedTeacherStore,
  type ManagedTeacherTarget,
} from '@/app/api/users/[userId]/handler'
import type { PilotActor, PilotUserRole } from '@/lib/pilot/pilot-server-auth'

const USER_ID = '20000000-0000-0000-0000-000000000004'
const SCHOOL_A = '10000000-0000-0000-0000-000000000001'
const SCHOOL_B = '10000000-0000-0000-0000-000000000002'
const ADMIN: PilotActor = {
  id: 'admin-id',
  name: 'Admin',
  email: 'admin@synthetic.invalid',
  role: 'admin',
  schoolId: null,
}
const validInput: ManagedTeacherInput = {
  nome: 'Professora Atualizada',
  email: 'professora.atualizada@synthetic.invalid',
  tipo_usuario: 'professor',
  escola_id: SCHOOL_A,
}

class MemoryManagedTeacherStore implements ManagedTeacherStore {
  auditCalls = 0
  findCalls = 0
  persistCalls = 0
  schoolChecks = 0

  constructor(
    private readonly target: ManagedTeacherTarget | null,
    private readonly options: {
      auditReceipt?: string | null
      emailConflict?: boolean
      schoolActive?: boolean
    } = {},
  ) {}

  async audit(): Promise<string | null> {
    this.auditCalls += 1
    return this.options.auditReceipt === undefined ? 'audit-id' : this.options.auditReceipt
  }

  async find(): Promise<ManagedTeacherTarget | null> {
    this.findCalls += 1
    return this.target
  }

  async hasActiveSchool(): Promise<boolean> {
    this.schoolChecks += 1
    return this.options.schoolActive ?? true
  }

  async persist(_target: ManagedTeacherTarget, input: ManagedTeacherInput): Promise<ManagedTeacherPersistResult> {
    this.persistCalls += 1
    if (this.options.emailConflict) return { kind: 'email_conflict' }
    return {
      kind: 'updated',
      user: {
        id: USER_ID,
        ...input,
        ativo: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    }
  }
}

type ManagedTeacherRequestBody = ManagedTeacherInput & { ativo?: boolean }

function request(body: ManagedTeacherRequestBody = validInput, userId = USER_ID): Request {
  return new Request(`http://test/api/users/${userId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createActorResolver(actor: PilotActor): ManagedTeacherHandlerDependencies['requireActor'] {
  return async (roles: PilotUserRole[]) => {
    if (!roles.includes(actor.role)) throw new Error('PILOT_ROLE_DENIED')
    return actor
  }
}

function createRoute(store: MemoryManagedTeacherStore, actor: PilotActor = ADMIN) {
  return createManagedTeacherHandler({
    requireActor: createActorResolver(actor),
    store: () => store,
  })
}

function teacherTarget(escola_id = SCHOOL_A): ManagedTeacherTarget {
  return {
    id: USER_ID,
    email: 'professora.a@synthetic.invalid',
    tipo_usuario: 'professor',
    escola_id,
  }
}

describe('teacher update route', () => {
  it('persists a validated teacher and returns the audit receipt', async () => {
    const store = new MemoryManagedTeacherStore(teacherTarget())
    const response = await createRoute(store)(request(), { params: Promise.resolve({ userId: USER_ID }) })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      user: expect.objectContaining(validInput),
      receipt: 'audit-id',
    })
    expect(store).toMatchObject({ findCalls: 1, schoolChecks: 1, persistCalls: 1, auditCalls: 1 })
  })

  it('does not open the store boundary for an unauthorized actor', async () => {
    const store = new MemoryManagedTeacherStore(teacherTarget())
    const response = await createRoute(store, { ...ADMIN, role: 'diretor', schoolId: SCHOOL_A })(request(), {
      params: Promise.resolve({ userId: USER_ID }),
    })

    expect(response.status).toBe(403)
    expect(store).toMatchObject({ findCalls: 0, schoolChecks: 0, persistCalls: 0, auditCalls: 0 })
  })

  it('rejects cross-school targets without persistence', async () => {
    const store = new MemoryManagedTeacherStore(teacherTarget(SCHOOL_B))
    const response = await createRoute(store, { ...ADMIN, schoolId: SCHOOL_A })(request({ ...validInput, escola_id: SCHOOL_B }), {
      params: Promise.resolve({ userId: USER_ID }),
    })

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'TEACHER_UPDATE_SCHOOL_DENIED' })
    expect(store).toMatchObject({ findCalls: 1, schoolChecks: 0, persistCalls: 0, auditCalls: 0 })
  })

  it('rejects role or school reassignment without persistence', async () => {
    const schoolStore = new MemoryManagedTeacherStore(teacherTarget())
    const schoolResponse = await createRoute(schoolStore)(request({ ...validInput, escola_id: SCHOOL_B }), {
      params: Promise.resolve({ userId: USER_ID }),
    })
    expect(schoolResponse.status).toBe(403)
    expect(await schoolResponse.json()).toEqual({ error: 'TEACHER_UPDATE_ASSIGNMENT_DENIED' })
    expect(schoolStore).toMatchObject({ findCalls: 1, schoolChecks: 0, persistCalls: 0, auditCalls: 0 })

    const roleStore = new MemoryManagedTeacherStore(teacherTarget())
    const roleResponse = await createRoute(roleStore)(request({ ...validInput, tipo_usuario: 'diretor' }), {
      params: Promise.resolve({ userId: USER_ID }),
    })
    expect(roleResponse.status).toBe(403)
    expect(await roleResponse.json()).toEqual({ error: 'TEACHER_UPDATE_ASSIGNMENT_DENIED' })
    expect(roleStore).toMatchObject({ findCalls: 1, schoolChecks: 0, persistCalls: 0, auditCalls: 0 })
  })

  it('rejects malformed input and inactive target schools before persistence', async () => {
    const malformedStore = new MemoryManagedTeacherStore(teacherTarget())
    const malformed = await createRoute(malformedStore)(request({ ...validInput, email: 'invalid', ativo: false }), {
      params: Promise.resolve({ userId: USER_ID }),
    })
    expect(malformed.status).toBe(400)
    expect(malformedStore).toMatchObject({ findCalls: 0, schoolChecks: 0, persistCalls: 0, auditCalls: 0 })

    const inactiveStore = new MemoryManagedTeacherStore(teacherTarget(), { schoolActive: false })
    const inactive = await createRoute(inactiveStore)(request(), { params: Promise.resolve({ userId: USER_ID }) })
    expect(inactive.status).toBe(404)
    expect(await inactive.json()).toEqual({ error: 'TEACHER_UPDATE_SCHOOL_NOT_FOUND' })
    expect(inactiveStore).toMatchObject({ findCalls: 1, schoolChecks: 1, persistCalls: 0, auditCalls: 0 })
  })

  it('does not report success when persistence conflicts or the audit receipt fails', async () => {
    const conflictStore = new MemoryManagedTeacherStore(teacherTarget(), { emailConflict: true })
    const conflict = await createRoute(conflictStore)(request(), { params: Promise.resolve({ userId: USER_ID }) })
    expect(conflict.status).toBe(409)
    expect(await conflict.json()).toEqual({ error: 'TEACHER_UPDATE_EMAIL_CONFLICT' })
    expect(conflictStore).toMatchObject({ persistCalls: 1, auditCalls: 0 })

    const auditStore = new MemoryManagedTeacherStore(teacherTarget(), { auditReceipt: null })
    const auditFailure = await createRoute(auditStore)(request(), { params: Promise.resolve({ userId: USER_ID }) })
    expect(auditFailure.status).toBe(503)
    expect(await auditFailure.json()).toEqual({ error: 'TEACHER_UPDATE_AUDIT_INCOMPLETE', completed: false })
    expect(auditStore).toMatchObject({ persistCalls: 1, auditCalls: 1 })
  })
})
