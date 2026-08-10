import { createHash } from 'node:crypto'
import { z } from 'zod'
import { SYNTHETIC_CSV_MARKER } from './synthetic-csv-import'

/** Exact CSV columns accepted by the governed student import contract. */
export const GOVERNED_PILOT_STUDENT_CSV_HEADERS = [
  'synthetic_marker',
  'source_id',
  'school_code',
  'class_code',
  'student_name',
  'birth_date',
  'sex',
  'guardian_name',
  'guardian_phone',
  'guardian_relationship',
] as const

export const GOVERNED_PILOT_IMPORT_SCHEMA_VERSION = 'educa-pilot-students-v1'

export type GovernedPilotImportDataMode = 'synthetic' | 'real'

export interface GovernedPilotStudentCsvRow {
  synthetic_marker: string
  source_id: string
  school_code: string
  class_code: string
  student_name: string
  birth_date: string
  sex: 'M' | 'F'
  guardian_name: string
  guardian_phone: string
  guardian_relationship: string
}

/** Canonical values written to alunos, responsaveis, links, and matriculas. */
export interface CanonicalPilotStudentRow {
  sourceId: string
  schoolCode: string
  classCode: string
  studentName: string
  birthDate: string
  sex: 'M' | 'F'
  guardianSourceId: string
  guardianName: string
  guardianPhone: string
  guardianRelationship: string
}

export interface GovernedCsvValidationIssue {
  row: number
  field: string
  code: string
}

export interface GovernedCsvValidationReport {
  valid: boolean
  schemaVersion: typeof GOVERNED_PILOT_IMPORT_SCHEMA_VERSION
  dataMode: GovernedPilotImportDataMode
  totalRows: number
  validRows: number
  contentSha256: string
  schoolCodes: string[]
  issues: GovernedCsvValidationIssue[]
}

export interface PilotImportPerson {
  name: string
  email: string
}

export interface PilotImportProcessingAgreementInput {
  reference: string
  version: string
}

export interface PilotImportRetentionInput {
  policy: string
  rawPayloadExpiresAt: string
  canonicalDataExpiresAt: string
  rollbackUntil: string
}

/** Governance fields recorded before the CSV can enter a proof database. */
export interface PilotImportGovernanceInput {
  owner: PilotImportPerson
  processingAgreement: PilotImportProcessingAgreementInput
  retention: PilotImportRetentionInput
}

export interface PilotImportProcessingAgreement extends PilotImportProcessingAgreementInput {
  recordedAt: string
  recordedBy: PilotImportPerson
}

export interface PilotImportApprovalInput {
  submittedBy: PilotImportPerson
  approvedBy: PilotImportPerson
  approvedAt: string
}

export interface GovernedPilotImportManifest {
  owner: PilotImportPerson
  processingAgreement: PilotImportProcessingAgreement
  approval: PilotImportApprovalInput
  retention: PilotImportRetentionInput
}

export interface GovernedCsvCanonicalCounts {
  sourceRows: number
  students: number
  guardians: number
  relationships: number
  enrollments: number
}

const personSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(320),
}).strict()

const governanceInputSchema = z.object({
  owner: personSchema,
  processingAgreement: z.object({
    reference: z.string().trim().min(2).max(200),
    version: z.string().trim().min(1).max(80),
  }).strict(),
  retention: z.object({
    policy: z.string().trim().min(2).max(120),
    rawPayloadExpiresAt: z.string().trim().min(1),
    canonicalDataExpiresAt: z.string().trim().min(1),
    rollbackUntil: z.string().trim().min(1),
  }).strict(),
}).strict()

const manifestSchema = z.object({
  owner: personSchema,
  processingAgreement: z.object({
    reference: z.string().trim().min(2).max(200),
    version: z.string().trim().min(1).max(80),
    recordedAt: z.string().trim().min(1),
    recordedBy: personSchema,
  }).strict(),
  approval: z.object({
    submittedBy: personSchema,
    approvedBy: personSchema,
    approvedAt: z.string().trim().min(1),
  }).strict(),
  retention: z.object({
    policy: z.string().trim().min(2).max(120),
    rawPayloadExpiresAt: z.string().trim().min(1),
    canonicalDataExpiresAt: z.string().trim().min(1),
    rollbackUntil: z.string().trim().min(1),
  }).strict(),
}).strict()

function parseCsvRecords(csv: string): string[][] {
  const records: string[][] = []
  let record: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index]
    const nextCharacter = csv[index + 1]
    if (character === '"' && quoted && nextCharacter === '"') {
      field += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      record.push(field.trim())
      field = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && nextCharacter === '\n') index += 1
      record.push(field.trim())
      field = ''
      if (record.some(value => value !== '')) records.push(record)
      record = []
    } else {
      field += character
    }
  }

  if (quoted) throw new Error('PILOT_IMPORT_CSV_INVALID_QUOTING: unclosed quoted field')
  record.push(field.trim())
  if (record.some(value => value !== '')) records.push(record)
  return records
}

function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const timestamp = Date.UTC(year, month - 1, day)
  const date = new Date(timestamp)
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function isValidTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value))
}

function normalizeTimestamp(value: string, errorCode: string): string {
  if (!isValidTimestamp(value)) throw new Error(errorCode)
  return new Date(value).toISOString()
}

function hasSpreadsheetFormula(value: string): boolean {
  return /^[=+\-@]/.test(value)
}

function normalizeGovernancePerson(person: PilotImportPerson): PilotImportPerson {
  return { name: person.name.trim(), email: person.email.trim().toLowerCase() }
}

function assertRetentionWindow(retention: PilotImportRetentionInput, now: Date): void {
  const rawExpiry = Date.parse(retention.rawPayloadExpiresAt)
  const canonicalExpiry = Date.parse(retention.canonicalDataExpiresAt)
  const rollbackExpiry = Date.parse(retention.rollbackUntil)
  if (![rawExpiry, canonicalExpiry, rollbackExpiry].every(Number.isFinite)) {
    throw new Error('PILOT_IMPORT_RETENTION_INVALID: all retention timestamps must be ISO dates')
  }
  if (rawExpiry <= now.getTime()) throw new Error('PILOT_IMPORT_RETENTION_RAW_EXPIRED: raw payload expiry must be in the future')
  if (canonicalExpiry <= rawExpiry) throw new Error('PILOT_IMPORT_RETENTION_CANONICAL_ORDER_INVALID: canonical expiry must follow raw expiry')
  if (rollbackExpiry <= now.getTime() || rollbackExpiry > canonicalExpiry) {
    throw new Error('PILOT_IMPORT_RETENTION_ROLLBACK_WINDOW_INVALID: rollback must end before canonical expiry')
  }
}

/** Validates the named owner, agreement record, approval, and retention rule. */
export function validatePilotImportGovernanceInput(
  input: unknown,
  now: Date = new Date()
): PilotImportGovernanceInput {
  const parsed = governanceInputSchema.safeParse(input)
  if (!parsed.success) throw new Error('PILOT_IMPORT_GOVERNANCE_INVALID: owner, agreement, and retention are required')
  const normalized: PilotImportGovernanceInput = {
    owner: normalizeGovernancePerson(parsed.data.owner),
    processingAgreement: {
      reference: parsed.data.processingAgreement.reference.trim(),
      version: parsed.data.processingAgreement.version.trim(),
    },
    retention: {
      policy: parsed.data.retention.policy.trim(),
      rawPayloadExpiresAt: normalizeTimestamp(parsed.data.retention.rawPayloadExpiresAt, 'PILOT_IMPORT_RETENTION_INVALID: raw payload expiry is invalid'),
      canonicalDataExpiresAt: normalizeTimestamp(parsed.data.retention.canonicalDataExpiresAt, 'PILOT_IMPORT_RETENTION_INVALID: canonical expiry is invalid'),
      rollbackUntil: normalizeTimestamp(parsed.data.retention.rollbackUntil, 'PILOT_IMPORT_RETENTION_INVALID: rollback expiry is invalid'),
    },
  }
  assertRetentionWindow(normalized.retention, now)
  return normalized
}

/** Validates the complete approval manifest consumed by the isolated proof runner. */
export function validateGovernedPilotImportManifest(
  input: unknown,
  now: Date = new Date()
): GovernedPilotImportManifest {
  const parsed = manifestSchema.safeParse(input)
  if (!parsed.success) throw new Error('PILOT_IMPORT_GOVERNANCE_INVALID: complete approval manifest is required')
  const normalized: GovernedPilotImportManifest = {
    owner: normalizeGovernancePerson(parsed.data.owner),
    processingAgreement: {
      reference: parsed.data.processingAgreement.reference.trim(),
      version: parsed.data.processingAgreement.version.trim(),
      recordedAt: normalizeTimestamp(parsed.data.processingAgreement.recordedAt, 'PILOT_IMPORT_GOVERNANCE_TIMESTAMP_INVALID: agreement time is invalid'),
      recordedBy: normalizeGovernancePerson(parsed.data.processingAgreement.recordedBy),
    },
    approval: {
      submittedBy: normalizeGovernancePerson(parsed.data.approval.submittedBy),
      approvedBy: normalizeGovernancePerson(parsed.data.approval.approvedBy),
      approvedAt: normalizeTimestamp(parsed.data.approval.approvedAt, 'PILOT_IMPORT_GOVERNANCE_TIMESTAMP_INVALID: approval time is invalid'),
    },
    retention: {
      policy: parsed.data.retention.policy.trim(),
      rawPayloadExpiresAt: normalizeTimestamp(parsed.data.retention.rawPayloadExpiresAt, 'PILOT_IMPORT_RETENTION_INVALID: raw payload expiry is invalid'),
      canonicalDataExpiresAt: normalizeTimestamp(parsed.data.retention.canonicalDataExpiresAt, 'PILOT_IMPORT_RETENTION_INVALID: canonical expiry is invalid'),
      rollbackUntil: normalizeTimestamp(parsed.data.retention.rollbackUntil, 'PILOT_IMPORT_RETENTION_INVALID: rollback expiry is invalid'),
    },
  }
  if (!isValidTimestamp(normalized.processingAgreement.recordedAt) || !isValidTimestamp(normalized.approval.approvedAt)) {
    throw new Error('PILOT_IMPORT_GOVERNANCE_TIMESTAMP_INVALID: agreement and approval times are required')
  }
  if (Date.parse(normalized.processingAgreement.recordedAt) > now.getTime()) {
    throw new Error('PILOT_IMPORT_AGREEMENT_FUTURE: agreement record cannot be in the future')
  }
  if (Date.parse(normalized.approval.approvedAt) > now.getTime()) {
    throw new Error('PILOT_IMPORT_APPROVAL_FUTURE: approval cannot be in the future')
  }
  if (normalized.approval.submittedBy.email === normalized.approval.approvedBy.email) {
    throw new Error('PILOT_IMPORT_MAKER_CHECKER_REQUIRED: submitter and approver must differ')
  }
  assertRetentionWindow(normalized.retention, now)
  return normalized
}

/** Parses the exact external CSV contract before any database write. */
export function validateGovernedPilotStudentCsv(
  csv: string,
  dataMode: GovernedPilotImportDataMode
): { rows: GovernedPilotStudentCsvRow[]; report: GovernedCsvValidationReport } {
  const contentSha256 = createHash('sha256').update(csv, 'utf8').digest('hex')
  let records: string[][]
  try {
    records = parseCsvRecords(csv)
  } catch {
    return {
      rows: [],
      report: {
        valid: false,
        schemaVersion: GOVERNED_PILOT_IMPORT_SCHEMA_VERSION,
        dataMode,
        totalRows: 0,
        validRows: 0,
        contentSha256,
        schoolCodes: [],
        issues: [{ row: 1, field: 'csv', code: 'invalid_quoting' }],
      },
    }
  }

  const issues: GovernedCsvValidationIssue[] = []
  const headers = records[0] ?? []
  const expectedHeaders = [...GOVERNED_PILOT_STUDENT_CSV_HEADERS]
  if (headers.length !== expectedHeaders.length || headers.some((header, index) => header.replace(/^\uFEFF/, '') !== expectedHeaders[index])) {
    issues.push({ row: 1, field: 'headers', code: 'schema_mismatch' })
    return {
      rows: [],
      report: {
        valid: false,
        schemaVersion: GOVERNED_PILOT_IMPORT_SCHEMA_VERSION,
        dataMode,
        totalRows: Math.max(0, records.length - 1),
        validRows: 0,
        contentSha256,
        schoolCodes: [],
        issues,
      },
    }
  }

  const rows: GovernedPilotStudentCsvRow[] = []
  const seenSourceIds = new Set<string>()
  for (let index = 1; index < records.length; index += 1) {
    const values = records[index]
    const rowNumber = index + 1
    if (values.length !== expectedHeaders.length) {
      issues.push({ row: rowNumber, field: 'row', code: 'column_count_mismatch' })
      continue
    }
    const candidate = Object.fromEntries(expectedHeaders.map((header, valueIndex) => [header, values[valueIndex]])) as unknown as GovernedPilotStudentCsvRow
    const rowIssues: GovernedCsvValidationIssue[] = []
    const formulaField = expectedHeaders.find((header, valueIndex) => header !== 'guardian_phone' && hasSpreadsheetFormula(values[valueIndex]))
    if (formulaField) rowIssues.push({ row: rowNumber, field: formulaField, code: 'spreadsheet_formula_rejected' })
    if (dataMode === 'synthetic' && candidate.synthetic_marker !== SYNTHETIC_CSV_MARKER) {
      rowIssues.push({ row: rowNumber, field: 'synthetic_marker', code: 'synthetic_marker_required' })
    }
    if (dataMode === 'real' && candidate.synthetic_marker !== '') {
      rowIssues.push({ row: rowNumber, field: 'synthetic_marker', code: 'real_mode_marker_must_be_empty' })
    }
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(candidate.source_id)) rowIssues.push({ row: rowNumber, field: 'source_id', code: 'invalid' })
    if (seenSourceIds.has(candidate.source_id)) rowIssues.push({ row: rowNumber, field: 'source_id', code: 'duplicate' })
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(candidate.school_code)) rowIssues.push({ row: rowNumber, field: 'school_code', code: 'invalid' })
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(candidate.class_code)) rowIssues.push({ row: rowNumber, field: 'class_code', code: 'invalid' })
    if (candidate.student_name.length < 2 || candidate.student_name.length > 160) rowIssues.push({ row: rowNumber, field: 'student_name', code: 'invalid_length' })
    if (!isValidIsoDate(candidate.birth_date)) rowIssues.push({ row: rowNumber, field: 'birth_date', code: 'invalid' })
    if (!['M', 'F'].includes(candidate.sex)) rowIssues.push({ row: rowNumber, field: 'sex', code: 'invalid' })
    if (candidate.guardian_name.length < 2 || candidate.guardian_name.length > 160) rowIssues.push({ row: rowNumber, field: 'guardian_name', code: 'invalid_length' })
    if (!/^\+?[0-9 ()-]{8,24}$/.test(candidate.guardian_phone)) rowIssues.push({ row: rowNumber, field: 'guardian_phone', code: 'invalid' })
    if (candidate.guardian_relationship.length < 2 || candidate.guardian_relationship.length > 40) rowIssues.push({ row: rowNumber, field: 'guardian_relationship', code: 'invalid_length' })
    issues.push(...rowIssues)
    if (rowIssues.length === 0) {
      rows.push(candidate)
      seenSourceIds.add(candidate.source_id)
    }
  }

  const schoolCodes = [...new Set(rows.map(row => row.school_code))].sort()
  if (rows.length > 0 && schoolCodes.length !== 1) issues.push({ row: 1, field: 'school_code', code: 'one_school_per_batch_required' })
  return {
    rows,
    report: {
      valid: issues.length === 0 && rows.length > 0,
      schemaVersion: GOVERNED_PILOT_IMPORT_SCHEMA_VERSION,
      dataMode,
      totalRows: Math.max(0, records.length - 1),
      validRows: rows.length,
      contentSha256,
      schoolCodes,
      issues,
    },
  }
}

/** Transforms validated CSV rows into the canonical EDUCA write model. */
export function transformGovernedPilotCsvToCanonicalRows(
  rows: GovernedPilotStudentCsvRow[]
): CanonicalPilotStudentRow[] {
  return rows
    .map(row => ({
      sourceId: row.source_id,
      schoolCode: row.school_code,
      classCode: row.class_code,
      studentName: row.student_name,
      birthDate: row.birth_date,
      sex: row.sex,
      guardianSourceId: `guardian:${row.source_id}`,
      guardianName: row.guardian_name,
      guardianPhone: row.guardian_phone,
      guardianRelationship: row.guardian_relationship,
    }))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId))
}

/** Creates the independent fingerprint of canonical values, never storing them. */
export function fingerprintCanonicalPilotRows(rows: CanonicalPilotStudentRow[]): string {
  return createHash('sha256').update(JSON.stringify(transformCanonicalRowsForFingerprint(rows)), 'utf8').digest('hex')
}

function transformCanonicalRowsForFingerprint(rows: CanonicalPilotStudentRow[]): CanonicalPilotStudentRow[] {
  return rows.map(row => ({ ...row }))
}

/** Counts the canonical rows expected from one validated student CSV. */
export function countCanonicalPilotRows(rows: CanonicalPilotStudentRow[]): GovernedCsvCanonicalCounts {
  return {
    sourceRows: rows.length,
    students: rows.length,
    guardians: rows.length,
    relationships: rows.length,
    enrollments: rows.length,
  }
}

/** Fingerprints governance metadata so approval changes cannot be hidden. */
export function fingerprintPilotImportGovernance(manifest: GovernedPilotImportManifest): string {
  const canonicalManifest = {
    owner: manifest.owner,
    processingAgreement: manifest.processingAgreement,
    approval: manifest.approval,
    retention: manifest.retention,
  }
  return createHash('sha256').update(JSON.stringify(canonicalManifest), 'utf8').digest('hex')
}

/** Creates a complete manifest from the server-stamped governance fields. */
export function completePilotImportGovernance(
  input: PilotImportGovernanceInput,
  submittedBy: PilotImportPerson,
  approvedBy: PilotImportPerson,
  now: Date = new Date()
): GovernedPilotImportManifest {
  const recordedAt = now.toISOString()
  return validateGovernedPilotImportManifest({
    owner: input.owner,
    processingAgreement: { ...input.processingAgreement, recordedAt, recordedBy: submittedBy },
    approval: { submittedBy, approvedBy, approvedAt: recordedAt },
    retention: input.retention,
  }, now)
}
