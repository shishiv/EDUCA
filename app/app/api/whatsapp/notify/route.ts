/**
 * POST /api/whatsapp/notify - trigger an attendance notification.
 *
 * Pilot staff (admin, secretario, diretor, professor) send one attendance
 * alert for a guardian/student/date. The caller speaks only domain
 * identifiers; the service resolves opt-in, phone, school scope, and returns
 * a masked receipt. In PILOT_MODE the local fake answers and the receipt
 * proves the attempt without any external delivery.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { asWhatsAppClient } from '@/lib/notifications/whatsapp-database'
import { createWhatsAppNotificationGateway } from '@/lib/notifications/whatsapp-gateway-factory'
import {
  notifyGuardianAttendanceAlert,
  notifyGuardianAttendanceAlertSchema,
} from '@/lib/notifications/whatsapp-notification-service'
import { deliverDueWhatsAppNotifications } from '@/lib/notifications/whatsapp-delivery-service'

const notifyRouteSchema = notifyGuardianAttendanceAlertSchema.extend({
  // Enables the retry worker path: process all due messages after this one.
  processDue: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const actor = await requirePilotActor(['admin', 'secretario', 'diretor', 'professor'])
    const input = notifyRouteSchema.parse(await request.json())
    const supabase = asWhatsAppClient(await createClient())
    const gateway = createWhatsAppNotificationGateway()

    const result = await notifyGuardianAttendanceAlert(
      supabase,
      { gateway, maxAttempts: resolveMaxAttempts() },
      { ...input, criadoPor: actor.id }
    )

    if (input.processDue) {
      await deliverDueWhatsAppNotifications(supabase, { gateway, maxAttempts: resolveMaxAttempts() })
    }

    return NextResponse.json(
      { outcome: result.outcome, messageId: result.messageId, receipt: result.receipt },
      { status: result.outcome === 'blocked' ? 202 : 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'WHATSAPP_NOTIFY_INVALID' }, { status: 400 })
    }
    return pilotErrorResponse(error, {
      feature: 'whatsapp-notify',
      fallbackCode: 'WHATSAPP_NOTIFY_FAILED',
      fallbackStatus: 400,
    })
  }
}

function resolveMaxAttempts(): number | undefined {
  const raw = process.env.WHATSAPP_MAX_ATTEMPTS
  if (!raw) return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}
