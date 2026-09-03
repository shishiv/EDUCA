import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, PATCH } from '@/app/api/school-settings/municipal/route'

const { actorMock, createClientMock } = vi.hoisted(() => ({
  actorMock: vi.fn(),
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/pilot/pilot-server-auth', () => ({ requirePilotActor: actorMock }))
vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }))

const SCHOOL_ID = '00000000-0000-0000-0000-000000000001'
const OTHER_SCHOOL_ID = '00000000-0000-0000-0000-000000000002'
const settings = {
  municipality_name: 'Município Sintético',
  education_department_name: 'Secretaria Sintética',
  state: 'UF',
  contact_phone: '',
  dpo_email: '',
  dpo_address: '',
  educacenso_deadline: '2026-07-31',
}

function patch(body: unknown) {
  return PATCH(new Request('http://test/api/school-settings/municipal', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

describe('/api/school-settings/municipal', () => {
  const rpc = vi.fn()

  beforeEach(() => {
    actorMock.mockReset()
    createClientMock.mockReset()
    rpc.mockReset()
    actorMock.mockResolvedValue({ id: 'director-1', role: 'diretor', schoolId: SCHOOL_ID })
    createClientMock.mockResolvedValue({ rpc })
  })

  it('resolves a director school scope', async () => {
    rpc.mockResolvedValue({ data: [settings], error: null })

    const response = await GET(new Request('http://test/api/school-settings/municipal?year=2026'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ settings })
    expect(actorMock).toHaveBeenCalledWith(['admin', 'secretario', 'diretor', 'professor'])
    expect(rpc).toHaveBeenCalledWith('get_municipal_settings', { p_escola_id: SCHOOL_ID, p_ano: 2026 })
  })

  it('rejects a director request for another school before the service call', async () => {
    const response = await GET(new Request(`http://test/api/school-settings/municipal?year=2026&schoolId=${OTHER_SCHOOL_ID}`))

    expect(response.status).toBe(403)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('propagates a nonexistent school denial from the database boundary', async () => {
    actorMock.mockResolvedValue({ id: 'admin-1', role: 'admin', schoolId: null })
    rpc.mockResolvedValue({ data: null, error: { message: 'PILOT_MUNICIPAL_SETTINGS_SCHOOL_DENIED' } })

    const response = await GET(new Request(`http://test/api/school-settings/municipal?year=2026&schoolId=${OTHER_SCHOOL_ID}`))

    expect(response.status).toBe(403)
    expect(rpc).toHaveBeenCalledWith('get_municipal_settings', { p_escola_id: OTHER_SCHOOL_ID, p_ano: 2026 })
  })

  it('allows a municipal administrator to update a school override', async () => {
    actorMock.mockResolvedValue({ id: 'admin-1', role: 'admin', schoolId: null })
    rpc.mockResolvedValue({ data: [settings], error: null })

    const response = await patch({
      schoolId: SCHOOL_ID,
      municipalityName: settings.municipality_name,
      educationDepartmentName: settings.education_department_name,
      state: settings.state,
      contactPhone: settings.contact_phone,
      dpoEmail: settings.dpo_email,
      dpoAddress: settings.dpo_address,
      educacensoYear: 2026,
      educacensoDeadline: settings.educacenso_deadline,
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ settings })
    expect(actorMock).toHaveBeenCalledWith(['admin', 'secretario'])
    expect(rpc).toHaveBeenCalledWith('set_municipal_settings', {
      p_escola_id: SCHOOL_ID,
      p_municipality_name: settings.municipality_name,
      p_education_department_name: settings.education_department_name,
      p_state: settings.state,
      p_contact_phone: settings.contact_phone,
      p_dpo_email: settings.dpo_email,
      p_dpo_address: settings.dpo_address,
      p_educacenso_year: 2026,
      p_educacenso_deadline: settings.educacenso_deadline,
    })
  })

  it('rejects a school-bound municipal role and malformed input', async () => {
    actorMock.mockResolvedValue({ id: 'admin-1', role: 'admin', schoolId: SCHOOL_ID })

    const denied = await patch({})
    expect(denied.status).toBe(403)
    expect(rpc).not.toHaveBeenCalled()

    actorMock.mockResolvedValue({ id: 'admin-1', role: 'admin', schoolId: null })
    const invalid = await patch({ educacensoYear: 2026 })
    expect(invalid.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })
})
