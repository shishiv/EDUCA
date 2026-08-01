import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  WhatsAppLocalAdapter,
  WHATSAPP_LOCAL_APP_SECRET,
  WHATSAPP_LOCAL_VERIFY_TOKEN,
} from '@/lib/notifications/whatsapp-local-adapter'
import { WhatsAppTransientDeliveryError } from '@/lib/notifications/whatsapp-gateway'
import type { AttendanceNotificationPayload } from '@/lib/notifications/whatsapp-notification-payload'

const payload: AttendanceNotificationPayload = {
  type: 'presenca_falta',
  studentName: 'Aluno Sintetico',
  date: '2026-08-01',
  schoolName: 'Escola Sintetica',
  guardianPhoneE164: '5531999998888',
}

describe('whatsapp local fake adapter', () => {
  it('delivers deterministically: same payload, same wamid and receipt', async () => {
    const receipts: string[] = []
    const adapter = new WhatsAppLocalAdapter({ receiptWriter: (line) => receipts.push(line) })

    const first = await adapter.sendAttendanceNotification(payload)
    const second = await adapter.sendAttendanceNotification(payload)

    expect(first.outcome).toBe('delivered')
    expect(first.externalMessageId).toMatch(/^wamid\.fake\.[0-9a-f]{32}$/)
    expect(first.externalMessageId).toBe(second.externalMessageId)
    expect(first.receipt).toBe(second.receipt)
    expect(receipts).toHaveLength(2)
  })

  it('never includes phone numbers, tokens, or message bodies in receipts', async () => {
    const adapter = new WhatsAppLocalAdapter({})
    const result = await adapter.sendAttendanceNotification(payload)
    expect(result.receipt).not.toContain('5531999998888')
    expect(result.receipt).not.toContain('Aluno Sintetico')
    expect(result.receipt).not.toContain('Frequencia escolar')
  })

  it('simulates transient failures in fail mode for retry tests', async () => {
    const adapter = new WhatsAppLocalAdapter({ mode: 'fail' })
    await expect(adapter.sendAttendanceNotification(payload)).rejects.toBeInstanceOf(
      WhatsAppTransientDeliveryError
    )
  })

  it('simulates permanent rejections in reject mode', async () => {
    const adapter = new WhatsAppLocalAdapter({ mode: 'reject' })
    const result = await adapter.sendAttendanceNotification(payload)
    expect(result.outcome).toBe('failed')
    expect(result.failureCode).toBe('meta_rejected')
  })

  it('verifies webhook signatures with the local secret', () => {
    const adapter = new WhatsAppLocalAdapter()
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] })
    const signature = `sha256=${createHmac('sha256', WHATSAPP_LOCAL_APP_SECRET).update(body, 'utf8').digest('hex')}`
    expect(adapter.verifyWebhookSignature(body, signature)).toBe(true)
    expect(adapter.verifyWebhookSignature(body, 'sha256=deadbeef')).toBe(false)
    expect(adapter.verifyWebhookSignature(body, null)).toBe(false)
  })

  it('validates the handshake token with the local verify token', () => {
    const adapter = new WhatsAppLocalAdapter()
    expect(adapter.verifyWebhookVerifyToken(WHATSAPP_LOCAL_VERIFY_TOKEN)).toBe(true)
    expect(adapter.verifyWebhookVerifyToken('wrong-token')).toBe(false)
    expect(adapter.verifyWebhookVerifyToken(null)).toBe(false)
  })
})
