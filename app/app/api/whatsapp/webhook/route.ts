/**
 * WhatsApp webhook endpoint (Meta Cloud API).
 *
 * GET  - handshake: hub.mode=subscribe, hub.verify_token, hub.challenge.
 *        Echoes the challenge only when the token matches; 403 otherwise.
 * POST - delivery receipts: X-Hub-Signature-256 (HMAC-SHA256 of the raw
 *        body keyed with the app secret) must validate before any status is
 *        applied. Only status fields are read - inbound message bodies,
 *        contact names, and phone numbers are never stored or logged.
 *
 * This route is the Edge Function equivalent for this project: a Next.js
 * App Router handler deployed on Vercel's edge/Node runtime.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { asWhatsAppClient } from '@/lib/notifications/whatsapp-database'
import { createWhatsAppNotificationGateway } from '@/lib/notifications/whatsapp-gateway-factory'
import { applyWhatsAppDeliveryStatus } from '@/lib/notifications/whatsapp-delivery-service'
import {
  countWhatsAppInboundMessages,
  extractWhatsAppDeliveryStatuses,
  whatsappWebhookEnvelopeSchema,
} from '@/lib/notifications/whatsapp-webhook-payload'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const gateway = createWhatsAppNotificationGateway()

  if (
    params.get('hub.mode') !== 'subscribe' ||
    !gateway.verifyWebhookVerifyToken(params.get('hub.verify_token'))
  ) {
    return new NextResponse('Verification token mismatch', { status: 403 })
  }

  const challenge = params.get('hub.challenge') ?? ''
  return new NextResponse(challenge, {
    status: 200,
    headers: { 'content-type': 'text/plain' },
  })
}

export async function POST(request: NextRequest) {
  const gateway = createWhatsAppNotificationGateway()
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!gateway.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'WHATSAPP_WEBHOOK_INVALID_SIGNATURE' }, { status: 403 })
  }

  let envelope
  try {
    envelope = whatsappWebhookEnvelopeSchema.parse(JSON.parse(rawBody))
  } catch {
    return NextResponse.json({ error: 'WHATSAPP_WEBHOOK_INVALID_PAYLOAD' }, { status: 400 })
  }

  const adminClient = asWhatsAppClient(await createAdminClient())
  const statuses = extractWhatsAppDeliveryStatuses(envelope)
  for (const status of statuses) {
    await applyWhatsAppDeliveryStatus(adminClient, status)
  }

  // Inbound user messages are acknowledged and counted, never processed:
  // MVP scope is outbound attendance alerts only.
  const inboundCount = countWhatsAppInboundMessages(envelope)

  return NextResponse.json({ received: true, statusesReceived: statuses.length, inboundCount })
}
