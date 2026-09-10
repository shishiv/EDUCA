/**
 * General municipal frequency alert bands.
 *
 * These bands classify the general attendance projection. Benefit-specific
 * eligibility uses the separately authorized conditionality read model.
 */
export const CONFORMIDADE = 80
export const ATENCAO = 85

export const FREQUENCIA_THRESHOLDS = {
  CONFORMIDADE,
  ATENCAO,
} as const

export type FrequencyPolicyStatus = 'CONFORME' | 'ATENCAO' | 'CRITICO'

/** Classifies a percentage using the municipal reference and attention bands. */
export function getFrequencyPolicyStatus(percentual: number): FrequencyPolicyStatus {
  if (percentual < CONFORMIDADE) return 'CRITICO'
  if (percentual < ATENCAO) return 'ATENCAO'
  return 'CONFORME'
}

/** Returns whether the general municipal attendance reference is met. */
export function isAttendanceCompliant(percentual: number): boolean {
  return percentual >= CONFORMIDADE
}

/** Returns whether the percentage needs preventive municipal attention. */
export function needsPreventiveAttendanceAttention(percentual: number): boolean {
  return percentual >= CONFORMIDADE && percentual < ATENCAO
}

/** Copy labels keep the two meanings visible to staff and exported readers. */
export function getFrequencyPolicyLabel(status: FrequencyPolicyStatus): string {
  switch (status) {
    case 'CRITICO':
      return 'Abaixo da referência municipal'
    case 'ATENCAO':
      return 'Atenção preventiva'
    case 'CONFORME':
      return 'Referência municipal atendida'
  }
}
