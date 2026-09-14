import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { saveSchoolPeriods, schoolPeriodsSchema } from '@/lib/services/school-periods'

const requestSchema = z.object({
  year: z.number().int().min(1).max(9999), periods: schoolPeriodsSchema,
}).strict()

export async function PATCH(request: Request) {
  try {
    const actor = await requirePilotActor(['diretor'])
    if (!actor.schoolId) throw new Error('PILOT_SCHOOL_REQUIRED')
    const parsed = requestSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Informe períodos válidos.' }, { status: 400 })
    const periods = await saveSchoolPeriods(await createClient(), actor.schoolId, parsed.data.year, parsed.data.periods)
    return NextResponse.json({ periods })
  } catch (error) {
    return pilotErrorResponse(error, { feature: 'school-periods', fallbackCode: 'SCHOOL_PERIODS_UPDATE_FAILED' })
  }
}
