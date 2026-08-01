/** Confirmed support targets for the synthetic 90-day pilot foundation. */
export const PILOT_SUPPORT_TARGETS = {
  critical: {
    channel: 'whatsapp',
    firstResponseBusinessHours: 4,
  },
  normal: {
    channel: 'email_or_ticket',
    firstResponseBusinessDays: 1,
  },
} as const

/** Success metrics approved for instrumentation without student-level telemetry. */
export const PILOT_SUCCESS_TARGETS = {
  weeklyActiveSchoolsPercent: 80,
  attendanceCapturePercent: 90,
  maximumCriticalDataOrAccessIncidents: 0,
  minimumSatisfactionScore: 4,
} as const

/** Daily recovery objectives for the isolated synthetic restore rehearsal. */
export const PILOT_RECOVERY_TARGETS = {
  rpoHours: 24,
  rtoHours: 4,
  cadence: 'daily',
} as const
