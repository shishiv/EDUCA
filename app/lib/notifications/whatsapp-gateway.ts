/**
 * WhatsApp notification gateway - the single seam for attendance alerts.
 *
 * Callers and webhook routes only learn this interface. Meta request details
 * (Graph API version, URL, Bearer token, template window rules, wamid, HMAC
 * signature algorithm) stay inside the adapters behind it, so a production
 * Meta adapter and a deterministic local fake are interchangeable.
 */

import type { AttendanceNotificationPayload } from './whatsapp-notification-payload'

/** Terminal gateway outcomes for a single send attempt. */
export type WhatsAppDeliveryOutcome =
  | 'accepted' // transport accepted the message; externalMessageId (wamid) is set
  | 'delivered' // local fake completed the delivery simulation
  | 'blocked' // external delivery refused by a safety boundary, receipt preserved
  | 'failed' // permanent transport failure, no further retries

/** Why a send was blocked before reaching the transport. */
export type WhatsAppBlockReason =
  | 'pilot_mode' // PILOT_MODE=true forces the local fake
  | 'missing_credentials' // Meta credentials are not fully configured
  | 'not_enabled' // WHATSAPP_META_ENABLED is not 'true'
  | 'recipient_missing' // no valid Brazilian phone for the guardian
  | 'opt_out' // guardian has not consented (or withdrew consent)
  | 'template_pending' // Meta requires an approved template outside the 24h window

/** Result of one send attempt. Receipt text is always PII-masked. */
export interface WhatsAppSendResult {
  outcome: WhatsAppDeliveryOutcome
  externalMessageId?: string
  blockReason?: WhatsAppBlockReason
  failureCode?: string
  /** Human-readable, masked local receipt; safe to persist, return, or print. */
  receipt: string
}

/** Identifies which adapter answered, for receipts and audit trails. */
export interface WhatsAppGatewayIdentity {
  adapterName: 'meta' | 'local-fake'
  /** Human-readable reason the mode was chosen (empty for meta). */
  mode: string
  pilotForced: boolean
}

/**
 * Transient transport failure: the caller (delivery service) schedules a
 * retry with backoff. Permanent failures return outcome 'failed' instead.
 */
export class WhatsAppTransientDeliveryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WhatsAppTransientDeliveryError'
  }
}

export interface WhatsAppNotificationGateway {
  /** Sends one attendance alert. Never throws for policy blocks - returns them. */
  sendAttendanceNotification(payload: AttendanceNotificationPayload): Promise<WhatsAppSendResult>

  /** Authenticates an inbound webhook payload (HMAC over the raw body). */
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean

  /** Validates the webhook GET handshake token (hub.verify_token). */
  verifyWebhookVerifyToken(candidate: string | null): boolean

  identity(): WhatsAppGatewayIdentity
}
