import { createHash } from 'node:crypto'
import { z } from 'zod'
import {
  createPilotDryRunValidationToken,
  decryptPilotImportPayload,
  encryptPilotImportPayload,
  verifyPilotDryRunValidationToken,
  type PilotEncryptedImportPayload,
} from './pilot-import-crypto'
import { PILOT_PROOF_SYNTHETIC_MARKER } from './pilot-safety-gate'
import { parseCsvRecords } from './csv-record-parser'

/** CSV marker shared by the synthetic pilot proof and its safety gate. */
export const SYNTHETIC_CSV_MARKER = PILOT_PROOF_SYNTHETIC_MARKER
export const SYNTHETIC_STUDENT_CSV_HEADERS = [
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

export interface SyntheticStudentImportRow {
  synthetic_marker: typeof SYNTHETIC_CSV_MARKER
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

export interface CsvValidationIssue {
  row: number
  field: string
  code: string
}

export interface SyntheticCsvValidationReport {
  valid: boolean
  totalRows: number
  validRows: number
  contentSha256: string
  schoolCodes: string[]
  issues: CsvValidationIssue[]
}

export interface SyntheticCsvValidationResult {
  rows: SyntheticStudentImportRow[]
  report: SyntheticCsvValidationReport
}

interface SyntheticCsvRowCollection {
  rows: SyntheticStudentImportRow[]
  issues: CsvValidationIssue[]
}

export type EncryptedStagingPayload = PilotEncryptedImportPayload

const syntheticStudentImportCandidateSchema = z.object({
  synthetic_marker: z.string(),
  source_id: z.string(),
  school_code: z.string(),
  class_code: z.string(),
  student_name: z.string(),
  birth_date: z.string(),
  sex: z.string(),
  guardian_name: z.string(),
  guardian_phone: z.string(),
  guardian_relationship: z.string(),
}).strict()

const syntheticStudentImportRowSchema = syntheticStudentImportCandidateSchema.extend({
  synthetic_marker: z.literal(SYNTHETIC_CSV_MARKER),
  sex: z.enum(['M', 'F']),
})

type SyntheticStudentImportCandidate = z.infer<typeof syntheticStudentImportCandidateSchema>

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function validationIssue(row: number, field: string, code: string): CsvValidationIssue {
  return { row, field, code }
}

function validateSyntheticFormula(
  headers: readonly string[],
  values: string[],
  row: number
): CsvValidationIssue[] {
  const field = headers.find((header, index) =>
    header !== 'guardian_phone' && /^[=+\-@]/.test(values[index])
  )
  return field ? [validationIssue(row, field, 'spreadsheet_formula_rejected')] : []
}

function validateSyntheticCandidateFields(
  candidate: SyntheticStudentImportCandidate,
  seenSourceIds: Set<string>,
  row: number
): CsvValidationIssue[] {
  const rules = [
    ['synthetic_marker', 'real_data_rejected', candidate.synthetic_marker !== SYNTHETIC_CSV_MARKER],
    ['source_id', 'invalid', !/^[A-Za-z0-9_-]{1,64}$/.test(candidate.source_id)],
    ['source_id', 'duplicate', seenSourceIds.has(candidate.source_id)],
    ['school_or_class_code', 'required', !candidate.school_code || !candidate.class_code],
    ['student_name', 'invalid_length', candidate.student_name.length < 2 || candidate.student_name.length > 160],
    ['birth_date', 'invalid', !isValidDate(candidate.birth_date)],
    ['sex', 'invalid', !['M', 'F'].includes(candidate.sex)],
    ['guardian_name', 'invalid_length', candidate.guardian_name.length < 2 || candidate.guardian_name.length > 160],
    ['guardian_phone', 'invalid', !/^\+?[0-9 ()-]{8,24}$/.test(candidate.guardian_phone)],
    ['guardian_relationship', 'invalid_length', candidate.guardian_relationship.length < 2 || candidate.guardian_relationship.length > 40],
  ] as const
  return rules.flatMap(([field, code, invalid]) => invalid ? [validationIssue(row, field, code)] : [])
}

function validateSyntheticStudentRow(
  candidate: SyntheticStudentImportCandidate,
  headers: readonly string[],
  values: string[],
  seenSourceIds: Set<string>,
  row: number
): CsvValidationIssue[] {
  return [
    ...validateSyntheticFormula(headers, values, row),
    ...validateSyntheticCandidateFields(candidate, seenSourceIds, row),
  ]
}

function createSyntheticCsvResult(
  rows: SyntheticStudentImportRow[],
  totalRows: number,
  contentSha256: string,
  schoolCodes: string[],
  issues: CsvValidationIssue[]
): SyntheticCsvValidationResult {
  return {
    rows,
    report: {
      valid: issues.length === 0 && rows.length > 0,
      totalRows,
      validRows: rows.length,
      contentSha256,
      schoolCodes,
      issues,
    },
  }
}

function hasSyntheticCsvHeaders(headers: string[]): boolean {
  return headers.length === SYNTHETIC_STUDENT_CSV_HEADERS.length && headers.every((header, index) =>
    header === SYNTHETIC_STUDENT_CSV_HEADERS[index]
  )
}

function collectSyntheticCsvRows(
  records: string[][],
  headers: string[]
): SyntheticCsvRowCollection {
  const rows: SyntheticStudentImportRow[] = []
  const issues: CsvValidationIssue[] = []
  const seenSourceIds = new Set<string>()
  for (let index = 1; index < records.length; index += 1) {
    const values = records[index]
    const row = index + 1
    if (values.length !== headers.length) {
      issues.push(validationIssue(row, 'row', 'column_count_mismatch'))
      continue
    }
    const candidate = syntheticStudentImportCandidateSchema.parse(
      Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex]]))
    )
    const rowIssues = validateSyntheticStudentRow(candidate, headers, values, seenSourceIds, row)
    issues.push(...rowIssues)
    if (rowIssues.length === 0) {
      rows.push(syntheticStudentImportRowSchema.parse(candidate))
      seenSourceIds.add(candidate.source_id)
    }
  }
  return { rows, issues }
}

/** Parses only the synthetic, low-risk student import allowlist. */
export function validateSyntheticStudentCsv(csv: string): SyntheticCsvValidationResult {
  const contentSha256 = createHash('sha256').update(csv, 'utf8').digest('hex')
  let records: string[][]
  try {
    records = parseCsvRecords(csv, 'CSV_INVALID_QUOTING: unclosed quoted field')
  } catch {
    return createSyntheticCsvResult([], 0, contentSha256, [], [validationIssue(1, 'csv', 'invalid_quoting')])
  }

  const headers = records[0] ?? []
  const totalRows = Math.max(0, records.length - 1)
  if (!hasSyntheticCsvHeaders(headers)) {
    return createSyntheticCsvResult([], totalRows, contentSha256, [], [validationIssue(1, 'headers', 'allowlist_mismatch')])
  }

  const { rows, issues } = collectSyntheticCsvRows(records, headers)

  const schoolCodes = [...new Set(rows.map(row => row.school_code))].sort()
  if (schoolCodes.length > 1) issues.push({ row: 1, field: 'school_code', code: 'one_school_per_batch_required' })
  return createSyntheticCsvResult(rows, totalRows, contentSha256, schoolCodes, issues)
}

/** Encrypts the legacy synthetic CSV contract before database staging. */
export const encryptSyntheticCsvForStaging = encryptPilotImportPayload

/** Decrypts the legacy synthetic staging payload only on the server. */
export const decryptSyntheticCsvFromStaging = decryptPilotImportPayload

/** Binds the legacy synthetic staging path to a successful dry run. */
export const createDryRunValidationToken = createPilotDryRunValidationToken

/** Verifies the legacy synthetic dry-run token with a constant-time comparison. */
export const verifyDryRunValidationToken = verifyPilotDryRunValidationToken
