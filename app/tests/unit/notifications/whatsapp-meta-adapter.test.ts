import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
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
  headers: Record<string, string>
  body: unknown
}

function adapterWith(fetchImpl: (request: CapturedRequest) => Response): {
  adapter: WhatsAppMetaAdapter
  requests: CapturedRequest[]
} {
  const requests: CapturedRequest[] = []
  const fetchFn = (async (url: string, init: RequestInit) => {
    const request: CapturedRequest = {
      url,
      headers: init.headers as Record<string, string>,
      body: JSON.parse(String(init.body)),
    }
    requests.push(request)
    return fetchImpl(request)
  }) as typeof fetch
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
    expect(requests[0].headers.authorization).toBe('Bearer access-token-test')
    expect(requests[0].body).toMatchObject({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '5531999998888',
      type: 'text',
    })
    const body = requests[0].body as { text: { body: string } }
    expect(body.text.body).toContain('Aluno Sintetico')
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
