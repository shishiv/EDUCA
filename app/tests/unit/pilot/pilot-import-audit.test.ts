import { describe, expect, it, vi } from 'vitest'
import type { PilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import { writePilotImportStagedAudit } from '@/lib/pilot/pilot-import-audit'

const input = {
  batchId: '10000000-0000-0000-0000-000000000001',
  schoolId: '20000000-0000-0000-0000-000000000001',
  rowCount: 2,
  sourceFingerprintSha256: 'a'.repeat(64),
}

function clientWithResult(result: Awaited<ReturnType<PilotRpcClient['rpc']>>): PilotRpcClient {
  return { rpc: vi.fn().mockResolvedValue(result) }
}

describe('pilot import staging audit', () => {
  it('returns the acknowledged audit receipt', async () => {
    const client = clientWithResult({ data: 'audit-receipt', error: null })

    await expect(writePilotImportStagedAudit(client, input)).resolves.toBe('audit-receipt')
    expect(client.rpc).toHaveBeenCalledWith('write_pilot_audit_event', {
      p_event_type: 'import_staged',
      p_entity_type: 'pilot_import_batch',
      p_entity_id: input.batchId,
      p_escola_id: input.schoolId,
      p_metadata: {
        dataset: 'students',
        row_count: 2,
        source_fingerprint_sha256: input.sourceFingerprintSha256,
        governance_recorded: true,
        plaintext_stored: false,
      },
    })
  })

  it('rejects RPC errors and missing receipts', async () => {
    await expect(writePilotImportStagedAudit(
      clientWithResult({ data: null, error: { message: 'audit unavailable' } }),
      input,
    )).rejects.toEqual({ message: 'audit unavailable' })
    await expect(writePilotImportStagedAudit(
      clientWithResult({ data: null, error: null }),
      input,
    )).rejects.toThrow('PILOT_IMPORT_STAGE_AUDIT_RECEIPT_MISSING')
  })
})
