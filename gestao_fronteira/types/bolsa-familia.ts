/**
 * Bolsa Familia Types
 * Task Group 4.2: Alerta Bolsa Familia
 *
 * Types for tracking Bolsa Familia program beneficiaries
 * and their school attendance compliance.
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/tasks.md
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Bolsa Familia attendance thresholds
 * Reference: Brazilian education conditionalities
 */
export const BOLSA_FAMILIA_THRESHOLDS = {
  /** Minimum attendance for compliance (regular status) */
  minimum: 80,
  /** Warning threshold */
  warning: 75,
  /** Ages 6-15 official threshold (for reference) */
  official_6_15: 85,
  /** Ages 16-17 official threshold (for reference) */
  official_16_17: 75,
} as const

/**
 * Status levels for Bolsa Familia attendance
 */
export const BOLSA_FAMILIA_STATUS = {
  regular: 'regular',
  alerta: 'alerta',
  critico: 'critico',
  sem_aulas: 'sem_aulas',
} as const

export type BolsaFamiliaStatus = typeof BOLSA_FAMILIA_STATUS[keyof typeof BOLSA_FAMILIA_STATUS]

/**
 * Status configuration for UI display
 */
export const BOLSA_FAMILIA_STATUS_CONFIG: Record<BolsaFamiliaStatus, {
  label: string
  color: 'green' | 'yellow' | 'red' | 'gray'
  description: string
}> = {
  regular: {
    label: 'Regular',
    color: 'green',
    description: 'Frequencia acima de 80%',
  },
  alerta: {
    label: 'Alerta',
    color: 'yellow',
    description: 'Frequencia entre 75% e 80%',
  },
  critico: {
    label: 'Critico',
    color: 'red',
    description: 'Frequencia abaixo de 75%',
  },
  sem_aulas: {
    label: 'Sem Aulas',
    color: 'gray',
    description: 'Nenhuma aula registrada no periodo',
  },
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Student Bolsa Familia data
 */
export interface BolsaFamiliaStudent {
  /** Student UUID */
  aluno_id: string
  /** Student full name */
  aluno_nome: string
  /** NIS (Numero de Identificacao Social) */
  nis: string | null
  /** Date of birth */
  data_nascimento?: string | null
  /** Turma UUID */
  turma_id: string
  /** Turma name */
  turma_nome: string
  /** Grade/Serie */
  serie: string
  /** School UUID */
  escola_id: string
  /** School name */
  escola_nome: string
  /** Matricula UUID */
  matricula_id?: string
  /** Academic year */
  ano_letivo?: number
  /** Shift (turno) */
  turno?: string
  /** Total classes (aulas) */
  total_aulas: number
  /** Total present (P + A) */
  total_presencas: number
  /** Total absences (F only) */
  total_faltas: number
  /** Total excused absences (A only) */
  total_atestados: number
  /** Attendance percentage */
  frequencia_percentual: number
  /** Bolsa Familia status */
  status_bolsa_familia: BolsaFamiliaStatus
  /** Whether student is at risk (< 80%) */
  em_risco: boolean
}

/**
 * Bolsa Familia report filters
 */
export interface BolsaFamiliaFilters {
  /** Filter by school UUID */
  escola_id?: string
  /** Filter by turma UUID */
  turma_id?: string
  /** Start date for calculation */
  data_inicio?: string
  /** End date for calculation */
  data_fim?: string
  /** Risk threshold (default: 80) */
  threshold?: number
  /** Show only at-risk students */
  only_at_risk?: boolean
}

/**
 * Bolsa Familia report summary
 */
export interface BolsaFamiliaReportSummary {
  /** Total students with NIS */
  total_alunos_nis: number
  /** Students with regular attendance */
  total_regular: number
  /** Students in warning zone (75-80%) */
  total_alerta: number
  /** Students in critical zone (< 75%) */
  total_critico: number
  /** Students without classes */
  total_sem_aulas: number
  /** Overall compliance rate */
  taxa_conformidade: number
}

/**
 * Bolsa Familia report data
 */
export interface BolsaFamiliaReport {
  /** Report generation date */
  generated_at: string
  /** Period start date */
  data_inicio: string
  /** Period end date */
  data_fim: string
  /** Filters applied */
  filters: BolsaFamiliaFilters
  /** Summary statistics */
  summary: BolsaFamiliaReportSummary
  /** List of students */
  students: BolsaFamiliaStudent[]
}

/**
 * API Response types
 */
export interface BolsaFamiliaResponse {
  data: BolsaFamiliaStudent[] | null
  error: string | null
}

export interface BolsaFamiliaReportResponse {
  data: BolsaFamiliaReport | null
  error: string | null
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get status from attendance percentage
 */
export function getBolsaFamiliaStatus(
  percentual: number,
  totalAulas: number
): BolsaFamiliaStatus {
  if (totalAulas === 0) return 'sem_aulas'
  if (percentual >= BOLSA_FAMILIA_THRESHOLDS.minimum) return 'regular'
  if (percentual >= BOLSA_FAMILIA_THRESHOLDS.warning) return 'alerta'
  return 'critico'
}

/**
 * Check if student is at risk
 */
export function isStudentAtRisk(
  percentual: number,
  totalAulas: number,
  threshold: number = BOLSA_FAMILIA_THRESHOLDS.minimum
): boolean {
  if (totalAulas === 0) return false
  return percentual < threshold
}

/**
 * Format NIS for display (add separators)
 */
export function formatNIS(nis: string | null): string {
  if (!nis) return '-'
  // Format: XXX.XXXXX.XX-X
  if (nis.length !== 11) return nis
  return `${nis.slice(0, 3)}.${nis.slice(3, 8)}.${nis.slice(8, 10)}-${nis.slice(10)}`
}

/**
 * Validate NIS format (11 digits)
 */
export function isValidNIS(nis: string): boolean {
  return /^[0-9]{11}$/.test(nis)
}

/**
 * Calculate Bolsa Familia frequency
 * Per spec: Atestado (A) counts as presence for 80% calculation
 *
 * @param presencas - Number of present days (P)
 * @param atestados - Number of excused absences (A)
 * @param totalAulas - Total number of classes
 */
export function calculateBolsaFamiliaFrequency(
  presencas: number,
  atestados: number,
  totalAulas: number
): number {
  if (totalAulas === 0) return 0
  // Atestado counts as presence for Bolsa Familia calculation
  const effectivePresencas = presencas + atestados
  return (effectivePresencas / totalAulas) * 100
}

/**
 * Get student age from birth date
 */
export function getStudentAge(dataNascimento: string | null): number | null {
  if (!dataNascimento) return null
  const birthDate = new Date(dataNascimento)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

/**
 * Get applicable threshold based on student age
 * Brazilian education conditionalities:
 * - Ages 6-15: 85% minimum
 * - Ages 16-17: 75% minimum
 *
 * We use 80% as early warning threshold for all ages
 */
export function getAgeBasedThreshold(age: number | null): number {
  if (age === null) return BOLSA_FAMILIA_THRESHOLDS.minimum
  if (age >= 16 && age <= 17) return BOLSA_FAMILIA_THRESHOLDS.official_16_17
  return BOLSA_FAMILIA_THRESHOLDS.minimum
}

/**
 * Calculate report summary from students list
 */
export function calculateBolsaFamiliaSummary(
  students: BolsaFamiliaStudent[]
): BolsaFamiliaReportSummary {
  const total = students.length
  const regular = students.filter(s => s.status_bolsa_familia === 'regular').length
  const alerta = students.filter(s => s.status_bolsa_familia === 'alerta').length
  const critico = students.filter(s => s.status_bolsa_familia === 'critico').length
  const semAulas = students.filter(s => s.status_bolsa_familia === 'sem_aulas').length

  const studentsWithClasses = total - semAulas
  const taxaConformidade = studentsWithClasses > 0
    ? (regular / studentsWithClasses) * 100
    : 0

  return {
    total_alunos_nis: total,
    total_regular: regular,
    total_alerta: alerta,
    total_critico: critico,
    total_sem_aulas: semAulas,
    taxa_conformidade: Math.round(taxaConformidade * 10) / 10,
  }
}
