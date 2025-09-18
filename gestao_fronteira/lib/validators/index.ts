/**
 * Brazilian Educational System Validation Utilities
 * Comprehensive validation library for educational management systems
 *
 * This module exports all validation utilities for:
 * - Brazilian data validation (CPF, phone, CEP)
 * - Educational attendance tracking and compliance
 * - Accessibility validation (WCAG 2.1 AA, LBI 13.146/2015)
 * - Performance monitoring for classroom applications
 */

// Core Brazilian validation utilities
export * from './brazilian'

// Attendance validation for Brazilian educational compliance
export * from './attendance'

// Accessibility validation for WCAG 2.1 AA and Brazilian LBI standards
export * from './accessibility'

// Performance validation for classroom-optimized applications
export * from './performance'

// Re-export commonly used types for convenience
export type {
  StudentFormData,
  UserFormData,
  SchoolFormData,
  ClassFormData
} from './brazilian'

export type {
  AttendanceStatus,
  AttendanceMarkingData,
  ClassSessionData,
  AttendanceBulkUpdateData
} from './attendance'

export type {
  ContrastLevel,
  AccessibilityIssueType,
  AccessibilityConfig,
  ColorContrastTest
} from './accessibility'

export type {
  PerformanceThreshold,
  ComponentType,
  PerformanceMetrics,
  APIPerformanceMetrics,
  BundleAnalysis
} from './performance'

/**
 * Quick validation functions for common use cases
 */

/**
 * Validates Brazilian student data comprehensively
 * @param data Student form data
 * @returns Validation result with detailed feedback
 */
export function validateBrazilianStudent(data: any) {
  const { studentFormSchema } = require('./brazilian')
  return studentFormSchema.safeParse(data)
}

/**
 * Validates attendance marking with Brazilian compliance
 * @param data Attendance marking data
 * @returns Validation result
 */
export function validateAttendanceMarking(data: any) {
  const { attendanceMarkingSchema } = require('./attendance')
  return attendanceMarkingSchema.safeParse(data)
}

/**
 * Validates component accessibility for Brazilian standards
 * @param colorForeground Foreground color (hex)
 * @param colorBackground Background color (hex)
 * @returns Accessibility validation result
 */
export function validateBrazilianAccessibility(
  colorForeground: string,
  colorBackground: string
) {
  const { validateColorContrast, validateEducationalColors } = require('./accessibility')

  const contrastValid = validateColorContrast(colorForeground, colorBackground, 'AA')
  const educationalValid = validateEducationalColors({
    backgroundColor: colorBackground,
    textColor: colorForeground,
    purpose: 'general'
  })

  return {
    contrastValid,
    educationalValid,
    brazilianCompliant: contrastValid && educationalValid.valid
  }
}

/**
 * Validates classroom performance requirements
 * @param componentType Type of component
 * @param loadTime Loading time in milliseconds
 * @returns Performance validation result
 */
export function validateClassroomPerformance(
  componentType: ComponentType,
  loadTime: number
) {
  const { evaluatePerformance } = require('./performance')
  return evaluatePerformance(loadTime, componentType)
}

/**
 * Complete validation suite for Brazilian educational interfaces
 * @param validationData Comprehensive validation data
 * @returns Complete validation report
 */
export function validateEducationalInterface(validationData: {
  studentData?: any
  attendanceData?: any
  colors?: { foreground: string; background: string }
  performance?: { componentType: ComponentType; loadTime: number }
}) {
  const results = {
    student: null as any,
    attendance: null as any,
    accessibility: null as any,
    performance: null as any,
    overall: {
      valid: true,
      brazilianCompliant: true,
      classroomReady: true,
      issues: [] as string[],
      recommendations: [] as string[]
    }
  }

  // Validate student data
  if (validationData.studentData) {
    results.student = validateBrazilianStudent(validationData.studentData)
    if (!results.student.success) {
      results.overall.valid = false
      results.overall.issues.push('Dados do estudante inválidos')
    }
  }

  // Validate attendance data
  if (validationData.attendanceData) {
    results.attendance = validateAttendanceMarking(validationData.attendanceData)
    if (!results.attendance.success) {
      results.overall.valid = false
      results.overall.issues.push('Dados de frequência inválidos')
    }
  }

  // Validate accessibility
  if (validationData.colors) {
    results.accessibility = validateBrazilianAccessibility(
      validationData.colors.foreground,
      validationData.colors.background
    )
    if (!results.accessibility.brazilianCompliant) {
      results.overall.brazilianCompliant = false
      results.overall.issues.push('Interface não atende padrões brasileiros de acessibilidade')
    }
  }

  // Validate performance
  if (validationData.performance) {
    results.performance = validateClassroomPerformance(
      validationData.performance.componentType,
      validationData.performance.loadTime
    )
    if (!results.performance.acceptable) {
      results.overall.classroomReady = false
      results.overall.issues.push('Performance inadequada para uso em sala de aula')
    }
  }

  // Generate recommendations
  if (!results.overall.valid) {
    results.overall.recommendations.push('Corrija os dados inválidos antes de prosseguir')
  }
  if (!results.overall.brazilianCompliant) {
    results.overall.recommendations.push('Ajuste cores e contraste para atender LBI 13.146/2015')
  }
  if (!results.overall.classroomReady) {
    results.overall.recommendations.push('Otimize performance para uso eficiente em tablets educacionais')
  }

  return results
}

/**
 * Version information for the validation utilities
 */
export const VALIDATION_VERSION = '1.0.0'
export const BRAZILIAN_COMPLIANCE_VERSION = 'LBI-13.146/2015'
export const WCAG_COMPLIANCE_VERSION = 'WCAG-2.1-AA'

/**
 * Supported Brazilian educational standards
 */
export const SUPPORTED_STANDARDS = {
  cpf: 'Receita Federal do Brasil',
  phone: 'ANATEL (Agência Nacional de Telecomunicações)',
  accessibility: 'Lei Brasileira de Inclusão (LBI 13.146/2015)',
  education: 'Lei de Diretrizes e Bases da Educação (LDB 9.394/96)',
  attendance: 'Resolução CNE/CEB nº 4/2010',
  wcag: 'Web Content Accessibility Guidelines 2.1 AA'
} as const