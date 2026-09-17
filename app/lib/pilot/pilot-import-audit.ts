import type { PilotRpcClient } from '@/lib/pilot/pilot-rpc-client'

export interface PilotImportStagedAuditInput {
  batchId: string
  schoolId: string
  rowCount: number
  sourceFingerprintSha256: string
}

export function requirePilotImportAuditReceipt(
  receipt: string | null | undefined,
  missingCode: string,
): string {
  if (!receipt?.trim()) throw new Error(missingCode)
  return receipt
}

export async function writePilotImportStagedAudit(
  client: PilotRpcClient,
  input: PilotImportStagedAuditInput,
): Promise<string> {
  const { data, error } = await client.rpc('write_pilot_audit_event', {
    p_event_type: 'import_staged',
    p_entity_type: 'pilot_import_batch',
    p_entity_id: input.batchId,
    p_escola_id: input.schoolId,
    p_metadata: {
      dataset: 'students',
      row_count: input.rowCount,
      source_fingerprint_sha256: input.sourceFingerprintSha256,
      governance_recorded: true,
      plaintext_stored: false,
    },
  })
  if (error) throw error
  return requirePilotImportAuditReceipt(data, 'PILOT_IMPORT_STAGE_AUDIT_RECEIPT_MISSING')
}
