import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'

const auditEventSchema = z.object({
  eventType: z.string().min(2).max(80),
  entityType: z.string().min(2).max(80),
  entityId: z.string().max(160).nullable().optional(),
  schoolId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
})

export async function POST(request: Request) {
  try {
    const actor = await requirePilotActor(['admin', 'secretario', 'diretor', 'professor'])
    const input = auditEventSchema.parse(await request.json())
    if (input.schoolId && input.schoolId !== actor.schoolId) {
      throw new Error('PILOT_AUDIT_SCHOOL_DENIED: actor cannot audit another school')
    }
    const supabase = await createClient()
    const { data, error } = await asPilotRpcClient(supabase).rpc<string>('write_pilot_audit_event', {
      p_event_type: input.eventType,
      p_entity_type: input.entityType,
      p_entity_id: input.entityId ?? undefined,
      p_escola_id: actor.schoolId ?? undefined,
      p_metadata: input.metadata,
    })
    if (error) throw error
    return NextResponse.json({ auditId: data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'PILOT_AUDIT_INVALID' }, { status: 400 })
    return pilotErrorResponse(error, { feature: 'pilot-audit', fallbackCode: 'PILOT_AUDIT_FAILED', fallbackStatus: 400 })
  }
}
