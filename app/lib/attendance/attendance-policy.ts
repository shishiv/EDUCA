import { z } from 'zod'

/** General alert bands only. Bolsa Família uses its separate conditionality model. */
export const attendanceBandsSchema = z.object({
  reference: z.number().finite().positive().max(100),
  attention: z.number().finite().positive().max(100),
}).strict().refine(bands => bands.reference < bands.attention, {
  message: 'ATTENDANCE_BANDS_INVALID: reference must be below attention',
})

export type AttendanceBands = z.infer<typeof attendanceBandsSchema>
export type FrequencyPolicyStatus = 'CONFORME' | 'ATENCAO' | 'CRITICO'

/** Requires a resolved database policy, never an application default. */
export function getFrequencyPolicyStatus(percentual: number, bands: AttendanceBands): FrequencyPolicyStatus {
  if (percentual < bands.reference) return 'CRITICO'
  if (percentual < bands.attention) return 'ATENCAO'
  return 'CONFORME'
}

export function isAttendanceCompliant(percentual: number, bands: AttendanceBands): boolean {
  return percentual >= bands.reference
}

export function needsPreventiveAttendanceAttention(percentual: number, bands: AttendanceBands): boolean {
  return getFrequencyPolicyStatus(percentual, bands) === 'ATENCAO'
}

export function getFrequencyPolicyLabel(status: FrequencyPolicyStatus): string {
  switch (status) {
    case 'CRITICO': return 'Abaixo da referência municipal'
    case 'ATENCAO': return 'Atenção preventiva'
    case 'CONFORME': return 'Referência municipal atendida'
  }
}
