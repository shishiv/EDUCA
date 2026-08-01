/**
 * Local WhatsApp delivery receipts.
 *
 * Every send attempt - delivered, blocked, or failed - produces one masked
 * receipt line. Receipts never contain phone numbers, message bodies, tokens,
 * or full student names: personal data is minimized by construction.
 * Receipts are appended to .pilot-evidence/whatsapp-receipts.jsonl (already
 * gitignored) when the filesystem allows it, and always returned in the
 * send result so callers can persist or display them.
 */

import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  WhatsAppBlockReason,
  WhatsAppDeliveryOutcome,
  WhatsAppGatewayIdentity,
} from './whatsapp-gateway'

export interface WhatsAppReceiptFields {
  gateway: WhatsAppGatewayIdentity
  notificationType: string
  /** Gateway outcomes plus 'duplicate' for idempotent re-triggers. */
  outcome: WhatsAppDeliveryOutcome | 'duplicate'
  externalMessageId?: string
  blockReason?: WhatsAppBlockReason
  failureCode?: string
  /** Short guardian reference: first 8 chars of the UUID, never the phone. */
  guardianRef?: string
}

const PILOT_EVIDENCE_DIR = join(process.cwd(), '..', '.pilot-evidence')

/** Best-effort append to the local evidence file; never throws. */
export function appendWhatsAppReceiptFile(line: string): void {
  try {
    appendFileSync(join(PILOT_EVIDENCE_DIR, 'whatsapp-receipts.jsonl'), `${line}\n`, {
      encoding: 'utf8',
    })
  } catch {
    // Serverless deployments have a read-only filesystem; the receipt still
    // travels in the send result and the notification row.
  }
}

/**
 * Builds the one-line masked receipt for a send attempt. Safe to log,
 * persist, and return to clients.
 */
export function formatWhatsAppReceipt(fields: WhatsAppReceiptFields): string {
  const identity = `whatsapp:${fields.gateway.adapterName}`
  const parts = [
    `[${identity}]`,
    `type=${fields.notificationType}`,
    `outcome=${fields.outcome}`,
  ]
  if (fields.guardianRef) parts.push(`guardian=${fields.guardianRef}`)
  if (fields.externalMessageId) parts.push(`wamid=${fields.externalMessageId}`)
  if (fields.blockReason) parts.push(`motivo=${fields.blockReason}`)
  if (fields.failureCode) parts.push(`erro=${fields.failureCode}`)
  return parts.join(' ')
}
