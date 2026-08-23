export const EDUCACENSO_IDENTIFICATION_LAYOUT_2026 = Object.freeze({
  year: 2026,
  version: 1,
  fieldCount: 9,
  encoding: 'ISO-8859-1',
  maximumFileBytes: 20_000_000,
} as const)

export type IdentificationLineEnding2026 = 'LF' | 'CRLF'

/**
 * Explicit reference data supplied by a caller or a synthetic test fixture.
 * The complete 5,571-code table is deliberately not bundled into runtime code.
 */
export interface IdentificationReferenceData2026 {
  readonly municipalityCodes: readonly string[]
  readonly municipalityTableSha256:
    | 'cea115117f79a697f3402eb67133976788544399b15c9789bcd9fe2ad08d80a3'
  readonly coverage: 'complete-official-table' | 'synthetic-fixture-subset'
}

/**
 * Supported outbound fields from the official Identification Layout v1.
 *
 * Fields 3 (birth certificate) and 9 (Inep identifier returned by the
 * service) intentionally are not accepted. Field 3 has an official validity
 * rule but no validation algorithm in the retrieved artifacts; field 9 must
 * be empty in an outbound file.
 */
export interface IdentificationCandidate2026 {
  readonly localStudentCode: string
  readonly cpf?: string
  readonly fullName: string
  readonly birthDate: string
  readonly affiliation1?: string
  readonly affiliation2?: string
  readonly birthMunicipalityCode: string
}

export interface IdentificationFileRequest2026 {
  readonly fileName: string
  readonly records: readonly IdentificationCandidate2026[]
  /** The official artifacts require lines but do not prescribe LF vs CRLF. */
  readonly lineEnding: IdentificationLineEnding2026
  /** The official artifacts do not prescribe a final line break. */
  readonly endWithLineBreak: boolean
}

export type IdentificationField2026 = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface IdentificationValidationIssue2026 {
  /** Zero-based index; absent for a file-level issue. */
  readonly recordIndex?: number
  readonly field: IdentificationField2026 | 'file' | 'record'
  /** Stable pointer to an official rule or to an explicit EDUCA boundary. */
  readonly source: string
  readonly message: string
}

export type IdentificationLineResult2026 =
  | {
      readonly ok: true
      readonly line: string
    }
  | {
      readonly ok: false
      readonly issues: readonly IdentificationValidationIssue2026[]
    }

export type IdentificationFileResult2026 =
  | {
      readonly ok: true
      readonly artifact: {
        readonly fileName: string
        readonly text: string
        readonly bytes: Uint8Array
        readonly encoding: 'ISO-8859-1'
        readonly layout: 'IDENTIFICATION_2026_V1'
        readonly referenceDataCoverage:
          | 'complete-official-table'
          | 'synthetic-fixture-subset'
      }
    }
  | {
      readonly ok: false
      readonly issues: readonly IdentificationValidationIssue2026[]
    }

const OFFICIAL_LAYOUT = 'Layout de Identificação 2026 v1'
const OFFICIAL_INSTRUCTIONS = 'Instruções de Migração 2026, p. 7'
const EDUCA_BOUNDARY = 'EDUCA issue #19 safety boundary'

const CANDIDATE_KEYS = new Set([
  'localStudentCode',
  'cpf',
  'fullName',
  'birthDate',
  'affiliation1',
  'affiliation2',
  'birthMunicipalityCode',
])

const REQUEST_KEYS = new Set([
  'fileName',
  'records',
  'lineEnding',
  'endWithLineBreak',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateReferenceData(
  referenceData: IdentificationReferenceData2026
): readonly IdentificationValidationIssue2026[] {
  const expectedSha256 =
    'cea115117f79a697f3402eb67133976788544399b15c9789bcd9fe2ad08d80a3'
  const validCoverage =
    referenceData?.coverage === 'complete-official-table' ||
    referenceData?.coverage === 'synthetic-fixture-subset'
  const codes = referenceData?.municipalityCodes

  if (
    referenceData?.municipalityTableSha256 !== expectedSha256 ||
    !validCoverage ||
    !Array.isArray(codes) ||
    codes.length === 0 ||
    codes.some((code) => typeof code !== 'string' || !/^\d{7}$/.test(code))
  ) {
    return [
      issue(
        'file',
        EDUCA_BOUNDARY,
        'Os códigos de município devem vir de referência explícita vinculada ao hash congelado da Tabela de Municípios 2026.'
      ),
    ]
  }

  if (new Set(codes).size !== codes.length) {
    return [
      issue(
        'file',
        EDUCA_BOUNDARY,
        'A referência de municípios não pode conter códigos duplicados.'
      ),
    ]
  }

  if (referenceData.coverage === 'complete-official-table' && codes.length !== 5_571) {
    return [
      issue(
        'file',
        EDUCA_BOUNDARY,
        'A cobertura completa declarada deve conter os 5.571 códigos observados na Tabela de Municípios 2026.'
      ),
    ]
  }

  return []
}

function issue(
  field: IdentificationValidationIssue2026['field'],
  source: string,
  message: string,
  recordIndex?: number
): IdentificationValidationIssue2026 {
  return recordIndex === undefined
    ? { field, source, message }
    : { recordIndex, field, source, message }
}

function requiredString(
  candidate: Record<string, unknown>,
  key: keyof IdentificationCandidate2026,
  field: IdentificationField2026,
  source: string,
  message: string,
  issues: IdentificationValidationIssue2026[],
  recordIndex: number
): string | undefined {
  const value = candidate[key]
  if (typeof value !== 'string' || value.length === 0) {
    issues.push(issue(field, source, message, recordIndex))
    return undefined
  }
  return value
}

function optionalString(
  candidate: Record<string, unknown>,
  key: keyof IdentificationCandidate2026,
  field: IdentificationField2026,
  issues: IdentificationValidationIssue2026[],
  recordIndex: number
): string | undefined {
  const value = candidate[key]
  if (value === undefined || value === '') return undefined
  if (typeof value !== 'string') {
    issues.push(
      issue(
        field,
        EDUCA_BOUNDARY,
        `O campo ${String(key)} deve ser uma string; valores não são convertidos implicitamente.`,
        recordIndex
      )
    )
    return undefined
  }
  return value
}

function isValidDate(value: string): boolean {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return false

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (year === 0 || month < 1 || month > 12 || day < 1) return false

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day <= daysInMonth[month - 1]
}

function validatePersonName(
  value: string,
  field: 4 | 6 | 7,
  issues: IdentificationValidationIssue2026[],
  recordIndex: number
): void {
  if (value.length > 100) {
    issues.push(
      issue(
        field,
        `${OFFICIAL_LAYOUT}, Campos, campo ${field}, regra de tamanho`,
        `O campo ${field} não pode ter mais de 100 caracteres.`,
        recordIndex
      )
    )
  }

  if (!/^[A-Z ]+$/.test(value) || !/[A-Z]/.test(value)) {
    issues.push(
      issue(
        field,
        `${OFFICIAL_LAYOUT}, Campos, campo ${field}, regra de caracteres`,
        `O campo ${field} aceita somente letras de A a Z e espaço.`,
        recordIndex
      )
    )
  }
}

function candidateToFields(candidate: IdentificationCandidate2026): readonly string[] {
  return [
    candidate.localStudentCode,
    candidate.cpf ?? '',
    '',
    candidate.fullName,
    candidate.birthDate,
    candidate.affiliation1 ?? '',
    candidate.affiliation2 ?? '',
    candidate.birthMunicipalityCode,
    '',
  ]
}

/**
 * Validates one logical outbound line without normalizing or coercing input.
 */
export function validateIdentificationCandidate2026(
  input: unknown,
  referenceData: IdentificationReferenceData2026,
  recordIndex = 0
): readonly IdentificationValidationIssue2026[] {
  const issues: IdentificationValidationIssue2026[] = [...validateReferenceData(referenceData)]
  if (issues.length > 0) return issues
  if (!isRecord(input)) {
    return [
      issue(
        'record',
        EDUCA_BOUNDARY,
        'Cada registro deve ser um objeto de candidato à identificação.',
        recordIndex
      ),
    ]
  }

  for (const key of Object.keys(input).filter((key) => !CANDIDATE_KEYS.has(key)).sort()) {
    const field = key === 'birthCertificateNumber' ? 3 : key === 'inepUniqueId' ? 9 : 'record'
    const message =
      field === 3
        ? 'O campo 3 não é suportado: a fonte recuperada exige uma matrícula válida, mas não fornece o algoritmo de validação.'
        : field === 9
          ? 'O campo 9 deve permanecer vazio em arquivos enviados; ele é reservado ao retorno do Inep.'
          : `Campo de entrada não suportado: ${key}.`
    issues.push(issue(field, EDUCA_BOUNDARY, message, recordIndex))
  }

  const localStudentCode = requiredString(
    input,
    'localStudentCode',
    1,
    `${OFFICIAL_LAYOUT}, Campos, campo 1, regra 1`,
    'O campo 1 (código do aluno na entidade/escola) deve ser preenchido.',
    issues,
    recordIndex
  )
  if (localStudentCode !== undefined) {
    if (localStudentCode.length > 20) {
      issues.push(
        issue(
          1,
          `${OFFICIAL_LAYOUT}, Campos, campo 1, regra 2`,
          'O campo 1 não pode ter mais de 20 caracteres.',
          recordIndex
        )
      )
    }
    if (!/^[A-Z0-9]+$/.test(localStudentCode)) {
      issues.push(
        issue(
          1,
          `${OFFICIAL_LAYOUT}, Campos, campo 1, formato alfanumérico; Regras Gerais, regra 3`,
          'O campo 1 deve ser alfanumérico, sem letras minúsculas ou caracteres acentuados.',
          recordIndex
        )
      )
    }
  }

  const cpf = optionalString(input, 'cpf', 2, issues, recordIndex)
  if (cpf !== undefined && !/^\d{11}$/.test(cpf)) {
    issues.push(
      issue(
        2,
        `${OFFICIAL_LAYOUT}, Campos, campo 2, regras 1 e 2`,
        'Quando preenchido, o campo 2 deve ter exatamente 11 caracteres numéricos.',
        recordIndex
      )
    )
  }

  const fullName = requiredString(
    input,
    'fullName',
    4,
    `${OFFICIAL_LAYOUT}, Campos, campo 4, regra 1`,
    'O campo 4 (nome completo) deve ser preenchido.',
    issues,
    recordIndex
  )
  if (fullName !== undefined) validatePersonName(fullName, 4, issues, recordIndex)

  const birthDate = requiredString(
    input,
    'birthDate',
    5,
    `${OFFICIAL_LAYOUT}, Campos, campo 5, regra 1`,
    'O campo 5 (data de nascimento) deve ser preenchido.',
    issues,
    recordIndex
  )
  if (birthDate !== undefined && !isValidDate(birthDate)) {
    issues.push(
      issue(
        5,
        `${OFFICIAL_LAYOUT}, Campos, campo 5, regras 2 e 3`,
        'O campo 5 deve ser uma data válida no formato DD/MM/YYYY.',
        recordIndex
      )
    )
  }

  const affiliation1 = optionalString(input, 'affiliation1', 6, issues, recordIndex)
  if (affiliation1 !== undefined) validatePersonName(affiliation1, 6, issues, recordIndex)

  const affiliation2 = optionalString(input, 'affiliation2', 7, issues, recordIndex)
  if (affiliation2 !== undefined) validatePersonName(affiliation2, 7, issues, recordIndex)

  const birthMunicipalityCode = requiredString(
    input,
    'birthMunicipalityCode',
    8,
    `${OFFICIAL_LAYOUT}, Campos, campo 8, regra 1`,
    'O campo 8 (município de nascimento) deve ser preenchido.',
    issues,
    recordIndex
  )
  if (
    birthMunicipalityCode !== undefined &&
    (!/^\d{7}$/.test(birthMunicipalityCode) ||
      !referenceData.municipalityCodes.includes(birthMunicipalityCode))
  ) {
    issues.push(
      issue(
        8,
        `${OFFICIAL_LAYOUT}, Campos, campo 8, regra 2; Tabela de Municípios 2026`,
        'O campo 8 deve ser um código presente na Tabela de Municípios 2026.',
        recordIndex
      )
    )
  }

  return issues
}

/** Serializes one valid candidate as the nine pipe-separated official fields. */
export function serializeIdentificationCandidate2026(
  input: unknown,
  referenceData: IdentificationReferenceData2026
): IdentificationLineResult2026 {
  const issues = validateIdentificationCandidate2026(input, referenceData)
  if (issues.length > 0) return { ok: false, issues }

  return {
    ok: true,
    line: candidateToFields(input as IdentificationCandidate2026).join('|'),
  }
}

function encodeIso88591(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length)
  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index)
  }
  return bytes
}

/**
 * Produces an offline artifact only. This function does not transmit, persist,
 * log, or claim that Educacenso accepted the resulting bytes.
 */
export function exportIdentificationFile2026(
  input: unknown,
  referenceData: IdentificationReferenceData2026
): IdentificationFileResult2026 {
  const referenceIssues = validateReferenceData(referenceData)
  const issues: IdentificationValidationIssue2026[] = [...referenceIssues]
  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [issue('file', EDUCA_BOUNDARY, 'A solicitação de arquivo deve ser um objeto.')],
    }
  }

  for (const key of Object.keys(input).filter((key) => !REQUEST_KEYS.has(key)).sort()) {
    issues.push(issue('file', EDUCA_BOUNDARY, `Opção de arquivo não suportada: ${key}.`))
  }

  const fileName = input.fileName
  if (
    typeof fileName !== 'string' ||
    fileName.length > 20 ||
    !/^[A-Za-z0-9_]+\.txt$/.test(fileName)
  ) {
    issues.push(
      issue(
        'file',
        OFFICIAL_INSTRUCTIONS,
        'O nome deve ter no máximo 20 caracteres, usar somente letras não acentuadas, números ou underscore, não conter espaços e terminar em .txt.'
      )
    )
  }

  const lineEnding = input.lineEnding
  if (lineEnding !== 'LF' && lineEnding !== 'CRLF') {
    issues.push(
      issue(
        'file',
        EDUCA_BOUNDARY,
        'lineEnding deve ser informado explicitamente como LF ou CRLF; a fonte oficial não escolhe entre eles.'
      )
    )
  }

  if (typeof input.endWithLineBreak !== 'boolean') {
    issues.push(
      issue(
        'file',
        EDUCA_BOUNDARY,
        'endWithLineBreak deve ser booleano; a fonte oficial não prescreve a quebra final.'
      )
    )
  }

  if (!Array.isArray(input.records) || input.records.length === 0) {
    issues.push(
      issue(
        'file',
        EDUCA_BOUNDARY,
        'O EDUCA não gera um arquivo de identificação vazio.'
      )
    )
  } else if (referenceIssues.length === 0) {
    input.records.forEach((candidate, recordIndex) => {
      issues.push(...validateIdentificationCandidate2026(candidate, referenceData, recordIndex))
    })
  }

  if (issues.length > 0) return { ok: false, issues }

  const request = input as unknown as IdentificationFileRequest2026
  const separator = request.lineEnding === 'CRLF' ? '\r\n' : '\n'
  const lines = request.records.map((candidate) => candidateToFields(candidate).join('|'))
  const text = `${lines.join(separator)}${request.endWithLineBreak ? separator : ''}`
  const bytes = encodeIso88591(text)

  if (bytes.byteLength > EDUCACENSO_IDENTIFICATION_LAYOUT_2026.maximumFileBytes) {
    return {
      ok: false,
      issues: [
        issue(
          'file',
          OFFICIAL_INSTRUCTIONS,
          'O arquivo excede o limite conservador de 20.000.000 bytes adotado para o limite oficial de 20 MB.'
        ),
      ],
    }
  }

  return {
    ok: true,
    artifact: {
      fileName: request.fileName,
      text,
      bytes,
      encoding: EDUCACENSO_IDENTIFICATION_LAYOUT_2026.encoding,
      layout: 'IDENTIFICATION_2026_V1',
      referenceDataCoverage: referenceData.coverage,
    },
  }
}
