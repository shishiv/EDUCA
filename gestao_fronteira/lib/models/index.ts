/**
 * Models index - Brazilian Educational System constants
 *
 * Note: Previous model implementations (audit-checklist, mockup-inventory, mcp-configuration)
 * were removed as unused (2025-01-20 cleanup). This file now contains only
 * educational system constants that may be referenced in the future.
 */

/**
 * Brazilian Educational System constants
 */
export const BrazilianEducationalConstants = {
  userRoles: ['admin', 'diretor', 'secretario', 'professor', 'responsavel'] as const,
  schoolTypes: ['municipal', 'estadual', 'federal', 'particular'] as const,
  complianceRequirements: ['LGPD', 'LBI_13146', 'Educational_Standards', 'Attendance_Tracking'] as const,
  workflows: [
    'student_registration',
    'attendance_marking',
    'grade_entry',
    'report_generation',
    'user_management',
    'school_administration'
  ] as const,
  accessibilityLevels: ['none', 'basic', 'wcag_a', 'wcag_aa', 'wcag_aaa', 'lbi_compliant'] as const
}
