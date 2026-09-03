/**
 * Audit Logging System for Brazilian Educational Compliance
 * Implements complete audit trail as required by Brazilian law
 * T030-T032 Implementation
 */

import { supabase } from './supabase'

export interface AuditLog {
  id?: string
  user_id: string
  action: AuditAction
  table_name: string
  record_id: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  timestamp?: string
  ip_address?: string
  user_agent?: string
  escola_id?: string
  details?: Record<string, any>
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
  auditData: Omit<AuditLog, 'id' | 'timestamp'>,
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
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>,
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
export const getAuditLogs = async (options?: {
  userId?: string
  schoolId?: string
  action?: AuditAction
  tableName?: string
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<AuditLog[]> => {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })

    if (options?.userId) {
      query = query.eq('user_id', options.userId)
    }

    if (options?.schoolId) {
      query = query.eq('escola_id', options.schoolId)
    }

    if (options?.action) {
      query = query.eq('action', options.action)
    }

    if (options?.tableName) {
      query = query.eq('table_name', options.tableName)
    }

    if (options?.startDate) {
      query = query.gte('timestamp', options.startDate)
    }

    if (options?.endDate) {
      query = query.lte('timestamp', options.endDate)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      return []
    }

    // Cast database rows to AuditLog interface
    // Note: action in database is string, we cast to AuditAction for type safety
    return (data || []).map(row => ({
      id: row.id,
      user_id: row.user_id,
      action: row.action as AuditAction,
      table_name: row.table_name,
      record_id: row.record_id,
      old_values: row.old_values as Record<string, unknown> | undefined,
      new_values: row.new_values as Record<string, unknown> | undefined,
      timestamp: row.timestamp ?? undefined,
      ip_address: row.ip_address ?? undefined,
      user_agent: row.user_agent ?? undefined,
      escola_id: row.escola_id ?? undefined,
      details: row.details as Record<string, unknown> | undefined
    }))
  } catch (error) {
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

  const summary = {
    total_events: logs.length,
    user_actions: logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1
      return acc
    }, {} as Record<string, number>),
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
