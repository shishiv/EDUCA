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

// ===== BRAZILIAN VALIDATORS (FORM SCHEMAS) =====
// Core validation functions and Zod schemas for Brazilian data forms

export {
  // CPF validation
  validateCPF,
  formatCPF,
  // Phone validation
  validateBrazilianPhone,
  formatBrazilianPhone,
  // CEP validation
  validateCEP,
  formatCEP,
  // Educational
  validateINEPCode,
  formatINEPCode,
  validateAcademicYear,
  calculateAge,
  validateStudentAge,
  calculateAttendanceRate,
  getAttendanceStatus,
  validateMinimumAttendance,
  // Schemas
  cpfSchema,
  brazilianPhoneSchema,
  cepSchema,
  academicYearSchema,
  attendanceRateSchema,
  inepCodeSchema,
  studentFormSchema,
  userFormSchema,
  schoolFormSchema,
  classFormSchema,
  // Types
  type StudentFormData,
  type UserFormData,
  type SchoolFormData,
  type ClassFormData,
} from '@/lib/validation/brazilian'

// ===== BRAZILIAN EDUCATIONAL VALIDATORS =====
// Extended Brazilian educational validation (CNPJ, NIS, INEP, etc.)

export {
  validateCNPJ,
  formatCNPJ,
  validateINEP,
  validateNIS,
  validateStateRegistration,
  validateSchoolDate,
  validateAttendancePercentage,
  // Schemas
  brazilianCPFSchema,
  brazilianCNPJSchema,
  nisSchema,
  studentRegistrationSchema as educationalStudentSchema,
  guardianRegistrationSchema,
  attendanceSessionSchema,
  // Helpers
  validationHelpers,
  schemas as brazilianSchemas,
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

// ===== ACCESSIBILITY VALIDATION =====
// WCAG 2.1 AA and Brazilian LBI 13.146/2015 compliance

export * from '@/lib/validation/accessibility'

// ===== ATTENDANCE WORKFLOW VALIDATION =====
// Brazilian educational attendance compliance

export * from '@/lib/validation/attendance'

// ===== PERFORMANCE VALIDATION =====
// Classroom-optimized application performance

export * from '@/lib/validation/performance'

// ===== PHONE VALIDATION ALIASES =====
// Short function names for internal use

export {
  validatePhone,
  formatPhone,
} from '@/lib/validation/brazilian'

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
