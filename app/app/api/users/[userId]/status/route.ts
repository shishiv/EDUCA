import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const paramsSchema = z.object({ userId: z.string().uuid() })
const statusSchema = z.object({ ativo: z.boolean() }).strict()

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const actor = await requirePilotActor(['admin'])
    const { userId } = paramsSchema.parse(await context.params)
    const { ativo } = statusSchema.parse(await request.json())
    const service = createServiceRoleClient()
    const { data: target, error: targetError } = await service
      .from('users')
      .select('id,escola_id')
      .eq('id', userId)
      .maybeSingle()

    if (targetError) throw targetError
    if (!target) return NextResponse.json({ error: 'USER_STATUS_TARGET_NOT_FOUND' }, { status: 404 })
    if (actor.schoolId !== null && target.escola_id !== actor.schoolId) {
      return NextResponse.json({ error: 'USER_STATUS_SCHOOL_DENIED' }, { status: 403 })
    }

    let update = service.from('users').update({ ativo }).eq('id', target.id)
    if (actor.schoolId !== null) update = update.eq('escola_id', actor.schoolId)
    const { data: user, error: updateError } = await update.select('id,ativo').maybeSingle()

    if (updateError) throw updateError
    if (!user) return NextResponse.json({ error: 'USER_STATUS_TARGET_NOT_FOUND' }, { status: 404 })
    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'USER_STATUS_INVALID' }, { status: 400 })
    }
    return pilotErrorResponse(error, {
      feature: 'user-status',
      fallbackCode: 'USER_STATUS_UPDATE_FAILED',
    })
  }
}
