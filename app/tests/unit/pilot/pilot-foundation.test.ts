// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  SYNTHETIC_CSV_MARKER,
  SYNTHETIC_STUDENT_CSV_HEADERS,
  createDryRunValidationToken,
  decryptSyntheticCsvFromStaging,
  encryptSyntheticCsvForStaging,
  validateSyntheticStudentCsv,
  verifyDryRunValidationToken,
} from '@/lib/pilot/synthetic-csv-import'
import { assertSyntheticPilotSafety } from '@/lib/pilot/pilot-safety-gate'
import { isPilotDisabledPath } from '@/lib/pilot/pilot-scope'

const csv = [
  SYNTHETIC_STUDENT_CSV_HEADERS.join(','),
  `${SYNTHETIC_CSV_MARKER},student-1,SYN-A,CLASS-A,Aluno Sintetico,2018-04-12,M,Responsavel Sintetico,(11) 99999-0000,mae`,
].join('\n')
const key = Buffer.alloc(32, 7).toString('base64')

describe('synthetic pilot foundation', () => {
  it('accepts only the minimal synthetic CSV allowlist', () => {
    const result = validateSyntheticStudentCsv(csv)
    expect(result.report).toMatchObject({ valid: true, totalRows: 1, validRows: 1, schoolCodes: ['SYN-A'] })
    expect(result.rows[0].student_name).toBe('Aluno Sintetico')
  })

  it('hard-fails real data markers and extra columns', () => {
    expect(validateSyntheticStudentCsv(csv.replace(SYNTHETIC_CSV_MARKER, 'REAL')).report.issues).toContainEqual(
      expect.objectContaining({ code: 'real_data_rejected' })
    )
    expect(validateSyntheticStudentCsv(csv.replace('guardian_relationship', 'cpf,guardian_relationship')).report.issues).toContainEqual(
      expect.objectContaining({ code: 'allowlist_mismatch' })
    )
    expect(validateSyntheticStudentCsv(csv.replace('Aluno Sintetico', '=HYPERLINK("https://invalid")')).report.issues).toContainEqual(
      expect.objectContaining({ code: 'spreadsheet_formula_rejected' })
    )
  })

  it('encrypts staging and verifies the dry-run binding', () => {
    const encrypted = encryptSyntheticCsvForStaging(csv, key, 'synthetic-key-v1')
    expect(encrypted.ciphertext).not.toContain('Aluno Sintetico')
    expect(decryptSyntheticCsvFromStaging(encrypted, key)).toBe(csv)
    const token = createDryRunValidationToken(validateSyntheticStudentCsv(csv).report.contentSha256, key)
    expect(verifyDryRunValidationToken(validateSyntheticStudentCsv(csv).report.contentSha256, token, key)).toBe(true)
  })

  it('rejects external Supabase, deploy, and legal approval claims', () => {
    const safe = { pilotMode: 'true', syntheticOnly: 'true', externalDeployApproved: 'false', legalApprovalStatus: 'not_approved', supabaseUrl: 'http://127.0.0.1:54321' }
    expect(() => assertSyntheticPilotSafety('seed', safe)).not.toThrow()
    expect(() => assertSyntheticPilotSafety('deploy', safe)).toThrow(/external deployment/)
    expect(() => assertSyntheticPilotSafety('seed', { ...safe, supabaseUrl: 'https://example.supabase.co' })).toThrow(/only local/)
    expect(() => assertSyntheticPilotSafety('seed', { ...safe, legalApprovalStatus: 'approved' })).toThrow(/legal approval/)
  })

  it('blocks notes, diary, Educacenso, and high-risk report routes', () => {
    expect(isPilotDisabledPath('/dashboard/notas')).toBe(true)
    expect(isPilotDisabledPath('/dashboard/diario')).toBe(true)
    expect(isPilotDisabledPath('/diario')).toBe(true)
    expect(isPilotDisabledPath('/dashboard/alunos/student-id/diario')).toBe(true)
    expect(isPilotDisabledPath('/api/educacenso/export')).toBe(true)
    expect(isPilotDisabledPath('/relatorios/bolsa-familia')).toBe(true)
    expect(isPilotDisabledPath('/diario/frequencia')).toBe(false)
  })
})
