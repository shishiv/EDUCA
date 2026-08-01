import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  countWhatsAppInboundMessages,
  extractWhatsAppDeliveryStatuses,
  verifyWhatsAppWebhookSignature,
  verifyWhatsAppWebhookVerifyToken,
  whatsappWebhookEnvelopeSchema,
} from '@/lib/notifications/whatsapp-webhook-payload'

const APP_SECRET = 'app-secret-test'

function sign(rawBody: string, secret: string = APP_SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`
}

describe('whatsapp webhook authentication', () => {
  it('accepts a valid HMAC signature over the raw body', () => {
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] })
    expect(verifyWhatsAppWebhookSignature(body, sign(body), APP_SECRET)).toBe(true)
  })

  it('rejects tampered bodies, wrong secrets, and missing headers', () => {
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] })
    const tampered = JSON.stringify({ object: 'whatsapp_business_account', entry: [1] })
    expect(verifyWhatsAppWebhookSignature(tampered, sign(body), APP_SECRET)).toBe(false)
    expect(verifyWhatsAppWebhookSignature(body, sign(body, 'other-secret'), APP_SECRET)).toBe(false)
    expect(verifyWhatsAppWebhookSignature(body, null, APP_SECRET)).toBe(false)
    expect(verifyWhatsAppWebhookSignature(body, 'sha256=not-hex', APP_SECRET)).toBe(false)
  })

  it('validates the GET handshake token in constant-time style', () => {
    expect(verifyWhatsAppWebhookVerifyToken('correct-token', 'correct-token')).toBe(true)
    expect(verifyWhatsAppWebhookVerifyToken('wrong', 'correct-token')).toBe(false)
    expect(verifyWhatsAppWebhookVerifyToken(null, 'correct-token')).toBe(false)
    expect(verifyWhatsAppWebhookVerifyToken('', 'correct-token')).toBe(false)
  })
})

describe('whatsapp webhook payload parsing', () => {
  const envelope = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '102290129340398',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '15550783881', phone_number_id: '106540352242922' },
              contacts: [{ profile: { name: 'Jessica' }, wa_id: '13557825698' }],
              statuses: [
                {
                  id: 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBI3MTE5MjVBOTE3MDk5QUVFM0YA',
                  status: 'delivered',
                  timestamp: '1750263773',
                  recipient_id: '16505551234',
                  conversation: { id: 'conv-1', origin: { type: 'service' } },
                  pricing: { billable: true },
                },
                {
                  id: 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBI3MTE5MjVBOTE3MDk5QUVFM0YB',
                  status: 'failed',
                  timestamp: '1750263774',
                  recipient_id: '16505551234',
                  errors: [{ code: 131026, title: 'Message undeliverable' }],
                },
              ],
            },
          },
        ],
      },
    ],
  }

  it('parses the official envelope shape and flattens statuses', () => {
    const parsed = whatsappWebhookEnvelopeSchema.parse(envelope)
    const statuses = extractWhatsAppDeliveryStatuses(parsed)
    expect(statuses).toHaveLength(2)
    expect(statuses[0]).toEqual({
      externalMessageId: 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBI3MTE5MjVBOTE3MDk5QUVFM0YA',
      status: 'delivered',
      timestampSeconds: '1750263773',
      errorCode: undefined,
    })
    expect(statuses[1].status).toBe('failed')
    expect(statuses[1].errorCode).toBe(131026)
  })

  it('drops message bodies and contact data from the extraction', () => {
    const withMessages = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '15550783881', phone_number_id: '106540352242922' },
                messages: [
                  { from: '13557825698', id: 'wamid.inbound', timestamp: '1750263775', type: 'text', text: { body: 'conteudo privado' } },
                ],
              },
            },
          ],
        },
      ],
    }
    const parsed = whatsappWebhookEnvelopeSchema.parse(withMessages)
    expect(extractWhatsAppDeliveryStatuses(parsed)).toHaveLength(0)
    expect(countWhatsAppInboundMessages(parsed)).toBe(1)
  })

  it('rejects envelopes that are not whatsapp_business_account objects', () => {
    expect(
      whatsappWebhookEnvelopeSchema.safeParse({ object: 'page', entry: [] }).success
    ).toBe(false)
  })
})
