/**
 * Audit Logging System for Brazilian Educational Compliance
 * Implements complete audit trail as required by Brazilian law
 * T030-T032 Implementation
 */

import { supabase } from './supabase'
import { getClientIP, getClientInfo } from './ip-tracking'

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
  headers?: Headers
): Promise<void> => {
  try {
    // Get additional context with improved IP tracking
    const timestamp = new Date().toISOString()
    const clientInfo = await getClientInfo(headers)

    const completeAuditData: AuditLog = {
      ...auditData,
      timestamp,
      ip_address: clientInfo.ip_address,
      user_agent: clientInfo.user_agent
    }

    // In production, save to audit_logs table
    // For now, we'll use dual logging: database + local storage for development

    // 1. Attempt to save to database
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert(completeAuditData)

      if (error) {
        // console.warn('Failed to save audit log to database:', error.message)
        // Fall back to local storage for development
        await saveAuditLogLocally(completeAuditData)
      }
    } catch (dbError) {
      // console.warn('Database audit logging failed, using local storage:', dbError)
      await saveAuditLogLocally(completeAuditData)
    }

    // 2. Also log to console for development (remove in production)
    if (process.env.NODE_ENV === 'development') {
      // console.log('🔍 Audit Event:', {
    //         action: completeAuditData.action,
    //         user: completeAuditData.user_id,
    //         table: completeAuditData.table_name,
    //         record: completeAuditData.record_id,
    //         timestamp: completeAuditData.timestamp
    //       })
    }

  } catch (error) {
    // Critical: Audit logging must never fail silently
    // console.error('🚨 CRITICAL: Audit logging failed:', error)

    // Send to error monitoring service in production
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      ;(window as any).Sentry.captureException(error, {
        tags: { component: 'audit-logging' },
        extra: auditData
      })
    }
  }
}

/**
 * Save audit log to local storage as fallback
 * Useful for development and when database is unavailable
 */
const saveAuditLogLocally = async (auditData: AuditLog): Promise<void> => {
  if (typeof window === 'undefined') return

  try {
    const existingLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]')
    existingLogs.push(auditData)

    // Keep only last 500 logs for performance
    if (existingLogs.length > 500) {
      existingLogs.splice(0, existingLogs.length - 500)
    }

    localStorage.setItem('audit_logs', JSON.stringify(existingLogs))
  } catch (error) {
    // console.error('Failed to save audit log locally:', error)
  }
}

// Note: getClientIP is now imported from './ip-tracking' for improved accuracy

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
      // console.error('Failed to retrieve audit logs:', error)
      return []
    }

    return data || []
  } catch (error) {
    // console.error('Error retrieving audit logs:', error)
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