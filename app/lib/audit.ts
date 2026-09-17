/**
 * Audit Logging System for Brazilian Educational Compliance
 * Implements complete audit trail as required by Brazilian law
 * T030-T032 Implementation
 */

import { supabase, type Tables } from './supabase'
import type { Json } from '@/types/database'

export interface AuditEventFields {
  readonly [key: string]: Json | undefined
}

export interface AuditEvent {
  user_id: string
  action: AuditAction
  table_name: string
  record_id: string
  old_values?: AuditEventFields
  new_values?: AuditEventFields
  ip_address?: string
  user_agent?: string
  escola_id?: string
  details?: AuditEventFields
}

type AuditLogRow = Tables<'audit_logs'>
type NormalizedAuditJson = Exclude<AuditLogRow['old_values'], null>

export type AuditLog = Omit<
  AuditLogRow,
  | 'created_at'
  | 'old_values'
  | 'new_values'
  | 'timestamp'
  | 'ip_address'
  | 'user_agent'
  | 'escola_id'
  | 'details'
> & {
  old_values?: NormalizedAuditJson
  new_values?: NormalizedAuditJson
  timestamp?: string
  ip_address?: string
  user_agent?: string
  escola_id?: string
  details?: NormalizedAuditJson
}

export type AuditAction =
  // Authentication events
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'session_expired'
  | 'password_changed'
  // User management
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_activated'
  | 'user_deactivated'
  // Student management
  | 'student_created'
  | 'student_updated'
  | 'student_deleted'
  | 'enrollment_created'
  | 'enrollment_updated'
  // Attendance tracking (CRITICAL for Brazilian compliance)
  | 'attendance_marked'
  | 'class_opened'
  | 'class_closed'
  | 'attendance_report_generated'
  // Configuration changes
  | 'config_updated'
  | 'system_config_changed'
  // Reports and exports
  | 'report_generated'
  | 'data_exported'
  // School management
  | 'school_created'
  | 'school_updated'
  // Grade management
  | 'grade_entered'
  | 'grade_updated'
  | 'grade_report_generated'

/**
 * Core audit logging function
 * Logs all significant actions for regulatory compliance
 * @param auditData - The audit data to log
 * @param headers - Optional request headers for server-side IP detection
 */
export const logAuditEvent = async (
  auditData: AuditEvent,
  _headers?: Headers
): Promise<void> => {
  if (typeof window === 'undefined') {
    throw new Error('PILOT_AUDIT_SERVER_ENDPOINT_REQUIRED: server callers must write through the database audit RPC')
  }
  const response = await fetch('/api/pilot/audit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventType: auditData.action,
      entityType: auditData.table_name,
      entityId: auditData.record_id,
      schoolId: auditData.escola_id ?? null,
      metadata: {
        changedFields: Object.keys(auditData.new_values || {}),
        hadPreviousValues: Boolean(auditData.old_values),
        detailFields: Object.keys(auditData.details || {}),
      },
    }),
  })
  if (!response.ok) {
    throw new Error(`PILOT_AUDIT_WRITE_FAILED: server returned ${response.status}`)
  }
}

/**
 * Brazilian Educational Compliance Helpers
 */

/**
 * Log attendance marking - CRITICAL for Brazilian compliance
 * Attendance records are legal documents and cannot be changed retroactively
 */
export const logAttendanceEvent = async (
  userId: string,
  studentId: string,
  classId: string,
  present: boolean,
  date: string,
  schoolId?: string
): Promise<void> => {
  await logAuditEvent({
    user_id: userId,
    action: 'attendance_marked',
    table_name: 'frequencia',
    record_id: `${studentId}_${classId}_${date}`,
    new_values: {
      student_id: studentId,
      class_id: classId,
      present,
      date,
      marked_at: new Date().toISOString()
    },
    escola_id: schoolId,
    details: {
      attendance_value: present,
      is_retroactive: false, // Critical: must always be false
      legal_document: true // Mark as legal document
    }
  })
}

/**
 * Log class opening - Required for "Abrir aula" workflow
 */
export const logClassOpenedEvent = async (
  userId: string,
  classId: string,
  subject: string,
  date: string,
  schoolId?: string
): Promise<void> => {
  await logAuditEvent({
    user_id: userId,
    action: 'class_opened',
    table_name: 'sessoes_aula',
    record_id: `${classId}_${date}`,
    new_values: {
      class_id: classId,
      subject,
      date,
      opened_at: new Date().toISOString(),
      teacher_id: userId
    },
    escola_id: schoolId,
    details: {
      workflow_step: 'abrir_aula',
      allows_attendance_marking: true
    }
  })
}

/**
 * Log user management events with RBAC context
 */
export const logUserEvent = async (
  actorUserId: string,
  action: AuditAction,
  targetUserId: string,
  oldValues?: AuditEventFields,
  newValues?: AuditEventFields,
  schoolId?: string
): Promise<void> => {
  await logAuditEvent({
    user_id: actorUserId,
    action,
    table_name: 'users',
    record_id: targetUserId,
    old_values: oldValues,
    new_values: newValues,
    escola_id: schoolId,
    details: {
      rbac_action: true,
      target_user: targetUserId
    }
  })
}

/**
 * Log configuration changes (requires elevated permissions)
 */
export const logConfigEvent = async (
  userId: string,
  configKey: string,
  oldValue: string,
  newValue: string,
  category: string
): Promise<void> => {
  await logAuditEvent({
    user_id: userId,
    action: 'config_updated',
    table_name: 'configurations',
    record_id: configKey,
    old_values: { [configKey]: oldValue },
    new_values: { [configKey]: newValue },
    details: {
      config_category: category,
      requires_elevated_permission: true,
      system_critical: ['ano_letivo_atual', 'frequencia_minima'].includes(configKey)
    }
  })
}

/**
 * Get audit logs for a specific user/school (respects RLS)
 */
export interface AuditLogQuery {
  userId?: string
  schoolId?: string
  action?: AuditAction
  tableName?: string
  startDate?: string
  endDate?: string
  limit?: number
}

function createAuditLogQuery() {
  return supabase
    .from('audit_logs')
    .select('*')
    .order('timestamp', { ascending: false })
}

type AuditLogBuilder = ReturnType<typeof createAuditLogQuery>

function applyAuditIdentityFilters(
  query: AuditLogBuilder,
  filters: AuditLogQuery,
): AuditLogBuilder {
  let filteredQuery = query
  if (filters.userId) filteredQuery = filteredQuery.eq('user_id', filters.userId)
  if (filters.schoolId) filteredQuery = filteredQuery.eq('escola_id', filters.schoolId)
  if (filters.action) filteredQuery = filteredQuery.eq('action', filters.action)
  if (filters.tableName) filteredQuery = filteredQuery.eq('table_name', filters.tableName)
  return filteredQuery
}

function applyAuditWindow(
  query: AuditLogBuilder,
  filters: AuditLogQuery,
): AuditLogBuilder {
  let filteredQuery = query
  if (filters.startDate) filteredQuery = filteredQuery.gte('timestamp', filters.startDate)
  if (filters.endDate) filteredQuery = filteredQuery.lte('timestamp', filters.endDate)
  if (filters.limit) filteredQuery = filteredQuery.limit(filters.limit)
  return filteredQuery
}

function toAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    user_id: row.user_id,
    action: row.action,
    table_name: row.table_name,
    record_id: row.record_id,
    old_values: row.old_values ?? undefined,
    new_values: row.new_values ?? undefined,
    timestamp: row.timestamp ?? undefined,
    ip_address: row.ip_address ?? undefined,
    user_agent: row.user_agent ?? undefined,
    escola_id: row.escola_id ?? undefined,
    details: row.details ?? undefined,
  }
}

export const getAuditLogs = async (options?: AuditLogQuery): Promise<AuditLog[]> => {
  try {
    const filters = options ?? {}
    const identityQuery = applyAuditIdentityFilters(createAuditLogQuery(), filters)
    const query = applyAuditWindow(identityQuery, filters)

    const { data, error } = await query

    if (error) {
      return []
    }

    return (data ?? []).map(toAuditLog)
  } catch {
    return []
  }
}

/**
 * Generate audit report for Brazilian compliance
 */
export const generateAuditReport = async (
  schoolId?: string,
  startDate?: string,
  endDate?: string
): Promise<{
  summary: {
    total_events: number
    user_actions: Record<string, number>
    critical_events: number
    attendance_events: number
  }
  events: AuditLog[]
}> => {
  const logs = await getAuditLogs({
    schoolId,
    startDate,
    endDate,
    limit: 1000
  })

  const userActions: Record<string, number> = {}
  for (const log of logs) {
    userActions[log.action] = (userActions[log.action] || 0) + 1
  }

  const summary = {
    total_events: logs.length,
    user_actions: userActions,
    critical_events: logs.filter(log =>
      ['attendance_marked', 'class_opened', 'grade_entered'].includes(log.action)
    ).length,
    attendance_events: logs.filter(log =>
      log.action === 'attendance_marked'
    ).length
  }

  return {
    summary,
    events: logs
  }
}
