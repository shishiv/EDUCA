/**
 * Health probes shared by the public liveness endpoint and the operator
 * diagnostic endpoint.
 *
 * Surface split:
 * - Public liveness (`GET /api/health`) may only expose `{ status, timestamp }`.
 *   It must never serialize version, environment, metrics, timings, dependency
 *   details, or internal error text.
 * - The diagnostic report (`GET /api/health/detail`) carries the full detail and
 *   is gated by the established operator session policy
 *   (`requirePilotActor(['admin'])`).
 *
 * Internal failures are always logged server-side; only the diagnostic report
 * may echo check-level error text, and only to an authenticated admin.
 */

import { logger } from '@/lib/logger'
import { recordMetric, recordTiming } from '@/lib/monitoring/metrics'
import { createClient } from '@/lib/supabase/server'

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface HealthCheckResult {
  name: string
  status: HealthStatus
  responseTime?: number
  error?: string
}

export interface SystemMetrics {
  totalStudents: number
  activeTeachers: number
  openSessionsToday: number
}

/** The only response shape the public liveness endpoint may return. */
export interface PublicLivenessResponse {
  status: HealthStatus
  timestamp: string
}

/** Full health report returned only to authenticated operators. */
export interface DiagnosticHealthReport {
  status: HealthStatus
  timestamp: string
  responseTime: string
  checks: HealthCheckResult[]
  metrics: SystemMetrics | null
  version: string
  environment: string
}

/**
 * Verifies the database answers a minimal query. The probe result keeps the
 * error text for the operator report and for server logs; the public liveness
 * builder below never serializes it.
 */
export async function probeDatabase(): Promise<HealthCheckResult> {
  const start = Date.now()

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('escolas').select('id').limit(1)

    const responseTime = Date.now() - start
    recordTiming('health_check_database', responseTime)

    if (error) {
      logger.error('Health database probe failed', new Error(error.message), {
        feature: 'health',
        action: 'database_probe',
      })
      return { name: 'database', status: 'unhealthy', responseTime, error: error.message }
    }

    return {
      name: 'database',
      status: responseTime > 1000 ? 'degraded' : 'healthy',
      responseTime,
    }
  } catch (error) {
    logger.error(
      'Health database probe threw',
      error instanceof Error ? error : new Error(String(error)),
      { feature: 'health', action: 'database_probe' }
    )
    return { name: 'database', status: 'unhealthy', responseTime: Date.now() - start }
  }
}

/**
 * Verifies the compliance-critical attendance surface answers a query.
 * Failures degrade rather than kill the overall status, matching the
 * pre-hardening contract.
 */
export async function probeComplianceMetrics(): Promise<HealthCheckResult> {
  const start = Date.now()

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('frequencia').select('id').limit(1)

    const responseTime = Date.now() - start

    if (error) {
      logger.error('Health compliance probe failed', new Error(error.message), {
        feature: 'health',
        action: 'compliance_probe',
      })
      return {
        name: 'compliance_metrics',
        status: 'degraded',
        responseTime,
        error: 'Attendance data not accessible',
      }
    }

    return { name: 'compliance_metrics', status: 'healthy', responseTime }
  } catch (error) {
    logger.error(
      'Health compliance probe threw',
      error instanceof Error ? error : new Error(String(error)),
      { feature: 'health', action: 'compliance_probe' }
    )
    return {
      name: 'compliance_metrics',
      status: 'degraded',
      responseTime: Date.now() - start,
    }
  }
}

/** Collects aggregate system counts for the operator diagnostic report. */
export async function collectSystemMetrics(): Promise<SystemMetrics | null> {
  try {
    const supabase = await createClient()

    const { count: totalStudents } = await supabase
      .from('alunos')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true)

    const { count: activeTeachers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tipo_usuario', 'professor')
      .eq('ativo', true)

    const today = new Date().toISOString().split('T')[0]
    const { count: openSessionsToday } = await supabase
      .from('sessoes_aula')
      .select('*', { count: 'exact', head: true })
      .eq('data_aula', today)
      .in('status', ['PLANEJADA', 'ABERTA'])

    recordMetric('students_total', totalStudents || 0)
    recordMetric('teachers_active', activeTeachers || 0)
    recordMetric('sessions_open_today', openSessionsToday || 0)

    return {
      totalStudents: totalStudents || 0,
      activeTeachers: activeTeachers || 0,
      openSessionsToday: openSessionsToday || 0,
    }
  } catch (error) {
    logger.error(
      'Health system metrics failed',
      error instanceof Error ? error : new Error(String(error)),
      { feature: 'health', action: 'system_metrics' }
    )
    return null
  }
}

/**
 * Minimal public liveness probe: one database round trip and only the
 * resulting status leaves this function. No per-check detail, no timings,
 * no metrics, no version, no environment, no error text.
 */
export async function runPublicLivenessProbe(): Promise<PublicLivenessResponse> {
  const databaseProbe = await probeDatabase()

  recordMetric('system_health', databaseProbe.status === 'healthy' ? 1 : 0)

  return {
    status: databaseProbe.status,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Runs the full operator diagnostic battery and aggregates the report.
 * Check-level error text may be present in the report; the caller is
 * responsible for keeping this surface behind operator authorization.
 */
export async function runHealthDiagnostics(): Promise<DiagnosticHealthReport> {
  const requestStart = Date.now()

  const [databaseProbe, complianceProbe, systemMetrics] = await Promise.all([
    probeDatabase(),
    probeComplianceMetrics(),
    collectSystemMetrics(),
  ])

  const checks: HealthCheckResult[] = [databaseProbe, complianceProbe]

  const hasUnhealthy = checks.some((check) => check.status === 'unhealthy')
  const hasDegraded = checks.some((check) => check.status === 'degraded')
  const status: HealthStatus = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy'

  const totalResponseTime = Date.now() - requestStart
  recordTiming('health_check_total', totalResponseTime)
  recordMetric('system_health', status === 'healthy' ? 1 : 0)

  return {
    status,
    timestamp: new Date().toISOString(),
    responseTime: `${totalResponseTime}ms`,
    checks,
    metrics: systemMetrics,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  }
}

/**
 * Stable unhealthy report used when an unexpected failure must be returned to
 * an operator. It keeps the diagnostic shape but carries no internal error
 * text; the full failure detail was already written to the server log.
 */
export function buildRedactedUnhealthyReport(): DiagnosticHealthReport {
  return {
    status: 'unhealthy',
    timestamp: new Date().toISOString(),
    responseTime: '0ms',
    checks: [],
    metrics: null,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  }
}
