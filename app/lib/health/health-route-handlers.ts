import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { buildRedactedUnhealthyReport, createHealthChecks } from './health-checks'

/** The HTTP boundary owns redaction and operator authorization. */
export function createHealthRouteHandlers(
  checks = createHealthChecks(),
  authorize = requirePilotActor,
) {
  async function GET() {
    try {
      const liveness = await checks.runPublicLivenessProbe()
      return NextResponse.json(liveness, { status: liveness.status === 'unhealthy' ? 503 : 200 })
    } catch (error) {
      logger.error('Public health probe failed unexpectedly',
        error instanceof Error ? error : new Error(String(error)),
        { feature: 'health', action: 'public_liveness' })
      return NextResponse.json({ status: 'unhealthy', timestamp: new Date().toISOString() }, { status: 503 })
    }
  }

  async function HEAD() {
    try {
      const probe = await checks.probeDatabase()
      return new NextResponse(null, { status: probe.status === 'unhealthy' ? 503 : 200 })
    } catch {
      return new NextResponse(null, { status: 503 })
    }
  }

  async function detailGET() {
    try {
      await authorize(['admin'])
    } catch (error) {
      return pilotErrorResponse(error, {
        feature: 'health-detail', fallbackCode: 'HEALTH_DETAIL_DENIED', fallbackStatus: 403,
      })
    }

    try {
      const report = await checks.runHealthDiagnostics()
      return NextResponse.json(report, { status: report.status === 'unhealthy' ? 503 : 200 })
    } catch (error) {
      logger.error('Health diagnostic failed unexpectedly',
        error instanceof Error ? error : new Error(String(error)),
        { feature: 'health', action: 'diagnostics' })
      return NextResponse.json(buildRedactedUnhealthyReport(), { status: 503 })
    }
  }

  return { GET, HEAD, detailGET }
}
