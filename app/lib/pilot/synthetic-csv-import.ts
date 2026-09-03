import { createHash } from 'node:crypto'
import {
  createPilotDryRunValidationToken,
  decryptPilotImportPayload,
  encryptPilotImportPayload,
  verifyPilotDryRunValidationToken,
  type PilotEncryptedImportPayload,
} from './pilot-import-crypto'
import { PILOT_PROOF_SYNTHETIC_MARKER } from './pilot-safety-gate'

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

export type EncryptedStagingPayload = PilotEncryptedImportPayload

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

  if (quoted) throw new Error('CSV_INVALID_QUOTING: unclosed quoted field')
  record.push(field.trim())
  if (record.some(value => value !== '')) records.push(record)
  return records
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function validateSyntheticStudentRow(
  candidate: SyntheticStudentImportRow,
  headers: readonly string[],
  values: string[],
  seenSourceIds: Set<string>,
  row: number
): CsvValidationIssue[] {
  const issues: CsvValidationIssue[] = []
  const formulaField = headers.find((header, index) =>
    header !== 'guardian_phone' && /^[=+\-@]/.test(values[index])
  )
  if (formulaField) issues.push({ row, field: formulaField, code: 'spreadsheet_formula_rejected' })
  if (candidate.synthetic_marker !== SYNTHETIC_CSV_MARKER) issues.push({ row, field: 'synthetic_marker', code: 'real_data_rejected' })
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(candidate.source_id)) issues.push({ row, field: 'source_id', code: 'invalid' })
  if (seenSourceIds.has(candidate.source_id)) issues.push({ row, field: 'source_id', code: 'duplicate' })
  if (!candidate.school_code || !candidate.class_code) issues.push({ row, field: 'school_or_class_code', code: 'required' })
  if (candidate.student_name.length < 2 || candidate.student_name.length > 160) issues.push({ row, field: 'student_name', code: 'invalid_length' })
  if (!isValidDate(candidate.birth_date)) issues.push({ row, field: 'birth_date', code: 'invalid' })
  if (!['M', 'F'].includes(candidate.sex)) issues.push({ row, field: 'sex', code: 'invalid' })
  if (candidate.guardian_name.length < 2 || candidate.guardian_name.length > 160) issues.push({ row, field: 'guardian_name', code: 'invalid_length' })
  if (!/^\+?[0-9 ()-]{8,24}$/.test(candidate.guardian_phone)) issues.push({ row, field: 'guardian_phone', code: 'invalid' })
  if (candidate.guardian_relationship.length < 2 || candidate.guardian_relationship.length > 40) issues.push({ row, field: 'guardian_relationship', code: 'invalid_length' })
  return issues
}

/** Parses only the synthetic, low-risk student import allowlist. */
export function validateSyntheticStudentCsv(csv: string): {
  rows: SyntheticStudentImportRow[]
  report: SyntheticCsvValidationReport
} {
  const contentSha256 = createHash('sha256').update(csv, 'utf8').digest('hex')
  let records: string[][]
  try {
    records = parseCsvRecords(csv)
  } catch {
    return {
      rows: [],
      report: { valid: false, totalRows: 0, validRows: 0, contentSha256, schoolCodes: [], issues: [{ row: 1, field: 'csv', code: 'invalid_quoting' }] },
    }
  }

  const issues: CsvValidationIssue[] = []
  const headers = records[0] ?? []
  if (headers.length !== SYNTHETIC_STUDENT_CSV_HEADERS.length || headers.some((header, index) => header !== SYNTHETIC_STUDENT_CSV_HEADERS[index])) {
    issues.push({ row: 1, field: 'headers', code: 'allowlist_mismatch' })
    return { rows: [], report: { valid: false, totalRows: Math.max(0, records.length - 1), validRows: 0, contentSha256, schoolCodes: [], issues } }
  }

  const rows: SyntheticStudentImportRow[] = []
  const seenSourceIds = new Set<string>()
  for (let index = 1; index < records.length; index += 1) {
    const values = records[index]
    const rowNumber = index + 1
    if (values.length !== headers.length) {
      issues.push({ row: rowNumber, field: 'row', code: 'column_count_mismatch' })
      continue
    }
    const candidate = Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex]])) as unknown as SyntheticStudentImportRow
    const rowIssues = validateSyntheticStudentRow(candidate, headers, values, seenSourceIds, rowNumber)
    issues.push(...rowIssues)
    if (rowIssues.length === 0) {
      rows.push(candidate)
      seenSourceIds.add(candidate.source_id)
    }
  }

  const schoolCodes = [...new Set(rows.map(row => row.school_code))].sort()
  if (schoolCodes.length > 1) issues.push({ row: 1, field: 'school_code', code: 'one_school_per_batch_required' })
  return {
    rows,
    report: {
      valid: issues.length === 0 && rows.length > 0,
      totalRows: Math.max(0, records.length - 1),
      validRows: rows.length,
      contentSha256,
      schoolCodes,
      issues,
    },
  }
}

/** Encrypts the legacy synthetic CSV contract before database staging. */
export const encryptSyntheticCsvForStaging = encryptPilotImportPayload

/** Decrypts the legacy synthetic staging payload only on the server. */
export const decryptSyntheticCsvFromStaging = decryptPilotImportPayload

/** Binds the legacy synthetic staging path to a successful dry run. */
export const createDryRunValidationToken = createPilotDryRunValidationToken

/** Verifies the legacy synthetic dry-run token with a constant-time comparison. */
export const verifyDryRunValidationToken = verifyPilotDryRunValidationToken
