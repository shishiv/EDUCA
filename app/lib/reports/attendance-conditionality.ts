/**
 * Typed seam for the canonical attendance conditionality RPC.
 *
 * This module keeps a narrow contract for the sensitive conditionality RPC.
 * The RPC currently includes legacy attendance rows without a session, while
 * the general canonical-facts seam excludes them. That divergence is kept
 * explicit pending a domain/legal decision; this adapter does not choose one.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/** Filters for the canonical attendance conditionality read model. */
export interface AttendanceConditionalityFilters {
  startDate: string
  endDate: string
  escolaId?: string
  turmaId?: string
}

/** One enrollment row resolved by legal rules and persisted municipality margins. */
export type AttendanceConditionalityRow =
  Database['public']['Functions']['get_attendance_conditionality']['Returns'][number]
type AttendanceConditionalityArgs =
  Database['public']['Functions']['get_attendance_conditionality']['Args']

export async function getStudentBolsaFamilia(
  supabase: SupabaseClient<Database>,
  studentId: string,
): Promise<boolean | null> {
  const { data, error } = await supabase.rpc(
    'get_student_bolsa_familia',
    { p_student_id: studentId },
  )
  return error ? null : data
}

/** Result returned by the canonical attendance conditionality query. */
export interface AttendanceConditionalityResult {
  data: AttendanceConditionalityRow[]
  error: string | null
}

/**
 * Reads attendance, legal conditionality, education completion, and municipal
 * margin resolution from one PostgreSQL read model. Callers must not query
 * frequencia directly for Bolsa Família alerts or reports.
 */
export async function getAttendanceConditionality(
  supabase: SupabaseClient<Database>,
  filters: AttendanceConditionalityFilters,
): Promise<AttendanceConditionalityResult> {
  const args: AttendanceConditionalityArgs = {
    p_start_date: filters.startDate,
    p_end_date: filters.endDate,
  }
  if (filters.escolaId) args.p_escola_id = filters.escolaId
  if (filters.turmaId) args.p_turma_id = filters.turmaId

  const { data, error } = await supabase.rpc(
    'get_attendance_conditionality',
    args,
  )

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: data ?? [], error: null }
}

/** Returns the rows that represent Bolsa Família conditionality records. */
export function filterBolsaFamiliaConditionality(
  rows: AttendanceConditionalityRow[],
): AttendanceConditionalityRow[] {
  return rows.filter((row) => row.is_bolsa_familia)
}

/** Returns true when a row is below its resolved municipal early-warning margin. */
export function isMunicipalAttendanceRisk(row: AttendanceConditionalityRow): boolean {
  return row.margem_municipal_status === 'ALERTA'
    || row.margem_municipal_status === 'CRITICO'
    || row.margem_municipal_status === 'NAO_CONFIGURADA'
}

/** Returns true when a row fails its age-specific legal conditionality. */
export function isLegalAttendanceRisk(row: AttendanceConditionalityRow): boolean {
  return row.condicionalidade_legal_status === 'CRITICO'
}
