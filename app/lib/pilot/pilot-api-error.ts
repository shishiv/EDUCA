import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

const PILOT_SENTINEL_MESSAGE = /^PILOT_[A-Z0-9_]+/

export interface PilotErrorResponseOptions {
  feature: string
  fallbackCode: string
  fallbackStatus?: number
}

/**
 * Returns a stable pilot error code to the caller. Only messages the pilot code
 * raises itself are echoed back; database and third-party failures are logged
 * server-side so constraint, column, and table names never reach the client.
 */
export function pilotErrorResponse(error: unknown, options: PilotErrorResponseOptions): NextResponse {
  const fallbackStatus = options.fallbackStatus ?? 500
  const message = error instanceof Error ? error.message : ''

  if (PILOT_SENTINEL_MESSAGE.test(message)) {
    const status = message.includes('AUTH_REQUIRED') ? 401 : message.includes('ROLE_DENIED') ? 403 : fallbackStatus
    return NextResponse.json({ error: message }, { status })
  }

  logger.error(options.fallbackCode, error instanceof Error ? error : new Error(String(error)), { feature: options.feature })
  return NextResponse.json({ error: options.fallbackCode }, { status: fallbackStatus })
}
