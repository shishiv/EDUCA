/**
 * Canonical Attendance Facts - the single shared read query for attendance data.
 *
 * This is the authoritative read interface for every attendance consumer:
 * reports, compliance warnings, dashboard alerts, and attendance cards.
 * The canonical contract is `frequencia.sessao_id` - legacy `aula_id`-only
 * rows never enter a policy calculation.
 *
 * ## Authentication
 *
 * Accepts a Supabase client injected by the caller (server component, API
 * route, or browser context).  The client's JWT determines RLS visibility.
 *
 * ## RLS
 *
 * The `frequencia` table RLS policies enforce school-scoped reads.  This
 * module never elevates privileges - it runs within the caller's context.
 *
 * ## Policy thresholds
 *
 * General bands are resolved from the municipal getter for each enrollment's school.
 *
 * Legal Bolsa Família floors remain in the separate conditionality RPC.
 *
 * ## Mode availability
 *
 * All modes (pilot, demo, production).
 *
 * @module api/canonical-attendance-facts
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/types/database'
import type { AttendanceBands } from '@/lib/attendance/attendance-policy'
import { resolveAttendanceBands } from '@/lib/attendance/resolve-attendance-bands'
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
  bands: AttendanceBands
  matriculaId: string
}

// Receipt: supabase/config.toml exposes at most 1,000 rows per API response.
const FREQUENCIA_QUERY_PAGE_SIZE = 1_000

type AttendanceFactRow = Pick<
  Tables<'frequencia'>,
  'id' | 'matricula_id' | 'sessao_id' | 'data_aula' | 'presente' | 'status_presenca' | 'justificativa'
>

async function loadCanonicalAttendancePage(
  supabase: SupabaseClient<Database>,
  matriculaIds: string[],
  options: CanonicalAttendanceQueryOptions,
  offset: number,
): Promise<AttendanceFactRow[]> {
  let query = supabase
    .from('frequencia')
    .select('id, matricula_id, sessao_id, data_aula, presente, status_presenca, justificativa')
    .not('sessao_id', 'is', null)

  if (matriculaIds.length > 0) query = query.in('matricula_id', matriculaIds)
  if (options.sessaoIds?.length) query = query.in('sessao_id', options.sessaoIds)
  if (options.startDate) query = query.gte('data_aula', options.startDate)
  if (options.endDate) query = query.lte('data_aula', options.endDate)

  const { data, error } = await query
    .order('id', { ascending: true })
    .range(offset, offset + FREQUENCIA_QUERY_PAGE_SIZE - 1)

  if (error) throw error
  return data ?? []
}

function toCanonicalAttendanceFact(record: AttendanceFactRow): CanonicalAttendanceFact | null {
  if (!record.sessao_id || record.status_presenca === 'NAO_MARCADO') return null

  return {
    id: record.id,
    matriculaId: record.matricula_id,
    sessaoId: record.sessao_id,
    dataAula: record.data_aula,
    presente: record.presente ?? false,
    statusPresenca: record.status_presenca,
    justificativa: record.justificativa,
  }
}

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
    const page = await loadCanonicalAttendancePage(supabase, matriculaIds, options, offset)
    for (const record of page) {
      const fact = toCanonicalAttendanceFact(record)
      if (fact) facts.push(fact)
    }

    if (page.length < FREQUENCIA_QUERY_PAGE_SIZE) return facts
    offset += page.length
  }
}

/**
 * Aggregates canonical facts once so every caller applies the same attendance
 * counting rules and the resolved school policy.
 */
export function summarizeCanonicalAttendanceFacts(
  facts: CanonicalAttendanceFact[],
  bands: AttendanceBands,
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
      return [matriculaId, { matriculaId, bands, ...summarizeAttendanceCounts(counts, bands) }]
    })
  )
}

/** Loads and aggregates one canonical attendance read for a set of enrollments. */
export async function loadCanonicalAttendanceSummaries(
  supabase: SupabaseClient<Database>,
  matriculaIds: string[],
  options: CanonicalAttendanceQueryOptions = {}
): Promise<Map<string, CanonicalAttendanceSummary>> {
  if (matriculaIds.length === 0) return new Map()
  const { data: enrollments, error } = await supabase.from('matriculas')
    .select('id, turma:turmas!inner(escola_id)').in('id', matriculaIds)
  if (error) throw error
  const idsBySchool = new Map<string, string[]>()
  for (const enrollment of enrollments ?? []) {
    const schoolId = enrollment.turma.escola_id
    const ids = idsBySchool.get(schoolId) ?? []
    ids.push(enrollment.id)
    idsBySchool.set(schoolId, ids)
  }
  const facts = await loadCanonicalAttendanceFacts(supabase, matriculaIds, options)
  const summaries = new Map<string, CanonicalAttendanceSummary>()
  for (const [schoolId, ids] of idsBySchool) {
    const bands = await resolveAttendanceBands(supabase, schoolId)
    const schoolIds = new Set(ids)
    const schoolFacts = facts.filter(fact => schoolIds.has(fact.matriculaId))
    for (const [id, summary] of summarizeCanonicalAttendanceFacts(schoolFacts, bands, ids)) summaries.set(id, summary)
  }
  return summaries
}
