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

export interface ResolvedAcademicYear {
  year: number
  startDate: string
  endDate: string
  configured: boolean
}

export interface SetAcademicYearInput {
  schoolId: string
  year: number
  startDate: string
  endDate: string
}

export interface AcademicYearService {
  get(schoolId: string, year: number): Promise<AcademicYear | null>
  resolveCurrent(schoolId: string, today: string): Promise<ResolvedAcademicYear>
  set(input: SetAcademicYearInput): Promise<AcademicYear>
}

export function createAcademicYearService(
  supabase: SupabaseClient<Database>
): AcademicYearService {
  const client = asPilotRpcClient(supabase)

  const get = async (schoolId: string, year: number) => {
    const { data, error } = await client.rpc<AcademicYear[]>('get_school_academic_year', {
      p_escola_id: schoolId,
      p_ano: year,
    })

    if (error) throw new Error(error.message)
    return data?.[0] ?? null
  }

  return {
    get,

    async resolveCurrent(schoolId, today) {
      const year = Number(today.slice(0, 4))
      if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || !Number.isInteger(year)) {
        throw new Error('ACADEMIC_YEAR_DATE_INVALID')
      }

      const configured = await get(schoolId, year)
      return configured
        ? {
            year: configured.ano,
            startDate: configured.data_inicio,
            endDate: configured.data_fim,
            configured: true,
          }
        : {
            year,
            startDate: `${year}-01-01`,
            endDate: `${year}-12-31`,
            configured: false,
          }
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
