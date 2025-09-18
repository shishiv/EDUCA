/**
 * Brazilian data validation utilities for educational management
 * Includes CPF, phone number, and educational-specific validations
 */

import { z } from 'zod'

/**
 * Validates Brazilian CPF (Cadastro de Pessoas Físicas)
 * @param cpf CPF string to validate
 * @returns boolean indicating if CPF is valid
 */
export function validateCPF(cpf: string): boolean {
  if (!cpf) return false

  // Remove non-numeric characters
  cpf = cpf.replace(/\D/g, '')

  // Check if CPF has 11 digits
  if (cpf.length !== 11) return false

  // Check for known invalid sequences
  if (/^(\d)\1{10}$/.test(cpf)) return false

  // Validate first digit
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i)
  }

  let remainder = 11 - (sum % 11)
  const digit1 = remainder >= 10 ? 0 : remainder

  if (digit1 !== parseInt(cpf.charAt(9))) return false

  // Validate second digit
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i)
  }

  remainder = 11 - (sum % 11)
  const digit2 = remainder >= 10 ? 0 : remainder

  return digit2 === parseInt(cpf.charAt(10))
}

/**
 * Formats CPF for display
 * @param cpf Raw CPF string
 * @returns Formatted CPF (xxx.xxx.xxx-xx)
 */
export function formatCPF(cpf: string): string {
  if (!cpf) return ''

  cpf = cpf.replace(/\D/g, '')

  if (cpf.length <= 11) {
    cpf = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  return cpf
}

/**
 * Validates Brazilian phone number
 * @param phone Phone string to validate
 * @returns boolean indicating if phone is valid
 */
export function validateBrazilianPhone(phone: string): boolean {
  if (!phone) return false

  // Remove non-numeric characters
  phone = phone.replace(/\D/g, '')

  // Check for valid Brazilian phone formats
  // Mobile: 11 digits (2 area code + 9 + 8 digits)
  // Landline: 10 digits (2 area code + 8 digits)
  return phone.length === 10 || phone.length === 11
}

/**
 * Formats Brazilian phone number for display
 * @param phone Raw phone string
 * @returns Formatted phone number
 */
export function formatBrazilianPhone(phone: string): string {
  if (!phone) return ''

  phone = phone.replace(/\D/g, '')

  if (phone.length === 10) {
    // Landline format: (xx) xxxx-xxxx
    return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  } else if (phone.length === 11) {
    // Mobile format: (xx) 9xxxx-xxxx
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  return phone
}

/**
 * Validates Brazilian postal code (CEP)
 * @param cep CEP string to validate
 * @returns boolean indicating if CEP is valid
 */
export function validateCEP(cep: string): boolean {
  if (!cep) return false

  // Remove non-numeric characters
  cep = cep.replace(/\D/g, '')

  // CEP must have exactly 8 digits
  return cep.length === 8
}

/**
 * Formats CEP for display
 * @param cep Raw CEP string
 * @returns Formatted CEP (xxxxx-xxx)
 */
export function formatCEP(cep: string): string {
  if (!cep) return ''

  cep = cep.replace(/\D/g, '')

  if (cep.length <= 8) {
    cep = cep.replace(/(\d{5})(\d{3})/, '$1-$2')
  }

  return cep
}

/**
 * Validates Brazilian academic year
 * @param year Academic year to validate
 * @returns boolean indicating if year is valid
 */
export function validateAcademicYear(year: number): boolean {
  const currentYear = new Date().getFullYear()
  // Accept current year and next year for planning
  return year >= currentYear && year <= currentYear + 1
}

/**
 * Calculates age from birth date
 * @param birthDate Date of birth
 * @returns Age in years
 */
export function calculateAge(birthDate: Date | string): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate
  const today = new Date()

  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

/**
 * Validates student age for educational level
 * @param birthDate Student's birth date
 * @param educationalLevel Educational level (creche, pre_escola, fundamental)
 * @returns boolean indicating if age is appropriate
 */
export function validateStudentAge(birthDate: Date | string, educationalLevel: 'creche' | 'pre_escola' | 'fundamental'): boolean {
  const age = calculateAge(birthDate)

  switch (educationalLevel) {
    case 'creche':
      return age >= 0 && age <= 3
    case 'pre_escola':
      return age >= 4 && age <= 5
    case 'fundamental':
      return age >= 6 && age <= 14
    default:
      return false
  }
}

/**
 * Calculates attendance percentage
 * @param presentDays Number of days present
 * @param totalDays Total number of school days
 * @returns Attendance percentage
 */
export function calculateAttendanceRate(presentDays: number, totalDays: number): number {
  if (totalDays === 0) return 0
  return Math.round((presentDays / totalDays) * 100)
}

/**
 * Determines attendance status based on Brazilian educational requirements
 * @param attendanceRate Attendance percentage
 * @returns Attendance status
 */
export function getAttendanceStatus(attendanceRate: number): 'adequate' | 'warning' | 'critical' {
  if (attendanceRate >= 80) return 'adequate'
  if (attendanceRate >= 75) return 'warning'
  return 'critical'
}

/**
 * Validates minimum attendance requirement (75% in Brazil)
 * @param attendanceRate Attendance percentage
 * @returns boolean indicating if minimum requirement is met
 */
export function validateMinimumAttendance(attendanceRate: number): boolean {
  return attendanceRate >= 75
}

// Zod schemas for Brazilian educational data validation

export const cpfSchema = z
  .string()
  .refine(validateCPF, { message: 'CPF inválido' })
  .transform(formatCPF)

export const brazilianPhoneSchema = z
  .string()
  .refine(validateBrazilianPhone, { message: 'Telefone inválido' })
  .transform(formatBrazilianPhone)

export const cepSchema = z
  .string()
  .refine(validateCEP, { message: 'CEP inválido' })
  .transform(formatCEP)

export const academicYearSchema = z
  .number()
  .refine(validateAcademicYear, { message: 'Ano letivo inválido' })

export const attendanceRateSchema = z
  .number()
  .min(0, { message: 'Taxa de frequência não pode ser negativa' })
  .max(100, { message: 'Taxa de frequência não pode exceder 100%' })

// Student form validation schema
export const studentFormSchema = z.object({
  nome_completo: z
    .string()
    .min(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
    .max(100, { message: 'Nome não pode exceder 100 caracteres' }),

  data_nascimento: z
    .coerce.date()
    .refine((date) => date <= new Date(), { message: 'Data de nascimento não pode ser no futuro' }),

  cpf: cpfSchema.optional(),

  rg: z
    .string()
    .min(5, { message: 'RG deve ter pelo menos 5 caracteres' })
    .optional(),

  sexo: z.enum(['M', 'F'], { message: 'Sexo deve ser M ou F' }),

  telefone: brazilianPhoneSchema.optional(),

  email: z
    .string()
    .email({ message: 'Email inválido' })
    .optional(),

  endereco: z
    .string()
    .min(10, { message: 'Endereço deve ter pelo menos 10 caracteres' }),

  nome_mae: z
    .string()
    .min(2, { message: 'Nome da mãe deve ter pelo menos 2 caracteres' }),

  nome_pai: z
    .string()
    .min(2, { message: 'Nome do pai deve ter pelo menos 2 caracteres' })
    .optional(),

  necessidades_especiais: z
    .string()
    .max(500, { message: 'Descrição de necessidades especiais não pode exceder 500 caracteres' })
    .optional(),
})

// User form validation schema
export const userFormSchema = z.object({
  email: z
    .string()
    .email({ message: 'Email inválido' }),

  nome: z
    .string()
    .min(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
    .max(100, { message: 'Nome não pode exceder 100 caracteres' }),

  tipo_usuario: z.enum(['admin', 'diretor', 'secretario', 'professor', 'responsavel'], {
    message: 'Tipo de usuário inválido'
  }),

  escola_id: z
    .string()
    .uuid({ message: 'ID da escola inválido' })
    .optional(),
})

// School form validation schema
export const schoolFormSchema = z.object({
  nome: z
    .string()
    .min(2, { message: 'Nome da escola deve ter pelo menos 2 caracteres' })
    .max(100, { message: 'Nome da escola não pode exceder 100 caracteres' }),

  codigo: z
    .string()
    .min(3, { message: 'Código da escola deve ter pelo menos 3 caracteres' })
    .max(20, { message: 'Código da escola não pode exceder 20 caracteres' }),

  endereco: z
    .string()
    .min(10, { message: 'Endereço deve ter pelo menos 10 caracteres' }),

  telefone: brazilianPhoneSchema,

  tipo: z.enum(['creche', 'pre_escola', 'fundamental'], {
    message: 'Tipo de escola inválido'
  }),
})

// Class form validation schema
export const classFormSchema = z.object({
  nome: z
    .string()
    .min(2, { message: 'Nome da turma deve ter pelo menos 2 caracteres' })
    .max(50, { message: 'Nome da turma não pode exceder 50 caracteres' }),

  ano_letivo: academicYearSchema,

  serie: z
    .string()
    .min(1, { message: 'Série é obrigatória' }),

  escola_id: z
    .string()
    .uuid({ message: 'ID da escola inválido' }),

  professor_id: z
    .string()
    .uuid({ message: 'ID do professor inválido' })
    .optional(),

  capacidade: z
    .number()
    .min(1, { message: 'Capacidade deve ser pelo menos 1' })
    .max(50, { message: 'Capacidade não pode exceder 50' }),

  turno: z.enum(['matutino', 'vespertino', 'integral'], {
    message: 'Turno inválido'
  }),
})

export type StudentFormData = z.infer<typeof studentFormSchema>
export type UserFormData = z.infer<typeof userFormSchema>
export type SchoolFormData = z.infer<typeof schoolFormSchema>
export type ClassFormData = z.infer<typeof classFormSchema>