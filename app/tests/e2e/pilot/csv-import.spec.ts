import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const csv = [
  'synthetic_marker,source_id,school_code,class_code,student_name,birth_date,sex,guardian_name,guardian_phone,guardian_relationship',
  'SYNTHETIC-EDUCA-PILOT,csv-e2e-student,SYN-A,CLASS-A,Aluno CSV Sintetico,2018-05-20,M,Responsavel CSV Sintetico,(11) 98888-0000,mae',
].join('\n')

const governance = {
  owner: { name: 'Owner do Piloto Sintetico', email: 'owner@synthetic.invalid' },
  processingAgreement: { reference: 'DPA-SYN-E2E-001', version: 'v1' },
  retention: {
    policy: 'synthetic-proof-30d',
    rawPayloadExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    canonicalDataExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    rollbackUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
}

const secretariatEmail = 'secretaria@synthetic.invalid'
const directorEmail = 'diretora.a@synthetic.invalid'
const sourceFingerprint = createHash('sha256').update(csv, 'utf8').digest('hex')

test('dry-runs, stages, approves, publishes, and cleans synthetic CSV', async ({ page, browser }) => {
  await page.goto('/dashboard')
  const dryRun = await page.evaluate(async ({ csvPayload, governancePayload }) => {
    const response = await fetch('/api/pilot/imports', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ csv: csvPayload, dryRun: true, governance: governancePayload }),
    })
    return { status: response.status, body: await response.json() }
  }, { csvPayload: csv, governancePayload: governance })
  expect(dryRun).toEqual(expect.objectContaining({
    status: 200,
    body: expect.objectContaining({ report: expect.objectContaining({ valid: true, validRows: 1 }), validationToken: expect.any(String) }),
  }))
  expect(JSON.stringify(dryRun.body)).not.toContain('Aluno CSV Sintetico')

  const staged = await page.evaluate(async ({ csvPayload, validationToken, governancePayload }) => {
    const response = await fetch('/api/pilot/imports', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ csv: csvPayload, validationToken, idempotencyKey: 'csv-e2e-batch-001', governance: governancePayload }),
    })
    return { status: response.status, body: await response.json() }
  }, { csvPayload: csv, validationToken: dryRun.body.validationToken, governancePayload: governance })
  expect(staged.status).toBe(201)
  expect(JSON.stringify(staged.body)).not.toContain('Aluno CSV Sintetico')
  const batchId = staged.body.batch.id as string

  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const [{ data: submitter, error: submitterError }, { data: encryptedBatch, error: encryptedBatchError }] = await Promise.all([
    service.from('users').select('id,email').eq('email', secretariatEmail).single(),
    service.from('pilot_import_batches').select('id,status,import_target,source_mode,encryption_algorithm,encryption_key_id,encrypted_payload,iv,auth_tag,submitted_by,approved_by,content_sha256,source_row_count,canonical_counts,canonical_fingerprint_sha256,governance_owner_name,governance_owner_email,processing_agreement_reference,processing_agreement_version,processing_agreement_recorded_by,raw_expires_at,canonical_expires_at,rollback_until').eq('id', batchId).single(),
  ])
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
    governance_owner_name: 'Owner do Piloto Sintetico',
    governance_owner_email: 'owner@synthetic.invalid',
    processing_agreement_reference: 'DPA-SYN-E2E-001',
    processing_agreement_version: 'v1',
    processing_agreement_recorded_by: submitter?.id,
  })
  expect(encryptedBatch?.encrypted_payload).toEqual(expect.any(String))
  expect(encryptedBatch?.iv).toEqual(expect.any(String))
  expect(encryptedBatch?.auth_tag).toEqual(expect.any(String))
  expect(encryptedBatch?.encrypted_payload).not.toContain('Aluno CSV Sintetico')
  expect(encryptedBatch?.canonical_fingerprint_sha256).toMatch(/^[a-f0-9]{64}$/)
  expect(encryptedBatch?.raw_expires_at).toEqual(expect.any(String))
  expect(encryptedBatch?.canonical_expires_at).toEqual(expect.any(String))
  expect(encryptedBatch?.rollback_until).toEqual(expect.any(String))

  const makerAttempt = await page.evaluate(async id => {
    const response = await fetch(`/api/pilot/imports/${id}/approval`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decision: 'approved' }),
    })
    return { status: response.status, body: await response.json() }
  }, batchId)
  expect(makerAttempt).toEqual({ status: 403, body: { error: 'PILOT_ROLE_DENIED' } })
  const { data: approvalsAfterMaker, error: approvalsAfterMakerError } = await service
    .from('pilot_import_approvals')
    .select('id')
    .eq('batch_id', batchId)
  expect(approvalsAfterMakerError).toBeNull()
  expect(approvalsAfterMaker).toHaveLength(0)

  const directorContext = await browser.newContext()
  const directorPage = await directorContext.newPage()
  await directorPage.goto('/login')
  await directorPage.getByLabel('E-mail', { exact: true }).fill('diretora.a@synthetic.invalid')
  await directorPage.getByLabel('Senha', { exact: true }).fill('Synthetic-Only-2026!')
  await directorPage.getByRole('button', { name: /entrar/i }).click()
  await expect(directorPage).toHaveURL(/dashboard/)
  const { data: approver, error: approverError } = await service.from('users').select('id,email').eq('email', directorEmail).single()
  expect(approverError).toBeNull()
  const approval = await directorPage.evaluate(async id => {
    const response = await fetch(`/api/pilot/imports/${id}/approval`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decision: 'approved' }),
    })
    return { status: response.status, body: await response.json() }
  }, batchId)
  expect(approval).toEqual(expect.objectContaining({ status: 200, body: expect.objectContaining({ batch: expect.objectContaining({ status: 'published' }) }) }))
  await directorContext.close()

  const [
    { data: finalBatch, error: finalBatchError },
    { data: approvalRecord, error: approvalRecordError },
    { data: students, error: studentsError },
    { data: guardians, error: guardiansError },
    { data: relationships, error: relationshipsError },
    { data: enrollments, error: enrollmentsError },
    { data: auditEvents, error: auditEventsError },
  ] = await Promise.all([
    service.from('pilot_import_batches').select('id,status,import_target,source_mode,encryption_algorithm,encryption_key_id,encrypted_payload,iv,auth_tag,submitted_by,approved_by,published_at,cleaned_at,source_row_count,canonical_counts,canonical_fingerprint_sha256,governance_fingerprint_sha256').eq('id', batchId).single(),
    service.from('pilot_import_approvals').select('submitted_by,approved_by,decision,report_sha256,decided_at').eq('batch_id', batchId).single(),
    service.from('alunos').select('id,import_source_id,pilot_import_batch_id,nome_completo').eq('pilot_import_batch_id', batchId),
    service.from('responsaveis').select('id,import_source_id,pilot_import_batch_id,nome').eq('pilot_import_batch_id', batchId),
    service.from('aluno_responsaveis').select('aluno_id,responsavel_id,pilot_import_batch_id').eq('pilot_import_batch_id', batchId),
    service.from('matriculas').select('id,aluno_id,pilot_import_batch_id').eq('pilot_import_batch_id', batchId),
    service.from('pilot_audit_log').select('event_type,entity_type,entity_id,redacted_metadata').eq('entity_id', batchId).in('event_type', ['import_staged', 'import_published']).order('created_at', { ascending: true }),
  ])
  expect(finalBatchError).toBeNull()
  expect(approvalRecordError).toBeNull()
  expect(studentsError).toBeNull()
  expect(guardiansError).toBeNull()
  expect(relationshipsError).toBeNull()
  expect(enrollmentsError).toBeNull()
  expect(auditEventsError).toBeNull()
  expect(finalBatch).toMatchObject({
    id: batchId,
    status: 'published',
    import_target: 'synthetic_local',
    source_mode: 'synthetic',
    encryption_algorithm: 'aes-256-gcm',
    encryption_key_id: 'synthetic-local-v1',
    submitted_by: submitter?.id,
    approved_by: approver?.id,
    source_row_count: 1,
    canonical_counts: { sourceRows: 1, students: 1, guardians: 1, relationships: 1, enrollments: 1 },
    encrypted_payload: null,
    iv: null,
    auth_tag: null,
    published_at: expect.any(String),
    cleaned_at: expect.any(String),
  })
  expect(finalBatch?.canonical_fingerprint_sha256).toBe(encryptedBatch?.canonical_fingerprint_sha256)
  expect(finalBatch?.governance_fingerprint_sha256).toMatch(/^[a-f0-9]{64}$/)
  expect(approvalRecord).toMatchObject({
    submitted_by: submitter?.id,
    approved_by: approver?.id,
    decision: 'approved',
    report_sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    decided_at: expect.any(String),
  })
  expect(approvalRecord?.submitted_by).not.toBe(approvalRecord?.approved_by)
  expect(students).toEqual([expect.objectContaining({
    import_source_id: 'csv-e2e-student',
    pilot_import_batch_id: batchId,
    nome_completo: 'Aluno CSV Sintetico',
  })])
  expect(guardians).toEqual([expect.objectContaining({
    import_source_id: 'guardian:csv-e2e-student',
    pilot_import_batch_id: batchId,
    nome: 'Responsavel CSV Sintetico',
  })])
  expect(relationships).toEqual([expect.objectContaining({ pilot_import_batch_id: batchId })])
  expect(enrollments).toEqual([expect.objectContaining({ pilot_import_batch_id: batchId })])
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
      canonical_fingerprint_sha256: finalBatch?.canonical_fingerprint_sha256,
      governance_recorded: true,
      plaintext_stored: false,
    },
  })
})
