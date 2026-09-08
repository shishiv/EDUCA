import { NextResponse } from 'next/server'
import { z } from 'zod'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { requirePilotActor, type PilotActor, type PilotUserRole } from '@/lib/pilot/pilot-server-auth'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const paramsSchema = z.object({ userId: z.string().uuid() })
const teacherSchema = z.object({
  nome: z.string().trim().min(2, 'Informe um nome com pelo menos 2 caracteres').max(160, 'O nome deve ter no máximo 160 caracteres'),
  email: z.string().trim().email('Informe um e-mail válido').transform(value => value.toLowerCase()),
  tipo_usuario: z.enum(['diretor', 'professor']),
  escola_id: z.string().uuid('Selecione uma escola válida'),
}).strict()

export type ManagedTeacherInput = z.infer<typeof teacherSchema>

export interface ManagedTeacherTarget {
  email: string | null
  escola_id: string | null
  id: string
  tipo_usuario: string
}

export interface ManagedTeacherRecord extends ManagedTeacherTarget {
  ativo: boolean
  created_at: string | null
  nome: string
}

export type ManagedTeacherPersistResult =
  | { kind: 'updated'; user: ManagedTeacherRecord }
  | { kind: 'email_conflict' }
  | { kind: 'not_found' }

export interface ManagedTeacherStore {
  audit(user: Pick<ManagedTeacherRecord, 'escola_id' | 'id'>): Promise<string | null>
  find(userId: string): Promise<ManagedTeacherTarget | null>
  hasActiveSchool(schoolId: string, scopedSchoolId: string | null): Promise<boolean>
  persist(target: ManagedTeacherTarget, input: ManagedTeacherInput): Promise<ManagedTeacherPersistResult>
}

export interface ManagedTeacherHandlerDependencies {
  requireActor(allowedRoles: PilotUserRole[]): Promise<PilotActor>
  store(): ManagedTeacherStore
}

const productionDependencies: ManagedTeacherHandlerDependencies = {
  requireActor: requirePilotActor,
  store: createManagedTeacherStore,
}

/** Applies the managed-teacher route policy while the store owns persistence. */
export function createManagedTeacherHandler(dependencies: ManagedTeacherHandlerDependencies = productionDependencies) {
  return async function PATCH(
    request: Request,
    context: { params: Promise<{ userId: string }> },
  ): Promise<NextResponse> {
    try {
      const actor = await dependencies.requireActor(['admin'])
      const { userId } = paramsSchema.parse(await context.params)
      const input = teacherSchema.parse(await request.json())
      const store = dependencies.store()
      const target = await store.find(userId)
      if (!target) return NextResponse.json({ error: 'TEACHER_UPDATE_NOT_FOUND' }, { status: 404 })

      const scopeError = validateManagedTeacherScope(actor.schoolId, target, input)
      if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 })
      if (!await store.hasActiveSchool(input.escola_id, actor.schoolId)) {
        return NextResponse.json({ error: 'TEACHER_UPDATE_SCHOOL_NOT_FOUND' }, { status: 404 })
      }

      const persisted = await store.persist(target, input)
      if (persisted.kind === 'email_conflict') {
        return NextResponse.json({ error: 'TEACHER_UPDATE_EMAIL_CONFLICT' }, { status: 409 })
      }
      if (persisted.kind === 'not_found') {
        return NextResponse.json({ error: 'TEACHER_UPDATE_NOT_FOUND' }, { status: 404 })
      }

      const receipt = await store.audit(persisted.user)
      if (!receipt) return NextResponse.json({ error: 'TEACHER_UPDATE_AUDIT_INCOMPLETE', completed: false }, { status: 503 })

      return NextResponse.json({ user: persisted.user, receipt })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          error: 'TEACHER_UPDATE_INVALID',
          issues: error.issues.map(issue => ({ path: issue.path, message: issue.message })),
        }, { status: 400 })
      }
      return pilotErrorResponse(error, {
        feature: 'teacher-update',
        fallbackCode: 'TEACHER_UPDATE_FAILED',
      })
    }
  }
}

function validateManagedTeacherScope(
  actorSchoolId: string | null,
  target: ManagedTeacherTarget,
  input: ManagedTeacherInput,
): string | null {
  if (target.tipo_usuario !== 'diretor' && target.tipo_usuario !== 'professor') return 'TEACHER_UPDATE_TARGET_DENIED'
  if (target.tipo_usuario !== input.tipo_usuario || target.escola_id !== input.escola_id) {
    return 'TEACHER_UPDATE_ASSIGNMENT_DENIED'
  }
  if (actorSchoolId !== null && (target.escola_id !== actorSchoolId || input.escola_id !== actorSchoolId)) {
    return 'TEACHER_UPDATE_SCHOOL_DENIED'
  }
  return null
}

function createManagedTeacherStore(): ManagedTeacherStore {
  const service = createServiceRoleClient()
  return {
    async find(userId) {
      const { data, error } = await service
        .from('users')
        .select('id,email,tipo_usuario,escola_id')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    async hasActiveSchool(schoolId, scopedSchoolId) {
      let query = service.from('escolas').select('id').eq('id', schoolId).eq('ativo', true)
      if (scopedSchoolId !== null) query = query.eq('id', scopedSchoolId)
      const { data, error } = await query.maybeSingle()
      if (error) throw error
      return data !== null
    },
    async persist(target, input) {
      const emailChanged = input.email !== target.email
      if (emailChanged) {
        const { error } = await service.auth.admin.updateUserById(target.id, { email: input.email })
        if (error) return { kind: 'email_conflict' }
      }

      let update = service.from('users').update(input).eq('id', target.id)
      update = target.escola_id === null ? update.is('escola_id', null) : update.eq('escola_id', target.escola_id)
      const { data: user, error } = await update
        .select('id,nome,email,tipo_usuario,escola_id,ativo,created_at')
        .maybeSingle()
      if (!error && user) return { kind: 'updated', user }

      if (emailChanged && target.email) await service.auth.admin.updateUserById(target.id, { email: target.email })
      if (error) throw error
      return { kind: 'not_found' }
    },
    async audit(user) {
      const auditClient = await createClient()
      const { data, error } = await asPilotRpcClient(auditClient).rpc('write_pilot_audit_event', {
        p_event_type: 'user_updated',
        p_entity_type: 'user',
        p_entity_id: user.id,
        p_escola_id: user.escola_id ?? undefined,
        p_metadata: {},
      })
      if (error) throw error
      return data
    },
  }
}
