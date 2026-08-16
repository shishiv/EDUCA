#!/usr/bin/env tsx
/**
 * Runs the governed CSV import only against an explicitly isolated proof
 * database. It never uses the public demo or the application's Supabase URL.
 */
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { Client } from 'pg'
import {
  assertPilotImportOwnerMatchesActor,
  countCanonicalPilotRows,
  fingerprintCanonicalPilotRows,
  fingerprintPilotImportGovernance,
  SYNTHETIC_PILOT_GOVERNANCE_MANIFEST_VERSION,
  transformGovernedPilotCsvToCanonicalRows,
  validateGovernedPilotImportManifest,
  validateGovernedPilotStudentCsv,
  type GovernedPilotImportDataMode,
} from '../lib/pilot/governed-csv-import'
import {
  assertGovernedPilotProofSafety,
  type GovernedPilotProofSafetyReceipt,
  readGovernedPilotProofEnvironment,
} from '../lib/pilot/governed-import-safety'
import {
  encryptPilotImportPayload,
  validatePilotImportEncryptionKey,
} from '../lib/pilot/pilot-import-crypto'

interface ProofImportArguments {
  command: 'import' | 'rollback' | 'cleanup'
  csvPath?: string
  approvalPath?: string
  batchId?: string
  actorEmail?: string
  reason?: string
}

interface ActorRow {
  id: string
  nome: string
  email: string
  ativo: boolean
  tipo_usuario: string
}

interface SchoolRow {
  id: string
  codigo: string
}

interface ClassRow {
  id: string
  ano_letivo: number
  import_source_id: string | null
}

interface BatchRow {
  id: string
  escola_id: string
  status: string
  import_target: string
  source_mode: GovernedPilotImportDataMode
  content_sha256: string
  encryption_key_id: string
  encrypted_payload: string | null
  iv: string | null
  auth_tag: string | null
  source_row_count: number | null
  canonical_counts: unknown
  canonical_fingerprint_sha256: string | null
  database_fingerprint_sha256: string | null
  governance_fingerprint_sha256: string | null
  retention_policy: string | null
  raw_expires_at: string
  canonical_expires_at: string | null
  rollback_until: string | null
  rolled_back_at: string | null
}

interface RollbackRow {
  batch_id: string
  deleted_enrollments: number
  deleted_relationships: number
  deleted_students: number
  deleted_guardians: number
  deleted_storage_objects: number
  storage_object_fingerprints: string[]
  final_status: string
}

interface StorageObjectState {
  ownedCount: number
  fingerprints: string[]
}

interface StorageObjectMetadataExpressions {
  batchAssociation: string
  objectFingerprint: string
  hasUserMetadata: boolean
}

interface RollbackEvidence {
  auditCount: number
  auditIsRedacted: boolean
  tombstoneCount: number
  tombstoneMatchesBatch: boolean
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const KEY_ID_PATTERN = /^[A-Za-z0-9._-]{1,80}$/

function parseProofImportArguments(argv: string[]): ProofImportArguments {
  const command = argv[0] || 'import'
  if (!['import', 'rollback', 'cleanup'].includes(command)) {
    throw new Error('PILOT_IMPORT_PROOF_COMMAND_INVALID: use import, rollback, or cleanup')
  }
  const result: ProofImportArguments = { command: command as ProofImportArguments['command'] }
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index]
    const next = argv[index + 1]
    if (argument === '--csv' && next) {
      result.csvPath = next
      index += 1
    } else if (argument === '--approval' && next) {
      result.approvalPath = next
      index += 1
    } else if (argument === '--batch' && next) {
      result.batchId = next
      index += 1
    } else if (argument === '--actor-email' && next) {
      result.actorEmail = next
      index += 1
    } else if (argument === '--reason' && next) {
      result.reason = next
      index += 1
    } else {
      throw new Error(`PILOT_IMPORT_PROOF_ARGUMENT_INVALID: unknown or incomplete argument ${argument}`)
    }
  }

  if (result.command === 'import' && (!result.csvPath || !result.approvalPath)) {
    throw new Error('PILOT_IMPORT_PROOF_INPUT_REQUIRED: --csv and --approval are required')
  }
  if (result.command === 'rollback' && (!result.batchId || !result.actorEmail || !result.reason)) {
    throw new Error('PILOT_IMPORT_PROOF_ROLLBACK_INPUT_REQUIRED: --batch, --actor-email, and --reason are required')
  }
  return result
}

function readDataMode(): GovernedPilotImportDataMode {
  const dataMode = process.env.PILOT_IMPORT_DATA_MODE
  if (!dataMode) throw new Error('PILOT_IMPORT_PROOF_DATA_MODE_REQUIRED: explicit data mode is required')
  if (dataMode !== 'synthetic' && dataMode !== 'real') {
    throw new Error('PILOT_IMPORT_PROOF_DATA_MODE_INVALID: data mode must be synthetic or real')
  }
  return dataMode
}

function readEncryptionKeyId(): string {
  const keyId = process.env.PILOT_IMPORT_ENCRYPTION_KEY_ID || 'proof-local-v1'
  if (!KEY_ID_PATTERN.test(keyId)) throw new Error('PILOT_IMPORT_KEY_ID_INVALID: encryption key id is invalid')
  return keyId
}

async function readJsonFile(path: string): Promise<unknown> {
  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch {
    throw new Error('PILOT_IMPORT_APPROVAL_FILE_READ_FAILED: approval manifest cannot be read')
  }
  try {
    return JSON.parse(raw) as unknown
  } catch {
    throw new Error('PILOT_IMPORT_APPROVAL_FILE_INVALID: approval manifest must be JSON')
  }
}

async function findActiveActor(client: Client, email: string, errorCode: string): Promise<ActorRow> {
  const result = await client.query<ActorRow>(
    `SELECT id, nome, email, ativo, tipo_usuario
     FROM public.users
     WHERE lower(email) = lower($1) AND ativo = true
     LIMIT 1`,
    [email]
  )
  const actor = result.rows[0]
  if (!actor) throw new Error(`${errorCode}: active governance actor was not found`)
  return actor
}

async function findProofSchool(client: Client, schoolCode: string): Promise<SchoolRow> {
  const result = await client.query<SchoolRow>(
    `SELECT id, codigo
     FROM public.escolas
     WHERE codigo = $1 AND ativo = true
     LIMIT 1`,
    [schoolCode]
  )
  const school = result.rows[0]
  if (!school) throw new Error('PILOT_IMPORT_PROOF_SCHOOL_NOT_FOUND: source school is not in proof database')
  return school
}

async function findProofClass(client: Client, schoolId: string, classCode: string): Promise<ClassRow> {
  const result = await client.query<ClassRow>(
    `SELECT id, ano_letivo, import_source_id
     FROM public.turmas
     WHERE escola_id = $1 AND import_source_id = $2 AND ativo = true
     LIMIT 1`,
    [schoolId, classCode]
  )
  const classRow = result.rows[0]
  if (!classRow) throw new Error(`PILOT_IMPORT_PROOF_CLASS_NOT_FOUND: class ${classCode} is not in proof database`)
  return classRow
}

function createDatabaseFingerprint(rows: string[]): string {
  return createHash('sha256').update(rows.join('\n'), 'utf8').digest('hex')
}

async function readDatabaseFingerprint(client: Client, batchId: string): Promise<string> {
  const result = await client.query<{ line: string }>(
    `SELECT concat_ws('|',
        a.import_source_id,
        a.nome_completo,
        a.data_nascimento::text,
        a.sexo,
        r.import_source_id,
        r.nome,
        r.telefone,
        ar.tipo_responsabilidade,
        m.turma_id::text,
        m.ano_letivo::text,
        m.situacao
      ) AS line
     FROM public.alunos a
     JOIN public.responsaveis r ON r.id = a.responsavel_id
     JOIN public.aluno_responsaveis ar ON ar.aluno_id = a.id AND ar.responsavel_id = r.id
     JOIN public.matriculas m ON m.aluno_id = a.id
     WHERE a.pilot_import_batch_id = $1
     ORDER BY a.import_source_id, r.import_source_id, m.id`,
    [batchId]
  )
  return createDatabaseFingerprint(result.rows.map(row => row.line))
}

async function readBatch(client: Client, batchId: string): Promise<BatchRow> {
  const result = await client.query<BatchRow>(
    `SELECT id, escola_id, status, import_target, source_mode, content_sha256,
            encryption_key_id, encrypted_payload, iv, auth_tag, source_row_count,
            canonical_counts, canonical_fingerprint_sha256, database_fingerprint_sha256,
            governance_fingerprint_sha256, retention_policy, raw_expires_at,
            canonical_expires_at, rollback_until, rolled_back_at
     FROM public.pilot_import_batches
     WHERE id = $1`,
    [batchId]
  )
  const batch = result.rows[0]
  if (!batch) throw new Error('PILOT_IMPORT_PROOF_BATCH_NOT_FOUND: batch does not exist')
  return batch
}

/** Resolves the current Storage custom metadata columns without trusting object names. */
async function readStorageObjectMetadataExpressions(
  client: Client
): Promise<StorageObjectMetadataExpressions | null> {
  const tableResult = await client.query<{ table_name: string | null }>(
    `SELECT to_regclass('storage.objects')::text AS table_name`
  )
  if (!tableResult.rows[0]?.table_name) return null

  const columnResult = await client.query<{ has_user_metadata: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'storage'
         AND table_name = 'objects'
         AND column_name = 'user_metadata'
     ) AS has_user_metadata`
  )
  const hasUserMetadata = columnResult.rows[0]?.has_user_metadata ?? false
  return hasUserMetadata
    ? {
        batchAssociation: "coalesce(user_metadata->>'pilot_import_batch_id', metadata->>'pilot_import_batch_id')",
        objectFingerprint: "coalesce(user_metadata->>'pilot_import_object_fingerprint', metadata->>'pilot_import_object_fingerprint', id::text)",
        hasUserMetadata,
      }
    : {
        batchAssociation: "metadata->>'pilot_import_batch_id'",
        objectFingerprint: "coalesce(metadata->>'pilot_import_object_fingerprint', id::text)",
        hasUserMetadata,
      }
}

/** Reads Storage metadata owned by one batch without exposing object names. */
async function readStorageObjectState(client: Client, batchId: string): Promise<StorageObjectState> {
  const expressions = await readStorageObjectMetadataExpressions(client)
  if (!expressions) return { ownedCount: 0, fingerprints: [] }

  const result = await client.query<{ owned_count: number; fingerprints: string[] }>(
    `SELECT count(*)::integer AS owned_count,
            coalesce(array_agg(${expressions.objectFingerprint} ORDER BY id), ARRAY[]::text[]) AS fingerprints
     FROM storage.objects
     WHERE ${expressions.batchAssociation} = $1`,
    [batchId]
  )
  return {
    ownedCount: result.rows[0]?.owned_count ?? 0,
    fingerprints: result.rows[0]?.fingerprints ?? [],
  }
}

/** Creates one synthetic Storage metadata object associated with a proof batch. */
async function createProofStorageObject(client: Client, batchId: string): Promise<string> {
  const bucketId = 'pilot-import-staging'
  const objectName = `proof/${batchId}/source.csv`
  const objectFingerprint = createHash('sha256').update(`${bucketId}/${objectName}`, 'utf8').digest('hex')
  const expressions = await readStorageObjectMetadataExpressions(client)
  if (!expressions) {
    throw new Error('PILOT_IMPORT_PROOF_STORAGE_REQUIRED: local Storage metadata is required')
  }

  const association = {
    pilot_import_batch_id: batchId,
    pilot_import_object_fingerprint: objectFingerprint,
    synthetic_only: true,
  }
  if (expressions.hasUserMetadata) {
    await client.query(
      `INSERT INTO storage.objects (id, bucket_id, name, metadata, user_metadata, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, now())`,
      [bucketId, objectName, association, association]
    )
  } else {
    await client.query(
      `INSERT INTO storage.objects (id, bucket_id, name, metadata, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, now())`,
      [bucketId, objectName, association]
    )
  }
  return objectFingerprint
}

/** Reads redacted rollback audit and tombstone evidence for a proof receipt. */
async function readRollbackEvidence(
  client: Client,
  batch: BatchRow
): Promise<RollbackEvidence> {
  const auditResult = await client.query<{ audit_count: number; audit_is_redacted: boolean }>(
    `SELECT count(*) FILTER (
              WHERE event_type = 'import_rolled_back'
                AND entity_type = 'pilot_import_batch'
                AND entity_id = $1
            )::integer AS audit_count,
            coalesce(
              bool_and(NOT (redacted_metadata ?| ARRAY[
                'cpf', 'nis', 'rg', 'password', 'senha', 'health', 'saude',
                'deficiencia', 'race', 'cor_raca'
              ])),
              true
            ) AS audit_is_redacted
     FROM public.pilot_audit_log
     WHERE entity_type = 'pilot_import_batch'
       AND entity_id = $1`,
    [batch.id]
  )
  const tombstoneResult = await client.query<{ tombstone_count: number; tombstone_matches_batch: boolean }>(
    `SELECT count(*)::integer AS tombstone_count,
            coalesce(bool_or(source_fingerprint = $1), false) AS tombstone_matches_batch
     FROM public.pilot_data_tombstones
     WHERE entity_type = 'pilot_import_batch'
       AND source_fingerprint = $1`,
    [batch.content_sha256]
  )
  return {
    auditCount: auditResult.rows[0]?.audit_count ?? 0,
    auditIsRedacted: auditResult.rows[0]?.audit_is_redacted ?? true,
    tombstoneCount: tombstoneResult.rows[0]?.tombstone_count ?? 0,
    tombstoneMatchesBatch: tombstoneResult.rows[0]?.tombstone_matches_batch ?? false,
  }
}

async function buildImportReceipt(
  client: Client,
  batch: BatchRow,
  safetyReceipt: GovernedPilotProofSafetyReceipt
): Promise<Record<string, unknown>> {
  const storage = await readStorageObjectState(client, batch.id)
  return {
    batchId: batch.id,
    target: safetyReceipt.target,
    status: batch.status,
    safety: safetyReceipt,
    sourceMode: batch.source_mode,
    sourceRowCount: batch.source_row_count,
    canonicalCounts: batch.canonical_counts,
    sourceFingerprintSha256: batch.content_sha256,
    canonicalFingerprintSha256: batch.canonical_fingerprint_sha256,
    databaseFingerprintSha256: batch.database_fingerprint_sha256,
    governanceManifestVersion: SYNTHETIC_PILOT_GOVERNANCE_MANIFEST_VERSION,
    governanceFingerprintSha256: batch.governance_fingerprint_sha256,
    encryption: {
      algorithm: 'aes-256-gcm',
      keyId: batch.encryption_key_id,
      ciphertextStored: Boolean(batch.encrypted_payload && batch.iv && batch.auth_tag),
      plaintextStored: false,
    },
    storageObjects: {
      ownedCount: storage.ownedCount,
      fingerprints: storage.fingerprints,
    },
    retention: {
      policy: batch.retention_policy,
      rawPayloadExpiresAt: batch.raw_expires_at,
      canonicalDataExpiresAt: batch.canonical_expires_at,
      rollbackUntil: batch.rollback_until,
    },
    rolledBackAt: batch.rolled_back_at,
  }
}

async function runGovernedProofImport(
  client: Client,
  csvPath: string,
  approvalPath: string,
  safetyReceipt: GovernedPilotProofSafetyReceipt
): Promise<Record<string, unknown>> {
  const dataMode = readDataMode()
  const encryptionKey = process.env.PILOT_IMPORT_ENCRYPTION_KEY
  if (!encryptionKey) throw new Error('PILOT_IMPORT_KEY_MISSING: encryption key is required')
  validatePilotImportEncryptionKey(encryptionKey)

  const [csv, approvalInput] = await Promise.all([
    readFile(csvPath, 'utf8'),
    readJsonFile(approvalPath),
  ])
  const manifest = validateGovernedPilotImportManifest(approvalInput)
  const { rows, report } = validateGovernedPilotStudentCsv(csv, dataMode)
  if (!report.valid) throw new Error(`PILOT_IMPORT_CSV_INVALID: ${JSON.stringify(report.issues)}`)
  const canonicalRows = transformGovernedPilotCsvToCanonicalRows(rows)
  const canonicalCounts = {
    ...countCanonicalPilotRows(canonicalRows),
    storageObjects: 1,
  }
  const canonicalFingerprint = fingerprintCanonicalPilotRows(canonicalRows)
  const governanceFingerprint = fingerprintPilotImportGovernance(manifest)
  const encrypted = encryptPilotImportPayload(csv, encryptionKey, readEncryptionKeyId())

  await client.query('BEGIN')
  try {
    const school = await findProofSchool(client, report.schoolCodes[0])
    const submitter = await findActiveActor(client, manifest.approval.submittedBy.email, 'PILOT_IMPORT_SUBMITTER_REQUIRED')
    const approver = await findActiveActor(client, manifest.approval.approvedBy.email, 'PILOT_IMPORT_APPROVER_REQUIRED')
    const agreementRecorder = await findActiveActor(
      client,
      manifest.processingAgreement.recordedBy.email,
      'PILOT_IMPORT_AGREEMENT_RECORDER_REQUIRED'
    )
    const owner = await findActiveActor(client, manifest.owner.email, 'PILOT_IMPORT_OWNER_REQUIRED')
    assertPilotImportOwnerMatchesActor(manifest.owner, {
      name: owner.nome,
      email: owner.email,
      role: owner.tipo_usuario,
      schoolId: null,
    })
    if (owner.id !== submitter.id) throw new Error('PILOT_IMPORT_OWNER_DENIED: owner must authorize the submitted batch')
    if (submitter.id === approver.id) throw new Error('PILOT_IMPORT_MAKER_CHECKER_REQUIRED: submitter and approver must differ')
    const agreementResult = await client.query<{
      id: string
      confirmed: boolean
      confirmed_at: string | null
      confirmed_by: string | null
      escola_id: string
    }>(
      `SELECT id, confirmed, confirmed_at, confirmed_by, escola_id
       FROM public.pilot_data_treatment_agreements
       WHERE escola_id = $1 AND reference = $2 AND version = $3 AND confirmed = true
       LIMIT 1`,
      [school.id, manifest.processingAgreement.reference, manifest.processingAgreement.version]
    )
    const agreement = agreementResult.rows[0]
    if (!agreement || !agreement.confirmed || !agreement.confirmed_at || !agreement.confirmed_by) {
      throw new Error('PILOT_IMPORT_TREATMENT_AGREEMENT_REQUIRED: a confirmed treatment agreement must be on file')
    }
    if (agreement.confirmed_by !== agreementRecorder.id) {
      throw new Error('PILOT_IMPORT_TREATMENT_AGREEMENT_RECORDER_MISMATCH: agreement confirmer does not match the manifest')
    }
    const ownerEmail = owner.email
    const idempotencyKey = `proof-${report.contentSha256}`
    const existing = await client.query<{ id: string; governance_fingerprint_sha256: string | null }>(
      `SELECT id, governance_fingerprint_sha256
       FROM public.pilot_import_batches
       WHERE escola_id = $1 AND import_target = 'isolated_proof'
         AND (idempotency_key = $2 OR content_sha256 = $3)
       ORDER BY created_at
       LIMIT 1`,
      [school.id, idempotencyKey, report.contentSha256]
    )
    if (existing.rows[0]) {
      if (existing.rows[0].governance_fingerprint_sha256 !== governanceFingerprint) {
        throw new Error('PILOT_IMPORT_IDEMPOTENCY_GOVERNANCE_MISMATCH: existing batch has different governance')
      }
      await client.query('COMMIT')
      return buildImportReceipt(client, await readBatch(client, existing.rows[0].id), safetyReceipt)
    }

    const batchResult = await client.query<{ id: string }>(
      `INSERT INTO public.pilot_import_batches (
         escola_id, dataset, idempotency_key, content_sha256, encryption_key_id,
         encrypted_payload, iv, auth_tag, validation_report, status, submitted_by,
         approved_by, approved_at, published_at, raw_expires_at, import_target,
         source_mode, encryption_algorithm, governance_owner_name, governance_owner_email,
         governance_owner_user_id, governance_owner_authorized_at, submitted_by_name, submitted_by_email,
         approved_by_name, approved_by_email,
         processing_agreement_id, processing_agreement_confirmed,
         processing_agreement_reference, processing_agreement_version,
         processing_agreement_recorded_at, processing_agreement_recorded_by,
         processing_agreement_recorded_by_name, processing_agreement_recorded_by_email,
         retention_policy, canonical_expires_at, rollback_until, source_row_count,
         canonical_counts, canonical_fingerprint_sha256, governance_fingerprint_sha256,
         governance_metadata
       ) VALUES (
         $1, 'students', $2, $3, $4, $5, $6, $7, $8, 'approved', $9,
         $10, $11, NULL, $12, 'isolated_proof', $13, 'aes-256-gcm', $14, $15,
         $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
         $29, $30, $31, $32, $33, $34, $35, $36, $37
       ) RETURNING id`,
      [
        school.id,
        idempotencyKey,
        report.contentSha256,
        encrypted.encryptionKeyId,
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag,
        report,
        submitter.id,
        approver.id,
        manifest.approval.approvedAt,
        manifest.retention.rawPayloadExpiresAt,
        dataMode,
        owner.nome,
        ownerEmail,
        owner.id,
        manifest.approval.approvedAt,
        submitter.nome,
        submitter.email,
        approver.nome,
        approver.email,
        agreement.id,
        true,
        manifest.processingAgreement.reference,
        manifest.processingAgreement.version,
        agreement.confirmed_at,
        agreementRecorder.id,
        agreementRecorder.nome,
        agreementRecorder.email,
        manifest.retention.policy,
        manifest.retention.canonicalDataExpiresAt,
        manifest.retention.rollbackUntil,
        report.totalRows,
        canonicalCounts,
        canonicalFingerprint,
        governanceFingerprint,
        manifest,
      ]
    )
    const batchId = batchResult.rows[0]?.id
    if (!batchId) throw new Error('PILOT_IMPORT_PROOF_BATCH_CREATE_FAILED: batch id is missing')

    await createProofStorageObject(client, batchId)

    const reportFingerprint = createHash('sha256').update(JSON.stringify(report), 'utf8').digest('hex')
    await client.query(
      `INSERT INTO public.pilot_import_approvals (
         batch_id, escola_id, submitted_by, approved_by, decision, report_sha256, decided_at
       ) VALUES ($1, $2, $3, $4, 'approved', $5, $6)`,
      [batchId, school.id, submitter.id, approver.id, reportFingerprint, manifest.approval.approvedAt]
    )

    const classRows = new Map<string, ClassRow>()
    for (const row of canonicalRows) {
      if (!classRows.has(row.classCode)) classRows.set(row.classCode, await findProofClass(client, school.id, row.classCode))
    }

    for (const row of canonicalRows) {
      const guardian = await client.query<{ id: string }>(
        `INSERT INTO public.responsaveis (
           escola_id, import_source_id, nome, cpf, parentesco, telefone, ativo, pilot_import_batch_id
         ) VALUES ($1, $2, $3, NULL, $4, $5, true, $6)
         RETURNING id`,
        [school.id, `proof:${row.guardianSourceId}`, row.guardianName, row.guardianRelationship, row.guardianPhone, batchId]
      )
      const guardianId = guardian.rows[0]?.id
      if (!guardianId) throw new Error('PILOT_IMPORT_PROOF_GUARDIAN_CREATE_FAILED: guardian id is missing')

      const student = await client.query<{ id: string }>(
        `INSERT INTO public.alunos (
           escola_id, import_source_id, nome_completo, data_nascimento, sexo,
           responsavel_id, ativo, pilot_import_batch_id
         ) VALUES ($1, $2, $3, $4, $5, $6, true, $7)
         RETURNING id`,
        [school.id, `proof:${row.sourceId}`, row.studentName, row.birthDate, row.sex, guardianId, batchId]
      )
      const studentId = student.rows[0]?.id
      if (!studentId) throw new Error('PILOT_IMPORT_PROOF_STUDENT_CREATE_FAILED: student id is missing')

      await client.query(
        `INSERT INTO public.aluno_responsaveis (
           aluno_id, responsavel_id, tipo_responsabilidade, pilot_import_batch_id
         ) VALUES ($1, $2, $3, $4)`,
        [studentId, guardianId, row.guardianRelationship, batchId]
      )

      const classRow = classRows.get(row.classCode)
      if (!classRow) throw new Error(`PILOT_IMPORT_PROOF_CLASS_NOT_FOUND: class ${row.classCode} is missing`)
      await client.query(
        `INSERT INTO public.matriculas (
           aluno_id, turma_id, ano_letivo, situacao, observacoes, pilot_import_batch_id
         ) VALUES ($1, $2, $3, 'ativa', 'governed isolated proof CSV import', $4)`,
        [studentId, classRow.id, classRow.ano_letivo, batchId]
      )
    }

    const databaseFingerprint = await readDatabaseFingerprint(client, batchId)
    await client.query(
      `UPDATE public.pilot_import_batches
       SET status = 'published', published_at = now(), database_fingerprint_sha256 = $2
       WHERE id = $1`,
      [batchId, databaseFingerprint]
    )
    await client.query(
      `INSERT INTO public.pilot_audit_log(
         actor_user_id, escola_id, event_type, entity_type, entity_id, redacted_metadata
       ) VALUES ($1, $2, 'import_published', 'pilot_import_batch', $3, $4)`,
      [
        approver.id,
        school.id,
        batchId,
        {
          target: 'isolated_proof',
          source_mode: dataMode,
          source_row_count: report.totalRows,
          canonical_counts: canonicalCounts,
          encrypted_at_rest: true,
          plaintext_stored: false,
        },
      ]
    )

    await client.query('COMMIT')
    return buildImportReceipt(client, await readBatch(client, batchId), safetyReceipt)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

function expectedCanonicalCount(batch: BatchRow, key: string): number | null {
  if (!batch.canonical_counts || typeof batch.canonical_counts !== 'object') return null
  const value = (batch.canonical_counts as Record<string, unknown>)[key]
  return typeof value === 'number' ? value : null
}

async function runRollback(
  client: Client,
  batchId: string,
  actorEmail: string,
  reason: string,
  safetyReceipt: GovernedPilotProofSafetyReceipt
): Promise<Record<string, unknown>> {
  if (!UUID_PATTERN.test(batchId)) throw new Error('PILOT_IMPORT_PROOF_BATCH_INVALID: batch id must be a UUID')
  const actor = await findActiveActor(client, actorEmail, 'PILOT_IMPORT_ROLLBACK_ACTOR_REQUIRED')
  const batchBefore = await readBatch(client, batchId)
  const result = await client.query<RollbackRow>(
    `SELECT * FROM public.pilot_rollback_import_batch($1, $2, $3)`,
    [batchId, actor.id, reason]
  )
  const rollback = result.rows[0]
  if (!rollback) throw new Error('PILOT_IMPORT_ROLLBACK_EMPTY: rollback receipt is missing')

  if (batchBefore.status !== 'rolled_back') {
    const expectedCounts = [
      ['enrollments', rollback.deleted_enrollments],
      ['relationships', rollback.deleted_relationships],
      ['students', rollback.deleted_students],
      ['guardians', rollback.deleted_guardians],
      ['storageObjects', rollback.deleted_storage_objects],
    ] as const
    for (const [key, observed] of expectedCounts) {
      const expected = expectedCanonicalCount(batchBefore, key)
      if (expected !== null && observed !== expected) {
        throw new Error(`PILOT_IMPORT_ROLLBACK_RECEIPT_MISMATCH: ${key} count does not match ownership receipt`)
      }
    }
  }

  const batch = await readBatch(client, batchId)
  const storage = await readStorageObjectState(client, batchId)
  const evidence = await readRollbackEvidence(client, batch)
  return {
    ...await buildImportReceipt(client, batch, safetyReceipt),
    rollback: {
      actorResolved: true,
      deletedEnrollments: rollback.deleted_enrollments,
      deletedRelationships: rollback.deleted_relationships,
      deletedStudents: rollback.deleted_students,
      deletedGuardians: rollback.deleted_guardians,
      storageObjects: {
        requested: rollback.storage_object_fingerprints.length,
        removed: rollback.deleted_storage_objects,
        remaining: storage.ownedCount,
      },
      tombstone: {
        count: evidence.tombstoneCount,
        matchesBatch: evidence.tombstoneMatchesBatch,
      },
      audit: {
        rollbackEvents: evidence.auditCount,
        redacted: evidence.auditIsRedacted,
      },
      reasonRecorded: true,
    },
  }
}

async function runRetentionCleanup(
  client: Client,
  safetyReceipt: GovernedPilotProofSafetyReceipt
): Promise<Record<string, unknown>> {
  const result = await client.query<{ pilot_cleanup_import_retention: number }>(
    `SELECT public.pilot_cleanup_import_retention()`
  )
  return {
    target: safetyReceipt.target,
    safety: safetyReceipt,
    rawPayloadsCleaned: result.rows[0]?.pilot_cleanup_import_retention ?? 0,
  }
}

async function main(): Promise<void> {
  const args = parseProofImportArguments(process.argv.slice(2))
  const proofEnvironment = readGovernedPilotProofEnvironment()
  const safetyReceipt = assertGovernedPilotProofSafety(proofEnvironment, args.command)
  const proofDatabaseUrl = proofEnvironment.proofDatabaseUrl
  if (!proofDatabaseUrl) throw new Error('PILOT_IMPORT_PROOF_DATABASE_REQUIRED: proof database URL is required')
  const client = new Client({ connectionString: proofDatabaseUrl })
  await client.connect()
  try {
    let receipt: Record<string, unknown>
    if (args.command === 'import') {
      receipt = await runGovernedProofImport(client, args.csvPath!, args.approvalPath!, safetyReceipt)
      console.info(`PILOT_GOVERNED_IMPORT_RECEIPT: ${JSON.stringify(receipt)}`)
    } else if (args.command === 'rollback') {
      receipt = await runRollback(client, args.batchId!, args.actorEmail!, args.reason!, safetyReceipt)
      console.info(`PILOT_GOVERNED_ROLLBACK_RECEIPT: ${JSON.stringify(receipt)}`)
    } else {
      receipt = await runRetentionCleanup(client, safetyReceipt)
      console.info(`PILOT_GOVERNED_RETENTION_RECEIPT: ${JSON.stringify(receipt)}`)
    }
  } finally {
    await client.end()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
