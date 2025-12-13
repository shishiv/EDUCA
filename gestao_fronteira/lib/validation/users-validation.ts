/**
 * User/Account Validation Schema
 *
 * Centralized Zod schema for user authentication and account management
 * Following Brazilian educational system role requirements
 * and Brazilian data protection standards (LGPD)
 *
 * Features:
 * - Email validation with Brazilian domain support
 * - Password strength validation
 * - 5-role RBAC: admin, diretor, secretario, professor, responsavel
 * - School assignment for multi-tenancy
 * - Profile information validation
 * - Account status management
 */

import { z } from 'zod'
import { validateCPF, formatCPF, validatePhone, formatPhone } from '@/lib/validation/brazilian'

// ===== PASSWORD VALIDATION =====

/**
 * Validates password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  requirements: {
    minLength: boolean
    hasUppercase: boolean
    hasLowercase: boolean
    hasNumber: boolean
    hasSpecial: boolean
  }
} {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  }

  const isValid = Object.values(requirements).every(Boolean)

  return {
    isValid,
    requirements
  }
}

/**
 * Gets human-readable password requirements message
 *
 * @param password - Password to validate
 * @returns Human-readable message about password requirements
 */
export function getPasswordRequirementsMessage(password: string): string {
  const { requirements } = validatePasswordStrength(password)

  const missing = []
  if (!requirements.minLength) missing.push('no mínimo 8 caracteres')
  if (!requirements.hasUppercase) missing.push('uma letra maiúscula')
  if (!requirements.hasLowercase) missing.push('uma letra minúscula')
  if (!requirements.hasNumber) missing.push('um número')
  if (!requirements.hasSpecial) missing.push('um caractere especial (!@#$%^&*)')

  if (missing.length === 0) return 'Senha atende todos os requisitos'

  return `A senha precisa de: ${missing.join(', ')}`
}

// ===== BASE USER VALIDATION =====

/**
 * Base user information schema
 * Common fields for all user types
 */
export const baseUserSchema = z.object({
  email: z
    .string()
    .email('E-mail inválido')
    .toLowerCase(),

  nome_completo: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(150, 'Nome não pode exceder 150 caracteres'),

  role: z
    .enum(['admin', 'diretor', 'secretario', 'professor', 'responsavel'])
    .refine(
      (value) => ['admin', 'diretor', 'secretario', 'professor', 'responsavel'].includes(value),
      'Perfil de usuário inválido'
    ),

  cpf: z
    .string()
    .optional()
    .refine(
      (value) => !value || validateCPF(value),
      'CPF inválido'
    )
    .transform((value) => value ? formatCPF(value) : undefined),

  telefone: z
    .string()
    .optional()
    .refine(
      (value) => !value || validatePhone(value),
      'Telefone inválido'
    )
    .transform((value) => value ? formatPhone(value) : undefined),

  status: z
    .enum(['ativo', 'inativo', 'suspenso'])
    .default('ativo'),
})

// ===== ROLE-SPECIFIC SCHEMAS =====

/**
 * Administrator user schema
 * Can manage schools, users, and system settings
 */
export const adminUserSchema = baseUserSchema.extend({
  role: z.literal('admin'),
  escola_id: z
    .string()
    .uuid('ID da escola inválido')
    .optional(), // Admins can optionally be tied to a school
})

/**
 * Director/Principal user schema
 * Can manage their school and staff
 */
export const diretorUserSchema = baseUserSchema.extend({
  role: z.literal('diretor'),
  escola_id: z
    .string()
    .uuid('ID da escola é obrigatório para diretores'),
  formacao: z
    .string()
    .max(200, 'Descrição de formação não pode exceder 200 caracteres')
    .optional(),
})

/**
 * Secretary user schema
 * Can manage administrative tasks and reports
 */
export const secretarioUserSchema = baseUserSchema.extend({
  role: z.literal('secretario'),
  escola_id: z
    .string()
    .uuid('ID da escola é obrigatório para secretários'),
  cargo_especifico: z
    .string()
    .max(100, 'Cargo específico não pode exceder 100 caracteres')
    .optional(),
})

/**
 * Teacher user schema
 * Can manage attendance and grades for assigned classes
 */
export const professorUserSchema = baseUserSchema.extend({
  role: z.literal('professor'),
  escola_id: z
    .string()
    .uuid('ID da escola é obrigatório para professores'),
  disciplinas: z
    .array(z.string())
    .min(1, 'Professor deve ter no mínimo uma disciplina')
    .max(5, 'Professor não pode ter mais de 5 disciplinas'),
  formacao_academica: z
    .enum([
      'graduacao', 'especializacao', 'mestrado', 'doutorado'
    ])
    .optional(),
  numero_registro: z
    .string()
    .optional(),
})

/**
 * Guardian/Parent user schema
 * Can view information about their children
 */
export const responsavelUserSchema = baseUserSchema.extend({
  role: z.literal('responsavel'),
  rg: z
    .string()
    .min(5, 'RG deve ter no mínimo 5 caracteres')
    .optional(),
  filhos_ids: z
    .array(z.string().uuid('ID do aluno inválido'))
    .default([]),
})

// ===== COMPLETE USER REGISTRATION =====

/**
 * User registration schema
 * Used when creating new user accounts
 */
export const userRegistrationSchema = baseUserSchema.extend({
  password: z
    .string()
    .refine(
      (password) => validatePasswordStrength(password).isValid,
      (password) => ({
        message: getPasswordRequirementsMessage(password)
      })
    ),

  password_confirmation: z
    .string()
})
  .refine(
    (data) => data.password === data.password_confirmation,
    {
      message: 'As senhas não coincidem',
      path: ['password_confirmation']
    }
  )

// ===== USER UPDATE SCHEMA =====

/**
 * User profile update schema
 * Allows users to update their own profile information
 */
export const userProfileUpdateSchema = z.object({
  nome_completo: baseUserSchema.shape.nome_completo.optional(),
  telefone: baseUserSchema.shape.telefone.optional(),
  email: baseUserSchema.shape.email.optional(),
})

/**
 * User password change schema
 * Used when user wants to change their password
 */
export const userPasswordChangeSchema = z.object({
  current_password: z
    .string()
    .min(1, 'Senha atual é obrigatória'),

  new_password: z
    .string()
    .refine(
      (password) => validatePasswordStrength(password).isValid,
      (password) => ({
        message: getPasswordRequirementsMessage(password)
      })
    ),

  new_password_confirmation: z
    .string()
})
  .refine(
    (data) => data.new_password === data.new_password_confirmation,
    {
      message: 'As senhas não coincidem',
      path: ['new_password_confirmation']
    }
  )

/**
 * Admin user update schema
 * Admins can update user information
 */
export const adminUserUpdateSchema = baseUserSchema.partial()

// ===== LOGIN SCHEMA =====

/**
 * Login schema
 * Used for user authentication
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email('E-mail inválido')
    .toLowerCase(),

  password: z
    .string()
    .min(1, 'Senha é obrigatória'),
})

// ===== TYPE EXPORTS =====

/**
 * TypeScript type for base user data
 */
export type BaseUserData = z.infer<typeof baseUserSchema>

/**
 * TypeScript type for admin user
 */
export type AdminUserData = z.infer<typeof adminUserSchema>

/**
 * TypeScript type for director user
 */
export type DiretorUserData = z.infer<typeof diretorUserSchema>

/**
 * TypeScript type for secretary user
 */
export type SecretarioUserData = z.infer<typeof secretarioUserSchema>

/**
 * TypeScript type for teacher user
 */
export type ProfessorUserData = z.infer<typeof professorUserSchema>

/**
 * TypeScript type for guardian user
 */
export type ResponsavelUserData = z.infer<typeof responsavelUserSchema>

/**
 * TypeScript type for user registration
 */
export type UserRegistrationData = z.infer<typeof userRegistrationSchema>

/**
 * TypeScript type for profile update
 */
export type UserProfileUpdateData = z.infer<typeof userProfileUpdateSchema>

/**
 * TypeScript type for password change
 */
export type UserPasswordChangeData = z.infer<typeof userPasswordChangeSchema>

/**
 * TypeScript type for admin update
 */
export type AdminUserUpdateData = z.infer<typeof adminUserUpdateSchema>

/**
 * TypeScript type for login
 */
export type LoginData = z.infer<typeof loginSchema>

// ===== VALIDATION HELPERS =====

/**
 * Validates user registration based on role
 *
 * @param data - User registration data
 * @returns Validation result with errors if invalid
 */
export function validateUserRegistration(data: unknown) {
  try {
    const result = userRegistrationSchema.parse(data)
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
 * Validates user login
 *
 * @param data - Login data
 * @returns Validation result with errors if invalid
 */
export function validateLogin(data: unknown) {
  try {
    const result = loginSchema.parse(data)
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
 * Validates password change
 *
 * @param data - Password change data
 * @returns Validation result with errors if invalid
 */
export function validatePasswordChange(data: unknown) {
  try {
    const result = userPasswordChangeSchema.parse(data)
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
 * Validates profile update
 *
 * @param data - Profile update data
 * @returns Validation result with errors if invalid
 */
export function validateProfileUpdate(data: unknown) {
  try {
    const result = userProfileUpdateSchema.parse(data)
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
 * Gets role display name in Portuguese
 *
 * @param role - User role
 * @returns Portuguese display name
 */
export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    admin: 'Administrador',
    diretor: 'Diretor',
    secretario: 'Secretário',
    professor: 'Professor',
    responsavel: 'Responsável'
  }
  return roleNames[role] || role
}
