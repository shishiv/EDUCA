/**
 * UI & Generic Hooks Barrel Export
 *
 * This file re-exports all UI-focused and generic hooks for convenient importing.
 * These hooks are reusable across multiple features and projects.
 *
 * Usage:
 * ```tsx
 * import { useAuth, useToast, useServiceWorker } from '@/hooks'
 * ```
 */

// Authentication & User Management
export { useAuth } from './use-auth'
export type { } from './use-auth'

// UI Notifications
export { useToast, toast } from './use-toast'
export type { } from './use-toast'

// Real-time Updates
export { useAulaRealtime } from './use-aula-realtime'
export type { AulaStatus } from './use-aula-realtime'

// Service Worker & Offline Support
export { useServiceWorker } from './use-service-worker'
export type { } from './use-service-worker'

// Compliance & Warnings
export { useComplianceWarnings } from './use-compliance-warnings'
export type { } from './use-compliance-warnings'

// User Data Management
export {
  useUsersWithSchool,
  useUser,
  useUserStats,
  useCreateUser,
  useUpdateUser,
  useUpdateUserStatus,
  useBulkUpdateUserStatus,
  useBulkAssignSchool,
  useUsersSubscription,
  useSearchUsers,
  useUserRoleHelpers,
} from './use-users-query'
export type { } from './use-users-query'
