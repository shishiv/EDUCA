/**
 * WhatsApp attendance notification service - the caller-facing entry point.
 *
 * Callers (attendance flows, API routes) pass only domain identifiers:
 * guardian, student, class date, notification type. Everything else - phone
 * lookup, opt-in check, school scoping, idempotent enqueue, immediate
 * delivery attempt, masked receipts - happens here. Meta request details
 * never surface.
 */

import { z } from 'zod'
import type { WhatsAppDeliveryDependencies } from './whatsapp-delivery-service'
import type { WhatsAppSupabase } from './whatsapp-database'
import {
  attemptWhatsAppMessageDelivery,
  claimWhatsAppNotificationById,
  clampMaxAttempts,
  enqueueWhatsAppNotification,
} from './whatsapp-delivery-service'
import { formatWhatsAppReceipt } from './whatsapp-receipts'

export const notifyGuardianAttendanceAlertSchema = z.object({
  responsavelId: z.string().uuid(),
  alunoId: z.string().uuid(),
  dataAula: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve estar em YYYY-MM-DD'),
  tipo: z.enum(['presenca_falta', 'presenca_presente']).optional().default('presenca_falta'),
  criadoPor: z.string().uuid().optional(),
})

export type NotifyGuardianAttendanceAlertInput = z.input<typeof notifyGuardianAttendanceAlertSchema>

export interface NotifyGuardianAttendanceAlertResult {
  outcome: 'delivered' | 'queued' | 'blocked' | 'failed' | 'delivery_unknown' | 'duplicate'
  messageId: string
  receipt: string
  duplicated: boolean
  auditReceiptId: string
}

/**
 * Sends (or records the decision not to send) one attendance alert.
 *
 * Fast paths: a guardian without consent or without a valid Brazilian phone
 * gets a blocked row with a masked receipt instead of a send. Repeated calls
 * with the same identifiers are idempotent and return the first decision.
 */
export async function notifyGuardianAttendanceAlert(
  supabase: WhatsAppSupabase,
  deps: WhatsAppDeliveryDependencies,
  input: NotifyGuardianAttendanceAlertInput
): Promise<NotifyGuardianAttendanceAlertResult> {
  const parsed = notifyGuardianAttendanceAlertSchema.parse(input)
  if (!parsed.criadoPor) throw new Error('WHATSAPP_NOTIFY_ACTOR_REQUIRED')

  const enqueued = await enqueueWhatsAppNotification(supabase, {
    responsavelId: parsed.responsavelId,
    alunoId: parsed.alunoId,
    tipo: parsed.tipo,
    dataAula: parsed.dataAula,
    criadoPor: parsed.criadoPor,
  })

  if (enqueued.duplicated) {
    return {
      outcome: 'duplicate',
      messageId: enqueued.messageId,
      duplicated: true,
      receipt: notificationReceipt(deps, parsed, 'duplicate'),
      auditReceiptId: enqueued.auditReceiptId,
    }
  }

  const claimed = await claimWhatsAppNotificationById(
    supabase,
    enqueued.messageId,
    clampMaxAttempts(deps.maxAttempts),
  )
  if (!claimed) {
    return {
      outcome: 'queued',
      messageId: enqueued.messageId,
      duplicated: false,
      receipt: notificationReceipt(deps, parsed, 'queued'),
      auditReceiptId: enqueued.auditReceiptId,
    }
  }
  const attempt = await attemptWhatsAppMessageDelivery(supabase, deps, claimed)

  const finalStatus = await readMessageStatus(supabase, enqueued.messageId)
  return {
    outcome: notificationOutcome(finalStatus),
    messageId: enqueued.messageId,
    duplicated: false,
    receipt: attempt.receipt ?? '',
    auditReceiptId: enqueued.auditReceiptId,
  }
}

function notificationOutcome(status: string): NotifyGuardianAttendanceAlertResult['outcome'] {
  if (status === 'delivered' || status === 'blocked' || status === 'failed' || status === 'delivery_unknown') return status
  return 'queued'
}

function notificationReceipt(
  deps: WhatsAppDeliveryDependencies,
  parsed: z.infer<typeof notifyGuardianAttendanceAlertSchema>,
  outcome: 'duplicate' | 'queued',
): string {
  return formatWhatsAppReceipt({
    gateway: deps.gateway.identity(),
    notificationType: parsed.tipo,
    outcome,
    guardianRef: parsed.responsavelId.slice(0, 8),
  })
}

async function readMessageStatus(
  supabase: WhatsAppSupabase,
  messageId: string
): Promise<string> {
  const { data, error } = await supabase
    .from('whatsapp_notification_messages')
    .select('status')
    .eq('id', messageId)
    .maybeSingle()
  if (error) throw error
  return data?.status ?? 'queued'
}
