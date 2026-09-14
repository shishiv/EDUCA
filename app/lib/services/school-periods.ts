import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const schoolPeriodKeySchema = z.enum([
  'primeiro', 'segundo', 'bimestre_1', 'bimestre_2', 'bimestre_3', 'bimestre_4',
])
export const schoolPeriodSchema = z.object({
  chave: schoolPeriodKeySchema,
  nome: z.string().trim().min(1).max(100),
  data_inicio: z.string().date(),
  data_fim: z.string().date(),
}).strict()
export const schoolPeriodsSchema = z.array(schoolPeriodSchema).max(6)
export type SchoolPeriod = z.infer<typeof schoolPeriodSchema>

/** Empty is an explicit database default, not a guessed pedagogical calendar. */
export async function loadSchoolPeriods(client: SupabaseClient<Database>, schoolId: string, year: number) {
  const { data, error } = await client.rpc('get_school_academic_year', { p_escola_id: schoolId, p_ano: year })
  if (error) throw error
  return schoolPeriodsSchema.parse(data?.[0]?.periodos ?? [])
}

export async function saveSchoolPeriods(client: SupabaseClient<Database>, schoolId: string, year: number, periods: SchoolPeriod[]) {
  const { data, error } = await client.rpc('set_school_periods', {
    p_escola_id: schoolId, p_ano: year, p_periodos: schoolPeriodsSchema.parse(periods),
  })
  if (error) throw error
  if (!data?.[0]) throw new Error('SCHOOL_PERIODS_NOT_SAVED')
  return schoolPeriodsSchema.parse(data[0].periodos)
}
