import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { assertSyntheticPilotSafety } from '@/lib/pilot/pilot-safety-gate'
import { requirePilotActor, type PilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import {
  completePilotImportGovernance,
  countCanonicalPilotRows,
  fingerprintCanonicalPilotRows,
  fingerprintPilotImportGovernance,
  transformGovernedPilotCsvToCanonicalRows,
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
  const submittedByName = typeof batch.submitted_by_name === 'string' ? batch.submitted_by_name : ''
  const submittedByEmail = typeof batch.submitted_by_email === 'string' ? batch.submitted_by_email : ''
  const governanceInput = validatePilotImportGovernanceInput(batch.governance_metadata)
  if (!actor.email || !submittedByName || !submittedByEmail) throw new Error('PILOT_IMPORT_GOVERNANCE_ACTOR_SNAPSHOT_MISSING')
  const now = new Date()
  const completeGovernance = completePilotImportGovernance(
    governanceInput,
    { name: submittedByName, email: submittedByEmail },
    { name: actor.name, email: actor.email },
    now,
  )
  return {
    now,
    completeGovernance,
    governanceFingerprint: fingerprintPilotImportGovernance(completeGovernance),
    reportSha256: createHash('sha256').update(JSON.stringify(batch.validation_report)).digest('hex'),
  }
}

async function rejectPilotImport(
  service: ServiceRoleClient,
  batch: PilotImportApprovalBatch,
  actor: PilotActor,
  now: Date,
  reportSha256: string,
  governanceFingerprint: string,
  completeGovernance: ReturnType<typeof completePilotImportGovernance>
): Promise<NextResponse> {
  const { error: approvalError } = await service.from('pilot_import_approvals').upsert({
    batch_id: batch.id, escola_id: batch.escola_id, submitted_by: batch.submitted_by,
    approved_by: actor.id, decision: 'rejected', report_sha256: reportSha256, decided_at: now.toISOString(),
  }, { onConflict: 'batch_id' })
  if (approvalError) throw approvalError
  const { data: rejected, error } = await service.from('pilot_import_batches').update({
    status: 'rejected', approved_by: actor.id, approved_by_name: actor.name, approved_by_email: actor.email,
    approved_at: now.toISOString(), governance_fingerprint_sha256: governanceFingerprint,
    governance_metadata: completeGovernance,
    encrypted_payload: null, iv: null, auth_tag: null, cleaned_at: new Date().toISOString(),
  }).eq('id', batch.id).select('id,status,cleaned_at').single()
  if (error) throw error
  return NextResponse.json({ batch: rejected })
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

  const { data: publishedRows, error: publishError } = await asPilotRpcClient(service).rpc<{
    batch_id: string
    status: string
    published_at: string
    cleaned_at: string | null
    raw_expires_at: string
  }[]>('pilot_publish_synthetic_import_batch', {
    p_batch_id: batch.id,
    p_approver_user_id: actor.id,
    p_report_sha256: reportSha256,
    p_rows: rows,
    p_canonical_counts: canonicalCounts,
    p_canonical_fingerprint_sha256: canonicalFingerprint,
    p_governance_fingerprint_sha256: governanceFingerprint,
    p_governance_metadata: completeGovernance,
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

export async function POST(request: Request, context: { params: Promise<{ batchId: string }> }) {
  const demoSandbox = isDemoSandboxEnabled()
  try {
    const actor = await requirePilotActor(['diretor'])
    if (!actor.schoolId) return NextResponse.json({ error: 'PILOT_APPROVAL_SCHOOL_REQUIRED' }, { status: 403 })
    const { batchId } = await context.params
    if (!z.string().uuid().safeParse(batchId).success) {
      return NextResponse.json({ error: 'PILOT_APPROVAL_INVALID_BATCH' }, { status: 400 })
    }
    const body = await request.json() as { decision?: 'approved' | 'rejected' }
    if (!['approved', 'rejected'].includes(body.decision || '')) return NextResponse.json({ error: 'PILOT_APPROVAL_INVALID_DECISION' }, { status: 400 })
    const decision = body.decision as ApprovalDecision

    if (demoSandbox) {
      return await runDemoApproval(batchId, decision, actor.schoolId)
    }

    assertSyntheticPilotSafety('import')

    const service = createServiceRoleClient()
    const { data: batch, error: batchError } = await service.from('pilot_import_batches').select('*').eq('id', batchId).single()
    if (batchError || !batch) return NextResponse.json({ error: 'PILOT_IMPORT_BATCH_NOT_FOUND' }, { status: 404 })
    if (batch.escola_id !== actor.schoolId || batch.submitted_by === actor.id) return NextResponse.json({ error: 'PILOT_IMPORT_MAKER_CHECKER_DENIED' }, { status: 403 })
    if (batch.status === 'published' || batch.status === 'rejected') return NextResponse.json({ batch, idempotentReplay: true })
    await requireConfirmedApprovalAgreement(service, batch)
    const approval = createApprovalGovernance(batch, actor)
    if (decision === 'rejected') {
      return await rejectPilotImport(service, batch, actor, approval.now, approval.reportSha256, approval.governanceFingerprint, approval.completeGovernance)
    }
    return await publishPilotImport(service, batch, actor, approval.reportSha256, approval.governanceFingerprint, approval.completeGovernance)
  } catch (error) {
    return pilotErrorResponse(error, { feature: 'pilot-import-approval', fallbackCode: 'PILOT_APPROVAL_FAILED' })
  }
}
