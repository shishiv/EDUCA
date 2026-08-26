import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAcademicYearService } from '@/lib/services/academic-year'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
})

const academicYearSchema = z.object({
  startDate: isoDate,
  endDate: isoDate,
}).strict().refine(value => value.startDate <= value.endDate)

async function schoolContext() {
  const actor = await requirePilotActor(['diretor'])
  if (!actor.schoolId) throw new Error('PILOT_SCHOOL_REQUIRED')
  return {
    schoolId: actor.schoolId,
    year: new Date().getUTCFullYear(),
  }
}

export async function GET() {
  try {
    const { schoolId, year } = await schoolContext()
    const service = createAcademicYearService(await createClient())
    const academicYear = await service.get(schoolId, year)
    if (!academicYear) {
      return NextResponse.json({ error: 'O ano letivo atual não está cadastrado para esta escola.' }, { status: 404 })
    }
    return NextResponse.json({ academicYear })
  } catch (error) {
    return pilotErrorResponse(error, {
      feature: 'school-academic-year',
      fallbackCode: 'ACADEMIC_YEAR_READ_FAILED',
    })
  }
}

export async function PATCH(request: Request) {
  try {
    const { schoolId, year } = await schoolContext()
    const parsed = academicYearSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Informe datas válidas. A data de término não pode ser anterior à data de início.' },
        { status: 400 }
      )
    }

    const service = createAcademicYearService(await createClient())
    const academicYear = await service.set({
      schoolId,
      year,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    })
    return NextResponse.json({ academicYear })
  } catch (error) {
    return pilotErrorResponse(error, {
      feature: 'school-academic-year',
      fallbackCode: 'ACADEMIC_YEAR_UPDATE_FAILED',
    })
  }
}
