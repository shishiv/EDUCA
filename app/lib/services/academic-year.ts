import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'

export interface AcademicYear {
  id: string
  escola_id: string
  ano: number
  data_inicio: string
  data_fim: string
  created_at: string
  updated_at: string
}

export interface SetAcademicYearInput {
  schoolId: string
  year: number
  startDate: string
  endDate: string
}

export interface AcademicYearService {
  get(schoolId: string, year: number): Promise<AcademicYear | null>
  set(input: SetAcademicYearInput): Promise<AcademicYear>
}

export function createAcademicYearService(
  supabase: SupabaseClient<Database>
): AcademicYearService {
  const client = asPilotRpcClient(supabase)

  return {
    async get(schoolId, year) {
      const { data, error } = await client.rpc<AcademicYear[]>('get_school_academic_year', {
        p_escola_id: schoolId,
        p_ano: year,
      })

      if (error) throw new Error(error.message)
      return data?.[0] ?? null
    },

    async set(input) {
      const { data, error } = await client.rpc<AcademicYear[]>('set_school_academic_year', {
        p_escola_id: input.schoolId,
        p_ano: input.year,
        p_data_inicio: input.startDate,
        p_data_fim: input.endDate,
      })

      if (error) throw new Error(error.message)
      if (!data?.[0]) throw new Error('ACADEMIC_YEAR_NOT_SAVED')
      return data[0]
    },
  }
}
