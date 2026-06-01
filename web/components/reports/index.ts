/**
 * Reports Components Index
 * Task Group 3.3: Boletim do Aluno
 *
 * This module exports all report-related components for
 * both Ensino Fundamental and Educacao Infantil.
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/tasks.md
 */

// Student Report (Fundamental)
export { StudentReport, type StudentReportProps, type StudentInfo, type DisciplineGrade, type AttendanceSummary } from './StudentReport'
export { default as StudentReportDefault } from './StudentReport'

// Student Report (Infantil)
export { StudentReportInfantil, type StudentReportInfantilProps, type StudentInfoInfantil, type ReportSummary } from './StudentReportInfantil'
export { default as StudentReportInfantilDefault } from './StudentReportInfantil'

// Descriptive Report Form
export { DescriptiveReportForm, type DescriptiveReportFormProps } from './DescriptiveReportForm'
export { default as DescriptiveReportFormDefault } from './DescriptiveReportForm'

// Attendance Report Table
export { AttendanceReportTable, type AttendanceReportTableProps, type AttendanceTableRow } from './AttendanceReportTable'
export { default as AttendanceReportTableDefault } from './AttendanceReportTable'

// Bolsa Família Alert
export { BolsaFamiliaAlert, type BolsaFamiliaAlertProps } from './BolsaFamiliaAlert'
export { default as BolsaFamiliaAlertDefault } from './BolsaFamiliaAlert'
