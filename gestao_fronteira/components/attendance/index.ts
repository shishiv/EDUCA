/**
 * Attendance Components Export Index
 * Centralized exports for attendance workflow and marking components
 * Educational Management System - Attendance Module
 */

// Main workflow components
export { FrequenciaWorkflow } from './FrequenciaWorkflow'
export { AbrirAulaWorkflow } from './AbrirAulaWorkflow'

// Attendance marking and session management
export { AttendanceGrid } from './AttendanceGrid'
export { FecharAulaDialog } from './FecharAulaDialog'

// Chamada page components (04-02-PLAN)
export { ChamadaHeader } from './ChamadaHeader'
export { ChamadaDateNav } from './ChamadaDateNav'
export { ChamadaStatusButtons } from './ChamadaStatusButtons'
export { JustificationModal } from './JustificationModal'

// Role-based access (12-01-PLAN)
export { ViewOnlyNotice } from './view-only-notice'

// Demo mode for admin (13-01-PLAN)
export { DemoModeBanner } from './demo-mode-banner'

// Type exports
export type { AbrirAulaWorkflowProps } from './AbrirAulaWorkflow'
export type { AttendanceGridProps } from './AttendanceGrid'
export type { FecharAulaDialogProps } from './FecharAulaDialog'
export type { ChamadaHeaderProps } from './ChamadaHeader'
export type { ChamadaDateNavProps } from './ChamadaDateNav'
export type { ChamadaStatusButtonsProps, AttendanceStatus } from './ChamadaStatusButtons'
export type { JustificationModalProps } from './JustificationModal'
