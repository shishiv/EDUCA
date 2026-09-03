import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'

export interface MunicipalSettings {
  municipality_name: string
  education_department_name: string
  state: string
  contact_phone: string
  dpo_email: string
  dpo_address: string
  educacenso_deadline: string | null
}

export interface SetMunicipalSettingsInput extends MunicipalSettings {
  schoolId: string | null
  educacensoYear: number
}

export interface MunicipalSettingsService {
  get(schoolId: string | null, year: number): Promise<MunicipalSettings>
  set(input: SetMunicipalSettingsInput): Promise<MunicipalSettings>
}

export function createMunicipalSettingsService(
  supabase: SupabaseClient<Database>
): MunicipalSettingsService {
  const client = asPilotRpcClient(supabase)

  const get = async (schoolId: string | null, year: number) => {
    const { data, error } = await client.rpc<MunicipalSettings[]>('get_municipal_settings', {
      p_escola_id: schoolId,
      p_ano: year,
    })

    if (error) throw new Error(error.message)
    if (!data?.[0]) throw new Error('MUNICIPAL_SETTINGS_NOT_FOUND')
    return data[0]
  }

  return {
    get,

    async set(input) {
      const { data, error } = await client.rpc<MunicipalSettings[]>('set_municipal_settings', {
        p_escola_id: input.schoolId,
        p_municipality_name: input.municipality_name,
        p_education_department_name: input.education_department_name,
        p_state: input.state,
        p_contact_phone: input.contact_phone,
        p_dpo_email: input.dpo_email,
        p_dpo_address: input.dpo_address,
        p_educacenso_year: input.educacensoYear,
        p_educacenso_deadline: input.educacenso_deadline,
      })

      if (error) throw new Error(error.message)
      if (!data?.[0]) throw new Error('MUNICIPAL_SETTINGS_NOT_SAVED')
      return data[0]
    },
  }
}
