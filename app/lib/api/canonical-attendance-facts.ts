import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/** One attendance fact tied to the canonical session and active enrollment. */
export interface CanonicalAttendanceFact {
  matriculaId: string
  sessaoId: string
  presente: boolean
}

// Receipt: supabase/config.toml exposes at most 1,000 rows per API response.
const FREQUENCIA_QUERY_PAGE_SIZE = 1_000

/**
 * Loads every marked attendance fact for the supplied enrollments.
 *
 * The canonical contract is frequencia.sessao_id. Legacy aula_id-only rows are
 * intentionally excluded so dashboard metrics and turma metrics cannot mix
 * the retired attendance source with canonical sessions.
 */
export async function loadCanonicalAttendanceFacts(
  supabase: SupabaseClient<Database>,
  matriculaIds: string[]
): Promise<CanonicalAttendanceFact[]> {
  if (matriculaIds.length === 0) return []

  const facts: CanonicalAttendanceFact[] = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('frequencia')
      .select('matricula_id, sessao_id, presente, status_presenca')
      .in('matricula_id', matriculaIds)
      .not('sessao_id', 'is', null)
      .order('id', { ascending: true })
      .range(offset, offset + FREQUENCIA_QUERY_PAGE_SIZE - 1)

    if (error) throw error

    const page = data ?? []
    for (const record of page) {
      if (!record.sessao_id || record.status_presenca === 'NAO_MARCADO') continue
      facts.push({
        matriculaId: record.matricula_id,
        sessaoId: record.sessao_id,
        presente: record.presente,
      })
    }

    if (page.length < FREQUENCIA_QUERY_PAGE_SIZE) return facts
    offset += page.length
  }
}
