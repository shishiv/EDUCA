/**
 * Attendance Components Export Index
 * Centralized exports for attendance workflow and marking components
 * Educational Management System - Attendance Module
 */

// Main workflow components
export { FrequenciaWorkflow } from './FrequenciaWorkflow'
export { AbrirAulaWorkflow } from './AbrirAulaWorkflow'

// The canonical pilot flow starts at a turma and does not select a discipline.

// Attendance marking and session management
export { AttendanceGrid } from './AttendanceGrid'
export { AttendanceGridHeader } from './AttendanceGridHeader'
export { AttendanceGridRow } from './AttendanceGridRow'
export { AttendanceGridSummary } from './AttendanceGridSummary'
export { FecharAulaDialog } from './FecharAulaDialog'
export { AttendanceReopenPanel } from './AttendanceReopenPanel'

// Chamada page components (04-02-PLAN)
export { ChamadaHeader } from './ChamadaHeader'
export { ChamadaDateNav } from './ChamadaDateNav'
export { ChamadaStatusButtons } from './ChamadaStatusButtons'
export { JustificationModal } from './JustificationModal'

// Role-based access (12-01-PLAN)
export { ViewOnlyNotice } from './ViewOnlyNotice'

// Type exports
export type { AbrirAulaWorkflowProps } from './AbrirAulaWorkflow'
export type { AttendanceGridProps, AttendanceStats, SessionLockInfo } from './AttendanceGridTypes'
export type { AttendanceGridHeaderProps } from './AttendanceGridHeader'
export type { AttendanceGridRowProps } from './AttendanceGridRow'
export type { AttendanceGridSummaryProps } from './AttendanceGridSummary'
export type { FecharAulaDialogProps } from './FecharAulaDialog'
export type { AttendanceReopenPanelProps } from './AttendanceReopenPanel'
export type { ChamadaHeaderProps } from './ChamadaHeader'
export type { ChamadaDateNavProps } from './ChamadaDateNav'
export type { ChamadaStatusButtonsProps, AttendanceStatus } from './ChamadaStatusButtons'
export type { JustificationModalProps } from './JustificationModal'
