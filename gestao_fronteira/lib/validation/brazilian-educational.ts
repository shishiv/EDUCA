/**
 * Brazilian Educational Data Validation Library
 *
 * Comprehensive validation for Brazilian educational system compliance
 * including CPF, CNPJ, phone numbers, state registration, and educational IDs
 */

import { z } from 'zod'

// ===== CPF VALIDATION =====
export function validateCPF(cpf: string): boolean {
  if (!cpf) return false

  // Remove formatting
  const cleanCPF = cpf.replace(/[^\d]/g, '')

  // Check length and invalid patterns
  if (cleanCPF.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false // All same digits

  // Validate check digits
  let sum = 0
  let remainder: number

  // First check digit
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false

  // Second check digit
  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false

  return true
}

export function formatCPF(cpf: string): string {
  const clean = cpf.replace(/[^\d]/g, '')
  if (clean.length !== 11) return cpf
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

// ===== CNPJ VALIDATION =====
export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj) return false

  const cleanCNPJ = cnpj.replace(/[^\d]/g, '')
  if (cleanCNPJ.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false

  // First check digit
  let sum = 0
  let pos = 5
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * pos--
    if (pos < 2) pos = 9
  }
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11
  if (result !== parseInt(cleanCNPJ.charAt(12))) return false

  // Second check digit
  sum = 0
  pos = 6
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * pos--
    if (pos < 2) pos = 9
  }
  result = sum % 11 < 2 ? 0 : 11 - sum % 11
  if (result !== parseInt(cleanCNPJ.charAt(13))) return false

  return true
}

export function formatCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/[^\d]/g, '')
  if (clean.length !== 14) return cnpj
  return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

// ===== BRAZILIAN PHONE VALIDATION =====
export function validateBrazilianPhone(phone: string): boolean {
  if (!phone) return false

  const cleanPhone = phone.replace(/[^\d]/g, '')

  // Valid patterns: 11 digits (with 9), 10 digits (landline)
  if (cleanPhone.length === 11) {
    // Mobile: (xx) 9xxxx-xxxx
    return /^[1-9][0-9]9[0-9]{8}$/.test(cleanPhone)
  } else if (cleanPhone.length === 10) {
    // Landline: (xx) xxxx-xxxx
    return /^[1-9][0-9][2-5][0-9]{7}$/.test(cleanPhone)
  }

  return false
}

export function formatBrazilianPhone(phone: string): string {
  const clean = phone.replace(/[^\d]/g, '')

  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  } else if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }

  return phone
}

// ===== EDUCATIONAL ID VALIDATION =====
export function validateINEP(inepCode: string): boolean {
  if (!inepCode) return false

  const clean = inepCode.replace(/[^\d]/g, '')

  // INEP codes are 8 digits for schools, 11 digits for students
  return clean.length === 8 || clean.length === 11
}

export function validateNIS(nis: string): boolean {
  if (!nis) return false

  const cleanNIS = nis.replace(/[^\d]/g, '')
  if (cleanNIS.length !== 11) return false

  // NIS validation algorithm
  const weights = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let sum = 0

  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanNIS.charAt(i)) * weights[i]
  }

  const remainder = sum % 11
  const checkDigit = remainder < 2 ? 0 : 11 - remainder

  return checkDigit === parseInt(cleanNIS.charAt(10))
}

// ===== STATE REGISTRATION VALIDATION =====
export function validateStateRegistration(registration: string, state: string): boolean {
  if (!registration || !state) return false

  const clean = registration.replace(/[^\d]/g, '')

  // Basic validation - each state has different rules
  // This is a simplified version, can be expanded
  switch (state.toUpperCase()) {
    case 'MG': // Minas Gerais
      return clean.length === 13
    case 'SP': // São Paulo
      return clean.length === 12
    case 'RJ': // Rio de Janeiro
      return clean.length === 8
    default:
      return clean.length >= 8 && clean.length <= 15
  }
}

// ===== EDUCATIONAL CALENDAR VALIDATION =====
export function validateSchoolDate(date: Date, schoolYear: number): boolean {
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  // Must be within the school year
  if (year !== schoolYear) return false

  // Brazilian school calendar: February to December
  if (month < 2 || month > 12) return false

  // Cannot be in July (winter break) for most schools
  if (month === 7) return false

  return true
}

export function validateAttendancePercentage(percentage: number): {
  isValid: boolean
  status: 'adequate' | 'warning' | 'critical'
  message: string
} {
  if (percentage >= 80) {
    return {
      isValid: true,
      status: 'adequate',
      message: 'Frequência adequada conforme LDB'
    }
  } else if (percentage >= 75) {
    return {
      isValid: true,
      status: 'warning',
      message: 'Frequência no limite mínimo legal (75%)'
    }
  } else {
    return {
      isValid: false,
      status: 'critical',
      message: 'Frequência abaixo do mínimo legal - risco de reprovação'
    }
  }
}

// ===== ZOD SCHEMAS FOR FORMS =====
export const brazilianCPFSchema = z
  .string()
  .min(11, 'CPF deve ter 11 dígitos')
  .refine(validateCPF, 'CPF inválido')
  .transform(formatCPF)

export const brazilianCNPJSchema = z
  .string()
  .min(14, 'CNPJ deve ter 14 dígitos')
  .refine(validateCNPJ, 'CNPJ inválido')
  .transform(formatCNPJ)

export const brazilianPhoneSchema = z
  .string()
  .min(10, 'Telefone deve ter pelo menos 10 dígitos')
  .refine(validateBrazilianPhone, 'Telefone brasileiro inválido')
  .transform(formatBrazilianPhone)

export const inepCodeSchema = z
  .string()
  .refine(validateINEP, 'Código INEP inválido')

export const nisSchema = z
  .string()
  .refine(validateNIS, 'NIS inválido')

// ===== COMPLETE STUDENT VALIDATION SCHEMA =====
export const studentRegistrationSchema = z.object({
  nome_completo: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .regex(/^[A-Za-zÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),

  data_nascimento: z
    .date()
    .max(new Date(), 'Data de nascimento não pode ser futura')
    .refine(
      (date) => {
        const age = new Date().getFullYear() - date.getFullYear()
        return age >= 0 && age <= 18
      },
      'Idade deve estar entre 0 e 18 anos'
    ),

  cpf: brazilianCPFSchema.optional(),

  rg: z.string().optional(),

  sexo: z.enum(['M', 'F'], {
    errorMap: () => ({ message: 'Sexo deve ser M ou F' })
  }),

  endereco: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres').optional(),

  telefone: brazilianPhoneSchema.optional(),

  email: z.string().email('E-mail inválido').optional(),

  nome_mae: z
    .string()
    .min(2, 'Nome da mãe deve ter pelo menos 2 caracteres')
    .optional(),

  nome_pai: z
    .string()
    .min(2, 'Nome do pai deve ter pelo menos 2 caracteres')
    .optional(),

  necessidades_especiais: z.string().optional(),

  // Educational specific fields
  codigo_inep: inepCodeSchema.optional(),
  nis: nisSchema.optional(),

  // Family context (Brazilian educational system)
  renda_familiar: z
    .number()
    .min(0, 'Renda familiar deve ser positiva')
    .optional(),

  transporte_escolar: z.boolean().optional(),
  bolsa_familia: z.boolean().optional(),
  programa_mais_educacao: z.boolean().optional()
})

// ===== GUARDIAN VALIDATION SCHEMA =====
export const guardianRegistrationSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),

  cpf: brazilianCPFSchema,

  rg: z.string().min(5, 'RG deve ter pelo menos 5 caracteres').optional(),

  telefone: brazilianPhoneSchema.optional(),

  email: z.string().email('E-mail inválido').optional(),

  parentesco: z.enum([
    'mae', 'pai', 'avo', 'ava', 'tio', 'tia', 'irmao', 'irma',
    'padrasto', 'madrasta', 'responsavel_legal', 'outro'
  ]),

  endereco: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres').optional(),

  profissao: z.string().optional(),

  escolaridade: z.enum([
    'analfabeto', 'fundamental_incompleto', 'fundamental_completo',
    'medio_incompleto', 'medio_completo', 'superior_incompleto',
    'superior_completo', 'pos_graduacao'
  ]).optional(),

  renda_familiar: z.number().min(0, 'Renda deve ser positiva').optional(),

  // LGPD compliance
  lgpd_consentimento: z.boolean().refine(
    (val) => val === true,
    'Consentimento LGPD é obrigatório'
  )
})

// ===== ATTENDANCE SESSION VALIDATION =====
export const attendanceSessionSchema = z.object({
  turma_id: z.string().uuid('ID da turma inválido'),

  data_aula: z.date().refine(
    (date) => {
      const today = new Date()
      const diffTime = Math.abs(today.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays <= 7 // Cannot mark attendance more than 7 days old
    },
    'Não é possível marcar presença para datas muito antigas'
  ),

  conteudo_programatico: z
    .string()
    .min(5, 'Conteúdo programático deve ter pelo menos 5 caracteres')
    .max(500, 'Conteúdo muito longo'),

  duracao_minutos: z
    .number()
    .min(30, 'Aula deve ter pelo menos 30 minutos')
    .max(240, 'Aula não pode exceder 4 horas'),

  metodologia: z.string().max(200).optional(),
  recursos_utilizados: z.string().max(200).optional(),
  observacoes: z.string().max(300).optional()
})

// ===== EXPORT VALIDATION HELPERS =====
export const validationHelpers = {
  validateCPF,
  formatCPF,
  validateCNPJ,
  formatCNPJ,
  validateBrazilianPhone,
  formatBrazilianPhone,
  validateINEP,
  validateNIS,
  validateStateRegistration,
  validateSchoolDate,
  validateAttendancePercentage
}

export const schemas = {
  brazilianCPFSchema,
  brazilianCNPJSchema,
  brazilianPhoneSchema,
  inepCodeSchema,
  nisSchema,
  studentRegistrationSchema,
  guardianRegistrationSchema,
  attendanceSessionSchema
}