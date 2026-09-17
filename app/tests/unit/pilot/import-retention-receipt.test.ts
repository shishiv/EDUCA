// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { importRetentionResultsSchema, summarizeImportRetention } from '@/lib/pilot/import-retention-receipt'

describe('import retention receipts', () => {
  it('counts raw cleanup separately from canonical disposal and preserves every outcome', () => {
    const results = importRetentionResultsSchema.parse([
      { batch_id: 'f8000000-0000-4000-8000-000000000001', escola_id: 'f8100000-0000-4000-8000-000000000001', raw_payload_status: 'cleaned', canonical_status: 'preserved_dependency', reason_code: 'dependency' },
      { batch_id: 'f8000000-0000-4000-8000-000000000002', escola_id: 'f8100000-0000-4000-8000-000000000001', raw_payload_status: 'cleaned', canonical_status: 'deleted', reason_code: 'retention_expired' },
      { batch_id: 'f8000000-0000-4000-8000-000000000003', escola_id: 'f8100000-0000-4000-8000-000000000001', raw_payload_status: 'not_due', canonical_status: 'failed', reason_code: 'rollback_failed' },
      { batch_id: 'f8000000-0000-4000-8000-000000000004', escola_id: 'f8100000-0000-4000-8000-000000000001', raw_payload_status: 'failed', canonical_status: 'not_due', reason_code: 'not_due' },
    ])
    expect(summarizeImportRetention(results)).toEqual({
      rawPayloadsCleaned: 2,
      rawPayloadsFailed: 1,
      canonicalBatchesDeleted: 1,
      canonicalBatchesPreserved: 1,
      canonicalBatchesFailed: 1,
      batches: results,
    })
    expect(summarizeImportRetention([])).toEqual({
      rawPayloadsCleaned: 0, rawPayloadsFailed: 0, canonicalBatchesDeleted: 0,
      canonicalBatchesPreserved: 0, canonicalBatchesFailed: 0, batches: [],
    })
  })

  it('does not serialize extra database diagnostics or accept a broken result as zero work', () => {
    const batch = {
      batch_id: 'f8000000-0000-4000-8000-000000000001',
      escola_id: 'f8100000-0000-4000-8000-000000000001',
      raw_payload_status: 'cleaned', canonical_status: 'failed', reason_code: 'rollback_failed',
    }
    const parsed = importRetentionResultsSchema.parse([{ ...batch, sqlerrm: 'private data', payload: 'private CSV' }])
    expect(summarizeImportRetention(parsed).batches).toEqual([batch])
    expect(importRetentionResultsSchema.safeParse(null).success).toBe(false)
    expect(importRetentionResultsSchema.safeParse([{ ...batch, canonical_status: 'private failure detail' }]).success).toBe(false)
  })
})
