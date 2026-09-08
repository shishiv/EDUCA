import { NextResponse } from 'next/server'
import { z } from 'zod'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createClient } from '@/lib/supabase/server'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'

const paramsSchema = z.object({ userId: z.string().uuid() })
const teacherSchema = z.object({
  nome: z.string().trim().min(2, 'Informe um nome com pelo menos 2 caracteres').max(160, 'O nome deve ter no máximo 160 caracteres'),
  email: z.string().trim().email('Informe um e-mail válido').transform(value => value.toLowerCase()),
  tipo_usuario: z.enum(['diretor', 'professor']),
  escola_id: z.string().uuid('Selecione uma escola válida'),
}).strict()

type ServiceClient = ReturnType<typeof createServiceRoleClient>

async function findManagedTeacher(service: ServiceClient, userId: string) {
  const { data, error } = await service
    .from('users')
    .select('id,email,tipo_usuario,escola_id')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

async function validateManagedTeacherScope(
  service: ServiceClient,
  actorSchoolId: string | null,
  target: { escola_id: string | null; tipo_usuario: string },
  requestedSchoolId: string,
): Promise<string | null> {
  if (!['diretor', 'professor'].includes(target.tipo_usuario)) return 'TEACHER_UPDATE_TARGET_DENIED'
  if (actorSchoolId !== null && (target.escola_id !== actorSchoolId || requestedSchoolId !== actorSchoolId)) {
    return 'TEACHER_UPDATE_SCHOOL_DENIED'
  }

  let schoolQuery = service.from('escolas').select('id').eq('id', requestedSchoolId).eq('ativo', true)
  if (actorSchoolId !== null) schoolQuery = schoolQuery.eq('id', actorSchoolId)
  const { data: school, error } = await schoolQuery.maybeSingle()
  if (error) throw error
  return school ? null : 'TEACHER_UPDATE_SCHOOL_NOT_FOUND'
}

async function persistManagedTeacher(
  service: ServiceClient,
  target: { id: string; email: string | null; escola_id: string | null },
  input: z.infer<typeof teacherSchema>,
) {
  const emailChanged = input.email !== target.email
  if (emailChanged) {
    const { error } = await service.auth.admin.updateUserById(target.id, { email: input.email })
    if (error) return { user: null, error: 'TEACHER_UPDATE_EMAIL_CONFLICT' as const }
  }

  const { data: user, error } = await service
    .from('users')
    .update(input)
    .eq('id', target.id)
    .eq('escola_id', target.escola_id)
    .select('id,nome,email,tipo_usuario,escola_id,ativo,created_at')
    .maybeSingle()
  if (!error && user) return { user, error: null }

  if (emailChanged && target.email) await service.auth.admin.updateUserById(target.id, { email: target.email })
  if (error) throw error
  return { user: null, error: 'TEACHER_UPDATE_NOT_FOUND' as const }
}

async function managedTeacherReceipt(user: { id: string; escola_id: string | null }) {
  const auditClient = await createClient()
  const { data, error } = await asPilotRpcClient(auditClient).rpc<string>('write_pilot_audit_event', {
    p_event_type: 'user_updated',
    p_entity_type: 'user',
    p_entity_id: user.id,
    p_escola_id: user.escola_id ?? undefined,
    p_metadata: {},
  })
  return error || !data ? null : data
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const actor = await requirePilotActor(['admin'])
    const { userId } = paramsSchema.parse(await context.params)
    const input = teacherSchema.parse(await request.json())
    const service = createServiceRoleClient()
    const target = await findManagedTeacher(service, userId)
    if (!target) return NextResponse.json({ error: 'TEACHER_UPDATE_NOT_FOUND' }, { status: 404 })
    const scopeError = await validateManagedTeacherScope(service, actor.schoolId, target, input.escola_id)
    if (scopeError) return NextResponse.json({ error: scopeError }, { status: scopeError === 'TEACHER_UPDATE_SCHOOL_NOT_FOUND' ? 404 : 403 })

    const persisted = await persistManagedTeacher(service, target, input)
    if (!persisted.user) return NextResponse.json({ error: persisted.error }, { status: persisted.error === 'TEACHER_UPDATE_EMAIL_CONFLICT' ? 409 : 404 })
    const receipt = await managedTeacherReceipt(persisted.user)
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
