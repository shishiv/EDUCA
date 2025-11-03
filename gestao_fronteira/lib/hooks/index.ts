/**
 * Educational Domain Hooks Barrel Export
 *
 * This file re-exports all specialized hooks for educational domain operations.
 * These hooks implement complex business logic specific to attendance workflows,
 * compliance management, and Brazilian educational standards.
 *
 * Usage:
 * ```tsx
 * import {
 *   useAttendanceWorkflow,
 *   useAttendanceLocking,
 *   useAttendanceHistory,
 *   useRealtimeAttendance
 * } from '@/lib/hooks'
 * ```
 */

// Attendance Workflow Management
export { useAttendanceWorkflow } from './use-attendance-workflow'
export type { } from './use-attendance-workflow'

// Attendance Record Locking
export { useAttendanceLocking } from './use-attendance-locking'
export type { } from './use-attendance-locking'

// Attendance History & Audit
export { useAttendanceHistory } from './use-attendance-history'
export type { } from './use-attendance-history'

// Real-time Attendance Coordination
export { useRealtimeAttendance, useRealtimeClassMonitoring } from './use-realtime-attendance'
export type { } from './use-realtime-attendance'
