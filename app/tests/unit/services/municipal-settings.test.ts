import { describe, expect, it, vi } from 'vitest'
import { createMunicipalSettingsService, type MunicipalSettings } from '@/lib/services/municipal-settings'

const settings: MunicipalSettings = {
  municipality_name: 'Município Sintético',
  education_department_name: 'Secretaria Sintética',
  state: 'UF',
  contact_phone: '',
  dpo_email: '',
  dpo_address: '',
  educacenso_deadline: null,
}

describe('municipal settings service', () => {
  it('resolves the database-backed values for a school and year', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [settings], error: null })
    const service = createMunicipalSettingsService({ rpc } as never)

    await expect(service.get('00000000-0000-0000-0000-000000000001', 2026)).resolves.toEqual(settings)
    expect(rpc).toHaveBeenCalledWith('get_municipal_settings', {
      p_escola_id: '00000000-0000-0000-0000-000000000001',
      p_ano: 2026,
    })
  })

  it('writes a municipal override through the governed interface', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [settings], error: null })
    const service = createMunicipalSettingsService({ rpc } as never)

    await expect(service.set({ ...settings, schoolId: null, educacensoYear: 2026 })).resolves.toEqual(settings)
    expect(rpc).toHaveBeenCalledWith('set_municipal_settings', {
      p_escola_id: null,
      p_municipality_name: settings.municipality_name,
      p_education_department_name: settings.education_department_name,
      p_state: settings.state,
      p_contact_phone: settings.contact_phone,
      p_dpo_email: settings.dpo_email,
      p_dpo_address: settings.dpo_address,
      p_educacenso_year: 2026,
      p_educacenso_deadline: null,
    })
  })

  it('propagates database authorization failures', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'PILOT_MUNICIPAL_SETTINGS_WRITE_DENIED' } })
    const service = createMunicipalSettingsService({ rpc } as never)

    await expect(service.set({ ...settings, schoolId: null, educacensoYear: 2026 })).rejects.toThrow('PILOT_MUNICIPAL_SETTINGS_WRITE_DENIED')
  })
})
