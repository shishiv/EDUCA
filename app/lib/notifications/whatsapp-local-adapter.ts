/**
 * Deterministic local fake WhatsApp gateway.
 *
 * Simulates the Meta transport without any network: the same input always
 * produces the same fake wamid and the same masked receipt. PILOT_MODE=true
 * and missing Meta credentials route every send here (see
 * whatsapp-safety-gate.ts), which is why this adapter is the default
 * production behavior today.
 *
 * Failure rehearsal: WHATSAPP_LOCAL_FAKE_MODE=fail makes every send throw a
 * transient error (retry path); =reject returns a permanent failure. The
 * public demo never constructs the Meta adapter, even when credentials exist.
 * The webhook signature and verify-token algorithms mirror the Meta adapter so
 * the local end-to-end path signs payloads with the same code.
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import {
  WhatsAppTransientDeliveryError,
  type WhatsAppGatewayIdentity,
  type WhatsAppNotificationGateway,
  type WhatsAppSendResult,
} from './whatsapp-gateway'
import type { AttendanceNotificationPayload } from './whatsapp-notification-payload'
import { formatWhatsAppReceipt } from './whatsapp-receipts'
import { appendWhatsAppReceiptFile } from './whatsapp-receipts'

export const WHATSAPP_LOCAL_VERIFY_TOKEN = 'educa-local-verify-token'
export const WHATSAPP_LOCAL_APP_SECRET = 'educa-local-app-secret'

export type WhatsAppLocalFakeMode = 'deliver' | 'fail' | 'reject'

export interface WhatsAppLocalAdapterConfig {
  mode?: WhatsAppLocalFakeMode
  verifyToken?: string
  appSecret?: string
  receiptWriter?: (line: string) => void
}

export class WhatsAppLocalAdapter implements WhatsAppNotificationGateway {
  private readonly mode: WhatsAppLocalFakeMode
  private readonly verifyToken: string
  private readonly appSecret: string
  private readonly receiptWriter: (line: string) => void

  constructor(config: WhatsAppLocalAdapterConfig = {}) {
    this.mode = config.mode ?? 'deliver'
    this.verifyToken = config.verifyToken ?? WHATSAPP_LOCAL_VERIFY_TOKEN
    this.appSecret = config.appSecret ?? WHATSAPP_LOCAL_APP_SECRET
    this.receiptWriter = config.receiptWriter ?? appendWhatsAppReceiptFile
  }

  identity(): WhatsAppGatewayIdentity {
    return { adapterName: 'local-fake', mode: this.mode, pilotForced: false }
  }

  /** Deterministic: identical payloads yield identical fake wamids. */
  private fakeMessageId(payload: AttendanceNotificationPayload): string {
    const canonical = JSON.stringify({
      type: payload.type,
      studentName: payload.studentName,
      date: payload.date,
      schoolName: payload.schoolName ?? null,
      guardianPhoneE164: payload.guardianPhoneE164,
    })
    const digest = createHash('sha256').update(canonical, 'utf8').digest('hex')
    return `wamid.fake.${digest.slice(0, 32)}`
  }

  async sendAttendanceNotification(
    payload: AttendanceNotificationPayload
  ): Promise<WhatsAppSendResult> {
    const receiptBase = {
      gateway: this.identity(),
      notificationType: payload.type,
      guardianRef: undefined,
    }

    if (this.mode === 'fail') {
      throw new WhatsAppTransientDeliveryError(
        'WhatsAppLocalAdapter simulated transient failure (WHATSAPP_LOCAL_FAKE_MODE=fail)'
      )
    }

    if (this.mode === 'reject') {
      const receipt = formatWhatsAppReceipt({
        ...receiptBase,
        outcome: 'failed',
        failureCode: 'meta_rejected',
      })
      this.receiptWriter(receipt)
      return { outcome: 'failed', failureCode: 'meta_rejected', receipt }
    }

    const externalMessageId = this.fakeMessageId(payload)
    const receipt = formatWhatsAppReceipt({
      ...receiptBase,
      outcome: 'delivered',
      externalMessageId,
    })
    this.receiptWriter(receipt)
    return { outcome: 'delivered', externalMessageId, receipt }
  }

  /** Mirrors the Meta HMAC-SHA256 signature check with the local secret. */
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader) return false
    const provided = signatureHeader.startsWith('sha256=') ? signatureHeader.slice(7) : signatureHeader
    const digest = createHmac('sha256', this.appSecret)
      .update(rawBody, 'utf8')
      .digest('hex')
    if (!/^[0-9a-f]+$/i.test(provided) || provided.length !== digest.length) return false
    return timingSafeEqual(Buffer.from(provided, 'utf8'), Buffer.from(digest, 'utf8'))
  }

  /** Mirrors the Meta verify-token handshake with the local token. */
  verifyWebhookVerifyToken(candidate: string | null): boolean {
    if (!candidate) return false
    const bufferA = Buffer.from(candidate, 'utf8')
    const bufferB = Buffer.from(this.verifyToken, 'utf8')
    return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB)
  }
}
