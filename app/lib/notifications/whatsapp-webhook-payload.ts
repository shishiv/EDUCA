/**
 * Inbound WhatsApp webhook payloads and their authentication.
 *
 * Shapes follow the official Meta WhatsApp Cloud API webhook reference:
 *   GET  ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...  (handshake)
 *   POST X-Hub-Signature-256: sha256=<HMAC-SHA256(app_secret, raw body)>
 *        { object: "whatsapp_business_account", entry: [{ id, changes: [{
 *            value: { messaging_product, metadata, statuses?: [...], messages?: [...] },
 *            field }] }] }
 * Delivery receipts arrive in value.statuses with id (wamid), status
 * (sent|delivered|read|failed), timestamp, and errors[] on failure.
 *
 * Data minimization: this module extracts only status fields - never message
 * bodies, contact names, or phone numbers. Inbound user messages are
 * acknowledged and counted, never stored.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

export const whatsappStatusValues = ['sent', 'delivered', 'read', 'failed'] as const
export type WhatsAppWebhookStatusValue = (typeof whatsappStatusValues)[number]

export const whatsappDeliveryStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(whatsappStatusValues),
  timestamp: z.string().min(1),
  recipient_id: z.string().min(1),
  errors: z.array(z.object({ code: z.number().optional(), title: z.string().optional() })).optional(),
})

export const whatsappInboundMessageSchema = z.object({
  from: z.string().min(1),
  id: z.string().min(1),
  timestamp: z.string().min(1),
  type: z.string().min(1),
  text: z.object({ body: z.string() }).optional(),
})

export const whatsappWebhookChangeValueSchema = z.object({
  messaging_product: z.literal('whatsapp'),
  metadata: z.object({
    display_phone_number: z.string().min(1),
    phone_number_id: z.string().min(1),
  }),
  contacts: z.array(z.object({ wa_id: z.string().min(1) })).optional(),
  messages: z.array(whatsappInboundMessageSchema).optional(),
  statuses: z.array(whatsappDeliveryStatusSchema).optional(),
})

export const whatsappWebhookEnvelopeSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(
    z.object({
      id: z.string().min(1),
      changes: z.array(
        z.object({
          field: z.string().min(1),
          value: whatsappWebhookChangeValueSchema,
        })
      ),
    })
  ),
})

export type WhatsAppWebhookEnvelope = z.infer<typeof whatsappWebhookEnvelopeSchema>

/** One flattened delivery receipt extracted from a webhook envelope. */
export interface ParsedWhatsAppDeliveryStatus {
  externalMessageId: string
  status: WhatsAppWebhookStatusValue
  /** Unix seconds as sent by Meta; converted by the caller. */
  timestampSeconds: string
  errorCode?: number
}

/**
 * Flattens entry[].changes[].value.statuses into one list. Only status
 * fields survive - message content and recipient identifiers are dropped.
 */
export function extractWhatsAppDeliveryStatuses(
  envelope: WhatsAppWebhookEnvelope
): ParsedWhatsAppDeliveryStatus[] {
  const statuses: ParsedWhatsAppDeliveryStatus[] = []
  for (const entry of envelope.entry) {
    for (const change of entry.changes) {
      for (const status of change.value.statuses ?? []) {
        statuses.push({
          externalMessageId: status.id,
          status: status.status,
          timestampSeconds: status.timestamp,
          errorCode: status.errors?.[0]?.code,
        })
      }
    }
  }
  return statuses
}

/** Counts inbound user messages (bodies never read past the schema). */
export function countWhatsAppInboundMessages(envelope: WhatsAppWebhookEnvelope): number {
  return envelope.entry.reduce(
    (total, entry) =>
      total +
      entry.changes.reduce(
        (changeTotal, change) => changeTotal + (change.value.messages?.length ?? 0),
        0
      ),
    0
  )
}

/**
 * Authenticates a webhook POST: HMAC-SHA256 of the raw body keyed with the
 * Meta app secret, compared in constant time. Never log the raw body.
 */
export function verifyWhatsAppWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader) return false
  const provided = signatureHeader.startsWith('sha256=') ? signatureHeader.slice(7) : signatureHeader
  const digest = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')
  if (!/^[0-9a-f]+$/i.test(provided) || provided.length !== digest.length) return false
  return timingSafeEqual(Buffer.from(provided, 'utf8'), Buffer.from(digest, 'utf8'))
}

/** Validates the webhook GET handshake token in constant time. */
export function verifyWhatsAppWebhookVerifyToken(
  candidate: string | null,
  expected: string
): boolean {
  if (!candidate || !expected) return false
  const bufferA = Buffer.from(candidate, 'utf8')
  const bufferB = Buffer.from(expected, 'utf8')
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB)
}
