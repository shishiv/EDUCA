import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createMunicipalSettingsService } from '@/lib/services/municipal-settings'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'

const year = z.coerce.number().int().min(2000).max(2100)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
})
const municipalSettingsSchema = z.object({
  schoolId: z.string().uuid().nullable().optional(),
  municipalityName: z.string().trim().min(1).max(120),
  educationDepartmentName: z.string().trim().min(1).max(120),
  state: z.string().trim().min(1).max(40),
  contactPhone: z.string().trim().max(100),
  dpoEmail: z.string().trim().max(255).refine(value => value === '' || z.string().email().safeParse(value).success),
  dpoAddress: z.string().trim().max(500),
  educacensoYear: year,
  educacensoDeadline: isoDate.nullable(),
}).strict()

function readScope(request: Request, actor: { schoolId: string | null }) {
  const schoolId = new URL(request.url).searchParams.get('schoolId')
  if (schoolId !== null && !z.string().uuid().safeParse(schoolId).success) {
    throw new Error('PILOT_MUNICIPAL_SETTINGS_SCHOOL_DENIED')
  }
  if (actor.schoolId !== null && schoolId !== null && schoolId !== actor.schoolId) {
    throw new Error('PILOT_MUNICIPAL_SETTINGS_SCHOOL_DENIED')
  }
  return actor.schoolId ?? schoolId
}

export async function GET(request: Request) {
  try {
    const actor = await requirePilotActor(['admin', 'secretario', 'diretor', 'professor'])
    const settingsYear = year.parse(new URL(request.url).searchParams.get('year') ?? new Date().getUTCFullYear())
    const service = createMunicipalSettingsService(await createClient())
    const settings = await service.get(readScope(request, actor), settingsYear)
    return NextResponse.json({ settings })
  } catch (error) {
    return pilotErrorResponse(error, {
      feature: 'municipal-settings',
      fallbackCode: 'MUNICIPAL_SETTINGS_READ_FAILED',
    })
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requirePilotActor(['admin', 'secretario'])
    if (actor.schoolId !== null) throw new Error('PILOT_MUNICIPAL_SETTINGS_WRITE_DENIED')
    const input = municipalSettingsSchema.parse(await request.json())
    const service = createMunicipalSettingsService(await createClient())
    const settings = await service.set({
      schoolId: input.schoolId ?? null,
      municipality_name: input.municipalityName,
      education_department_name: input.educationDepartmentName,
      state: input.state,
      contact_phone: input.contactPhone,
      dpo_email: input.dpoEmail,
      dpo_address: input.dpoAddress,
      educacensoYear: input.educacensoYear,
      educacenso_deadline: input.educacensoDeadline,
    })
    return NextResponse.json({ settings })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'MUNICIPAL_SETTINGS_INVALID' }, { status: 400 })
    }
    return pilotErrorResponse(error, {
      feature: 'municipal-settings',
      fallbackCode: 'MUNICIPAL_SETTINGS_UPDATE_FAILED',
    })
  }
}
