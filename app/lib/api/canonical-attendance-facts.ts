import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  countAttendanceRecords,
  summarizeAttendanceCounts,
  type AttendancePolicySummary,
} from '@/lib/attendance/attendance-calculations'

/** One marked attendance fact tied to the canonical session and enrollment. */
export interface CanonicalAttendanceFact {
  id: string
  matriculaId: string
  sessaoId: string
  dataAula: string
  presente: boolean
  statusPresenca: string | null
  justificativa: string | null
}

export interface CanonicalAttendanceQueryOptions {
  startDate?: string
  endDate?: string
  sessaoIds?: string[]
}

export interface CanonicalAttendanceSummary extends AttendancePolicySummary {
  matriculaId: string
}

// Receipt: supabase/config.toml exposes at most 1,000 rows per API response.
const FREQUENCIA_QUERY_PAGE_SIZE = 1_000

/**
 * Loads every marked attendance fact for the supplied enrollments.
 *
 * This is the only shared attendance read query for reports, compliance
 * warnings, dashboard alerts, and derived attendance cards. The canonical
 * contract is frequencia.sessao_id, so legacy aula_id-only rows never enter a
 * policy calculation.
 */
export async function loadCanonicalAttendanceFacts(
  supabase: SupabaseClient<Database>,
  matriculaIds: string[] = [],
  options: CanonicalAttendanceQueryOptions = {}
): Promise<CanonicalAttendanceFact[]> {
  if (matriculaIds.length === 0 && (!options.sessaoIds || options.sessaoIds.length === 0)) return []

  const facts: CanonicalAttendanceFact[] = []
  let offset = 0

  while (true) {
    let query = supabase
      .from('frequencia')
      .select('id, matricula_id, sessao_id, data_aula, presente, status_presenca, justificativa')
      .not('sessao_id', 'is', null)

    if (matriculaIds.length > 0) query = query.in('matricula_id', matriculaIds)
    if (options.sessaoIds && options.sessaoIds.length > 0) query = query.in('sessao_id', options.sessaoIds)
    if (options.startDate) query = query.gte('data_aula', options.startDate)
    if (options.endDate) query = query.lte('data_aula', options.endDate)
    query = query
      .order('id', { ascending: true })
      .range(offset, offset + FREQUENCIA_QUERY_PAGE_SIZE - 1)

    const { data, error } = await query

    if (error) throw error

    const page = data ?? []
    for (const record of page) {
      if (!record.sessao_id || record.status_presenca === 'NAO_MARCADO') continue
      facts.push({
        id: record.id,
        matriculaId: record.matricula_id,
        sessaoId: record.sessao_id,
        dataAula: record.data_aula,
        presente: record.presente,
        statusPresenca: record.status_presenca,
        justificativa: record.justificativa,
      })
    }

    if (page.length < FREQUENCIA_QUERY_PAGE_SIZE) return facts
    offset += page.length
  }
}

/**
 * Aggregates canonical facts once so every caller applies the same attendance
 * counting rules and the same CONFORMIDADE/ATENCAO policy.
 */
export function summarizeCanonicalAttendanceFacts(
  facts: CanonicalAttendanceFact[],
  matriculaIds: string[] = [...new Set(facts.map((fact) => fact.matriculaId))]
): Map<string, CanonicalAttendanceSummary> {
  const recordsByMatricula = new Map<string, CanonicalAttendanceFact[]>()

  for (const matriculaId of matriculaIds) {
    recordsByMatricula.set(matriculaId, [])
  }

  for (const fact of facts) {
    const records = recordsByMatricula.get(fact.matriculaId)
    if (records) records.push(fact)
    else recordsByMatricula.set(fact.matriculaId, [fact])
  }

  return new Map(
    [...recordsByMatricula.entries()].map(([matriculaId, records]) => {
      const counts = countAttendanceRecords(records.map((record) => ({
        presente: record.presente,
        status_presenca: record.statusPresenca,
      })))
      return [matriculaId, { matriculaId, ...summarizeAttendanceCounts(counts) }]
    })
  )
}

/** Loads and aggregates one canonical attendance read for a set of enrollments. */
export async function loadCanonicalAttendanceSummaries(
  supabase: SupabaseClient<Database>,
  matriculaIds: string[],
  options: CanonicalAttendanceQueryOptions = {}
): Promise<Map<string, CanonicalAttendanceSummary>> {
  const facts = await loadCanonicalAttendanceFacts(supabase, matriculaIds, options)
  return summarizeCanonicalAttendanceFacts(facts, matriculaIds)
}
