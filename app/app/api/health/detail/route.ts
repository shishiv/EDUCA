/**
 * Operator diagnostic endpoint: full health report for administrators.
 *
 * Gated by the established operator session policy (`requirePilotActor` with
 * the admin role). Returns per-check status and response times, system
 * metrics, application version, and environment. Unauthenticated callers get
 * 401, non-admin sessions get 403. Unexpected internal failures are logged
 * server-side and returned as a stable redacted unhealthy report, never with
 * the raw error text.
 */

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import {
  buildRedactedUnhealthyReport,
  runHealthDiagnostics,
} from '@/lib/health/health-checks'

/**
 * GET /api/health/detail
 * Full diagnostic report for an authenticated operator.
 */
export async function GET() {
  try {
    await requirePilotActor(['admin'])
  } catch (error) {
    return pilotErrorResponse(error, {
      feature: 'health-detail',
      fallbackCode: 'HEALTH_DETAIL_DENIED',
      fallbackStatus: 403,
    })
  }

  try {
    const report = await runHealthDiagnostics()
    const httpStatus = report.status === 'unhealthy' ? 503 : 200
    return NextResponse.json(report, { status: httpStatus })
  } catch (error) {
    logger.error(
      'Health diagnostic failed unexpectedly',
      error instanceof Error ? error : new Error(String(error)),
      { feature: 'health', action: 'diagnostics' }
    )
    return NextResponse.json(buildRedactedUnhealthyReport(), { status: 503 })
  }
}
