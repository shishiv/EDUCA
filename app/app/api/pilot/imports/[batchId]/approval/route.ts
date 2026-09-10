import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { assertSyntheticPilotSafety } from '@/lib/pilot/pilot-safety-gate'
import { requirePilotActor, type PilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import { requirePilotImportAuditReceipt } from '@/lib/pilot/pilot-import-audit'
import {
  completePilotImportGovernance,
  countCanonicalPilotRows,
  fingerprintCanonicalPilotRows,
  fingerprintPilotImportGovernance,
  transformGovernedPilotCsvToCanonicalRows,
  toPilotImportJson,
  validatePilotImportGovernanceInput,
  validateGovernedPilotStudentCsv,
} from '@/lib/pilot/governed-csv-import'
import { decryptPilotImportPayload } from '@/lib/pilot/pilot-import-crypto'
import {
  demoSandboxSimulatedSuccessResponse,
  isDemoSandboxEnabled,
} from '@/lib/demo-sandbox/demo-sandbox'
import { writeDemoActionInterceptedAudit } from '@/lib/demo-sandbox/demo-audit'

type ApprovalDecision = 'approved' | 'rejected'
type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>

const approvalRequestSchema = z.object({ decision: z.enum(['approved', 'rejected']) })
const submitterSnapshotSchema = z.object({
  submitted_by_name: z.string().min(1),
  submitted_by_email: z.string().min(1),
})

interface PilotImportApprovalBatch {
  id: string
  escola_id: string
  submitted_by: string
  status: string
  processing_agreement_confirmed: boolean | null
  processing_agreement_id: string | null
  submitted_by_name: unknown
  submitted_by_email: unknown
  governance_metadata: unknown
  validation_report: unknown
  content_sha256: string
  encryption_key_id: string
  encrypted_payload: string | null
  iv: string | null
  auth_tag: string | null
}

async function runDemoApproval(
  batchId: string,
  decision: ApprovalDecision,
  schoolId: string
): Promise<NextResponse> {
  const supabase = await createClient()
  const receipt = await writeDemoActionInterceptedAudit(
    asPilotRpcClient(supabase),
    {
      operation: 'demo.pilot.import_approval',
      entityId: batchId,
      schoolId,
    }
  )
  const response = demoSandboxSimulatedSuccessResponse(
    'demo.pilot.import_approval',
    {
      batch: {
        id: batchId,
        status: decision === 'approved' ? 'simulated_approved' : 'simulated_rejected',
        decision,
      },
    },
    { auditId: receipt.auditId, correlationId: receipt.correlationId },
  )

  return response ?? NextResponse.json({ error: 'DEMO_IMPORT_APPROVAL_NOT_AVAILABLE' }, { status: 404 })
}

async function requireConfirmedApprovalAgreement(
  service: ServiceRoleClient,
  batch: PilotImportApprovalBatch
): Promise<void> {
  if (batch.processing_agreement_confirmed !== true || !batch.processing_agreement_id) {
    throw new Error('PILOT_IMPORT_TREATMENT_AGREEMENT_REQUIRED: a confirmed treatment agreement must be on file')
  }
  const { data: agreement, error: agreementError } = await service
    .from('pilot_data_treatment_agreements')
    .select('id,escola_id,confirmed,confirmed_at,confirmed_by')
    .eq('id', batch.processing_agreement_id)
    .eq('escola_id', batch.escola_id)
    .eq('confirmed', true)
    .maybeSingle()
  if (agreementError) throw agreementError
  if (!agreement?.confirmed || !agreement.confirmed_at || !agreement.confirmed_by) {
    throw new Error('PILOT_IMPORT_TREATMENT_AGREEMENT_REQUIRED: a confirmed treatment agreement must be on file')
  }
}

function createApprovalGovernance(batch: PilotImportApprovalBatch, actor: PilotActor) {
  const submitter = submitterSnapshotSchema.safeParse(batch)
  const governanceInput = validatePilotImportGovernanceInput(batch.governance_metadata)
  if (!actor.email || !submitter.success) throw new Error('PILOT_IMPORT_GOVERNANCE_ACTOR_SNAPSHOT_MISSING')
  const now = new Date()
  const completeGovernance = completePilotImportGovernance(
    governanceInput,
    { name: submitter.data.submitted_by_name, email: submitter.data.submitted_by_email },
    { name: actor.name, email: actor.email },
    now,
  )
  return {
    completeGovernance,
    governanceFingerprint: fingerprintPilotImportGovernance(completeGovernance),
    reportSha256: createHash('sha256').update(JSON.stringify(batch.validation_report)).digest('hex'),
  }
}

async function rejectPilotImport(
  service: ServiceRoleClient,
  batch: PilotImportApprovalBatch,
  actor: PilotActor,
  reportSha256: string,
  governanceFingerprint: string,
  completeGovernance: ReturnType<typeof completePilotImportGovernance>
): Promise<NextResponse> {
  const { data: rejectedRows, error } = await asPilotRpcClient(service).rpc('pilot_reject_synthetic_import_batch', {
    p_batch_id: batch.id,
    p_approver_user_id: actor.id,
    p_report_sha256: reportSha256,
    p_governance_fingerprint_sha256: governanceFingerprint,
    p_governance_metadata: toPilotImportJson(completeGovernance),
  })
  if (error) throw error
  const rejected = rejectedRows?.[0]
  if (!rejected) throw new Error('PILOT_IMPORT_REJECTION_RECEIPT_MISSING')
  const auditId = requirePilotImportAuditReceipt(
    rejected.audit_id,
    'PILOT_IMPORT_REJECTION_AUDIT_RECEIPT_MISSING',
  )
  return NextResponse.json({
    batch: {
      id: rejected.batch_id,
      status: rejected.status,
      approved_at: rejected.approved_at,
      cleaned_at: rejected.cleaned_at,
      raw_expires_at: rejected.raw_expires_at,
    },
    auditId,
  })
}

async function findRejectedAuditReceipt(
  service: ServiceRoleClient,
  batchId: string,
): Promise<string> {
  const { data, error } = await service
    .from('pilot_audit_log')
    .select('id')
    .eq('event_type', 'import_rejected')
    .eq('entity_type', 'pilot_import_batch')
    .eq('entity_id', batchId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return requirePilotImportAuditReceipt(
    data?.id,
    'PILOT_IMPORT_REJECTION_AUDIT_RECEIPT_MISSING',
  )
}

async function publishPilotImport(
  service: ServiceRoleClient,
  batch: PilotImportApprovalBatch,
  actor: PilotActor,
  reportSha256: string,
  governanceFingerprint: string,
  completeGovernance: ReturnType<typeof completePilotImportGovernance>
): Promise<NextResponse> {
  const key = process.env.PILOT_IMPORT_ENCRYPTION_KEY
  if (!key || !batch.encrypted_payload || !batch.iv || !batch.auth_tag) throw new Error('PILOT_IMPORT_ENCRYPTED_PAYLOAD_MISSING')
  const csv = decryptPilotImportPayload({
    encryptionKeyId: batch.encryption_key_id,
    ciphertext: batch.encrypted_payload,
    iv: batch.iv,
    authTag: batch.auth_tag,
  }, key)
  const { rows, report } = validateGovernedPilotStudentCsv(csv, 'synthetic')
  if (!report.valid || report.contentSha256 !== batch.content_sha256) throw new Error('PILOT_IMPORT_INTEGRITY_FAILED')
  const canonicalRows = transformGovernedPilotCsvToCanonicalRows(rows)
  const canonicalCounts = countCanonicalPilotRows(canonicalRows)
  const canonicalFingerprint = fingerprintCanonicalPilotRows(canonicalRows)

  const { data: publishedRows, error: publishError } = await asPilotRpcClient(service).rpc('pilot_publish_synthetic_import_batch', {
    p_batch_id: batch.id,
    p_approver_user_id: actor.id,
    p_report_sha256: reportSha256,
    p_rows: toPilotImportJson(rows),
    p_canonical_counts: toPilotImportJson(canonicalCounts),
    p_canonical_fingerprint_sha256: canonicalFingerprint,
    p_governance_fingerprint_sha256: governanceFingerprint,
    p_governance_metadata: toPilotImportJson(completeGovernance),
  })
  if (publishError) throw publishError
  const published = publishedRows?.[0]
  if (!published) throw new Error('PILOT_IMPORT_PUBLISH_RECEIPT_MISSING')

  return NextResponse.json({
    batch: {
      id: published.batch_id,
      status: published.status,
      published_at: published.published_at,
      cleaned_at: published.cleaned_at,
      raw_expires_at: published.raw_expires_at,
    },
  })
}

async function runLiveApproval(
  actor: PilotActor & { schoolId: string },
  batchId: string,
  decision: ApprovalDecision,
): Promise<NextResponse> {
  assertSyntheticPilotSafety('import')

  const service = createServiceRoleClient()
  const { data: batch, error: batchError } = await service.from('pilot_import_batches').select('*').eq('id', batchId).single()
  if (batchError || !batch) return NextResponse.json({ error: 'PILOT_IMPORT_BATCH_NOT_FOUND' }, { status: 404 })
  if (batch.escola_id !== actor.schoolId || batch.submitted_by === actor.id) return NextResponse.json({ error: 'PILOT_IMPORT_MAKER_CHECKER_DENIED' }, { status: 403 })
  if (batch.status === 'published') return NextResponse.json({ batch, idempotentReplay: true })
  if (batch.status === 'rejected') {
    const auditId = await findRejectedAuditReceipt(service, batch.id)
    return NextResponse.json({ batch, auditId, idempotentReplay: true })
  }

  await requireConfirmedApprovalAgreement(service, batch)
  const approval = createApprovalGovernance(batch, actor)
  if (decision === 'rejected') {
    return rejectPilotImport(service, batch, actor, approval.reportSha256, approval.governanceFingerprint, approval.completeGovernance)
  }
  return publishPilotImport(service, batch, actor, approval.reportSha256, approval.governanceFingerprint, approval.completeGovernance)
}

export async function POST(request: Request, context: { params: Promise<{ batchId: string }> }) {
  const demoSandbox = isDemoSandboxEnabled()
  try {
    const actor = await requirePilotActor(['diretor'])
    if (!actor.schoolId) return NextResponse.json({ error: 'PILOT_APPROVAL_SCHOOL_REQUIRED' }, { status: 403 })
    const { batchId } = await context.params
    if (!z.string().uuid().safeParse(batchId).success) {
      return NextResponse.json({ error: 'PILOT_APPROVAL_INVALID_BATCH' }, { status: 400 })
    }
    const body = approvalRequestSchema.safeParse(await request.json())
    if (!body.success) return NextResponse.json({ error: 'PILOT_APPROVAL_INVALID_DECISION' }, { status: 400 })

    if (demoSandbox) {
      return runDemoApproval(batchId, body.data.decision, actor.schoolId)
    }
    return runLiveApproval({ ...actor, schoolId: actor.schoolId }, batchId, body.data.decision)
  } catch (error) {
    return pilotErrorResponse(error, { feature: 'pilot-import-approval', fallbackCode: 'PILOT_APPROVAL_FAILED' })
  }
}
