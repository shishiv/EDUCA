/**
 * School/Institution Validation Schema
 *
 * Centralized Zod schema for school data validation
 * Following INEP (Instituto Nacional de Estudos e Pesquisas Educacionais) compliance standards
 * and Brazilian educational requirements
 *
 * Features:
 * - INEP code validation (8 digits)
 * - Brazilian CNPJ validation
 * - School type classification (creche, pré-escola, fundamental)
 * - Operating schedules (turno)
 * - Contact information validation
 * - Address information with CEP
 * - Multi-tenancy school isolation
 */

import { z } from 'zod'
import { validatePhone, formatPhone } from '@/lib/validation/brazilian'

// ===== INEP CODE VALIDATION =====

/**
 * Validates Brazilian INEP school code (8 digits)
 * INEP codes identify schools in the Brazilian education system
 *
 * @param inepCode - Code to validate
 * @returns boolean indicating if code is valid
 */
export function validateINEPCode(inepCode: string): boolean {
  if (!inepCode) return false

  const cleanCode = inepCode.replace(/\D/g, '')
  return cleanCode.length === 8 && /^\d{8}$/.test(cleanCode)
}

/**
 * Formats INEP code for display
 *
 * @param inepCode - Code to format
 * @returns Formatted INEP code
 */
export function formatINEPCode(inepCode: string): string {
  if (!inepCode) return ''

  const cleanCode = inepCode.replace(/\D/g, '')
  if (cleanCode.length !== 8) return inepCode

  // Format as XX.XXX.XXX for readability
  return cleanCode.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3')
}

// ===== CNPJ VALIDATION =====

/**
 * Validates Brazilian CNPJ (Cadastro Nacional da Pessoa Jurídica)
 *
 * @param cnpj - CNPJ to validate
 * @returns boolean indicating if CNPJ is valid
 */
export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj) return false

  const cleanCNPJ = cnpj.replace(/\D/g, '')
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

/**
 * Formats CNPJ for display
 *
 * @param cnpj - CNPJ to format
 * @returns Formatted CNPJ
 */
export function formatCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) return cnpj

  return clean.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    '$1.$2.$3/$4-$5'
  )
}

// ===== CEP VALIDATION =====

/**
 * Validates Brazilian CEP (Postal Code)
 *
 * @param cep - CEP to validate
 * @returns boolean indicating if CEP is valid
 */
export function validateCEP(cep: string): boolean {
  if (!cep) return false

  const cleanCEP = cep.replace(/\D/g, '')
  return cleanCEP.length === 8
}

/**
 * Formats CEP for display
 *
 * @param cep - CEP to format
 * @returns Formatted CEP (XXXXX-XXX)
 */
export function formatCEP(cep: string): string {
  if (!cep) return ''

  const cleanCEP = cep.replace(/\D/g, '')
  if (cleanCEP.length !== 8) return cep

  return cleanCEP.replace(/(\d{5})(\d{3})/, '$1-$2')
}

// ===== BASE SCHOOL VALIDATION =====

/**
 * Base school information schema
 * Used for creating and updating school records
 */
export const baseSchoolSchema = z.object({
  nome: z
    .string()
    .min(3, 'Nome da escola deve ter no mínimo 3 caracteres')
    .max(150, 'Nome da escola não pode exceder 150 caracteres'),

  codigo_escola: z
    .string()
    .min(3, 'Código da escola deve ter no mínimo 3 caracteres')
    .max(20, 'Código da escola não pode exceder 20 caracteres'),

  codigo_inep: z
    .string()
    .refine(
      (value) => validateINEPCode(value),
      'Código INEP inválido (deve ter 8 dígitos)'
    )
    .transform((value) => formatINEPCode(value)),

  cnpj: z
    .string()
    .optional()
    .refine(
      (value) => !value || validateCNPJ(value),
      'CNPJ inválido'
    )
    .transform((value) => value ? formatCNPJ(value) : undefined),

  tipo_escola: z
    .enum(['creche', 'pre_escola', 'fundamental_anos_iniciais', 'fundamental_anos_finais', 'medio'])
    .refine(
      (value) => [
        'creche', 'pre_escola', 'fundamental_anos_iniciais',
        'fundamental_anos_finais', 'medio'
      ].includes(value),
      'Tipo de escola inválido'
    ),

  endereco: z
    .string()
    .min(10, 'Endereço deve ter no mínimo 10 caracteres')
    .max(200, 'Endereço não pode exceder 200 caracteres'),

  numero: z
    .string()
    .min(1, 'Número do imóvel é obrigatório')
    .max(10, 'Número do imóvel não pode exceder 10 caracteres'),

  complemento: z
    .string()
    .max(100, 'Complemento do endereço não pode exceder 100 caracteres')
    .optional(),

  bairro: z
    .string()
    .min(3, 'Bairro deve ter no mínimo 3 caracteres')
    .max(50, 'Bairro não pode exceder 50 caracteres'),

  cidade: z
    .string()
    .min(3, 'Cidade deve ter no mínimo 3 caracteres')
    .max(50, 'Cidade não pode exceder 50 caracteres'),

  estado: z
    .string()
    .length(2, 'Estado deve ter 2 caracteres')
    .regex(/^[A-Z]{2}$/, 'Estado deve ser em formato UF (ex: MG)'),

  cep: z
    .string()
    .refine(
      (value) => validateCEP(value),
      'CEP inválido (deve ter 8 dígitos)'
    )
    .transform((value) => formatCEP(value)),

  telefone: z
    .string()
    .refine(
      (value) => validatePhone(value),
      'Telefone inválido'
    )
    .transform((value) => formatPhone(value)),

  telefone_secundario: z
    .string()
    .optional()
    .refine(
      (value) => !value || validatePhone(value),
      'Telefone secundário inválido'
    )
    .transform((value) => value ? formatPhone(value) : undefined),

  email: z
    .string()
    .email('E-mail da escola inválido')
    .optional(),

  diretor_nome: z
    .string()
    .min(3, 'Nome do diretor deve ter no mínimo 3 caracteres')
    .max(100, 'Nome do diretor não pode exceder 100 caracteres'),

  diretor_telefone: z
    .string()
    .optional()
    .refine(
      (value) => !value || validatePhone(value),
      'Telefone do diretor inválido'
    )
    .transform((value) => value ? formatPhone(value) : undefined),
})

// ===== SCHOOL OPERATING SCHEDULE =====

/**
 * School operating schedule schema
 * Defines when the school operates (turnos)
 */
export const schoolScheduleSchema = z.object({
  turno_matutino: z
    .boolean()
    .default(false),

  turno_vespertino: z
    .boolean()
    .default(false),

  turno_noturno: z
    .boolean()
    .default(false),

  turno_integral: z
    .boolean()
    .default(false),

  horario_inicio_matutino: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Horário deve ser no formato HH:mm')
    .optional(),

  horario_fim_matutino: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Horário deve ser no formato HH:mm')
    .optional(),

  horario_inicio_vespertino: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Horário deve ser no formato HH:mm')
    .optional(),

  horario_fim_vespertino: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Horário deve ser no formato HH:mm')
    .optional(),

  horario_inicio_noturno: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Horário deve ser no formato HH:mm')
    .optional(),

  horario_fim_noturno: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Horário deve ser no formato HH:mm')
    .optional(),
})

// ===== COMPLETE SCHOOL REGISTRATION =====

/**
 * Complete school registration schema
 * Used for creating new school records
 */
export const schoolRegistrationSchema = z.object({
  ...baseSchoolSchema.shape,
  ...schoolScheduleSchema.shape,

  // Multi-tenancy
  municipio: z
    .string()
    .min(3, 'Município deve ter no mínimo 3 caracteres'),

  // Infrastructure
  numero_salas_aula: z
    .number()
    .min(1, 'Número de salas deve ser no mínimo 1')
    .max(100, 'Número de salas não pode exceder 100'),

  numero_professores: z
    .number()
    .min(1, 'Número de professores deve ser no mínimo 1'),

  numero_funcionarios: z
    .number()
    .min(1, 'Número de funcionários deve ser no mínimo 1'),

  capacidade_alunos: z
    .number()
    .min(10, 'Capacidade mínima de 10 alunos')
    .max(2000, 'Capacidade máxima de 2000 alunos'),

  // Services
  servico_alimentacao: z
    .boolean()
    .default(false),

  servico_transporte: z
    .boolean()
    .default(false),

  servico_saude: z
    .boolean()
    .default(false),

  biblioteca: z
    .boolean()
    .default(false),

  laboratorio_informatica: z
    .boolean()
    .default(false),

  quadra_esportes: z
    .boolean()
    .default(false),

  // Status
  status: z
    .enum(['ativa', 'inativa', 'em_construccao'])
    .default('ativa'),

  ano_fundacao: z
    .number()
    .min(1900, 'Ano de fundação deve ser 1900 ou posterior')
    .max(new Date().getFullYear(), 'Ano de fundação não pode ser futuro'),
})

// ===== SCHOOL UPDATE SCHEMA =====

/**
 * School update schema
 * Allows partial updates to school records
 */
export const schoolUpdateSchema = schoolRegistrationSchema.partial()

// ===== TYPE EXPORTS =====

/**
 * TypeScript type for base school data
 */
export type BaseSchoolData = z.infer<typeof baseSchoolSchema>

/**
 * TypeScript type for school schedule data
 */
export type SchoolScheduleData = z.infer<typeof schoolScheduleSchema>

/**
 * TypeScript type for complete school registration
 */
export type SchoolRegistrationData = z.infer<typeof schoolRegistrationSchema>

/**
 * TypeScript type for school update
 */
export type SchoolUpdateData = z.infer<typeof schoolUpdateSchema>

// ===== VALIDATION HELPERS =====

/**
 * Validates a complete school registration
 *
 * @param data - School data to validate
 * @returns Validation result with errors if invalid
 */
export function validateSchoolRegistration(data: unknown) {
  try {
    const result = schoolRegistrationSchema.parse(data)
    return {
      valid: true,
      data: result,
      errors: null
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        data: null,
        errors: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      }
    }
    throw error
  }
}

/**
 * Validates school update data (partial validation)
 *
 * @param data - Partial school data to validate
 * @returns Validation result with errors if invalid
 */
export function validateSchoolUpdate(data: unknown) {
  try {
    const result = schoolUpdateSchema.parse(data)
    return {
      valid: true,
      data: result,
      errors: null
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        data: null,
        errors: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      }
    }
    throw error
  }
}

/**
 * Validates that at least one turno is selected
 *
 * @param schedule - School schedule data
 * @returns boolean indicating if at least one turno is selected
 */
export function validateAtLeastOneTurno(schedule: SchoolScheduleData): boolean {
  return (
    schedule.turno_matutino ||
    schedule.turno_vespertino ||
    schedule.turno_noturno ||
    schedule.turno_integral
  )
}
