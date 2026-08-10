import { ATENCAO, CONFORMIDADE, getFrequencyPolicyStatus, type FrequencyPolicyStatus } from './attendance-policy'

export interface AttendanceCounts {
  presencas: number
  faltas: number
  atestados: number
  total: number
}

export interface AttendanceRecordForCalculation {
  presente: boolean
  status_presenca: string | null
}

/** Atestados and justifications count as attended for the policy calculation. */
export function isExcusedAttendanceStatus(status: string | null): boolean {
  const normalizedStatus = status?.toUpperCase()
  return normalizedStatus === 'A' || normalizedStatus === 'J'
}

/** Counts canonical attendance records without relying on a legacy status label. */
export function countAttendanceRecords(
  records: AttendanceRecordForCalculation[]
): AttendanceCounts {
  let presencas = 0
  let faltas = 0
  let atestados = 0

  for (const record of records) {
    if (isExcusedAttendanceStatus(record.status_presenca)) {
      atestados += 1
    } else if (record.presente) {
      presencas += 1
    } else {
      faltas += 1
    }
  }

  return {
    presencas,
    faltas,
    atestados,
    total: records.length,
  }
}

/** Calculates the rounded attendance percentage used by reports and alerts. */
export function calculateAttendancePercentage(
  presencas: number,
  faltas: number,
  atestados: number
): number {
  const total = presencas + faltas + atestados
  if (total === 0) return 0

  return Math.round(((presencas + atestados) / total) * 100)
}

export interface AttendancePolicySummary extends AttendanceCounts {
  percentual: number
  status: FrequencyPolicyStatus
  conforme: boolean
  atencaoPreventiva: boolean
}

/** Adds the canonical policy status to a set of attendance counts. */
export function summarizeAttendanceCounts(
  counts: AttendanceCounts
): AttendancePolicySummary {
  const percentual = calculateAttendancePercentage(
    counts.presencas,
    counts.faltas,
    counts.atestados
  )
  const status = getFrequencyPolicyStatus(percentual)

  return {
    ...counts,
    percentual,
    status,
    conforme: percentual >= CONFORMIDADE,
    atencaoPreventiva: percentual >= CONFORMIDADE && percentual < ATENCAO,
  }
}
