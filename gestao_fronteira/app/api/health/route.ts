/**
 * Health Check Endpoint
 * Provides system health status for monitoring services (UptimeRobot, Grafana, etc.)
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'
import { recordMetric, recordTiming } from '@/lib/monitoring/metrics'

interface HealthCheck {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  error?: string
  details?: any
}

async function createSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )
}

/**
 * Check database connectivity and performance
 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now()

  try {
    const supabase = await createSupabaseClient()

    // Simple query to verify database is responsive
    const { data, error } = await supabase
      .from('escolas')
      .select('id')
      .limit(1)

    const responseTime = Date.now() - start
    recordTiming('health_check_database', responseTime)

    if (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime,
        error: error.message
      }
    }

    // Warn if database is slow
    const status = responseTime > 1000 ? 'degraded' : 'healthy'

    return {
      name: 'database',
      status,
      responseTime
    }
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check Brazilian compliance metrics availability
 */
async function checkComplianceMetrics(): Promise<HealthCheck> {
  const start = Date.now()

  try {
    const supabase = await createSupabaseClient()

    // Check if we can query attendance data (critical for Brazilian compliance)
    const { data: attendanceCheck, error } = await supabase
      .from('frequencia')
      .select('id')
      .limit(1)

    const responseTime = Date.now() - start

    if (error) {
      return {
        name: 'compliance_metrics',
        status: 'degraded',
        responseTime,
        error: 'Attendance data not accessible'
      }
    }

    return {
      name: 'compliance_metrics',
      status: 'healthy',
      responseTime
    }
  } catch (error) {
    return {
      name: 'compliance_metrics',
      status: 'degraded',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get current system metrics for monitoring dashboards
 */
async function getSystemMetrics() {
  try {
    const supabase = await createSupabaseClient()

    // Get student count
    const { count: totalStudents } = await supabase
      .from('alunos')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true)

    // Get active teachers count
    const { count: activeTeachers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tipo_usuario', 'professor')
      .eq('ativo', true)

    // Get open sessions today
    const today = new Date().toISOString().split('T')[0]
    const { count: openSessionsToday } = await supabase
      .from('sessoes_aula')
      .select('*', { count: 'exact', head: true })
      .eq('data_aula', today)
      .in('status', ['PLANEJADA', 'ABERTA'])

    // Record metrics for Grafana dashboards
    recordMetric('students_total', totalStudents || 0)
    recordMetric('teachers_active', activeTeachers || 0)
    recordMetric('sessions_open_today', openSessionsToday || 0)

    return {
      totalStudents: totalStudents || 0,
      activeTeachers: activeTeachers || 0,
      openSessionsToday: openSessionsToday || 0
    }
  } catch (error) {
    logger.error('Error getting system metrics', { error })
    return null
  }
}

/**
 * GET /api/health
 * Returns comprehensive health status
 */
export async function GET() {
  const requestStart = Date.now()

  try {
    // Run all health checks in parallel
    const [databaseCheck, complianceCheck, systemMetrics] = await Promise.all([
      checkDatabase(),
      checkComplianceMetrics(),
      getSystemMetrics()
    ])

    const checks = [databaseCheck, complianceCheck]

    // Determine overall status
    const hasUnhealthy = checks.some(c => c.status === 'unhealthy')
    const hasDegraded = checks.some(c => c.status === 'degraded')

    const overallStatus = hasUnhealthy ? 'unhealthy' :
                         hasDegraded ? 'degraded' :
                         'healthy'

    const totalResponseTime = Date.now() - requestStart
    recordTiming('health_check_total', totalResponseTime)

    // Record overall health as metric
    recordMetric('system_health', overallStatus === 'healthy' ? 1 : 0)

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${totalResponseTime}ms`,
      checks,
      metrics: systemMetrics,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }

    // Return appropriate HTTP status
    const httpStatus = overallStatus === 'healthy' ? 200 :
                      overallStatus === 'degraded' ? 200 :
                      503

    return NextResponse.json(response, { status: httpStatus })

  } catch (error) {
    logger.error('Health check failed', { error })

    recordMetric('system_health', 0)

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: []
    }, { status: 503 })
  }
}

/**
 * HEAD /api/health
 * Lightweight health check (returns only status code)
 */
export async function HEAD() {
  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.from('escolas').select('id').limit(1)

    return new NextResponse(null, { status: error ? 503 : 200 })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
