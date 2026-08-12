import { createHash } from 'node:crypto'
import type { LessonContentReportItem } from '@/lib/reports/content-reports'

/**
 * Serializes only fields returned by the canonical conteudo_aula report query.
 * The SQL validation receipt mirrors this projection and ordering.
 */
function serializeCanonicalContentRow(row: LessonContentReportItem): string {
  return [
    row.id,
    row.sessaoId,
    row.dataAula,
    row.tema,
    row.objetivo,
    row.habilidadesBncc.join(','),
    row.metodologia ?? '',
    row.recursos ?? '',
    row.observacoes ?? '',
  ].join('|')
}

/** Computes the deterministic fingerprint for the rows printed in the report. */
export function fingerprintCanonicalContentRows(rows: LessonContentReportItem[]): string {
  const serializedRows = rows.map(serializeCanonicalContentRow).sort()
  return createHash('md5').update(serializedRows.join('|'), 'utf8').digest('hex')
}
