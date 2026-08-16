import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

const PILOT_SENTINEL_MESSAGE = /^PILOT_[A-Z0-9_]+/

export interface PilotErrorResponseOptions {
  feature: string
  fallbackCode: string
  fallbackStatus?: number
}

interface PilotErrorDetail {
  message: string
  code?: string
  details?: string
  hint?: string
  status?: number
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/**
 * supabase-js surfaces PostgREST failures as plain objects rather than `Error`
 * instances, so the message and diagnostics are read structurally.
 */
function readErrorDetail(error: unknown): PilotErrorDetail {
  if (typeof error === 'string') return { message: error }
  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>
    return {
      message: readString(candidate.message) ?? '',
      code: readString(candidate.code),
      details: readString(candidate.details),
      hint: readString(candidate.hint),
      status: typeof candidate.status === 'number' ? candidate.status : undefined,
    }
  }
  return { message: '' }
}

/**
 * Returns a stable pilot error code to the caller. Only sentinel messages the
 * pilot code and its migrations raise themselves are echoed back; database and
 * third-party failures are logged server-side with their full diagnostics so
 * constraint, column, and table names never reach the client.
 */
export function pilotErrorResponse(error: unknown, options: PilotErrorResponseOptions): NextResponse {
  const fallbackStatus = options.fallbackStatus ?? 500
  const detail = readErrorDetail(error)

  if (PILOT_SENTINEL_MESSAGE.test(detail.message)) {
    const status = detail.message.includes('AUTH_REQUIRED')
      ? 401
      : detail.message.includes('_DENIED')
        ? 403
        : detail.message.includes('_REQUIRED') || detail.message.includes('_MISSING')
          ? 409
          : fallbackStatus
    return NextResponse.json({ error: detail.message }, { status })
  }

  logger.error(
    options.fallbackCode,
    error instanceof Error ? error : new Error(detail.message || options.fallbackCode),
    {
      feature: options.feature,
      metadata: { message: detail.message, code: detail.code, details: detail.details, hint: detail.hint, status: detail.status },
    }
  )
  return NextResponse.json({ error: options.fallbackCode }, { status: fallbackStatus })
}
