import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { WhatsAppMetaAdapter } from '@/lib/notifications/whatsapp-meta-adapter'
import type { AttendanceNotificationPayload } from '@/lib/notifications/whatsapp-notification-payload'

const payload: AttendanceNotificationPayload = {
  type: 'presenca_falta',
  studentName: 'Aluno Sintetico',
  date: '2026-08-01',
  schoolName: 'Escola Sintetica',
  guardianPhoneE164: '5531999998888',
}

interface CapturedRequest {
  url: string
  headers: Headers
  body: z.infer<typeof metaRequestSchema>
}

interface AdapterHarness {
  adapter: WhatsAppMetaAdapter
  requests: CapturedRequest[]
}

const metaRequestSchema = z.object({
  messaging_product: z.literal('whatsapp'),
  recipient_type: z.literal('individual'),
  to: z.string(),
  type: z.literal('text'),
  text: z.object({ body: z.string() }),
})

function adapterWith(fetchImpl: (request: CapturedRequest) => Response): AdapterHarness {
  const requests: CapturedRequest[] = []
  const fetchFn: typeof fetch = async (input, init) => {
    const outbound = new Request(input, init)
    const request: CapturedRequest = {
      url: outbound.url,
      headers: outbound.headers,
      body: metaRequestSchema.parse(await outbound.json()),
    }
    requests.push(request)
    return fetchImpl(request)
  }
  const adapter = new WhatsAppMetaAdapter({
    phoneNumberId: '106540352242922',
    accessToken: 'access-token-test',
    appSecret: 'app-secret-test',
    verifyToken: 'verify-token-test',
    fetchFn,
  })
  return { adapter, requests }
}

const metaAcceptedResponse = () =>
  new Response(
    JSON.stringify({
      messaging_product: 'whatsapp',
      contacts: [{ input: '5531999998888', wa_id: '5531999998888' }],
      messages: [{ id: 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBI3MTE5MjVBOTE3MDk5QUVFM0YA' }],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )

describe('whatsapp Meta adapter', () => {
  it('builds the official Graph API request shape', async () => {
    const { adapter, requests } = adapterWith(() => metaAcceptedResponse())
    const result = await adapter.sendAttendanceNotification(payload)

    expect(requests).toHaveLength(1)
    expect(requests[0].url).toBe(
      'https://graph.facebook.com/v23.0/106540352242922/messages'
    )
    expect(requests[0].headers.get('authorization')).toBe('Bearer access-token-test')
    expect(requests[0].body).toMatchObject({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '5531999998888',
      type: 'text',
    })
    expect(requests[0].body.text.body).toContain('Aluno Sintetico')
    expect(result.outcome).toBe('accepted')
    expect(result.externalMessageId).toBe('wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBI3MTE5MjVBOTE3MDk5QUVFM0YA')
  })

  it('maps template-required errors to the template_pending failure code', async () => {
    const { adapter } = adapterWith(() =>
      new Response(
        JSON.stringify({
          error: { message: 'Message undeliverable', code: 131026, type: 'OAuthException' },
        }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      )
    )
    const result = await adapter.sendAttendanceNotification(payload)
    expect(result.outcome).toBe('failed')
    expect(result.failureCode).toBe('template_pending')
  })

  it('classifies Meta rate limits as transient for the retry owner', async () => {
    const { adapter } = adapterWith(() =>
      new Response(
        JSON.stringify({ error: { message: 'Rate limit', code: 130429 } }),
        { status: 429, headers: { 'content-type': 'application/json' } }
      )
    )

    await expect(adapter.sendAttendanceNotification(payload)).rejects.toMatchObject({
      name: 'WhatsAppTransientDeliveryError',
      retrySafe: true,
    })
  })

  it('classifies provider outages as transient without exposing the response body', async () => {
    const { adapter } = adapterWith(() =>
      new Response(
        JSON.stringify({ error: { message: 'telefone 5531999998888 indisponivel' } }),
        { status: 503, headers: { 'content-type': 'application/json' } }
      )
    )

    await expect(adapter.sendAttendanceNotification(payload)).rejects.toMatchObject({
      message: 'WhatsAppMetaAdapter indeterminate response: 503',
      retrySafe: false,
    })
  })

  it('treats a lost network response as indeterminate', async () => {
    const fetchFn: typeof fetch = async () => {
      throw new Error('connection reset')
    }
    const adapter = new WhatsAppMetaAdapter({
      phoneNumberId: '106540352242922',
      accessToken: 'access-token-test',
      appSecret: 'app-secret-test',
      verifyToken: 'verify-token-test',
      fetchFn,
    })

    await expect(adapter.sendAttendanceNotification(payload)).rejects.toMatchObject({
      name: 'WhatsAppTransientDeliveryError',
      retrySafe: false,
    })
  })

  it('maps unknown error codes numerically without leaking the error message', async () => {
    const { adapter } = adapterWith(() =>
      new Response(
        JSON.stringify({
          error: { message: 'segredo interno com telefone 5531999998888', code: 99999, type: 'OAuthException' },
        }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      )
    )
    const result = await adapter.sendAttendanceNotification(payload)
    expect(result.failureCode).toBe('meta_error_99999')
    expect(result.receipt).not.toContain('5531999998888')
    expect(result.receipt).not.toContain('segredo interno')
  })

  it('verifies webhook signatures with the Meta app secret', () => {
    const { adapter } = adapterWith(() => metaAcceptedResponse())
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] })
    const signature = `sha256=${createHmac('sha256', 'app-secret-test').update(body, 'utf8').digest('hex')}`
    expect(adapter.verifyWebhookSignature(body, signature)).toBe(true)
    expect(adapter.verifyWebhookSignature(body, 'sha256=deadbeef')).toBe(false)
  })

  it('validates the verify token handshake', () => {
    const { adapter } = adapterWith(() => metaAcceptedResponse())
    expect(adapter.verifyWebhookVerifyToken('verify-token-test')).toBe(true)
    expect(adapter.verifyWebhookVerifyToken('wrong')).toBe(false)
  })
})
