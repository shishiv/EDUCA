# Brazilian Educational Compliance Style Guide

## INEP (Instituto Nacional de Estudos e Pesquisas Educacionais) Standards

### Core Compliance Principles

#### "Não existe o esquecer" (No Forgetting Principle)
The fundamental principle that attendance records cannot be modified after submission:

```typescript
// ✅ Immutable attendance implementation
export interface AttendanceRecord {
  id: string
  alunoId: string
  data: Date
  presente: boolean
  observacao?: string
  registradoPor: string
  registradoEm: Date
  // Immutability enforcement
  readonly locked: boolean
  readonly lockReason?: string
  readonly lockedAt?: Date
  readonly lockedBy?: string
}

// ✅ Attendance locking validation
export function validateAttendanceModification(record: AttendanceRecord) {
  if (record.locked) {
    throw new EducationalError(
      'Não é possível modificar presença após confirmação (não existe o esquecer)',
      'RETROACTIVE_ATTENDANCE_FORBIDDEN',
      {
        recordId: record.id,
        lockReason: record.lockReason,
        lockedAt: record.lockedAt
      }
    )
  }
}
```

#### Legal Documentation Standards
Attendance records are official legal documents requiring complete audit trails:

```typescript
// ✅ Audit trail implementation
export interface AuditTrail {
  id: string
  tableName: string
  recordId: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  oldValues: Record<string, any> | null
  newValues: Record<string, any>
  userId: string
  userName: string
  userRole: UserRole
  timestamp: Date
  ipAddress: string
  userAgent: string
  // Legal compliance fields
  legalJustification?: string
  authorizationLevel: 'normal' | 'supervisor' | 'director' | 'admin'
}

// ✅ Mandatory audit logging
export async function createAuditLog(
  tableName: string,
  recordId: string,
  action: AuditAction,
  oldValues: any,
  newValues: any,
  context: AuditContext
) {
  const supabase = createServerSupabaseClient()

  await supabase
    .from('audit_log')
    .insert({
      table_name: tableName,
      record_id: recordId,
      action,
      old_values: oldValues,
      new_values: newValues,
      user_id: context.userId,
      user_name: context.userName,
      user_role: context.userRole,
      timestamp: new Date().toISOString(),
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      legal_justification: context.legalJustification,
      authorization_level: context.authorizationLevel
    })

  // Legal requirement: Cannot delete audit logs
  // All audit operations are INSERT only
}
```

### Educacenso 2025 Compliance

#### Required Data Points Implementation
Implement all mandatory INEP data collection requirements:

```typescript
// ✅ Educacenso-compliant student data
export interface EducacensoStudentData {
  // Basic identification (mandatory)
  nomeCompleto: string
  cpf: CPF
  dataNascimento: Date
  sexo: 'M' | 'F'
  corRaca: CorRaca

  // Educational status (mandatory)
  situacaoMatricula: SituacaoMatricula
  dataMatricula: Date
  tipoMatricula: TipoMatricula

  // Academic progress (mandatory)
  anoEscolar: number
  turma: string
  frequenciaMinima: number // 75% minimum

  // Special needs (if applicable)
  necessidadesEspeciais?: NecessidadeEspecial[]

  // Social programs (if applicable)
  beneficiarioBolsaFamilia?: boolean
  numeroNIS?: string

  // Address (mandatory)
  endereco: BrazilianAddress

  // Responsible person (mandatory)
  responsavelLegal: ResponsavelLegal
}

export type CorRaca =
  | 'branca'
  | 'preta'
  | 'parda'
  | 'amarela'
  | 'indigena'
  | 'nao_declarada'

export type SituacaoMatricula =
  | 'cursando'
  | 'aprovado'
  | 'reprovado'
  | 'transferido'
  | 'abandono'
  | 'falecido'

// ✅ Educacenso validation rules
export const educacensoValidation = z.object({
  nomeCompleto: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode exceder 100 caracteres')
    .regex(/^[A-Za-zÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),

  cpf: cpfSchema,

  dataNascimento: z.date()
    .max(new Date(), 'Data de nascimento não pode ser futura')
    .refine(
      (date) => {
        const age = new Date().getFullYear() - date.getFullYear()
        return age >= 4 && age <= 25
      },
      'Idade deve estar entre 4 e 25 anos para educação básica'
    ),

  frequenciaMinima: z.number()
    .min(75, 'Frequência mínima obrigatória é 75%')
    .max(100, 'Frequência não pode exceder 100%')
})
```

#### Teacher Qualification Tracking
Track teacher qualifications as required by INEP:

```typescript
// ✅ Teacher qualification compliance
export interface TeacherQualification {
  id: string
  professorId: string
  tipoFormacao: TipoFormacao
  instituicao: string
  curso: string
  anoFormacao: number
  numeroRegistro: string
  situacao: 'ativo' | 'vencido' | 'suspenso'
  validadeRegistro?: Date
  // INEP compliance
  codigoINEP?: string
  modalidadeEnsino: ModalidadeEnsino[]
  disciplinasAptas: string[]
}

export type TipoFormacao =
  | 'pedagogia'
  | 'licenciatura_especifica'
  | 'bacharelado_complementacao'
  | 'normal_superior'
  | 'normal_medio'

export type ModalidadeEnsino =
  | 'educacao_infantil'
  | 'ensino_fundamental_anos_iniciais'
  | 'ensino_fundamental_anos_finais'
  | 'ensino_medio'
  | 'educacao_jovens_adultos'
  | 'educacao_especial'

// ✅ Teacher authorization validation
export async function validateTeacherAuthorization(
  professorId: string,
  turmaId: string,
  disciplina?: string
): Promise<boolean> {
  const supabase = createServerSupabaseClient()

  const { data: teacher } = await supabase
    .from('professores')
    .select(`
      id,
      qualificacoes:teacher_qualifications(*),
      turmas:turma_assignments(turma_id)
    `)
    .eq('id', professorId)
    .single()

  if (!teacher) {
    throw new EducationalError(
      'Professor não encontrado',
      'TEACHER_NOT_FOUND',
      { professorId }
    )
  }

  // Check if teacher is assigned to the class
  const isAssignedToClass = teacher.turmas.some(
    (assignment: any) => assignment.turma_id === turmaId
  )

  if (!isAssignedToClass) {
    throw new EducationalError(
      'Professor não está autorizado para esta turma',
      'UNAUTHORIZED_TEACHER',
      { professorId, turmaId }
    )
  }

  // Check qualification for specific subject
  if (disciplina) {
    const hasQualification = teacher.qualificacoes.some(
      (qual: any) =>
        qual.situacao === 'ativo' &&
        qual.disciplinasAptas.includes(disciplina)
    )

    if (!hasQualification) {
      throw new EducationalError(
        'Professor não tem qualificação para esta disciplina',
        'UNQUALIFIED_TEACHER',
        { professorId, disciplina }
      )
    }
  }

  return true
}
```

## LGPD (Lei Geral de Proteção de Dados) Compliance

### Data Minimization and Consent
Implement LGPD-compliant data collection:

```typescript
// ✅ LGPD consent management
export interface LGPDConsent {
  id: string
  studentId: string
  responsibleId: string
  consentType: ConsentType
  purpose: DataProcessingPurpose[]
  granted: boolean
  grantedAt: Date
  revokedAt?: Date
  expiresAt?: Date
  legalBasis: LegalBasis
  consentVersion: string
}

export type ConsentType =
  | 'educational_data'
  | 'medical_data'
  | 'image_usage'
  | 'contact_information'
  | 'academic_performance'
  | 'behavioral_records'

export type DataProcessingPurpose =
  | 'academic_registration'
  | 'attendance_tracking'
  | 'performance_evaluation'
  | 'government_reporting'
  | 'emergency_contact'
  | 'educational_communication'

export type LegalBasis =
  | 'consent' // Most educational data
  | 'legal_obligation' // INEP reporting
  | 'public_interest' // Government compliance
  | 'vital_interests' // Emergency situations

// ✅ Data access validation
export async function validateDataAccess(
  userId: string,
  studentId: string,
  dataType: ConsentType
): Promise<boolean> {
  const supabase = createServerSupabaseClient()

  // Check active consent
  const { data: consent } = await supabase
    .from('lgpd_consents')
    .select('*')
    .eq('student_id', studentId)
    .eq('consent_type', dataType)
    .eq('granted', true)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!consent) {
    throw new EducationalError(
      'Acesso negado: Consentimento LGPD necessário',
      'LGPD_CONSENT_REQUIRED',
      { studentId, dataType }
    )
  }

  return true
}
```

### Data Subject Rights Implementation
Implement all LGPD data subject rights:

```typescript
// ✅ Data portability (Article 18, IV)
export async function exportStudentData(studentId: string, requesterId: string) {
  await validateDataAccess(requesterId, studentId, 'educational_data')

  const supabase = createServerSupabaseClient()

  const studentData = await supabase
    .from('alunos')
    .select(`
      *,
      matriculas(*),
      frequencia(*),
      notas(*),
      observacoes(*)
    `)
    .eq('id', studentId)
    .single()

  // Create audit log for data export
  await createAuditLog(
    'data_export',
    studentId,
    'SELECT',
    null,
    { exported_tables: ['alunos', 'matriculas', 'frequencia', 'notas'] },
    {
      userId: requesterId,
      legalJustification: 'LGPD Article 18, IV - Data Portability',
      authorizationLevel: 'normal'
    }
  )

  return {
    exportDate: new Date().toISOString(),
    studentData,
    dataFormat: 'JSON',
    lgpdCompliance: 'Article 18, IV'
  }
}

// ✅ Data deletion (Article 18, VI)
export async function deleteStudentData(
  studentId: string,
  requesterId: string,
  justification: string
) {
  // Validate deletion request
  if (await hasLegalObligationToRetain(studentId)) {
    throw new EducationalError(
      'Dados não podem ser excluídos devido a obrigações legais (INEP)',
      'LEGAL_RETENTION_REQUIRED',
      { studentId, retentionReason: 'INEP_COMPLIANCE' }
    )
  }

  const supabase = createServerSupabaseClient()

  // Anonymize instead of delete (educational context)
  await supabase
    .from('alunos')
    .update({
      nome: '[DADOS REMOVIDOS LGPD]',
      cpf: null,
      endereco: null,
      telefone: null,
      email: null,
      responsavel_nome: '[DADOS REMOVIDOS LGPD]',
      lgpd_deleted: true,
      lgpd_deleted_at: new Date().toISOString(),
      lgpd_deletion_reason: justification
    })
    .eq('id', studentId)

  // Mandatory audit log
  await createAuditLog(
    'alunos',
    studentId,
    'DELETE',
    null,
    { action: 'LGPD_ANONYMIZATION' },
    {
      userId: requesterId,
      legalJustification: `LGPD Article 18, VI: ${justification}`,
      authorizationLevel: 'supervisor'
    }
  )
}
```

## Brazilian Data Validation Standards

### CPF Validation Implementation
Implement comprehensive CPF validation:

```typescript
// ✅ Complete CPF validation
export function validateCPF(cpf: string): boolean {
  // Remove formatting
  const cleanCPF = cpf.replace(/[^\d]/g, '')

  // Check length
  if (cleanCPF.length !== 11) return false

  // Check for known invalid CPFs
  const invalidCPFs = [
    '00000000000', '11111111111', '22222222222',
    '33333333333', '44444444444', '55555555555',
    '66666666666', '77777777777', '88888888888',
    '99999999999'
  ]

  if (invalidCPFs.includes(cleanCPF)) return false

  // Validate check digits
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
  }

  let checkDigit1 = 11 - (sum % 11)
  if (checkDigit1 === 10 || checkDigit1 === 11) checkDigit1 = 0

  if (checkDigit1 !== parseInt(cleanCPF.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
  }

  let checkDigit2 = 11 - (sum % 11)
  if (checkDigit2 === 10 || checkDigit2 === 11) checkDigit2 = 0

  return checkDigit2 === parseInt(cleanCPF.charAt(10))
}

// ✅ CPF formatting and brand type
export function formatCPF(cpf: string): CPF {
  const clean = cpf.replace(/[^\d]/g, '')

  if (!validateCPF(clean)) {
    throw new EducationalError(
      'CPF inválido',
      'INVALID_CPF',
      { providedCPF: cpf }
    )
  }

  const formatted = clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return formatted as CPF
}

// ✅ Zod schema for CPF validation
export const cpfSchema = z.string()
  .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve estar no formato XXX.XXX.XXX-XX')
  .refine(validateCPF, 'CPF inválido')
  .transform(value => value as CPF)
```

### Brazilian Phone Number Validation
Implement Brazilian phone validation patterns:

```typescript
// ✅ Brazilian phone validation
export function validateBrazilianPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[^\d]/g, '')

  // Mobile: 11 digits (including area code)
  // Landline: 10 digits (including area code)
  return cleanPhone.length === 10 || cleanPhone.length === 11
}

export function formatBrazilianPhone(phone: string): BrazilianPhone {
  const clean = phone.replace(/[^\d]/g, '')

  if (!validateBrazilianPhone(clean)) {
    throw new EducationalError(
      'Telefone inválido',
      'INVALID_PHONE',
      { providedPhone: phone }
    )
  }

  let formatted: string

  if (clean.length === 10) {
    // Landline: (XX) XXXX-XXXX
    formatted = clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  } else {
    // Mobile: (XX) XXXXX-XXXX
    formatted = clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  return formatted as BrazilianPhone
}

// ✅ Zod schema for Brazilian phone
export const brazilianPhoneSchema = z.string()
  .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone deve estar no formato (XX) XXXXX-XXXX')
  .refine(
    (value) => validateBrazilianPhone(value),
    'Número de telefone inválido'
  )
  .transform(value => value as BrazilianPhone)
```

## Academic Calendar Compliance

### Brazilian School Year Validation
Implement academic calendar compliance:

```typescript
// ✅ Academic calendar validation
export interface AcademicCalendar {
  id: string
  ano: number
  escolaId: string
  inicioAnoLetivo: Date
  fimAnoLetivo: Date
  diasLetivos: number // Minimum 200 days required by LDB
  feriasEscolares: Period[]
  recessos: Period[]
  diasNaoLetivos: Date[]
}

export interface Period {
  inicio: Date
  fim: Date
  descricao: string
  tipo: 'ferias' | 'recesso' | 'evento'
}

// ✅ Validate academic year compliance
export function validateAcademicYear(calendar: AcademicCalendar): void {
  // LDB requires minimum 200 school days
  if (calendar.diasLetivos < 200) {
    throw new EducationalError(
      'Ano letivo deve ter no mínimo 200 dias (Lei 9.394/96 - LDB)',
      'INSUFFICIENT_SCHOOL_DAYS',
      { providedDays: calendar.diasLetivos, minimumRequired: 200 }
    )
  }

  // Validate date range
  const yearStart = new Date(calendar.ano, 0, 1)
  const yearEnd = new Date(calendar.ano, 11, 31)

  if (calendar.inicioAnoLetivo < yearStart || calendar.inicioAnoLetivo > yearEnd) {
    throw new EducationalError(
      'Início do ano letivo deve estar dentro do ano civil',
      'INVALID_ACADEMIC_START_DATE',
      { year: calendar.ano, startDate: calendar.inicioAnoLetivo }
    )
  }

  if (calendar.fimAnoLetivo <= calendar.inicioAnoLetivo) {
    throw new EducationalError(
      'Fim do ano letivo deve ser posterior ao início',
      'INVALID_ACADEMIC_END_DATE',
      { startDate: calendar.inicioAnoLetivo, endDate: calendar.fimAnoLetivo }
    )
  }
}

// ✅ Attendance date validation
export function validateAttendanceDate(
  date: Date,
  calendar: AcademicCalendar
): void {
  // Check if date is within academic year
  if (date < calendar.inicioAnoLetivo || date > calendar.fimAnoLetivo) {
    throw new EducationalError(
      'Data está fora do período letivo',
      'DATE_OUTSIDE_ACADEMIC_YEAR',
      {
        providedDate: date,
        academicStart: calendar.inicioAnoLetivo,
        academicEnd: calendar.fimAnoLetivo
      }
    )
  }

  // Check if date is a school day
  const isNonSchoolDay = calendar.diasNaoLetivos.some(
    nonSchoolDay => nonSchoolDay.getTime() === date.getTime()
  )

  if (isNonSchoolDay) {
    throw new EducationalError(
      'Não é possível marcar presença em dia não letivo',
      'NON_SCHOOL_DAY',
      { date }
    )
  }

  // Check vacation periods
  const isVacationDay = calendar.feriasEscolares.some(
    vacation => date >= vacation.inicio && date <= vacation.fim
  )

  if (isVacationDay) {
    throw new EducationalError(
      'Não é possível marcar presença durante período de férias',
      'VACATION_PERIOD',
      { date }
    )
  }
}
```

## Error Messages in Portuguese

### User-Friendly Error Messages
Always provide clear error messages in Portuguese:

```typescript
// ✅ Portuguese error messages
export const EDUCATIONAL_ERROR_MESSAGES: Record<EducationalErrorCode, string> = {
  STUDENT_NOT_FOUND: 'Aluno não encontrado no sistema',
  INVALID_CPF: 'CPF inválido. Verifique o formato: XXX.XXX.XXX-XX',
  ATTENDANCE_ALREADY_MARKED: 'Presença já foi registrada para este aluno hoje',
  SESSION_NOT_OPEN: 'Sessão de aula não está aberta. Use "Abrir Aula" primeiro',
  UNAUTHORIZED_TEACHER: 'Apenas professores da turma podem marcar presença',
  RETROACTIVE_ATTENDANCE_FORBIDDEN: 'Não é possível modificar presença após confirmação (não existe o esquecer)',
  INVALID_ACADEMIC_YEAR: 'Ano letivo inválido ou não configurado',
  LGPD_CONSENT_REQUIRED: 'Consentimento LGPD necessário para acessar estes dados',
  INEP_COMPLIANCE_VIOLATION: 'Operação viola normas INEP de registro educacional',
  INSUFFICIENT_SCHOOL_DAYS: 'Ano letivo deve ter no mínimo 200 dias conforme LDB',
  DUPLICATE_CPF: 'CPF já cadastrado no sistema',
  INVALID_PHONE: 'Número de telefone inválido',
  DATE_OUTSIDE_ACADEMIC_YEAR: 'Data está fora do período letivo vigente',
  NON_SCHOOL_DAY: 'Não é possível marcar presença em dia não letivo',
  VACATION_PERIOD: 'Não é possível marcar presença durante período de férias'
}

// ✅ Context-aware error formatting
export function formatEducationalError(
  error: EducationalError,
  userRole: UserRole
): string {
  const baseMessage = EDUCATIONAL_ERROR_MESSAGES[error.code] || error.message

  // Add technical details for admins
  if (userRole === 'admin' && error.context) {
    return `${baseMessage}\n\nDetalhes técnicos: ${JSON.stringify(error.context, null, 2)}`
  }

  return baseMessage
}
```

Remember: All implementations must prioritize Brazilian educational compliance, legal requirements, and clear communication in Portuguese for the educational domain.