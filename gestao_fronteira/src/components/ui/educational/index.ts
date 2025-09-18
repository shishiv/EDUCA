/**
 * Educational UI Components for Brazilian School Management
 *
 * This module provides specialized components for Brazilian educational contexts,
 * including Brazilian document validation, phone formatting, educational labels,
 * and attendance tracking optimized for tablets and mobile devices.
 */

// Input Components
export { CPFInput, type CPFInputProps } from './cpf-input';
export { PhoneInput, type PhoneInputProps } from './phone-input';

// Label Components
export { EducationalLabel, type EducationalLabelProps } from './educational-label';

// Attendance Components
export {
  AttendanceStatusButton,
  type AttendanceStatusButtonProps,
  type AttendanceStatus
} from './attendance-status-button';

// Re-export common types for convenience
export type { BrazilianPhoneFormat } from '@/lib/validators/brazilian/phone';