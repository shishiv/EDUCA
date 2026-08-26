import { NextResponse } from 'next/server'
import { z } from 'zod'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const paramsSchema = z.object({ userId: z.string().uuid() })
const teacherSchema = z.object({
  nome: z.string().trim().min(2, 'Informe um nome com pelo menos 2 caracteres').max(160, 'O nome deve ter no máximo 160 caracteres'),
  email: z.string().trim().email('Informe um e-mail válido').transform(value => value.toLowerCase()),
  tipo_usuario: z.enum(['diretor', 'professor']),
  escola_id: z.string().uuid('Selecione uma escola válida'),
}).strict()

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const actor = await requirePilotActor(['admin'])
    const { userId } = paramsSchema.parse(await context.params)
    const input = teacherSchema.parse(await request.json())
    const service = createServiceRoleClient()
    const { data: target, error: targetError } = await service
      .from('users')
      .select('id,email,tipo_usuario,escola_id')
      .eq('id', userId)
      .maybeSingle()

    if (targetError) throw targetError
    if (!target) return NextResponse.json({ error: 'TEACHER_UPDATE_NOT_FOUND' }, { status: 404 })
    if (!['diretor', 'professor'].includes(target.tipo_usuario)) {
      return NextResponse.json({ error: 'TEACHER_UPDATE_TARGET_DENIED' }, { status: 403 })
    }
    if (actor.schoolId !== null && (target.escola_id !== actor.schoolId || input.escola_id !== actor.schoolId)) {
      return NextResponse.json({ error: 'TEACHER_UPDATE_SCHOOL_DENIED' }, { status: 403 })
    }

    let schoolQuery = service.from('escolas').select('id').eq('id', input.escola_id).eq('ativo', true)
    if (actor.schoolId !== null) schoolQuery = schoolQuery.eq('id', actor.schoolId)
    const { data: school, error: schoolError } = await schoolQuery.maybeSingle()
    if (schoolError) throw schoolError
    if (!school) return NextResponse.json({ error: 'TEACHER_UPDATE_SCHOOL_NOT_FOUND' }, { status: 404 })

    if (input.email !== target.email) {
      const { error: authError } = await service.auth.admin.updateUserById(target.id, { email: input.email })
      if (authError) return NextResponse.json({ error: 'TEACHER_UPDATE_EMAIL_CONFLICT' }, { status: 409 })
    }

    const { data: user, error: updateError } = await service
      .from('users')
      .update(input)
      .eq('id', target.id)
      .eq('escola_id', target.escola_id)
      .select('id,nome,email,tipo_usuario,escola_id,ativo,created_at')
      .maybeSingle()

    if (updateError || !user) {
      if (input.email !== target.email && target.email) {
        await service.auth.admin.updateUserById(target.id, { email: target.email })
      }
      if (updateError) throw updateError
      return NextResponse.json({ error: 'TEACHER_UPDATE_NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ user })
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
