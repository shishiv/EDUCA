import { createHash } from 'node:crypto'
import { z } from 'zod'
import { SYNTHETIC_CSV_MARKER } from './synthetic-csv-import'
import { PILOT_IMPORT_ENCRYPTION_ALGORITHM } from './pilot-import-crypto'

/** Versioned technical contract for the synthetic pilot governance manifest. */
export const SYNTHETIC_PILOT_GOVERNANCE_MANIFEST_VERSION = 'educa-synthetic-pilot-governance-v1' as const

/** Placeholder for decisions reserved for the captain or municipality. */
export const PILOT_GOVERNANCE_UNCONFIRMED = 'a confirmar' as const
/** Status recorded only when the data treatment agreement is confirmed on file. */
export const PILOT_TREATMENT_AGREEMENT_CONFIRMED = 'confirmed' as const

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

/** A governance role with a synthetic identity and no legal confirmation. */
export interface PilotImportGovernanceRole extends PilotImportPerson {
  status: typeof PILOT_GOVERNANCE_UNCONFIRMED
}

/** A subprocessador recorded as a technical placeholder, never as an approval. */
export interface PilotImportSubprocessor extends PilotImportGovernanceRole {
  service: string
  processingLocation: string
}

/** The proof location and unresolved transfer decision for synthetic data. */
export interface PilotImportLocation {
  primary: string
  transfer: typeof PILOT_GOVERNANCE_UNCONFIRMED
}

/** Encryption metadata only; this field never carries a key or secret. */
export interface PilotImportEncryption {
  algorithm: typeof PILOT_IMPORT_ENCRYPTION_ALGORITHM
  keyReference: string
  inTransit: typeof PILOT_GOVERNANCE_UNCONFIRMED
  plaintextStored: false
}

/** Technical exit fields that remain unresolved until the pilot authority decides. */
export interface PilotImportExitPlan {
  trigger: string
  dataDisposition: typeof PILOT_GOVERNANCE_UNCONFIRMED
  accessRevocation: typeof PILOT_GOVERNANCE_UNCONFIRMED
  evidence: typeof PILOT_GOVERNANCE_UNCONFIRMED
}

/** Incident contact and response placeholders for the synthetic proof. */
export interface PilotImportIncidentPlan {
  contact: PilotImportPerson
  notification: typeof PILOT_GOVERNANCE_UNCONFIRMED
  response: typeof PILOT_GOVERNANCE_UNCONFIRMED
}

export interface PilotImportProcessingAgreementInput {
  reference: string
  version: string
  status: typeof PILOT_GOVERNANCE_UNCONFIRMED | typeof PILOT_TREATMENT_AGREEMENT_CONFIRMED
  confirmed: boolean
}

export interface PilotImportRetentionInput {
  policy: string
  rawPayloadExpiresAt: string
  canonicalDataExpiresAt: string
  rollbackUntil: string
}

/** Governance fields recorded before the CSV can enter a proof database. */
export interface PilotImportGovernanceInput {
  version: typeof SYNTHETIC_PILOT_GOVERNANCE_MANIFEST_VERSION
  owner: PilotImportPerson
  controller: PilotImportGovernanceRole
  processor: PilotImportGovernanceRole
  purpose: string
  legalBasis: typeof PILOT_GOVERNANCE_UNCONFIRMED
  processingAgreement: PilotImportProcessingAgreementInput
  subprocessors: PilotImportSubprocessor[]
  location: PilotImportLocation
  encryption: PilotImportEncryption
  retention: PilotImportRetentionInput
  exit: PilotImportExitPlan
  incident: PilotImportIncidentPlan
}

export interface PilotImportProcessingAgreement extends PilotImportProcessingAgreementInput {
  recordedAt: string
  recordedBy: PilotImportPerson
}

/** Existing import maker-checker approval only; never a legal or contracting approval. */
export interface PilotImportApprovalInput {
  submittedBy: PilotImportPerson
  approvedBy: PilotImportPerson
  approvedAt: string
}

/** Complete synthetic manifest whose approval block remains technical, not legal. */
export interface GovernedPilotImportManifest {
  version: typeof SYNTHETIC_PILOT_GOVERNANCE_MANIFEST_VERSION
  owner: PilotImportPerson
  controller: PilotImportGovernanceRole
  processor: PilotImportGovernanceRole
  purpose: string
  legalBasis: typeof PILOT_GOVERNANCE_UNCONFIRMED
  processingAgreement: PilotImportProcessingAgreement
  approval: PilotImportApprovalInput
  subprocessors: PilotImportSubprocessor[]
  location: PilotImportLocation
  encryption: PilotImportEncryption
  retention: PilotImportRetentionInput
  exit: PilotImportExitPlan
  incident: PilotImportIncidentPlan
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

function requireSyntheticIdentity(person: { email: string }, context: z.RefinementCtx): void {
  const domain = person.email.slice(person.email.lastIndexOf('@') + 1).toLowerCase()
  if (!domain.endsWith('.invalid')) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'synthetic_identity_required', path: ['email'] })
  }
}

const syntheticPersonSchema = personSchema.superRefine(requireSyntheticIdentity)
const governanceRoleSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(320),
  status: z.literal(PILOT_GOVERNANCE_UNCONFIRMED),
}).strict().superRefine(requireSyntheticIdentity)
const subprocessorSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(320),
  status: z.literal(PILOT_GOVERNANCE_UNCONFIRMED),
  service: z.string().trim().min(2).max(160),
  processingLocation: z.string().trim().min(2).max(120),
}).strict().superRefine(requireSyntheticIdentity)

const processingAgreementInputSchema = z.object({
  reference: z.string().trim().min(2).max(200),
  version: z.string().trim().min(1).max(80),
  status: z.union([z.literal(PILOT_GOVERNANCE_UNCONFIRMED), z.literal(PILOT_TREATMENT_AGREEMENT_CONFIRMED)]),
  confirmed: z.boolean(),
}).strict()

const retentionSchema = z.object({
  policy: z.string().trim().min(2).max(120),
  rawPayloadExpiresAt: z.string().trim().min(1),
  canonicalDataExpiresAt: z.string().trim().min(1),
  rollbackUntil: z.string().trim().min(1),
}).strict()

const governanceFieldsSchema = {
  version: z.literal(SYNTHETIC_PILOT_GOVERNANCE_MANIFEST_VERSION),
  owner: syntheticPersonSchema,
  controller: governanceRoleSchema,
  processor: governanceRoleSchema,
  purpose: z.string().trim().min(2).max(240),
  legalBasis: z.literal(PILOT_GOVERNANCE_UNCONFIRMED),
  processingAgreement: processingAgreementInputSchema,
  subprocessors: z.array(subprocessorSchema).max(32),
  location: z.object({
    primary: z.string().trim().min(2).max(120),
    transfer: z.literal(PILOT_GOVERNANCE_UNCONFIRMED),
  }).strict(),
  encryption: z.object({
    algorithm: z.literal(PILOT_IMPORT_ENCRYPTION_ALGORITHM),
    keyReference: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9._-]+$/),
    inTransit: z.literal(PILOT_GOVERNANCE_UNCONFIRMED),
    plaintextStored: z.literal(false),
  }).strict(),
  retention: retentionSchema,
  exit: z.object({
    trigger: z.string().trim().min(2).max(160),
    dataDisposition: z.literal(PILOT_GOVERNANCE_UNCONFIRMED),
    accessRevocation: z.literal(PILOT_GOVERNANCE_UNCONFIRMED),
    evidence: z.literal(PILOT_GOVERNANCE_UNCONFIRMED),
  }).strict(),
  incident: z.object({
    contact: syntheticPersonSchema,
    notification: z.literal(PILOT_GOVERNANCE_UNCONFIRMED),
    response: z.literal(PILOT_GOVERNANCE_UNCONFIRMED),
  }).strict(),
} as const

const governanceInputSchema = z.object({
  ...governanceFieldsSchema,
}).strict()

const manifestSchema = z.object({
  ...governanceFieldsSchema,
  processingAgreement: z.object({
    reference: z.string().trim().min(2).max(200),
    version: z.string().trim().min(1).max(80),
    status: z.union([z.literal(PILOT_GOVERNANCE_UNCONFIRMED), z.literal(PILOT_TREATMENT_AGREEMENT_CONFIRMED)]),
    confirmed: z.boolean(),
    recordedAt: z.string().trim().min(1),
    recordedBy: syntheticPersonSchema,
  }).strict(),
  approval: z.object({
    submittedBy: syntheticPersonSchema,
    approvedBy: syntheticPersonSchema,
    approvedAt: z.string().trim().min(1),
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

function normalizeGovernanceRole(role: PilotImportGovernanceRole): PilotImportGovernanceRole {
  return { ...normalizeGovernancePerson(role), status: role.status }
}

function normalizeGovernanceSubprocessors(subprocessors: PilotImportSubprocessor[]): PilotImportSubprocessor[] {
  return subprocessors
    .map(subprocessor => ({
      ...normalizeGovernanceRole(subprocessor),
      service: subprocessor.service.trim(),
      processingLocation: subprocessor.processingLocation.trim(),
    }))
    .sort((left, right) => {
      const leftKey = `${left.email}|${left.service}|${left.processingLocation}|${left.name}|${left.status}`
      const rightKey = `${right.email}|${right.service}|${right.processingLocation}|${right.name}|${right.status}`
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0
    })
}

function normalizeGovernanceRetention(retention: PilotImportRetentionInput): PilotImportRetentionInput {
  return {
    policy: retention.policy.trim(),
    rawPayloadExpiresAt: normalizeTimestamp(retention.rawPayloadExpiresAt, 'PILOT_IMPORT_RETENTION_INVALID: raw payload expiry is invalid'),
    canonicalDataExpiresAt: normalizeTimestamp(retention.canonicalDataExpiresAt, 'PILOT_IMPORT_RETENTION_INVALID: canonical expiry is invalid'),
    rollbackUntil: normalizeTimestamp(retention.rollbackUntil, 'PILOT_IMPORT_RETENTION_INVALID: rollback expiry is invalid'),
  }
}

function normalizeGovernanceInputValues(input: PilotImportGovernanceInput): PilotImportGovernanceInput {
  return {
    version: input.version,
    owner: normalizeGovernancePerson(input.owner),
    controller: normalizeGovernanceRole(input.controller),
    processor: normalizeGovernanceRole(input.processor),
    purpose: input.purpose.trim(),
    legalBasis: input.legalBasis,
    processingAgreement: {
      reference: input.processingAgreement.reference.trim(),
      version: input.processingAgreement.version.trim(),
      status: input.processingAgreement.status,
      confirmed: input.processingAgreement.confirmed,
    },
    subprocessors: normalizeGovernanceSubprocessors(input.subprocessors),
    location: {
      primary: input.location.primary.trim(),
      transfer: input.location.transfer,
    },
    encryption: {
      algorithm: input.encryption.algorithm,
      keyReference: input.encryption.keyReference.trim(),
      inTransit: input.encryption.inTransit,
      plaintextStored: input.encryption.plaintextStored,
    },
    retention: normalizeGovernanceRetention(input.retention),
    exit: {
      trigger: input.exit.trigger.trim(),
      dataDisposition: input.exit.dataDisposition,
      accessRevocation: input.exit.accessRevocation,
      evidence: input.exit.evidence,
    },
    incident: {
      contact: normalizeGovernancePerson(input.incident.contact),
      notification: input.incident.notification,
      response: input.incident.response,
    },
  }
}

function throwGovernanceSchemaError(issues: z.ZodIssue[], message: string): never {
  if (issues.some(issue => issue.message === 'synthetic_identity_required')) {
    throw new Error('PILOT_IMPORT_GOVERNANCE_SYNTHETIC_IDENTITY_REQUIRED: every governance identity must use a .invalid email')
  }
  throw new Error(message)
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
  if (rollbackExpiry <= rawExpiry || rollbackExpiry >= canonicalExpiry || rollbackExpiry <= now.getTime()) {
    throw new Error('PILOT_IMPORT_RETENTION_ROLLBACK_WINDOW_INVALID: rollback must follow raw expiry and end before canonical expiry')
  }
}

/** Rejects imports until a data treatment agreement is confirmed on file. */
export function assertPilotImportTreatmentAgreementConfirmed(
  agreement: PilotImportProcessingAgreementInput
): void {
  if (!agreement.confirmed) {
    throw new Error('PILOT_IMPORT_TREATMENT_AGREEMENT_REQUIRED: a confirmed treatment agreement is required')
  }
  if (agreement.status !== PILOT_TREATMENT_AGREEMENT_CONFIRMED) {
    throw new Error('PILOT_IMPORT_TREATMENT_AGREEMENT_STATUS_INVALID: confirmed agreement status is required')
  }
}

/** Requires the authenticated municipal secretary or designated operator to own the import. */
export function assertPilotImportOwnerMatchesActor(
  owner: PilotImportPerson,
  actor: { name: string; email: string | null; role: string; schoolId: string | null }
): PilotImportPerson {
  if (!['admin', 'secretario'].includes(actor.role) || actor.schoolId !== null || !actor.email) {
    throw new Error('PILOT_IMPORT_OWNER_DENIED: a municipal secretary or designated operator must authorize the import')
  }
  if (owner.email.trim().toLowerCase() !== actor.email.trim().toLowerCase()) {
    throw new Error('PILOT_IMPORT_OWNER_DENIED: the named owner must be the authenticated authorizer')
  }
  if (owner.name.trim() !== actor.name.trim()) {
    throw new Error('PILOT_IMPORT_OWNER_DENIED: the named owner must match the authenticated profile')
  }
  return { name: actor.name.trim(), email: actor.email.trim().toLowerCase() }
}

/** Validates the versioned technical governance fields before a synthetic CSV enters a proof database. */
export function validatePilotImportGovernanceInput(
  input: unknown,
  now: Date = new Date()
): PilotImportGovernanceInput {
  const parsed = governanceInputSchema.safeParse(input)
  if (!parsed.success) {
    throwGovernanceSchemaError(parsed.error.issues, 'PILOT_IMPORT_GOVERNANCE_INVALID: versioned governance fields are required')
  }
  const normalized = normalizeGovernanceInputValues(parsed.data)
  assertPilotImportTreatmentAgreementConfirmed(normalized.processingAgreement)
  assertRetentionWindow(normalized.retention, now)
  return normalized
}

/** Validates the complete versioned manifest while reusing the existing maker-checker approval shape. */
export function validateGovernedPilotImportManifest(
  input: unknown,
  now: Date = new Date()
): GovernedPilotImportManifest {
  const parsed = manifestSchema.safeParse(input)
  if (!parsed.success) {
    throwGovernanceSchemaError(parsed.error.issues, 'PILOT_IMPORT_GOVERNANCE_INVALID: complete versioned manifest is required')
  }
  const normalizedInput = normalizeGovernanceInputValues({
    version: parsed.data.version,
    owner: parsed.data.owner,
    controller: parsed.data.controller,
    processor: parsed.data.processor,
    purpose: parsed.data.purpose,
    legalBasis: parsed.data.legalBasis,
    processingAgreement: {
      reference: parsed.data.processingAgreement.reference,
      version: parsed.data.processingAgreement.version,
      status: parsed.data.processingAgreement.status,
      confirmed: parsed.data.processingAgreement.confirmed,
    },
    subprocessors: parsed.data.subprocessors,
    location: parsed.data.location,
    encryption: parsed.data.encryption,
    retention: parsed.data.retention,
    exit: parsed.data.exit,
    incident: parsed.data.incident,
  })
  const normalized: GovernedPilotImportManifest = {
    ...normalizedInput,
    processingAgreement: {
      ...normalizedInput.processingAgreement,
      recordedAt: normalizeTimestamp(parsed.data.processingAgreement.recordedAt, 'PILOT_IMPORT_GOVERNANCE_TIMESTAMP_INVALID: agreement time is invalid'),
      recordedBy: normalizeGovernancePerson(parsed.data.processingAgreement.recordedBy),
    },
    approval: {
      submittedBy: normalizeGovernancePerson(parsed.data.approval.submittedBy),
      approvedBy: normalizeGovernancePerson(parsed.data.approval.approvedBy),
      approvedAt: normalizeTimestamp(parsed.data.approval.approvedAt, 'PILOT_IMPORT_GOVERNANCE_TIMESTAMP_INVALID: approval time is invalid'),
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
  assertPilotImportTreatmentAgreementConfirmed(normalized.processingAgreement)
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

function canonicalizeGovernedPilotImportManifest(manifest: GovernedPilotImportManifest): GovernedPilotImportManifest {
  const normalizedInput = normalizeGovernanceInputValues({
    version: manifest.version,
    owner: manifest.owner,
    controller: manifest.controller,
    processor: manifest.processor,
    purpose: manifest.purpose,
    legalBasis: manifest.legalBasis,
    processingAgreement: {
      reference: manifest.processingAgreement.reference,
      version: manifest.processingAgreement.version,
      status: manifest.processingAgreement.status,
      confirmed: manifest.processingAgreement.confirmed,
    },
    subprocessors: manifest.subprocessors,
    location: manifest.location,
    encryption: manifest.encryption,
    retention: manifest.retention,
    exit: manifest.exit,
    incident: manifest.incident,
  })
  return {
    ...normalizedInput,
    processingAgreement: {
      ...normalizedInput.processingAgreement,
      recordedAt: new Date(manifest.processingAgreement.recordedAt).toISOString(),
      recordedBy: normalizeGovernancePerson(manifest.processingAgreement.recordedBy),
    },
    approval: {
      submittedBy: normalizeGovernancePerson(manifest.approval.submittedBy),
      approvedBy: normalizeGovernancePerson(manifest.approval.approvedBy),
      approvedAt: new Date(manifest.approval.approvedAt).toISOString(),
    },
  }
}

/** Fingerprints every normalized governance field so approval changes cannot hide. */
export function fingerprintPilotImportGovernance(manifest: GovernedPilotImportManifest): string {
  const canonicalManifest = canonicalizeGovernedPilotImportManifest(manifest)
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
    version: input.version,
    owner: input.owner,
    controller: input.controller,
    processor: input.processor,
    purpose: input.purpose,
    legalBasis: input.legalBasis,
    processingAgreement: { ...input.processingAgreement, recordedAt, recordedBy: submittedBy },
    approval: { submittedBy, approvedBy, approvedAt: recordedAt },
    subprocessors: input.subprocessors,
    location: input.location,
    encryption: input.encryption,
    retention: input.retention,
    exit: input.exit,
    incident: input.incident,
  }, now)
}
