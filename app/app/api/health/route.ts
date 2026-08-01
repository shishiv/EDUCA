/**
 * Public liveness endpoint for uptime monitors (UptimeRobot, Grafana, etc.).
 *
 * Public response contract (stable, no secrets):
 *   { status: 'healthy' | 'degraded' | 'unhealthy', timestamp: string }
 * HTTP 200 for healthy/degraded, 503 for unhealthy.
 *
 * Never returns version, environment, metrics, timings, dependency details,
 * or internal error text. Operators that need the full diagnostic report use
 * GET /api/health/detail, gated by the established admin session policy.
 */

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import {
  runPublicLivenessProbe,
  type PublicLivenessResponse,
} from '@/lib/health/health-checks'

/**
 * GET /api/health
 * Public liveness: one database probe, minimal stable response.
 */
export async function GET() {
  try {
    const liveness = await runPublicLivenessProbe()
    const httpStatus = liveness.status === 'unhealthy' ? 503 : 200
    return NextResponse.json(liveness, { status: httpStatus })
  } catch (error) {
    logger.error(
      'Public health probe failed unexpectedly',
      error instanceof Error ? error : new Error(String(error)),
      { feature: 'health', action: 'public_liveness' }
    )
    const redacted: PublicLivenessResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    }
    return NextResponse.json(redacted, { status: 503 })
  }
}

/**
 * HEAD /api/health
 * Lightweight probe (returns only the status code). Unchanged contract:
 * 200 when the database answers, 503 otherwise.
 */
export async function HEAD() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('escolas').select('id').limit(1)

    return new NextResponse(null, { status: error ? 503 : 200 })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
