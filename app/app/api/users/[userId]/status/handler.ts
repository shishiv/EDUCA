import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { createClient } from '@/lib/supabase/server'

const paramsSchema = z.object({ userId: z.string().uuid() })
const statusSchema = z.object({ ativo: z.boolean() }).strict()
const receiptSchema = z.object({ user_id: z.string().uuid(), ativo: z.boolean(), audit_id: z.string().uuid() })
type StatusReceipt = z.infer<typeof receiptSchema>
type Dependencies = {
  requireActor: typeof requirePilotActor
  mutate: (userId: string, ativo: boolean) => Promise<StatusReceipt | null>
}

export function createStatusHandler(dependencies: Dependencies = { requireActor: requirePilotActor, mutate: setUserStatus }) {
  return async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
    try {
      await dependencies.requireActor(['admin'])
      const { userId } = paramsSchema.parse(await context.params)
      const { ativo } = statusSchema.parse(await request.json())
      const result = receiptSchema.safeParse(await dependencies.mutate(userId, ativo))
      if (!result.success || result.data.user_id !== userId || result.data.ativo !== ativo) {
        return NextResponse.json({ error: 'USER_STATUS_AUDIT_INCOMPLETE' }, { status: 503 })
      }
      return NextResponse.json({ user: { id: result.data.user_id, ativo: result.data.ativo }, receipt: result.data.audit_id })
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: 'USER_STATUS_INVALID' }, { status: 400 })
      return statusErrorResponse(error)
    }
  }
}

async function setUserStatus(userId: string, ativo: boolean): Promise<StatusReceipt | null> {
  const client = await createClient()
  const { data, error } = await client.rpc('set_governed_user_status', { p_user_id: userId, p_ativo: ativo }).single()
  if (error) throw error
  return data
}

function statusErrorResponse<ErrorInput>(error: ErrorInput) {
  const detail = z.object({ message: z.string() }).safeParse(error)
  const errors = new Map([
    ['PILOT_USER_STATUS_TARGET_NOT_FOUND', { error: 'USER_STATUS_TARGET_NOT_FOUND', status: 404 }],
    ['PILOT_USER_STATUS_SCHOOL_DENIED', { error: 'USER_STATUS_SCHOOL_DENIED', status: 403 }],
    ['PILOT_USER_STATUS_ROLE_DENIED', { error: 'USER_STATUS_ROLE_DENIED', status: 403 }],
    ['PILOT_USER_STATUS_INVALID', { error: 'USER_STATUS_INVALID', status: 400 }],
  ])
  const mapped = detail.success ? errors.get(detail.data.message) : undefined
  if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status })
  return pilotErrorResponse(error, { feature: 'user-status', fallbackCode: 'USER_STATUS_UPDATE_FAILED', fallbackStatus: 503 })
}
