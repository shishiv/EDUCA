/**
 * Student Registration Validation Schema
 *
 * Centralized Zod schema for student data validation
 * Following INEP (Instituto Nacional de Estudos e Pesquisas Educacionais) compliance standards
 * and Brazilian educational requirements
 *
 * Features:
 * - CPF validation with Brazilian formatting
 * - Birth date validation with age constraints
 * - Brazilian phone number validation
 * - Family guardian information
 * - Special needs documentation
 * - Bolsa Família integration support
 */

import { z } from 'zod'
import { validateCPF, formatCPF, validatePhone, formatPhone } from '@/lib/validation/brazilian'

// ===== BASE STUDENT VALIDATION =====

/**
 * Basic student information schema
 * Used for creating and updating student records
 */
export const baseStudentSchema = z.object({
  nome_completo: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome não pode exceder 100 caracteres')
    .regex(
      /^[A-Za-zÀ-ÿ\s'-]+$/,
      'Nome deve conter apenas letras, hífens, apóstrofos e espaços'
    ),

  data_nascimento: z
    .union([z.date(), z.string()])
    .refine((value) => {
      const date = typeof value === 'string' ? new Date(value) : value
      return !isNaN(date.getTime())
    }, 'Data de nascimento inválida')
    .transform((value) => {
      return typeof value === 'string' ? new Date(value) : value
    })
    .refine(
      (date) => date <= new Date(),
      'Data de nascimento não pode ser futura'
    )
    .refine(
      (date) => {
        const age = new Date().getFullYear() - date.getFullYear()
        return age <= 18
      },
      'Aluno deve ter no máximo 18 anos'
    ),

  sexo: z
    .enum(['M', 'F'])
    .refine(
      (value) => ['M', 'F'].includes(value),
      'Sexo deve ser M (Masculino) ou F (Feminino)'
    ),

  cpf: z
    .string()
    .optional()
    .refine(
      (value) => !value || validateCPF(value),
      'CPF inválido'
    )
    .transform((value) => value ? formatCPF(value) : undefined),

  rg: z
    .string()
    .min(5, 'RG deve ter pelo menos 5 caracteres')
    .max(20, 'RG não pode exceder 20 caracteres')
    .optional(),

  endereco: z
    .string()
    .min(10, 'Endereço deve ter no mínimo 10 caracteres')
    .max(200, 'Endereço não pode exceder 200 caracteres')
    .optional(),

  telefone: z
    .string()
    .optional()
    .refine(
      (value) => !value || validatePhone(value),
      'Telefone inválido'
    )
    .transform((value) => value ? formatPhone(value) : undefined),

  email: z
    .string()
    .email('E-mail inválido')
    .optional(),

  necessidades_especiais: z
    .string()
    .max(500, 'Descrição de necessidades especiais não pode exceder 500 caracteres')
    .optional(),
})

// ===== FAMILY INFORMATION =====

/**
 * Parent/Guardian information schema
 * Validates parent or responsible guardian data
 */
export const parentGuardianSchema = z.object({
  nome: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome não pode exceder 100 caracteres'),

  cpf: z
    .string()
    .refine(
      (value) => validateCPF(value),
      'CPF inválido'
    )
    .transform((value) => formatCPF(value)),

  rg: z
    .string()
    .min(5, 'RG deve ter pelo menos 5 caracteres')
    .optional(),

  telefone: z
    .string()
    .optional()
    .refine(
      (value) => !value || validatePhone(value),
      'Telefone inválido'
    )
    .transform((value) => value ? formatPhone(value) : undefined),

  email: z
    .string()
    .email('E-mail inválido')
    .optional(),

  parentesco: z
    .enum([
      'mae', 'pai', 'avo', 'ava', 'tio', 'tia', 'irmao', 'irma',
      'padrasto', 'madrasta', 'responsavel_legal', 'outro'
    ])
    .refine(
      (value) => [
        'mae', 'pai', 'avo', 'ava', 'tio', 'tia', 'irmao', 'irma',
        'padrasto', 'madrasta', 'responsavel_legal', 'outro'
      ].includes(value),
      'Parentesco selecionado não é válido'
    ),

  endereco: z
    .string()
    .min(10, 'Endereço deve ter no mínimo 10 caracteres')
    .optional(),

  profissao: z
    .string()
    .max(50, 'Profissão não pode exceder 50 caracteres')
    .optional(),

  escolaridade: z
    .enum([
      'analfabeto', 'fundamental_incompleto', 'fundamental_completo',
      'medio_incompleto', 'medio_completo', 'superior_incompleto',
      'superior_completo', 'pos_graduacao'
    ])
    .optional(),

  renda_familiar: z
    .number()
    .min(0, 'Renda familiar não pode ser negativa')
    .optional(),
})

// ===== SOCIAL PROGRAMS =====

/**
 * Social programs and special support schema
 * Validates Bolsa Família and other government program information
 */
export const socialProgramsSchema = z.object({
  bolsa_familia: z
    .boolean()
    .default(false),

  numero_nis: z
    .string()
    .min(11, 'NIS deve ter 11 dígitos')
    .max(11, 'NIS deve ter 11 dígitos')
    .optional(),

  transporte_escolar: z
    .boolean()
    .default(false),

  programa_alimentacao: z
    .boolean()
    .default(false),

  programa_mais_educacao: z
    .boolean()
    .default(false),

  renda_familiar_mensal: z
    .number()
    .min(0, 'Renda familiar não pode ser negativa')
    .optional(),
})

// ===== COMPLETE STUDENT REGISTRATION =====

/**
 * Complete student registration schema
 * Used for creating new student records with all required information
 */
export const studentRegistrationSchema = z.object({
  ...baseStudentSchema.shape,
  nome_mae: z
    .string()
    .min(3, 'Nome da mãe deve ter no mínimo 3 caracteres')
    .optional(),

  nome_pai: z
    .string()
    .min(3, 'Nome do pai deve ter no mínimo 3 caracteres')
    .optional(),

  // INEP compliance
  codigo_inep_estudante: z
    .string()
    .length(11, 'Código INEP do estudante deve ter 11 dígitos')
    .regex(/^\d{11}$/, 'Código INEP deve conter apenas números')
    .optional(),

  // Enrollment details
  turma_id: z
    .string()
    .uuid('ID da turma inválido'),

  ano_letivo: z
    .number()
    .min(2000, 'Ano letivo deve ser 2000 ou posterior')
    .max(2100, 'Ano letivo deve ser 2100 ou anterior'),

  status_matricula: z
    .enum(['ativo', 'inativo', 'transferido', 'desistente'])
    .default('ativo'),

  data_matricula: z
    .union([z.date(), z.string()])
    .transform((value) => {
      return typeof value === 'string' ? new Date(value) : value
    })
    .optional(),

  // Family information (array of guardians)
  responsaveis: z
    .array(parentGuardianSchema)
    .min(1, 'Pelo menos um responsável é obrigatório')
    .max(4, 'Máximo de 4 responsáveis'),

  // Social programs
  ...socialProgramsSchema.shape,

  // LGPD compliance
  lgpd_consentimento: z
    .boolean()
    .refine(
      (val) => val === true,
      'Consentimento LGPD é obrigatório para registrar aluno'
    ),
})

// ===== STUDENT UPDATE SCHEMA =====

/**
 * Student update schema
 * Allows partial updates to student records
 */
export const studentUpdateSchema = studentRegistrationSchema.partial()

// ===== TYPE EXPORTS =====

/**
 * TypeScript type for base student data
 */
export type BaseStudentData = z.infer<typeof baseStudentSchema>

/**
 * TypeScript type for parent/guardian data
 */
export type ParentGuardianData = z.infer<typeof parentGuardianSchema>

/**
 * TypeScript type for social programs data
 */
export type SocialProgramsData = z.infer<typeof socialProgramsSchema>

/**
 * TypeScript type for complete student registration
 */
export type StudentRegistrationData = z.infer<typeof studentRegistrationSchema>

/**
 * TypeScript type for student update
 */
export type StudentUpdateData = z.infer<typeof studentUpdateSchema>

// ===== VALIDATION HELPERS =====

/**
 * Validates a complete student registration
 *
 * @param data - Student data to validate
 * @returns Validation result with errors if invalid
 */
export function validateStudentRegistration(data: unknown) {
  try {
    const result = studentRegistrationSchema.parse(data)
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
 * Validates student update data (partial validation)
 *
 * @param data - Partial student data to validate
 * @returns Validation result with errors if invalid
 */
export function validateStudentUpdate(data: unknown) {
  try {
    const result = studentUpdateSchema.parse(data)
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
 * Calculates student age from birth date
 *
 * @param birthDate - Student's birth date
 * @returns Age in years
 */
export function calculateStudentAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}
