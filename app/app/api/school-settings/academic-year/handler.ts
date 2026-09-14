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
  year: z.number().int().min(1).max(9999).optional(),
}).strict().refine(value => value.startDate <= value.endDate)

interface SchoolAcademicYearContext {
  readonly schoolId: string
  readonly year: number
}

export interface SchoolAcademicYearHandlerDependencies {
  createClient: typeof createClient
  currentYear(): number
  requireActor: typeof requirePilotActor
}

const productionDependencies: SchoolAcademicYearHandlerDependencies = {
  createClient,
  currentYear: () => new Date().getUTCFullYear(),
  requireActor: requirePilotActor,
}

async function schoolContext(
  dependencies: SchoolAcademicYearHandlerDependencies,
): Promise<SchoolAcademicYearContext> {
  const actor = await dependencies.requireActor(['diretor'])
  if (!actor.schoolId) throw new Error('PILOT_SCHOOL_REQUIRED')
  return { schoolId: actor.schoolId, year: dependencies.currentYear() }
}

/** Serves and updates the director-scoped persisted academic-year configuration. */
export function createSchoolAcademicYearRouteHandlers(
  dependencies: SchoolAcademicYearHandlerDependencies = productionDependencies,
) {
  return {
    async GET(request?: Request): Promise<NextResponse> {
      try {
        const context = await schoolContext(dependencies)
        const requestedYear = request ? new URL(request.url).searchParams.get('year') : null
        const year = requestedYear === null ? context.year : z.coerce.number().int().min(1).max(9999).parse(requestedYear)
        const schoolId = context.schoolId
        const service = createAcademicYearService(await dependencies.createClient())
        const academicYear = await service.get(schoolId, year)
        if (!academicYear) {
          return NextResponse.json(
            { error: 'O ano letivo atual não está cadastrado para esta escola.' },
            { status: 404 },
          )
        }
        return NextResponse.json({ academicYear })
      } catch (error) {
        return pilotErrorResponse(error, {
          feature: 'school-academic-year',
          fallbackCode: 'ACADEMIC_YEAR_READ_FAILED',
        })
      }
    },

    async PATCH(request: Request): Promise<NextResponse> {
      try {
        const { schoolId, year } = await schoolContext(dependencies)
        const parsed = academicYearSchema.safeParse(await request.json())
        if (!parsed.success) {
          return NextResponse.json(
            { error: 'Informe datas válidas. A data de término não pode ser anterior à data de início.' },
            { status: 400 },
          )
        }

        const service = createAcademicYearService(await dependencies.createClient())
        const academicYear = await service.set({
          schoolId,
          year: parsed.data.year ?? year,
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
    },
  }
}
