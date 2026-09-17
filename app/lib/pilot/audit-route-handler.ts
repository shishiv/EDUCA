import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import type { Json } from '@/types/database'

const jsonValue: z.ZodType<Json> = z.lazy(() => z.union([
  z.string(), z.number().finite(), z.boolean(), z.null(), z.array(jsonValue), z.record(jsonValue),
]))

const auditEventSchema = z.object({
  eventType: z.string().min(2).max(80),
  entityType: z.string().min(2).max(80),
  entityId: z.string().max(160).nullable().optional(),
  schoolId: z.string().uuid().nullable().optional(),
  metadata: z.record(jsonValue).default({}),
})

interface AuditRouteDependencies {
  createClient: typeof createClient
  requireActor: typeof requirePilotActor
}

export function createPilotAuditPostHandler(
  dependencies: AuditRouteDependencies = { createClient, requireActor: requirePilotActor },
) {
  return async function POST(request: Request) {
    try {
      const actor = await dependencies.requireActor(['admin', 'secretario', 'diretor', 'professor'])
      const input = auditEventSchema.parse(await request.json())
      if (input.schoolId && input.schoolId !== actor.schoolId) {
        throw new Error('PILOT_AUDIT_SCHOOL_DENIED: actor cannot audit another school')
      }
      const supabase = await dependencies.createClient()
      const { data, error } = await supabase.rpc('write_pilot_audit_event', {
        p_event_type: input.eventType,
        p_entity_type: input.entityType,
        p_entity_id: input.entityId ?? undefined,
        p_escola_id: actor.schoolId ?? undefined,
        p_metadata: input.metadata,
      })
      if (error) throw error
      if (!data) return NextResponse.json({ error: 'PILOT_AUDIT_RECEIPT_MISSING' }, { status: 503 })
      return NextResponse.json({ auditId: data }, { status: 201 })
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: 'PILOT_AUDIT_INVALID' }, { status: 400 })
      return pilotErrorResponse(error, { feature: 'pilot-audit', fallbackCode: 'PILOT_AUDIT_FAILED', fallbackStatus: 400 })
    }
  }
}
