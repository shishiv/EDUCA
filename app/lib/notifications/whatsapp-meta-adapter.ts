/**
 * Production-shaped Meta WhatsApp Cloud API adapter.
 *
 * Maps the domain payload to the official Graph API request:
 *   POST https://graph.facebook.com/{version}/{phone_number_id}/messages
 *   Authorization: Bearer {system user access token}
 *   body: { messaging_product, recipient_type, to, type: "text", text: { body } }
 * (per developers.facebook.com WhatsApp Cloud API getting-started docs).
 *
 * Safety: this adapter is only constructed after the safety gate has seen
 * PILOT_MODE off, WHATSAPP_META_ENABLED=true, and complete credentials. It
 * never logs tokens, phone numbers, or message bodies; error handling maps
 * only numeric error codes. fetchFn and baseUrl exist for tests - real calls
 * only happen with explicit production approval.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  buildAttendanceMessageBody,
  type AttendanceNotificationPayload,
} from './whatsapp-notification-payload'
import type {
  WhatsAppGatewayIdentity,
  WhatsAppNotificationGateway,
  WhatsAppSendResult,
} from './whatsapp-gateway'
import { formatWhatsAppReceipt } from './whatsapp-receipts'

export const WHATSAPP_GRAPH_API_VERSION = 'v23.0'
export const WHATSAPP_GRAPH_API_BASE_URL = 'https://graph.facebook.com'

export interface WhatsAppMetaAdapterConfig {
  phoneNumberId: string
  accessToken: string
  appSecret: string
  verifyToken: string
  graphApiVersion?: string
  baseUrl?: string
  fetchFn?: typeof fetch
}

interface MetaApiErrorBody {
  error?: { code?: number; message?: string; type?: string; error_subcode?: number }
}

/** Meta error codes mapped to stable failure codes (numbers only, no body text). */
const META_ERROR_CODE_MAP: Record<number, string> = {
  130429: 'rate_limited',
  131026: 'template_pending', // business-initiated outside the 24h window
  131042: 'template_pending', // re-engagement template required
  131047: 'template_pending', // free entry point required
  131051: 'recipient_unavailable', // user opted out or number not on WhatsApp
}

export class WhatsAppMetaAdapter implements WhatsAppNotificationGateway {
  private readonly version: string
  private readonly baseUrl: string
  private readonly fetchFn: typeof fetch

  constructor(private readonly config: WhatsAppMetaAdapterConfig) {
    this.version = config.graphApiVersion ?? WHATSAPP_GRAPH_API_VERSION
    this.baseUrl = config.baseUrl ?? WHATSAPP_GRAPH_API_BASE_URL
    this.fetchFn = config.fetchFn ?? fetch
  }

  identity(): WhatsAppGatewayIdentity {
    return { adapterName: 'meta', mode: 'meta', pilotForced: false }
  }

  async sendAttendanceNotification(
    payload: AttendanceNotificationPayload
  ): Promise<WhatsAppSendResult> {
    const requestBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: payload.guardianPhoneE164,
      type: 'text',
      text: { body: buildAttendanceMessageBody(payload) },
    }

    let response: Response
    try {
      response = await this.fetchFn(
        `${this.baseUrl}/${this.version}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${this.config.accessToken}`,
          },
          body: JSON.stringify(requestBody),
        }
      )
    } catch (error) {
      throw new Error(
        `WhatsAppMetaAdapter network failure: ${error instanceof Error ? error.message : 'unknown'}`
      )
    }

    if (!response.ok) {
      return this.mapMetaErrorResponse(payload, response)
    }

    const body = (await response.json()) as { messages?: Array<{ id?: string }> }
    const externalMessageId = body.messages?.[0]?.id
    if (!externalMessageId) {
      return {
        outcome: 'failed',
        failureCode: 'meta_missing_message_id',
        receipt: formatWhatsAppReceipt({
          gateway: this.identity(),
          notificationType: payload.type,
          outcome: 'failed',
          failureCode: 'meta_missing_message_id',
        }),
      }
    }

    return {
      outcome: 'accepted',
      externalMessageId,
      receipt: formatWhatsAppReceipt({
        gateway: this.identity(),
        notificationType: payload.type,
        outcome: 'accepted',
        externalMessageId,
        guardianRef: undefined,
      }),
    }
  }

  private async mapMetaErrorResponse(
    payload: AttendanceNotificationPayload,
    response: Response
  ): Promise<WhatsAppSendResult> {
    let errorCode: number | undefined
    try {
      const body = (await response.json()) as MetaApiErrorBody
      errorCode = body.error?.code
    } catch {
      // Unparseable error body: fall back to the HTTP status only.
    }
    const failureCode = errorCode !== undefined
      ? (META_ERROR_CODE_MAP[errorCode] ?? `meta_error_${errorCode}`)
      : `meta_http_${response.status}`

    return {
      outcome: 'failed',
      failureCode,
      receipt: formatWhatsAppReceipt({
        gateway: this.identity(),
        notificationType: payload.type,
        outcome: 'failed',
        failureCode,
        guardianRef: undefined,
      }),
    }
  }

  /**
   * Authenticates inbound webhooks: X-Hub-Signature-256 is an HMAC-SHA256 of
   * the raw request body keyed with the Meta app secret. Constant-time
   * comparison prevents timing side channels.
   */
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader) return false
    const provided = signatureHeader.startsWith('sha256=') ? signatureHeader.slice(7) : signatureHeader
    const digest = createHmac('sha256', this.config.appSecret)
      .update(rawBody, 'utf8')
      .digest('hex')
    return constantTimeEqualHex(provided, digest)
  }

  /** Validates the webhook GET handshake token (hub.verify_token). */
  verifyWebhookVerifyToken(candidate: string | null): boolean {
    if (!candidate || !this.config.verifyToken) return false
    return constantTimeEqualUtf8(candidate, this.config.verifyToken)
  }
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
}

function constantTimeEqualUtf8(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8')
  const bufferB = Buffer.from(b, 'utf8')
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB)
}
