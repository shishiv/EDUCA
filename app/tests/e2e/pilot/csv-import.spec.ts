import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { z } from 'zod'

const csv = [
  'synthetic_marker,source_id,school_code,class_code,student_name,birth_date,sex,guardian_name,guardian_phone,guardian_relationship',
  'SYNTHETIC-EDUCA-PILOT,csv-e2e-student,00000001,CLASS-A,Aluno CSV Sintetico,2018-05-20,M,Responsavel CSV Sintetico,(11) 98888-0000,mae',
].join('\n')
const rejectedCsv = [
  'synthetic_marker,source_id,school_code,class_code,student_name,birth_date,sex,guardian_name,guardian_phone,guardian_relationship',
  'SYNTHETIC-EDUCA-PILOT,csv-e2e-rejected,00000001,CLASS-A,Aluno CSV Rejeitado,2018-06-12,F,Responsavel CSV Rejeitado,(11) 97777-0000,pai',
].join('\n')

const governance = {
  version: 'educa-synthetic-pilot-governance-v1',
  owner: { name: 'Secretaria Sintetica', email: 'secretaria@synthetic.invalid' },
  controller: { name: 'Controlador do Piloto Sintetico', email: 'controller@synthetic.invalid', status: 'a confirmar' },
  processor: { name: 'Processador do Piloto Sintetico', email: 'processor@synthetic.invalid', status: 'a confirmar' },
  purpose: 'preparacao tecnica do piloto sintetico',
  legalBasis: 'a confirmar',
  processingAgreement: { reference: 'DPA-SYN-E2E-001', version: 'v1', status: 'confirmed', confirmed: true },
  subprocessors: [{
    name: 'Armazenamento do Piloto Sintetico', email: 'storage@synthetic.invalid', status: 'a confirmar',
    service: 'armazenamento cifrado de prova', processingLocation: 'isolated-proof-local',
  }],
  location: { primary: 'isolated-proof-local', transfer: 'a confirmar' },
  encryption: { algorithm: 'aes-256-gcm', keyReference: 'synthetic-local-v1', inTransit: 'a confirmar', plaintextStored: false },
  retention: {
    policy: 'synthetic-proof-30d',
    rawPayloadExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    canonicalDataExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    rollbackUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  exit: {
    trigger: 'fim da prova tecnica', dataDisposition: 'a confirmar', accessRevocation: 'a confirmar', evidence: 'a confirmar',
  },
  incident: {
    contact: { name: 'Contato Incidente Sintetico', email: 'incidente@synthetic.invalid' },
    notification: 'a confirmar', response: 'a confirmar',
  },
}

const secretariatEmail = 'secretaria@synthetic.invalid'
const directorEmail = 'diretora.a@synthetic.invalid'
const sourceFingerprint = createHash('sha256').update(csv, 'utf8').digest('hex')

async function postJson<RequestBody>(page: Page, url: string, body: RequestBody) {
  return page.evaluate(async ({ requestUrl, requestBody }) => {
    const response = await fetch(requestUrl, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(requestBody),
    })
    return { status: response.status, body: await response.json() }
  }, { requestUrl: url, requestBody: body })
}

function createServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

type ServiceClient = ReturnType<typeof createServiceClient>

async function loginDirector(browser: Browser) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill(directorEmail)
  await page.getByLabel('Senha', { exact: true }).fill('Synthetic-Only-2026!')
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/dashboard/)
  return { context, page }
}

async function stagePublishedImport(page: Page) {
  await page.goto('/dashboard')
  const blockedWithoutAgreement = await postJson(page, '/api/pilot/imports', {
    csv,
    dryRun: true,
    governance: {
      ...governance,
      processingAgreement: { ...governance.processingAgreement, status: 'a confirmar', confirmed: false },
    },
  })
  expect(blockedWithoutAgreement).toEqual({
    status: 409,
    body: { error: 'PILOT_IMPORT_TREATMENT_AGREEMENT_REQUIRED: a confirmed treatment agreement is required' },
  })
  const blockedWithoutOwner = await postJson(page, '/api/pilot/imports', {
    csv,
    dryRun: true,
    governance: {
      ...governance,
      owner: { name: 'Outro Owner Sintetico', email: 'outro-owner@synthetic.invalid' },
    },
  })
  expect(blockedWithoutOwner).toEqual({
    status: 403,
    body: { error: 'PILOT_IMPORT_OWNER_DENIED: the named owner must be the authenticated authorizer' },
  })
  const dryRun = await postJson(page, '/api/pilot/imports', { csv, dryRun: true, governance })
  expect(dryRun).toEqual(expect.objectContaining({
    status: 200,
    body: expect.objectContaining({
      report: expect.objectContaining({ valid: true, validRows: 1 }),
      validationToken: expect.any(String),
    }),
  }))
  expect(JSON.stringify(dryRun.body)).not.toContain('Aluno CSV Sintetico')
  const staged = await postJson(page, '/api/pilot/imports', {
    csv,
    validationToken: dryRun.body.validationToken,
    idempotencyKey: 'csv-e2e-batch-001',
    governance,
  })
  expect(staged.status).toBe(201)
  expect(JSON.stringify(staged.body)).not.toContain('Aluno CSV Sintetico')
  return z.string().uuid().parse(staged.body.batch.id)
}

async function loadStagedSnapshot(service: ServiceClient, batchId: string) {
  const [submitterResult, batchResult] = await Promise.all([
    service.from('users').select('id,email').eq('email', secretariatEmail).single(),
    service
      .from('pilot_import_batches')
      .select('id,status,import_target,source_mode,encryption_algorithm,encryption_key_id,encrypted_payload,iv,auth_tag,submitted_by,approved_by,content_sha256,source_row_count,canonical_counts,canonical_fingerprint_sha256,governance_owner_name,governance_owner_email,processing_agreement_id,processing_agreement_confirmed,processing_agreement_reference,processing_agreement_version,processing_agreement_recorded_by,raw_expires_at,canonical_expires_at,rollback_until')
      .eq('id', batchId)
      .single(),
  ])
  return { submitterResult, batchResult }
}

type StagedSnapshot = Awaited<ReturnType<typeof loadStagedSnapshot>>

function assertStagedGovernance(snapshot: StagedSnapshot, batchId: string) {
  const { data: submitter, error: submitterError } = snapshot.submitterResult
  const { data: encryptedBatch, error: encryptedBatchError } = snapshot.batchResult
  expect(submitterError).toBeNull()
  expect(encryptedBatchError).toBeNull()
  expect(encryptedBatch).toMatchObject({
    id: batchId,
    status: 'pending_approval',
    import_target: 'synthetic_local',
    source_mode: 'synthetic',
    encryption_algorithm: 'aes-256-gcm',
    encryption_key_id: 'synthetic-local-v1',
    submitted_by: submitter?.id,
    approved_by: null,
    content_sha256: sourceFingerprint,
    source_row_count: 1,
    canonical_counts: { sourceRows: 1, students: 1, guardians: 1, relationships: 1, enrollments: 1 },
    governance_owner_name: 'Secretaria Sintetica',
    governance_owner_email: 'secretaria@synthetic.invalid',
    processing_agreement_reference: 'DPA-SYN-E2E-001',
    processing_agreement_version: 'v1',
    processing_agreement_recorded_by: submitter?.id,
    processing_agreement_confirmed: true,
    processing_agreement_id: expect.any(String),
  })
}

function assertStagedEncryption(snapshot: StagedSnapshot) {
  const encryptedBatch = snapshot.batchResult.data
  expect(encryptedBatch?.encrypted_payload).toEqual(expect.any(String))
  expect(encryptedBatch?.iv).toEqual(expect.any(String))
  expect(encryptedBatch?.auth_tag).toEqual(expect.any(String))
  expect(encryptedBatch?.encrypted_payload).not.toContain('Aluno CSV Sintetico')
  expect(encryptedBatch?.canonical_fingerprint_sha256).toMatch(/^[a-f0-9]{64}$/)
  expect(encryptedBatch?.raw_expires_at).toEqual(expect.any(String))
  expect(encryptedBatch?.canonical_expires_at).toEqual(expect.any(String))
  expect(encryptedBatch?.rollback_until).toEqual(expect.any(String))
}

async function assertMakerApprovalDenied(page: Page, service: ServiceClient, batchId: string) {
  const makerAttempt = await postJson(page, `/api/pilot/imports/${batchId}/approval`, { decision: 'approved' })
  expect(makerAttempt).toEqual({ status: 403, body: { error: 'PILOT_ROLE_DENIED' } })
  const { data: approvalsAfterMaker, error: approvalsAfterMakerError } = await service
    .from('pilot_import_approvals')
    .select('id')
    .eq('batch_id', batchId)
  expect(approvalsAfterMakerError).toBeNull()
  expect(approvalsAfterMaker).toHaveLength(0)
}

async function approveImport(page: Page, service: ServiceClient, batchId: string) {
  const { data: approver, error: approverError } = await service
    .from('users')
    .select('id,email')
    .eq('email', directorEmail)
    .single()
  expect(approverError).toBeNull()
  const approval = await postJson(page, `/api/pilot/imports/${batchId}/approval`, { decision: 'approved' })
  expect(approval).toEqual(expect.objectContaining({
    status: 200,
    body: expect.objectContaining({ batch: expect.objectContaining({ status: 'published' }) }),
  }))
  return approver?.id
}

async function loadPublishedSnapshot(service: ServiceClient, batchId: string) {
  const [batchResult, approvalResult, studentsResult, guardiansResult, relationshipsResult, enrollmentsResult, auditResult] = await Promise.all([
    service.from('pilot_import_batches').select('id,status,import_target,source_mode,encryption_algorithm,encryption_key_id,encrypted_payload,iv,auth_tag,submitted_by,approved_by,published_at,cleaned_at,source_row_count,canonical_counts,canonical_fingerprint_sha256,governance_fingerprint_sha256').eq('id', batchId).single(),
    service.from('pilot_import_approvals').select('submitted_by,approved_by,decision,report_sha256,decided_at').eq('batch_id', batchId).single(),
    service.from('alunos').select('id,import_source_id,pilot_import_batch_id,nome_completo').eq('pilot_import_batch_id', batchId),
    service.from('responsaveis').select('id,import_source_id,pilot_import_batch_id,nome').eq('pilot_import_batch_id', batchId),
    service.from('aluno_responsaveis').select('aluno_id,responsavel_id,pilot_import_batch_id').eq('pilot_import_batch_id', batchId),
    service.from('matriculas').select('id,aluno_id,pilot_import_batch_id').eq('pilot_import_batch_id', batchId),
    service.from('pilot_audit_log').select('event_type,entity_type,entity_id,redacted_metadata').eq('entity_id', batchId).in('event_type', ['import_staged', 'import_published']).order('created_at', { ascending: true }),
  ])
  return { batchResult, approvalResult, studentsResult, guardiansResult, relationshipsResult, enrollmentsResult, auditResult }
}

type PublishedSnapshot = Awaited<ReturnType<typeof loadPublishedSnapshot>>

function assertPublishedBatch(snapshot: PublishedSnapshot, batchId: string, submitterId: string | undefined, approverId: string | undefined, canonicalFingerprint: string | null | undefined) {
  const { data: finalBatch, error } = snapshot.batchResult
  expect(error).toBeNull()
  expect(finalBatch).toMatchObject({
    id: batchId,
    status: 'published',
    import_target: 'synthetic_local',
    source_mode: 'synthetic',
    encryption_algorithm: 'aes-256-gcm',
    encryption_key_id: 'synthetic-local-v1',
    submitted_by: submitterId,
    approved_by: approverId,
    source_row_count: 1,
    canonical_counts: { sourceRows: 1, students: 1, guardians: 1, relationships: 1, enrollments: 1 },
    encrypted_payload: expect.any(String),
    iv: expect.any(String),
    auth_tag: expect.any(String),
    published_at: expect.any(String),
    cleaned_at: null,
  })
  expect(finalBatch?.canonical_fingerprint_sha256).toBe(canonicalFingerprint)
  expect(finalBatch?.governance_fingerprint_sha256).toMatch(/^[a-f0-9]{64}$/)
}

function assertPublishedCanonicalRows(snapshot: PublishedSnapshot, batchId: string, submitterId: string | undefined, approverId: string | undefined) {
  const { data: approvalRecord, error: approvalRecordError } = snapshot.approvalResult
  expect(approvalRecordError).toBeNull()
  expect(snapshot.studentsResult.error).toBeNull()
  expect(snapshot.guardiansResult.error).toBeNull()
  expect(snapshot.relationshipsResult.error).toBeNull()
  expect(snapshot.enrollmentsResult.error).toBeNull()
  expect(approvalRecord).toMatchObject({
    submitted_by: submitterId,
    approved_by: approverId,
    decision: 'approved',
    report_sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    decided_at: expect.any(String),
  })
  expect(approvalRecord?.submitted_by).not.toBe(approvalRecord?.approved_by)
  expect(snapshot.studentsResult.data).toEqual([expect.objectContaining({
    import_source_id: 'csv-e2e-student',
    pilot_import_batch_id: batchId,
    nome_completo: 'Aluno CSV Sintetico',
  })])
  expect(snapshot.guardiansResult.data).toEqual([expect.objectContaining({
    import_source_id: 'guardian:csv-e2e-student',
    pilot_import_batch_id: batchId,
    nome: 'Responsavel CSV Sintetico',
  })])
  expect(snapshot.relationshipsResult.data).toEqual([expect.objectContaining({ pilot_import_batch_id: batchId })])
  expect(snapshot.enrollmentsResult.data).toEqual([expect.objectContaining({ pilot_import_batch_id: batchId })])
}

function assertPublishedAudit(snapshot: PublishedSnapshot, batchId: string) {
  const { data: auditEvents, error } = snapshot.auditResult
  expect(error).toBeNull()
  expect(auditEvents).toHaveLength(2)
  const auditByType = new Map((auditEvents ?? []).map(event => [event.event_type, event]))
  expect(auditByType.get('import_staged')).toMatchObject({
    entity_type: 'pilot_import_batch',
    entity_id: batchId,
    redacted_metadata: {
      dataset: 'students',
      row_count: 1,
      source_fingerprint_sha256: sourceFingerprint,
      governance_recorded: true,
      plaintext_stored: false,
    },
  })
  expect(auditByType.get('import_published')).toMatchObject({
    entity_type: 'pilot_import_batch',
    entity_id: batchId,
    redacted_metadata: {
      dataset: 'students',
      row_count: 1,
      canonical_counts: { sourceRows: 1, students: 1, guardians: 1, relationships: 1, enrollments: 1 },
      canonical_fingerprint_sha256: snapshot.batchResult.data?.canonical_fingerprint_sha256,
      governance_recorded: true,
      plaintext_stored: false,
    },
  })
}

async function expireRawSourceAndAssertCanonicalRetention(service: ServiceClient, batchId: string) {
  const { error: rawExpiryError } = await service
    .from('pilot_import_batches')
    .update({ raw_expires_at: new Date(Date.now() - 60_000).toISOString() })
    .eq('id', batchId)
  expect(rawExpiryError).toBeNull()
  const { data: cleanedCount, error: cleanupError } = await service.rpc('pilot_cleanup_import_retention')
  expect(cleanupError).toBeNull()
  expect(cleanedCount).toBe(1)
  const [batchResult, studentsResult] = await Promise.all([
    service.from('pilot_import_batches').select('status,encrypted_payload,iv,auth_tag,cleaned_at').eq('id', batchId).single(),
    service.from('alunos').select('id').eq('pilot_import_batch_id', batchId),
  ])
  expect(batchResult.error).toBeNull()
  expect(studentsResult.error).toBeNull()
  expect(batchResult.data).toMatchObject({
    status: 'published', encrypted_payload: null, iv: null, auth_tag: null, cleaned_at: expect.any(String),
  })
  expect(studentsResult.data).toHaveLength(1)
}

async function requestRollback(page: Page, batchId: string) {
  const rollback = await postJson(page, `/api/pilot/imports/${batchId}/rollback`, {
    reason: 'synthetic E2E rollback proof',
  })
  expect(rollback).toEqual(expect.objectContaining({
    status: 200,
    body: expect.objectContaining({
      batch: { id: batchId, status: 'rolled_back' },
      rollback: expect.objectContaining({ deletedStudents: 1, deletedGuardians: 1 }),
    }),
  }))
}

async function assertRolledBackState(service: ServiceClient, batchId: string) {
  const [batchResult, studentsResult, guardiansResult, relationshipsResult, enrollmentsResult, auditResult, tombstoneResult] = await Promise.all([
    service.from('pilot_import_batches').select('id,status,encrypted_payload,iv,auth_tag,rolled_back_at,rollback_reason').eq('id', batchId).single(),
    service.from('alunos').select('id').eq('pilot_import_batch_id', batchId),
    service.from('responsaveis').select('id').eq('pilot_import_batch_id', batchId),
    service.from('aluno_responsaveis').select('id').eq('pilot_import_batch_id', batchId),
    service.from('matriculas').select('id').eq('pilot_import_batch_id', batchId),
    service.from('pilot_audit_log').select('event_type,entity_id,redacted_metadata').eq('entity_id', batchId).eq('event_type', 'import_rolled_back'),
    service.from('pilot_data_tombstones').select('entity_type,source_fingerprint').eq('entity_type', 'pilot_import_batch').eq('source_fingerprint', sourceFingerprint),
  ])
  expect(batchResult.error).toBeNull()
  expect(studentsResult.error).toBeNull()
  expect(guardiansResult.error).toBeNull()
  expect(relationshipsResult.error).toBeNull()
  expect(enrollmentsResult.error).toBeNull()
  expect(auditResult.error).toBeNull()
  expect(tombstoneResult.error).toBeNull()
  expect(batchResult.data).toMatchObject({
    id: batchId,
    status: 'rolled_back',
    encrypted_payload: null,
    iv: null,
    auth_tag: null,
    rolled_back_at: expect.any(String),
    rollback_reason: 'synthetic E2E rollback proof',
  })
  expect(studentsResult.data).toHaveLength(0)
  expect(guardiansResult.data).toHaveLength(0)
  expect(relationshipsResult.data).toHaveLength(0)
  expect(enrollmentsResult.data).toHaveLength(0)
  expect(auditResult.data).toHaveLength(1)
  expect(auditResult.data![0]).toMatchObject({
    event_type: 'import_rolled_back',
    entity_id: batchId,
    redacted_metadata: { reason_recorded: true },
  })
  expect(tombstoneResult.data).toHaveLength(1)
}

async function stageRejectedImport(page: Page) {
  await page.goto('/dashboard')
  const dryRun = await postJson(page, '/api/pilot/imports', {
    csv: rejectedCsv,
    dryRun: true,
    governance,
  })
  expect(dryRun.status).toBe(200)
  const staged = await postJson(page, '/api/pilot/imports', {
    csv: rejectedCsv,
    validationToken: dryRun.body.validationToken,
    idempotencyKey: 'csv-e2e-rejection-001',
    governance,
  })
  expect(staged).toEqual(expect.objectContaining({
    status: 201,
    body: expect.objectContaining({ auditId: expect.any(String) }),
  }))
  return z.string().uuid().parse(staged.body.batch.id)
}

async function rejectImport(page: Page, batchId: string) {
  const rejection = await postJson(page, `/api/pilot/imports/${batchId}/approval`, {
    decision: 'rejected',
  })
  expect(rejection).toEqual(expect.objectContaining({
    status: 200,
    body: expect.objectContaining({
      auditId: expect.any(String),
      batch: expect.objectContaining({
        id: batchId,
        status: 'rejected',
        cleaned_at: null,
        raw_expires_at: expect.any(String),
      }),
    }),
  }))
  return rejection.body.auditId
}

async function assertRejectedState(service: ServiceClient, batchId: string, auditId: string) {
  const [batchResult, approvalResult, auditResult] = await Promise.all([
    service.from('pilot_import_batches').select('status,encrypted_payload,iv,auth_tag,cleaned_at,raw_expires_at').eq('id', batchId).single(),
    service.from('pilot_import_approvals').select('decision,approved_by,decided_at').eq('batch_id', batchId).single(),
    service.from('pilot_audit_log').select('id,event_type,redacted_metadata').eq('entity_id', batchId).eq('event_type', 'import_rejected').single(),
  ])
  expect(batchResult.error).toBeNull()
  expect(approvalResult.error).toBeNull()
  expect(auditResult.error).toBeNull()
  expect(batchResult.data).toMatchObject({
    status: 'rejected',
    encrypted_payload: expect.any(String),
    iv: expect.any(String),
    auth_tag: expect.any(String),
    cleaned_at: null,
    raw_expires_at: expect.any(String),
  })
  expect(approvalResult.data).toMatchObject({
    decision: 'rejected', approved_by: expect.any(String), decided_at: expect.any(String),
  })
  expect(auditResult.data).toMatchObject({
    id: auditId,
    event_type: 'import_rejected',
    redacted_metadata: expect.objectContaining({
      decision: 'rejected',
      governance_recorded: true,
      plaintext_stored: false,
      ciphertext_retained_until: batchResult.data?.raw_expires_at,
    }),
  })
}

async function assertRejectedReplay(page: Page, batchId: string, auditId: string) {
  const replay = await postJson(page, `/api/pilot/imports/${batchId}/approval`, {
    decision: 'rejected',
  })
  expect(replay).toEqual(expect.objectContaining({
    status: 200,
    body: expect.objectContaining({ auditId, idempotentReplay: true }),
  }))
}

async function assertRawRetainedBeforeExpiry(service: ServiceClient, batchId: string) {
  const { error: earlyCleanupError } = await service.rpc('pilot_cleanup_import_retention')
  expect(earlyCleanupError).toBeNull()
  const { data, error } = await service
    .from('pilot_import_batches')
    .select('encrypted_payload,iv,auth_tag,cleaned_at')
    .eq('id', batchId)
    .single()
  expect(error).toBeNull()
  expect(data).toMatchObject({
    encrypted_payload: expect.any(String),
    iv: expect.any(String),
    auth_tag: expect.any(String),
    cleaned_at: null,
  })
}

async function expireRejectedRawSource(service: ServiceClient, batchId: string) {
  const { error: expiryError } = await service
    .from('pilot_import_batches')
    .update({ raw_expires_at: new Date(Date.now() - 60_000).toISOString() })
    .eq('id', batchId)
  expect(expiryError).toBeNull()
  const { error: cleanupError } = await service.rpc('pilot_cleanup_import_retention')
  expect(cleanupError).toBeNull()
  const { data, error } = await service
    .from('pilot_import_batches')
    .select('status,encrypted_payload,iv,auth_tag,cleaned_at')
    .eq('id', batchId)
    .single()
  expect(error).toBeNull()
  expect(data).toMatchObject({
    status: 'rejected',
    encrypted_payload: null,
    iv: null,
    auth_tag: null,
    cleaned_at: expect.any(String),
  })
}

test('dry-runs, stages, approves, publishes, and rolls back synthetic CSV', async ({ page, browser }) => {
  const batchId = await stagePublishedImport(page)
  const service = createServiceClient()
  const stagedSnapshot = await loadStagedSnapshot(service, batchId)
  assertStagedGovernance(stagedSnapshot, batchId)
  assertStagedEncryption(stagedSnapshot)
  const submitterId = stagedSnapshot.submitterResult.data?.id
  const canonicalFingerprint = stagedSnapshot.batchResult.data?.canonical_fingerprint_sha256
  await assertMakerApprovalDenied(page, service, batchId)
  const director = await loginDirector(browser)
  const approverId = await approveImport(director.page, service, batchId)
  const publishedSnapshot = await loadPublishedSnapshot(service, batchId)
  assertPublishedBatch(publishedSnapshot, batchId, submitterId, approverId, canonicalFingerprint)
  assertPublishedCanonicalRows(publishedSnapshot, batchId, submitterId, approverId)
  assertPublishedAudit(publishedSnapshot, batchId)
  await expireRawSourceAndAssertCanonicalRetention(service, batchId)
  await requestRollback(director.page, batchId)
  await director.context.close()
  await assertRolledBackState(service, batchId)
})

test('rejects atomically and retains encrypted source until raw expiry', async ({ page, browser }) => {
  const batchId = await stageRejectedImport(page)
  const service = createServiceClient()
  const director = await loginDirector(browser)
  const auditId = await rejectImport(director.page, batchId)
  await assertRejectedState(service, batchId, auditId)
  await assertRejectedReplay(director.page, batchId, auditId)
  await assertRawRetainedBeforeExpiry(service, batchId)
  await expireRejectedRawSource(service, batchId)
  await director.context.close()
})
