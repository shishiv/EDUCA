/**
 * Canonical frequency alert policy for every attendance surface.
 *
 * CONFORMIDADE is the Bolsa Família conditionality threshold. ATENCAO is a
 * preventive municipal margin and must never replace the conditionality.
 */
export const CONFORMIDADE = 80
export const ATENCAO = 85

export const FREQUENCIA_THRESHOLDS = {
  CONFORMIDADE,
  ATENCAO,
} as const

export type FrequencyPolicyStatus = 'CONFORME' | 'ATENCAO' | 'CRITICO'

/** Classifies a percentage using the canonical compliance and attention bands. */
export function getFrequencyPolicyStatus(percentual: number): FrequencyPolicyStatus {
  if (percentual < CONFORMIDADE) return 'CRITICO'
  if (percentual < ATENCAO) return 'ATENCAO'
  return 'CONFORME'
}

/** Returns whether the Bolsa Família conditionality is met. */
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
      return 'Não conformidade Bolsa Família'
    case 'ATENCAO':
      return 'Atenção preventiva'
    case 'CONFORME':
      return 'Conformidade Bolsa Família'
  }
}
