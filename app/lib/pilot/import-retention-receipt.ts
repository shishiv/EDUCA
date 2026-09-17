import { z } from 'zod'

const batchResultSchema = z.object({
  batch_id: z.string().uuid(),
  escola_id: z.string().uuid(),
  raw_payload_status: z.enum(['not_due', 'cleaned', 'failed']),
  canonical_status: z.enum(['not_due', 'deleted', 'preserved_dependency', 'failed']),
  reason_code: z.enum(['not_due', 'retention_expired', 'dependency', 'ownership_gap', 'rollback_failed', 'batch_failed']),
})
/** Keep the database receipt allowlisted even if a future query adds diagnostics. */
export const importRetentionResultsSchema = z.array(batchResultSchema)
type ImportRetentionBatch = z.infer<typeof batchResultSchema>

export function summarizeImportRetention(batches: ImportRetentionBatch[]) {
  return {
    rawPayloadsCleaned: batches.filter(batch => batch.raw_payload_status === 'cleaned').length,
    rawPayloadsFailed: batches.filter(batch => batch.raw_payload_status === 'failed').length,
    canonicalBatchesDeleted: batches.filter(batch => batch.canonical_status === 'deleted').length,
    canonicalBatchesPreserved: batches.filter(batch => batch.canonical_status === 'preserved_dependency').length,
    canonicalBatchesFailed: batches.filter(batch => batch.canonical_status === 'failed').length,
    batches,
  }
}
