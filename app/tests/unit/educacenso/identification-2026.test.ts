import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  EDUCACENSO_IDENTIFICATION_LAYOUT_2026,
  EDUCACENSO_SOURCE_2026,
  exportIdentificationFile2026,
  isPersonInepId2026,
  isSchoolInepCode2026,
  serializeIdentificationCandidate2026,
  validateIdentificationCandidate2026,
  type IdentificationReferenceData2026,
} from '@/lib/educacenso/2026'
import { validateINEP } from '@/lib/validation/brazilian-educational'
import { studentRegistrationSchema } from '@/lib/validation/students-validation'

const fixtureDirectory = resolve(process.cwd(), 'tests/fixtures/educacenso/2026')

const candidates = JSON.parse(
  readFileSync(`${fixtureDirectory}/identification-candidates.synthetic.json`, 'utf8')
) as unknown[]

const municipalityFixture = JSON.parse(
  readFileSync(`${fixtureDirectory}/municipality-codes.synthetic-subset.json`, 'utf8')
) as {
  sourceArtifactSha256: IdentificationReferenceData2026['municipalityTableSha256']
  coverage: IdentificationReferenceData2026['coverage']
  codes: Array<{ code: string }>
}

const referenceData = {
  municipalityCodes: municipalityFixture.codes.map(({ code }) => code),
  municipalityTableSha256: municipalityFixture.sourceArtifactSha256,
  coverage: municipalityFixture.coverage,
} satisfies IdentificationReferenceData2026

describe('Educacenso 2026 identification file', () => {
  it('matches the synthetic golden bytes with nine fields and explicit LF framing', () => {
    const result = exportIdentificationFile2026(
      {
        fileName: 'identifica_2026.txt',
        records: candidates,
        lineEnding: 'LF',
        endWithLineBreak: true,
      },
      referenceData
    )
    const golden = readFileSync(`${fixtureDirectory}/identification.synthetic.txt`)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.artifact.text).toBe(golden.toString('latin1'))
    expect(result.artifact.bytes).toEqual(Uint8Array.from(golden))
    expect(result.artifact.encoding).toBe('ISO-8859-1')
    expect(result.artifact.layout).toBe('IDENTIFICATION_2026_V1')
    expect(result.artifact.referenceDataCoverage).toBe('synthetic-fixture-subset')

    const lines = result.artifact.text.trimEnd().split('\n')
    expect(lines).toHaveLength(2)
    for (const line of lines) {
      expect(line.split('|')).toHaveLength(9)
      expect(line.endsWith('|')).toBe(true)
    }
  })

  it('keeps optional and return-only fields empty without adding padding', () => {
    const result = serializeIdentificationCandidate2026(candidates[0], referenceData)

    expect(result).toEqual({
      ok: true,
      line: 'EDUCA0001|||PESSOA SINTETICA UM|01/01/2015|||5300108|',
    })
  })

  it('uses the explicitly selected CRLF framing without inventing a final break', () => {
    const result = exportIdentificationFile2026(
      {
        fileName: 'identifica_2026.txt',
        records: candidates,
        lineEnding: 'CRLF',
        endWithLineBreak: false,
      },
      referenceData
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.artifact.text.split('\r\n')).toHaveLength(2)
    expect(result.artifact.text.endsWith('\r\n')).toBe(false)
  })

  it('returns deterministic field issues and never normalizes invalid input', () => {
    const invalid = {
      localStudentCode: 'educa-identificador-longo',
      cpf: '123',
      birthCertificateNumber: '12345678901234567890123456789012',
      inepUniqueId: '123456789012',
      fullName: 'Pessoa Ácentuada',
      birthDate: '29/02/2015',
      affiliation1: 123,
      birthMunicipalityCode: '0000000',
      unknown: true,
    }

    const first = validateIdentificationCandidate2026(invalid, referenceData, 4)
    const second = validateIdentificationCandidate2026(invalid, referenceData, 4)

    expect(first).toEqual(second)
    expect(first.map(({ recordIndex }) => recordIndex)).toEqual(
      Array.from({ length: first.length }, () => 4)
    )
    expect(first.map(({ field }) => field)).toEqual([
      3,
      9,
      'record',
      1,
      1,
      2,
      4,
      5,
      6,
      8,
    ])
  })

  it('rejects unsupported framing, empty exports, and unpinned reference data', () => {
    const result = exportIdentificationFile2026(
      {
        fileName: '../invalido com espaco.txt',
        records: [],
        lineEnding: 'platform-default',
        endWithLineBreak: 'yes',
        upload: true,
      },
      {
        municipalityCodes: ['5300108'],
        municipalityTableSha256: 'wrong',
        coverage: 'synthetic-fixture-subset',
      } as unknown as IdentificationReferenceData2026
    )

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.issues.map(({ field }) => field)).toEqual([
      'file',
      'file',
      'file',
      'file',
      'file',
      'file',
    ])
    expect(result.issues.map(({ message }) => message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('hash congelado'),
        expect.stringContaining('não suportada: upload'),
        expect.stringContaining('no máximo 20 caracteres'),
        expect.stringContaining('LF ou CRLF'),
        expect.stringContaining('não gera um arquivo de identificação vazio'),
      ])
    )
  })

  it('does not let a fixture subset claim complete municipality coverage', () => {
    const result = exportIdentificationFile2026(
      {
        fileName: 'identifica_2026.txt',
        records: candidates,
        lineEnding: 'CRLF',
        endWithLineBreak: false,
      },
      {
        ...referenceData,
        coverage: 'complete-official-table',
      }
    )

    expect(result).toEqual({
      ok: false,
      issues: [
        expect.objectContaining({
          field: 'file',
          message: expect.stringContaining('5.571 códigos'),
        }),
      ],
    })
  })

  it('freezes source provenance and keeps school/person identifiers distinct', () => {
    expect(EDUCACENSO_SOURCE_2026.identificationLayout.version).toBe(1)
    expect(EDUCACENSO_SOURCE_2026.auxiliaryTables.municipalityTableSha256).toBe(
      municipalityFixture.sourceArtifactSha256
    )
    expect(EDUCACENSO_IDENTIFICATION_LAYOUT_2026.fieldCount).toBe(9)

    expect(isSchoolInepCode2026('12345678')).toBe(true)
    expect(isSchoolInepCode2026('123456789012')).toBe(false)
    expect(isPersonInepId2026('123456789012')).toBe(true)
    expect(isPersonInepId2026('12345678')).toBe(false)

    // Caller audit: preserve the legacy form helper's two existing categories;
    // strict file serialization uses the category-specific functions above.
    expect(validateINEP('12.345.678')).toBe(true)
    expect(validateINEP('123456789012')).toBe(true)
    expect(validateINEP('12345678901')).toBe(false)
  })

  it('reconciles the student form field to the official 12-digit person identifier', () => {
    const schema = studentRegistrationSchema.shape.codigo_inep_estudante

    expect(schema.safeParse('123456789012').success).toBe(true)
    expect(schema.safeParse('12345678901').success).toBe(false)
  })
})
