import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMunicipalSettingsRoute } from '@/app/api/school-settings/municipal/handler'
import type { PilotActor } from '@/lib/pilot/pilot-server-auth'
import type { MunicipalSettings } from '@/lib/services/municipal-settings'

const SCHOOL_ID = '00000000-0000-0000-0000-000000000001'
const OTHER_SCHOOL_ID = '00000000-0000-0000-0000-000000000002'
const settings: MunicipalSettings = {
  municipality_name: 'Município Sintético',
  education_department_name: 'Secretaria Sintética',
  state: 'UF',
  contact_phone: '',
  dpo_email: '',
  dpo_address: '',
  educacenso_deadline: '2026-07-31',
  attendance_bands: { reference: 80, attention: 85 },
}
const director: PilotActor = {
  id: 'director-1',
  name: 'Diretora Sintética',
  email: 'diretora@synthetic.invalid',
  role: 'diretor',
  schoolId: SCHOOL_ID,
}

interface MunicipalSettingsRequestBody {
  schoolId?: string | null
  municipalityName?: string
  educationDepartmentName?: string
  state?: string
  contactPhone?: string
  dpoEmail?: string
  dpoAddress?: string
  educacensoYear?: number
  educacensoDeadline?: string | null
  attendanceBands?: { reference: number; attention: number }
}

function patch(handler: (request: Request) => Promise<Response>, body: MunicipalSettingsRequestBody) {
  return handler(new Request('http://test/api/school-settings/municipal', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

describe('/api/school-settings/municipal', () => {
  const get = vi.fn()
  const set = vi.fn()
  let actor = director
  const route = createMunicipalSettingsRoute({
    requireActor: async allowedRoles => {
      if (!allowedRoles.includes(actor.role)) throw new Error('PILOT_ROLE_DENIED')
      return actor
    },
    createService: async () => ({ get, set }),
  })

  beforeEach(() => {
    get.mockReset()
    set.mockReset()
    actor = director
  })

  it('resolves a director school scope', async () => {
    get.mockResolvedValue(settings)

    const response = await route.GET(new Request('http://test/api/school-settings/municipal?year=2026'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ settings })
    expect(get).toHaveBeenCalledWith(SCHOOL_ID, 2026)
  })

  it('rejects a director request for another school before the service call', async () => {
    const response = await route.GET(
      new Request(`http://test/api/school-settings/municipal?year=2026&schoolId=${OTHER_SCHOOL_ID}`),
    )

    expect(response.status).toBe(403)
    expect(get).not.toHaveBeenCalled()
  })

  it('propagates a nonexistent school denial from the database boundary', async () => {
    actor = { ...director, id: 'admin-1', role: 'admin', schoolId: null }
    get.mockRejectedValue(new Error('PILOT_MUNICIPAL_SETTINGS_SCHOOL_DENIED'))

    const response = await route.GET(
      new Request(`http://test/api/school-settings/municipal?year=2026&schoolId=${OTHER_SCHOOL_ID}`),
    )

    expect(response.status).toBe(403)
    expect(get).toHaveBeenCalledWith(OTHER_SCHOOL_ID, 2026)
  })

  it('allows a municipal administrator to update a school override', async () => {
    actor = { ...director, id: 'admin-1', role: 'admin', schoolId: null }
    set.mockResolvedValue(settings)

    const response = await patch(route.PATCH, {
      schoolId: SCHOOL_ID,
      municipalityName: settings.municipality_name,
      educationDepartmentName: settings.education_department_name,
      state: settings.state,
      contactPhone: settings.contact_phone,
      dpoEmail: settings.dpo_email,
      dpoAddress: settings.dpo_address,
      educacensoYear: 2026,
      educacensoDeadline: settings.educacenso_deadline,
      attendanceBands: settings.attendance_bands,
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ settings })
    expect(set).toHaveBeenCalledWith({
      schoolId: SCHOOL_ID,
      municipality_name: settings.municipality_name,
      education_department_name: settings.education_department_name,
      state: settings.state,
      contact_phone: settings.contact_phone,
      dpo_email: settings.dpo_email,
      dpo_address: settings.dpo_address,
      educacensoYear: 2026,
      educacenso_deadline: settings.educacenso_deadline,
      attendance_bands: settings.attendance_bands,
    })
  })

  it('rejects a school-bound municipal role and malformed input', async () => {
    actor = { ...director, id: 'admin-1', role: 'admin' }

    const denied = await patch(route.PATCH, {})
    expect(denied.status).toBe(403)
    expect(set).not.toHaveBeenCalled()

    actor = { ...actor, schoolId: null }
    const invalid = await patch(route.PATCH, { educacensoYear: 2026 })
    expect(invalid.status).toBe(400)
    expect(set).not.toHaveBeenCalled()
  })
})
