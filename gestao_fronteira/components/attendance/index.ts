/**
 * Attendance Components Export Index
 * Centralized exports for attendance workflow and marking components
 * Educational Management System - Attendance Module
 */

// Main workflow components
export { FrequenciaWorkflow } from './FrequenciaWorkflow'
export { AbrirAulaWorkflow } from './AbrirAulaWorkflow'

// Workflow subcomponents (15-09-PLAN refactor)
export { WorkflowStepIndicator } from './WorkflowStepIndicator'
export { DisciplinaSelector } from './DisciplinaSelector'
export { TurmaSelector } from './TurmaSelector'

// Attendance marking and session management
export { AttendanceGrid } from './AttendanceGrid'
export { AttendanceGridHeader } from './AttendanceGridHeader'
export { AttendanceGridRow } from './AttendanceGridRow'
export { AttendanceGridSummary } from './AttendanceGridSummary'
export { FecharAulaDialog } from './FecharAulaDialog'

// Chamada page components (04-02-PLAN)
export { ChamadaHeader } from './ChamadaHeader'
export { ChamadaDateNav } from './ChamadaDateNav'
export { ChamadaStatusButtons } from './ChamadaStatusButtons'
export { JustificationModal } from './JustificationModal'

// Role-based access (12-01-PLAN)
export { ViewOnlyNotice } from './ViewOnlyNotice'

// Demo mode for admin (13-01-PLAN)
export { DemoModeBanner } from './DemoModeBanner'

// Type exports
export type { AbrirAulaWorkflowProps } from './AbrirAulaWorkflow'
export type { WorkflowStep, WorkflowStepIndicatorProps } from './WorkflowStepIndicator'
export type { Disciplina, DisciplinaSelectorProps } from './DisciplinaSelector'
export type { Turma, TurmaSelectorProps } from './TurmaSelector'
export type { AttendanceGridProps, AttendanceStats, SessionLockInfo } from './AttendanceGridTypes'
export type { AttendanceGridHeaderProps } from './AttendanceGridHeader'
export type { AttendanceGridRowProps } from './AttendanceGridRow'
export type { AttendanceGridSummaryProps } from './AttendanceGridSummary'
export type { FecharAulaDialogProps } from './FecharAulaDialog'
export type { ChamadaHeaderProps } from './ChamadaHeader'
export type { ChamadaDateNavProps } from './ChamadaDateNav'
export type { ChamadaStatusButtonsProps, AttendanceStatus } from './ChamadaStatusButtons'
export type { JustificationModalProps } from './JustificationModal'
