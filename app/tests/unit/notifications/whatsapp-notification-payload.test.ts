import { describe, expect, it } from 'vitest'
import {
  attendanceNotificationPayloadSchema,
  buildAttendanceMessageBody,
  formatBrazilianDate,
  maskPhoneForReceipt,
  normalizeBrazilianPhoneToE164,
} from '@/lib/notifications/whatsapp-notification-payload'

describe('whatsapp notification payload', () => {
  const validPayload = {
    type: 'presenca_falta' as const,
    studentName: 'Aluno Sintetico',
    date: '2026-08-01',
    guardianPhoneE164: '5531999998888',
  }

  it('accepts valid attendance alert payloads', () => {
    expect(attendanceNotificationPayloadSchema.safeParse(validPayload).success).toBe(true)
  })

  it('rejects non-Brazilian phones and malformed dates', () => {
    expect(
      attendanceNotificationPayloadSchema.safeParse({ ...validPayload, guardianPhoneE164: '3199998888' }).success
    ).toBe(false)
    expect(
      attendanceNotificationPayloadSchema.safeParse({ ...validPayload, date: '01/08/2026' }).success
    ).toBe(false)
  })

  it('builds the falta message body deterministically', () => {
    const body = buildAttendanceMessageBody(validPayload)
    expect(body).toContain('Aluno Sintetico')
    expect(body).toContain('01/08/2026')
    expect(buildAttendanceMessageBody(validPayload)).toBe(body)
  })

  it('appends the school name when provided', () => {
    const body = buildAttendanceMessageBody({ ...validPayload, schoolName: 'Escola Sintetica' })
    expect(body).toContain('- Escola Sintetica')
  })

  it('normalizes Brazilian phones to E.164 with 55 prefix', () => {
    expect(normalizeBrazilianPhoneToE164('(31) 99999-8888')).toBe('5531999998888')
    expect(normalizeBrazilianPhoneToE164('3199998888')).toBe('553199998888')
    expect(normalizeBrazilianPhoneToE164('+55 31 99999-8888')).toBe('5531999998888')
    expect(normalizeBrazilianPhoneToE164('5531999998888')).toBe('5531999998888')
  })

  it('rejects uninterpretable phones', () => {
    expect(normalizeBrazilianPhoneToE164(null)).toBeNull()
    expect(normalizeBrazilianPhoneToE164('')).toBeNull()
    expect(normalizeBrazilianPhoneToE164('1234')).toBeNull()
    expect(normalizeBrazilianPhoneToE164('99999999999999999')).toBeNull()
  })

  it('masks phones keeping only the last four digits', () => {
    expect(maskPhoneForReceipt('5531999998888')).toBe('*********8888')
    expect(maskPhoneForReceipt('5531')).toBe('****')
  })

  it('formats dates as dd/mm/aaaa', () => {
    expect(formatBrazilianDate('2026-08-01')).toBe('01/08/2026')
  })
})
