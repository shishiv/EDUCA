import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'

const metricSchema = z.object({
  eventName: z.enum(['weekly_school_active','expected_attendance','attendance_recorded','critical_incident','satisfaction_submitted','training_completed']),
  schoolId: z.string().uuid().nullable(),
  value: z.number().min(0).max(100000).default(1),
  dimensions: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
})

export async function POST(request: Request) {
  try {
    await requirePilotActor(['admin', 'secretario', 'diretor', 'professor'])
    const input = metricSchema.parse(await request.json())
    const supabase = await createClient()
    const { data, error } = await asPilotRpcClient(supabase).rpc<string>('record_pilot_metric_event', {
      p_event_name: input.eventName, p_escola_id: input.schoolId ?? undefined, p_metric_value: input.value, p_dimensions: input.dimensions,
    })
    if (error) throw error
    return NextResponse.json({ metricId: data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'PILOT_METRIC_INVALID' }, { status: 400 })
    return pilotErrorResponse(error, { feature: 'pilot-metrics', fallbackCode: 'PILOT_METRIC_FAILED', fallbackStatus: 400 })
  }
}

export async function GET(request: Request) {
  try {
    await requirePilotActor(['admin', 'secretario', 'diretor'])
    const schoolId = new URL(request.url).searchParams.get('schoolId')
    const supabase = await createClient()
    const { data, error } = await asPilotRpcClient(supabase).rpc('pilot_dashboard_metrics', { p_escola_id: schoolId ?? undefined })
    if (error) throw error
    return NextResponse.json({ metrics: data })
  } catch (error) {
    return pilotErrorResponse(error, { feature: 'pilot-metrics', fallbackCode: 'PILOT_METRIC_FAILED', fallbackStatus: 400 })
  }
}
