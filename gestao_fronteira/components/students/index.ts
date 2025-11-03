/**
 * Student Components Export Index
 * Centralized exports for student registration and management components
 * Educational Management System - Student Module
 */

// Student registration components
export { StudentRegistrationForm } from './student-registration-form'
export { EnhancedStudentRegistrationForm } from './enhanced-student-registration-form'
export { StudentRegistrationWizard } from './student-registration-wizard'

// Wizard step components
export { PersonalInfoStep } from './wizard-steps/personal-info-step'
export { ContactInfoStep } from './wizard-steps/contact-info-step'
export { EducationalInfoStep } from './wizard-steps/educational-info-step'
export { FamilyInfoStep } from './wizard-steps/family-info-step'
export { HealthInfoStep } from './wizard-steps/health-info-step'
export { ReviewStep } from './wizard-steps/review-step'

// Type exports
export type { StudentFormData } from '@/lib/validators/brazilian'
