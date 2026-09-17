import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, type Tables } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { assertSyntheticPilotSafety } from '@/lib/pilot/pilot-safety-gate'
import { requirePilotActor, type PilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import {
  requirePilotImportAuditReceipt,
  writePilotImportStagedAudit,
} from '@/lib/pilot/pilot-import-audit'
import {
  demoSandboxSimulatedSuccessResponse,
  isDemoSandboxEnabled,
} from '@/lib/demo-sandbox/demo-sandbox'
import { writeDemoActionInterceptedAudit } from '@/lib/demo-sandbox/demo-audit'
import {
  assertPilotImportOwnerMatchesActor,
  countCanonicalPilotRows,
  fingerprintCanonicalPilotRows,
  transformGovernedPilotCsvToCanonicalRows,
  validatePilotImportGovernanceInput,
  validateGovernedPilotStudentCsv,
  type GovernedCsvCanonicalCounts,
  type GovernedCsvValidationReport,
  type GovernedPilotStudentCsvRow,
  type PilotImportGovernanceInput,
} from '@/lib/pilot/governed-csv-import'
import {
  createPilotDryRunValidationToken,
  encryptPilotImportPayload,
  verifyPilotDryRunValidationToken,
} from '@/lib/pilot/pilot-import-crypto'

const MAX_CSV_BYTES = 5 * 1024 * 1024

interface ImportKey {
  key: string
  keyId: string
}

const importRequestSchema = z.object({
  csv: z.string().optional(),
  dryRun: z.boolean().optional(),
  validationToken: z.string().optional(),
  idempotencyKey: z.string().optional(),
  governance: z.unknown().optional(),
})

function getImportKey(): ImportKey {
  const key = process.env.PILOT_IMPORT_ENCRYPTION_KEY
  const keyId = process.env.PILOT_IMPORT_ENCRYPTION_KEY_ID || 'synthetic-local-v1'
  if (!key) throw new Error('PILOT_IMPORT_KEY_MISSING')
  return { key, keyId }
}

interface ConfirmedTreatmentAgreement {
  id: string
  confirmedAt: string
  confirmedBy: string
  recorderName: string
  recorderEmail: string
}

interface ImportRequestBody {
  csv: string
  dryRun?: boolean
  validationToken?: string
  idempotencyKey?: string
  governance?: unknown
}

type ExistingImportBatch = Pick<
  Tables<'pilot_import_batches'>,
  'id' | 'status' | 'validation_report' | 'idempotency_key' | 'content_sha256'
>

const confirmedAgreementSchema = z.object({
  id: z.string().uuid(),
  confirmed: z.literal(true),
  confirmed_at: z.string().min(1),
  confirmed_by: z.string().uuid(),
})
const activeAgreementRecorderSchema = z.object({
  nome: z.string().min(1),
  email: z.string().min(1),
  ativo: z.literal(true),
})

async function requireConfirmedTreatmentAgreement(
  service: ReturnType<typeof createServiceRoleClient>,
  schoolId: string,
  reference: string,
  version: string
): Promise<ConfirmedTreatmentAgreement> {
  const { data: agreement, error: agreementError } = await service
    .from('pilot_data_treatment_agreements')
    .select('id,confirmed,confirmed_at,confirmed_by')
    .eq('escola_id', schoolId)
    .eq('reference', reference)
    .eq('version', version)
    .eq('confirmed', true)
    .maybeSingle()
  if (agreementError) throw agreementError
  const confirmedAgreement = confirmedAgreementSchema.safeParse(agreement)
  if (!confirmedAgreement.success) {
    throw new Error('PILOT_IMPORT_TREATMENT_AGREEMENT_REQUIRED: a confirmed treatment agreement must be on file')
  }

  const { data: recorder, error: recorderError } = await service
    .from('users')
    .select('id,nome,email,ativo')
    .eq('id', confirmedAgreement.data.confirmed_by)
    .eq('ativo', true)
    .single()
  if (recorderError) throw recorderError
  const activeRecorder = activeAgreementRecorderSchema.safeParse(recorder)
  if (!activeRecorder.success) {
    throw new Error('PILOT_IMPORT_TREATMENT_AGREEMENT_RECORDER_REQUIRED: agreement confirmer must be active')
  }

  return {
    id: confirmedAgreement.data.id,
    confirmedAt: confirmedAgreement.data.confirmed_at,
    confirmedBy: confirmedAgreement.data.confirmed_by,
    recorderName: activeRecorder.data.nome,
    recorderEmail: activeRecorder.data.email,
  }
}

function validateStageMutation(
  body: ImportRequestBody,
  report: GovernedCsvValidationReport,
  key: string,
): NextResponse | null {
  if (body.dryRun) {
    return NextResponse.json({ report, validationToken: createPilotDryRunValidationToken(report.contentSha256, key) })
  }
  if (!body.validationToken || !verifyPilotDryRunValidationToken(report.contentSha256, body.validationToken, key)) {
    return NextResponse.json({ error: 'PILOT_IMPORT_DRY_RUN_REQUIRED' }, { status: 409 })
  }
  if (!body.idempotencyKey || !/^[A-Za-z0-9_-]{8,128}$/.test(body.idempotencyKey)) {
    return NextResponse.json({ error: 'PILOT_IMPORT_IDEMPOTENCY_KEY_REQUIRED' }, { status: 400 })
  }
  return null
}

async function findExistingImportBatch(
  service: ReturnType<typeof createServiceRoleClient>,
  schoolId: string,
  idempotencyKey: string | undefined,
  contentSha256: string,
): Promise<ExistingImportBatch | null> {
  const { data, error } = await service
    .from('pilot_import_batches')
    .select('id,status,validation_report,idempotency_key,content_sha256')
    .eq('escola_id', schoolId)
    .or(`idempotency_key.eq.${idempotencyKey},content_sha256.eq.${contentSha256}`)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data?.find(batch => batch.idempotency_key === idempotencyKey) ?? data?.[0] ?? null
}

async function respondToExistingImport(
  service: ReturnType<typeof createServiceRoleClient>,
  auditClient: Awaited<ReturnType<typeof createClient>>,
  batch: ExistingImportBatch,
  schoolId: string,
  rows: GovernedPilotStudentCsvRow[],
  report: GovernedCsvValidationReport,
): Promise<NextResponse> {
  const { data: audit, error } = await service
    .from('pilot_audit_log')
    .select('id')
    .eq('event_type', 'import_staged')
    .eq('entity_type', 'pilot_import_batch')
    .eq('entity_id', batch.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  const auditId = audit?.id
    ? requirePilotImportAuditReceipt(audit.id, 'PILOT_IMPORT_STAGE_AUDIT_RECEIPT_MISSING')
    : await writePilotImportStagedAudit(asPilotRpcClient(auditClient), {
        batchId: batch.id,
        schoolId,
        rowCount: rows.length,
        sourceFingerprintSha256: report.contentSha256,
      })
  return NextResponse.json({
    batch: { id: batch.id, status: batch.status, validation_report: batch.validation_report },
    auditId,
    idempotentReplay: true,
  })
}

async function runDemoImport(
  rows: GovernedPilotStudentCsvRow[],
  report: GovernedCsvValidationReport
): Promise<NextResponse> {
  if (!report.valid) return NextResponse.json({ report }, { status: 422 })

  const supabase = await createClient()
  const { data: school, error: schoolError } = await supabase
    .from('escolas')
    .select('id,codigo')
    .eq('codigo', report.schoolCodes[0])
    .single()

  if (schoolError || !school) {
    return NextResponse.json({ error: 'PILOT_IMPORT_SCHOOL_NOT_FOUND', report }, { status: 422 })
  }

  const receipt = await writeDemoActionInterceptedAudit(
    asPilotRpcClient(supabase),
    {
      operation: 'demo.pilot.import',
      entityId: report.contentSha256,
      schoolId: school.id,
    }
  )
  const response = demoSandboxSimulatedSuccessResponse(
    'demo.pilot.import',
    {
      batch: {
        id: receipt.correlationId,
        status: 'simulated',
        validation_report: report,
      },
      report,
      validationToken: 'demo-simulated',
      simulatedRowCount: rows.length,
    },
    { status: 201, auditId: receipt.auditId, correlationId: receipt.correlationId },
  )

  return response ?? NextResponse.json({ error: 'DEMO_IMPORT_NOT_AVAILABLE' }, { status: 404 })
}

async function stageGovernedImport(
  body: ImportRequestBody,
  governance: PilotImportGovernanceInput,
  rows: GovernedPilotStudentCsvRow[],
  report: GovernedCsvValidationReport,
  canonicalCounts: GovernedCsvCanonicalCounts,
  canonicalFingerprint: string,
  actor: PilotActor
): Promise<NextResponse> {
  const { key, keyId } = getImportKey()
  if (!report.valid) return NextResponse.json({ report }, { status: 422 })
  const owner = assertPilotImportOwnerMatchesActor(governance.owner, actor)

  const supabase = await createClient()
  const { data: school, error: schoolError } = await supabase
    .from('escolas')
    .select('id,codigo')
    .eq('codigo', report.schoolCodes[0])
    .single()
  if (schoolError || !school) return NextResponse.json({ error: 'PILOT_IMPORT_SCHOOL_NOT_FOUND', report }, { status: 422 })

  const service = createServiceRoleClient()
  const agreement = await requireConfirmedTreatmentAgreement(
    service,
    school.id,
    governance.processingAgreement.reference,
    governance.processingAgreement.version,
  )

  const validationResponse = validateStageMutation(body, report, key)
  if (validationResponse) return validationResponse

  const matched = await findExistingImportBatch(service, school.id, body.idempotencyKey, report.contentSha256)
  if (matched) {
    return respondToExistingImport(service, supabase, matched, school.id, rows, report)
  }

  const recordedAt = new Date().toISOString()
  const governanceMetadata = { ...governance, owner }
  const encrypted = encryptPilotImportPayload(body.csv, key, keyId)
  const { data: batch, error: insertError } = await service
    .from('pilot_import_batches')
    .insert({
      escola_id: school.id,
      dataset: 'students',
      idempotency_key: body.idempotencyKey,
      content_sha256: report.contentSha256,
      encryption_key_id: encrypted.encryptionKeyId,
      encrypted_payload: encrypted.ciphertext,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
      validation_report: report,
      submitted_by: actor.id,
      import_target: 'synthetic_local',
      source_mode: 'synthetic',
      encryption_algorithm: 'aes-256-gcm',
      governance_owner_name: owner.name,
      governance_owner_email: owner.email,
      governance_owner_user_id: actor.id,
      governance_owner_authorized_at: recordedAt,
      submitted_by_name: actor.name,
      submitted_by_email: actor.email,
      processing_agreement_id: agreement.id,
      processing_agreement_confirmed: true,
      processing_agreement_reference: governance.processingAgreement.reference,
      processing_agreement_version: governance.processingAgreement.version,
      processing_agreement_recorded_at: agreement.confirmedAt,
      processing_agreement_recorded_by: agreement.confirmedBy,
      processing_agreement_recorded_by_name: agreement.recorderName,
      processing_agreement_recorded_by_email: agreement.recorderEmail,
      retention_policy: governance.retention.policy,
      raw_expires_at: governance.retention.rawPayloadExpiresAt,
      canonical_expires_at: governance.retention.canonicalDataExpiresAt,
      rollback_until: governance.retention.rollbackUntil,
      source_row_count: report.totalRows,
      canonical_counts: canonicalCounts,
      canonical_fingerprint_sha256: canonicalFingerprint,
      governance_metadata: governanceMetadata,
    })
    .select('id,status,validation_report,raw_expires_at,canonical_counts,canonical_fingerprint_sha256')
    .single()
  if (insertError) throw insertError

  const auditId = await writePilotImportStagedAudit(asPilotRpcClient(supabase), {
    batchId: batch.id,
    schoolId: school.id,
    rowCount: rows.length,
    sourceFingerprintSha256: report.contentSha256,
  })
  return NextResponse.json({ batch, auditId }, { status: 201 })
}

export async function POST(request: Request) {
  const demoSandbox = isDemoSandboxEnabled()

  try {
    if (!demoSandbox) assertSyntheticPilotSafety('import')
    const actor = await requirePilotActor(['admin', 'secretario'])
    if (actor.schoolId !== null) return NextResponse.json({ error: 'PILOT_IMPORT_SECRETARIAT_REQUIRED' }, { status: 403 })

    const parsedBody = importRequestSchema.safeParse(await request.json())
    if (!parsedBody.success || !parsedBody.data.csv || Buffer.byteLength(parsedBody.data.csv, 'utf8') > MAX_CSV_BYTES) {
      return NextResponse.json({ error: 'PILOT_IMPORT_INVALID_SIZE' }, { status: 400 })
    }
    const body: ImportRequestBody = { ...parsedBody.data, csv: parsedBody.data.csv }

    const governance = validatePilotImportGovernanceInput(body.governance)
    const { rows, report } = validateGovernedPilotStudentCsv(body.csv, 'synthetic')
    const canonicalRows = transformGovernedPilotCsvToCanonicalRows(rows)
    const canonicalCounts = countCanonicalPilotRows(canonicalRows)
    const canonicalFingerprint = fingerprintCanonicalPilotRows(canonicalRows)
    if (demoSandbox) return await runDemoImport(rows, report)
    return await stageGovernedImport(body, governance, rows, report, canonicalCounts, canonicalFingerprint, actor)
  } catch (error) {
    return pilotErrorResponse(error, { feature: 'pilot-imports', fallbackCode: 'PILOT_IMPORT_FAILED' })
  }
}
