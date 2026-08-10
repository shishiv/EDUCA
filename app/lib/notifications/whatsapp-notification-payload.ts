/**
 * Domain-shaped outbound payload for WhatsApp attendance notifications.
 *
 * This file owns the caller's vocabulary: attendance alerts, Brazilian phone
 * normalization, and the message body builder. Nothing here knows Meta
 * request details (Graph API URLs, tokens, wamid) - adapters map this payload
 * to their transport.
 */

import { z } from 'zod'

/** Notification types emitted by the attendance flow. */
export const attendanceNotificationTypes = ['presenca_falta', 'presenca_presente'] as const
export type AttendanceNotificationType = (typeof attendanceNotificationTypes)[number]

/** Outbound attendance alert accepted by every WhatsApp gateway adapter. */
export const attendanceNotificationPayloadSchema = z.object({
  type: z.enum(attendanceNotificationTypes),
  studentName: z.string().min(2).max(200),
  /** Class date, YYYY-MM-DD (calendar date, not timestamp). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve estar em YYYY-MM-DD'),
  schoolName: z.string().max(200).optional(),
  /** Recipient phone already normalized to Brazilian E.164 (55 + DDD + number). */
  guardianPhoneE164: z.string().regex(/^55\d{10,11}$/, 'telefone deve ser E.164 brasileiro'),
})

export type AttendanceNotificationPayload = z.infer<typeof attendanceNotificationPayloadSchema>

/** Converts YYYY-MM-DD to the dd/mm/aaaa shape used in message bodies. */
export function formatBrazilianDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

/** Builds the exact message body for an attendance alert. Pure and deterministic. */
export function buildAttendanceMessageBody(payload: AttendanceNotificationPayload): string {
  const schoolSuffix = payload.schoolName ? ` - ${payload.schoolName}` : ''
  const formattedDate = formatBrazilianDate(payload.date)
  if (payload.type === 'presenca_falta') {
    return `Frequência escolar: ${payload.studentName} ficou ausente em ${formattedDate}.${schoolSuffix}`
  }
  return `Frequência escolar: presença de ${payload.studentName} confirmada em ${formattedDate}.${schoolSuffix}`
}

/**
 * Normalizes a raw Brazilian phone to E.164 (digits, 55 prefix) for Meta.
 * Accepts 10/11 local digits (DDD + number) and 12/13 digits with 55 prefix.
 * Returns null when the phone cannot be interpreted safely.
 */
export function normalizeBrazilianPhoneToE164(telefone: string | null | undefined): string | null {
  if (!telefone) return null
  const digits = telefone.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  if (digits.length === 12 && digits.startsWith('55')) return digits
  if (digits.length === 13 && digits.startsWith('55')) return digits
  return null
}

/** Masks an E.164 phone for receipts and logs: only the last 4 digits remain. */
export function maskPhoneForReceipt(phoneE164: string): string {
  if (phoneE164.length <= 4) return '****'
  return `${'*'.repeat(phoneE164.length - 4)}${phoneE164.slice(-4)}`
}
