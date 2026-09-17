import { NextResponse } from 'next/server'
import { z } from 'zod'
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

const pilotErrorDetailSchema = z.object({
  message: z.string().optional(),
  code: z.string().optional(),
  details: z.string().optional(),
  hint: z.string().optional(),
  status: z.number().optional(),
}).passthrough()

function nonEmpty(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined
}

/**
 * supabase-js surfaces PostgREST failures as plain objects rather than `Error`
 * instances, so the message and diagnostics are read structurally.
 */
function readErrorDetail<ErrorInput>(error: ErrorInput): PilotErrorDetail {
  const message = z.string().safeParse(error)
  if (message.success) return { message: message.data }
  const candidate = pilotErrorDetailSchema.safeParse(error)
  if (candidate.success) {
    return {
      message: nonEmpty(candidate.data.message) ?? '',
      code: nonEmpty(candidate.data.code),
      details: nonEmpty(candidate.data.details),
      hint: nonEmpty(candidate.data.hint),
      status: candidate.data.status,
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
export function pilotErrorResponse<ErrorInput>(error: ErrorInput, options: PilotErrorResponseOptions): NextResponse {
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
