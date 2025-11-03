/**
 * Centralized Validation Library
 *
 * This module exports all validation schemas and helpers for the educational
 * management system. All validation logic should be imported from here for
 * consistency across the application.
 *
 * Organization:
 * - brazilian-educational: Core Brazilian data validators (CPF, phone, etc.)
 * - students-validation: Student registration and profile schemas
 * - schools-validation: School and institution schemas
 * - users-validation: User authentication and account schemas
 *
 * Usage:
 * ```typescript
 * import {
 *   studentRegistrationSchema,
 *   validateStudentRegistration,
 *   validateCPF
 * } from '@/lib/validation'
 * ```
 */

// ===== BRAZILIAN EDUCATIONAL VALIDATORS =====
// Core validation functions and Zod schemas for Brazilian data

export {
  // CPF validation
  validateCPF,
  formatCPF,
  // Phone validation
  validatePhone,
  formatPhone,
  getPhoneType,
  // Educational
  validateINEPCode,
  formatINEPCode,
  validateNIS,
  calculateAttendanceRate,
  getAttendanceStatus,
  validateMinimumAttendance,
  calculateAge,
  validateStudentAge,
  // Schemas
  cpfSchema,
  brazilianPhoneSchema,
  studentFormSchema,
  userFormSchema,
  schoolFormSchema,
  classFormSchema,
} from '@/lib/validation/brazilian-educational'

// ===== STUDENT VALIDATION =====
// Complete student registration and profile management

export {
  // Schemas
  baseStudentSchema,
  parentGuardianSchema,
  socialProgramsSchema,
  studentRegistrationSchema,
  studentUpdateSchema,
  // Types
  type BaseStudentData,
  type ParentGuardianData,
  type SocialProgramsData,
  type StudentRegistrationData,
  type StudentUpdateData,
  // Functions
  validateStudentRegistration,
  validateStudentUpdate,
  calculateStudentAge,
} from '@/lib/validation/students-validation'

// ===== SCHOOL VALIDATION =====
// School/institution registration and management

export {
  // Functions
  validateINEPCode as validateSchoolINEPCode,
  formatINEPCode as formatSchoolINEPCode,
  validateCNPJ,
  formatCNPJ,
  validateCEP,
  formatCEP,
  // Schemas
  baseSchoolSchema,
  schoolScheduleSchema,
  schoolRegistrationSchema,
  schoolUpdateSchema,
  // Types
  type BaseSchoolData,
  type SchoolScheduleData,
  type SchoolRegistrationData,
  type SchoolUpdateData,
  // Functions
  validateSchoolRegistration,
  validateSchoolUpdate,
  validateAtLeastOneTurno,
} from '@/lib/validation/schools-validation'

// ===== USER VALIDATION =====
// User authentication and account management

export {
  // Functions
  validatePasswordStrength,
  getPasswordRequirementsMessage,
  getRoleDisplayName,
  // Schemas
  baseUserSchema,
  adminUserSchema,
  diretorUserSchema,
  secretarioUserSchema,
  professorUserSchema,
  responsavelUserSchema,
  userRegistrationSchema,
  userProfileUpdateSchema,
  userPasswordChangeSchema,
  adminUserUpdateSchema,
  loginSchema,
  // Types
  type BaseUserData,
  type AdminUserData,
  type DiretorUserData,
  type SecretarioUserData,
  type ProfessorUserData,
  type ResponsavelUserData,
  type UserRegistrationData,
  type UserProfileUpdateData,
  type UserPasswordChangeData,
  type AdminUserUpdateData,
  type LoginData,
  // Functions
  validateUserRegistration,
  validateLogin,
  validatePasswordChange,
  validateProfileUpdate,
} from '@/lib/validation/users-validation'

// ===== RE-EXPORT FROM BRAZILIAN VALIDATORS =====
// Make sure all functions from brazilian validators are available

export {
  validateCPF as validateBrazilianCPF,
  formatCPF as formatBrazilianCPF,
  validatePhone as validateBrazilianPhone,
  formatPhone as formatBrazilianPhone,
  getPhoneType as getBrazilianPhoneType,
  validateINEPCode as validateBrazilianINEPCode,
  formatINEPCode as formatBrazilianINEPCode,
  validateNIS as validateBrazilianNIS,
  calculateAttendanceRate as calculateBrazilianAttendanceRate,
  getAttendanceStatus as getBrazilianAttendanceStatus,
  validateMinimumAttendance as validateBrazilianMinimumAttendance,
} from '@/lib/validators/brazilian'

/**
 * Summary of validation modules
 *
 * 1. Brazilian Educational Validators
 *    - Core CPF, CNPJ, phone, CEP, INEP code validation
 *    - Educational-specific helpers (age, attendance, etc.)
 *    - Re-exported from lib/validators/brazilian for consistency
 *
 * 2. Student Validation
 *    - Student registration with family information
 *    - Social programs (Bolsa Família, etc.)
 *    - Supports multi-guardian family structures
 *    - LGPD compliance for data collection
 *
 * 3. School Validation
 *    - School registration with INEP codes
 *    - Operating schedules (turnos)
 *    - Infrastructure and services tracking
 *    - Director and contact information
 *
 * 4. User Validation
 *    - 5-role RBAC (admin, diretor, secretario, professor, responsavel)
 *    - Password strength validation
 *    - Role-specific schema extensions
 *    - LGPD-compliant account management
 *
 * All schemas use Zod for runtime type safety and can be used both
 * client-side (for UX feedback) and server-side (for data security).
 */

// ===== TYPE UNION EXPORTS =====

/**
 * Union type for any user role
 */
export type AnyUserRole = 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel'

/**
 * Union type for user data based on role
 */
export type UserDataByRole = {
  admin: AdminUserData
  diretor: DiretorUserData
  secretario: SecretarioUserData
  professor: ProfessorUserData
  responsavel: ResponsavelUserData
}

/**
 * Union type for any user data
 */
export type AnyUserData =
  | AdminUserData
  | DiretorUserData
  | SecretarioUserData
  | ProfessorUserData
  | ResponsavelUserData
