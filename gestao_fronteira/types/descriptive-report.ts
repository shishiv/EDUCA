/**
 * TypeScript types for Descriptive Reports (Relatorios Descritivos)
 * Task Group 3.2: Relatorios Descritivos (Ed. Infantil)
 * OpenSpec Change: 2025-12-04-diario-de-classe
 *
 * These types support the semester-based descriptive reports for
 * Early Childhood Education (Educacao Infantil) following BNCC's
 * 5 Experience Fields (Campos de Experiencia).
 */

import type { BNNCExperienceFieldCode } from './lesson-content'

// ============================================================================
// REPORT STATUS AND SEMESTER TYPES
// ============================================================================

/**
 * Report status
 */
export type ReportStatus = 'rascunho' | 'finalizado'

/**
 * Semester type
 */
export type SemestreType = 'primeiro' | 'segundo'

/**
 * Report status configuration for display
 */
export const REPORT_STATUS_CONFIG = {
  rascunho: {
    label: 'Rascunho',
    color: 'yellow',
    bgColor: '#fef3c7',
    borderColor: '#f59e0b',
    textColor: '#92400e',
    icon: 'PenLine',
  },
  finalizado: {
    label: 'Finalizado',
    color: 'green',
    bgColor: '#dcfce7',
    borderColor: '#22c55e',
    textColor: '#166534',
    icon: 'CheckCircle',
  },
} as const

/**
 * Semester configuration for display
 */
export const SEMESTER_CONFIG = {
  primeiro: {
    label: '1 Semestre',
    shortLabel: '1o Sem',
    months: 'Fevereiro - Julho',
    startMonth: 2,
    endMonth: 7,
  },
  segundo: {
    label: '2 Semestre',
    shortLabel: '2o Sem',
    months: 'Agosto - Dezembro',
    startMonth: 8,
    endMonth: 12,
  },
} as const

// ============================================================================
// EXPERIENCE FIELDS CONFIGURATION
// ============================================================================

/**
 * Experience field keys matching database columns
 */
export type ExperienceFieldKey =
  | 'campo_eu_outro_nos'
  | 'campo_corpo_gestos'
  | 'campo_tracos_sons'
  | 'campo_escuta_fala'
  | 'campo_espacos_tempos'

/**
 * Experience field configuration for forms
 */
export interface ExperienceFieldConfig {
  key: ExperienceFieldKey
  code: BNNCExperienceFieldCode
  label: string
  fullName: string
  description: string
  placeholder: string
  minLength: number
  maxLength: number
}

/**
 * Experience fields configuration for forms and display
 */
export const EXPERIENCE_FIELDS_CONFIG: ExperienceFieldConfig[] = [
  {
    key: 'campo_eu_outro_nos',
    code: 'EO',
    label: 'O eu, o outro e o nos',
    fullName: 'O eu, o outro e o nos',
    description:
      'Desenvolvimento da identidade pessoal e social, construcao de autonomia e nocao de coletividade',
    placeholder:
      'Descreva o desenvolvimento da crianca em relacao a identidade pessoal, interacoes sociais, autonomia e convivencia com os colegas...',
    minLength: 50,
    maxLength: 2000,
  },
  {
    key: 'campo_corpo_gestos',
    code: 'CG',
    label: 'Corpo, gestos e movimentos',
    fullName: 'Corpo, gestos e movimentos',
    description:
      'Exploracao do corpo, gestos, movimentos, coordenacao motora e expressao corporal',
    placeholder:
      'Descreva o desenvolvimento motor da crianca, coordenacao, expressao corporal, participacao em atividades fisicas...',
    minLength: 50,
    maxLength: 2000,
  },
  {
    key: 'campo_tracos_sons',
    code: 'TS',
    label: 'Tracos, sons, cores e formas',
    fullName: 'Tracos, sons, cores e formas',
    description:
      'Exploracao artistica atraves de tracos, sons, cores, formas e expressoes culturais',
    placeholder:
      'Descreva a expressao artistica da crianca, interesse por musica, artes plasticas, cores, formas e manifestacoes culturais...',
    minLength: 50,
    maxLength: 2000,
  },
  {
    key: 'campo_escuta_fala',
    code: 'EF',
    label: 'Escuta, fala, pensamento e imaginacao',
    fullName: 'Escuta, fala, pensamento e imaginacao',
    description:
      'Desenvolvimento da linguagem oral, escuta ativa, pensamento critico e imaginacao',
    placeholder:
      'Descreva o desenvolvimento da linguagem oral, capacidade de comunicacao, participacao em conversas, criatividade e imaginacao...',
    minLength: 50,
    maxLength: 2000,
  },
  {
    key: 'campo_espacos_tempos',
    code: 'ET',
    label: 'Espacos, tempos, quantidades',
    fullName: 'Espacos, tempos, quantidades, relacoes e transformacoes',
    description:
      'Nocoes espaciais, temporais, quantitativas e relacoes de transformacao do mundo',
    placeholder:
      'Descreva a compreensao da crianca sobre espaco, tempo, quantidade, sequencias, transformacoes e relacoes com o ambiente...',
    minLength: 50,
    maxLength: 2000,
  },
]

/**
 * Get experience field config by key
 */
export function getExperienceFieldConfig(
  key: ExperienceFieldKey
): ExperienceFieldConfig | undefined {
  return EXPERIENCE_FIELDS_CONFIG.find((field) => field.key === key)
}

/**
 * Get experience field config by BNCC code
 */
export function getExperienceFieldByCode(
  code: BNNCExperienceFieldCode
): ExperienceFieldConfig | undefined {
  return EXPERIENCE_FIELDS_CONFIG.find((field) => field.code === code)
}

// ============================================================================
// DESCRIPTIVE REPORT TYPES
// ============================================================================

/**
 * Descriptive report record from database
 */
export interface DescriptiveReport {
  id: string
  matricula_id: string
  turma_id: string
  professor_id: string
  ano_letivo: number
  semestre: SemestreType
  status: ReportStatus
  // Experience Fields
  campo_eu_outro_nos: string | null
  campo_corpo_gestos: string | null
  campo_tracos_sons: string | null
  campo_escuta_fala: string | null
  campo_espacos_tempos: string | null
  // General
  observacoes_gerais: string | null
  // Draft
  draft_data: Record<string, unknown> | null
  last_draft_saved_at: string | null
  // Finalization
  finalizado_em: string | null
  finalizado_por: string | null
  // Audit
  created_at: string
  updated_at: string
  created_by: string | null
}

/**
 * Detailed descriptive report with related data
 */
export interface DescriptiveReportDetailed extends DescriptiveReport {
  // Student info
  aluno_id: string
  aluno_nome: string
  aluno_nascimento: string
  // Class info
  turma_nome: string
  turma_serie: string
  // School info
  escola_id: string
  escola_nome: string
  // Teacher info
  professor_nome: string
  // Calculated
  campos_preenchidos: number
  total_campos: number
}

/**
 * Input for creating a new report
 */
export interface DescriptiveReportInput {
  matricula_id: string
  turma_id: string
  ano_letivo: number
  semestre: SemestreType
  campo_eu_outro_nos?: string
  campo_corpo_gestos?: string
  campo_tracos_sons?: string
  campo_escuta_fala?: string
  campo_espacos_tempos?: string
  observacoes_gerais?: string
}

/**
 * Input for updating a report
 */
export interface DescriptiveReportUpdate {
  campo_eu_outro_nos?: string | null
  campo_corpo_gestos?: string | null
  campo_tracos_sons?: string | null
  campo_escuta_fala?: string | null
  campo_espacos_tempos?: string | null
  observacoes_gerais?: string | null
  status?: ReportStatus
  draft_data?: Record<string, unknown> | null
}

/**
 * Form data for descriptive report
 */
export interface DescriptiveReportFormData {
  campo_eu_outro_nos: string
  campo_corpo_gestos: string
  campo_tracos_sons: string
  campo_escuta_fala: string
  campo_espacos_tempos: string
  observacoes_gerais: string
}

/**
 * Filters for querying reports
 */
export interface DescriptiveReportFilters {
  turma_id?: string
  aluno_id?: string
  professor_id?: string
  ano_letivo?: number
  semestre?: SemestreType
  status?: ReportStatus
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * API response for single report
 */
export interface DescriptiveReportResponse {
  data: DescriptiveReport | null
  error: string | null
}

/**
 * API response for report list
 */
export interface DescriptiveReportListResponse {
  data: DescriptiveReportDetailed[] | null
  error: string | null
}

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

/**
 * Validation rules for descriptive reports
 */
export const DESCRIPTIVE_REPORT_VALIDATION = {
  minFieldLength: 50,
  maxFieldLength: 2000,
  maxObservacoesLength: 1000,
  requiredFieldsForFinalization: 5, // All 5 experience fields required
} as const

/**
 * Error messages for validation
 */
export const DESCRIPTIVE_REPORT_ERROR_MESSAGES = {
  fieldTooShort: (field: string, min: number) =>
    `${field} deve ter pelo menos ${min} caracteres`,
  fieldTooLong: (field: string, max: number) =>
    `${field} deve ter no maximo ${max} caracteres`,
  allFieldsRequired: 'Todos os 5 Campos de Experiencia devem ser preenchidos para finalizar',
  alreadyFinalized: 'Este relatorio ja foi finalizado e nao pode ser alterado',
  notAuthorized: 'Voce nao tem permissao para editar este relatorio',
  reportNotFound: 'Relatorio nao encontrado',
  duplicateReport: 'Ja existe um relatorio para este aluno neste periodo',
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current semester based on date
 */
export function getCurrentSemester(date: Date = new Date()): SemestreType {
  const month = date.getMonth() + 1 // JavaScript months are 0-indexed
  return month <= 7 ? 'primeiro' : 'segundo'
}

/**
 * Get current academic year
 */
export function getCurrentAcademicYear(date: Date = new Date()): number {
  return date.getFullYear()
}

/**
 * Calculate completion percentage
 */
export function calculateReportCompletion(report: DescriptiveReport): number {
  const fields = [
    report.campo_eu_outro_nos,
    report.campo_corpo_gestos,
    report.campo_tracos_sons,
    report.campo_escuta_fala,
    report.campo_espacos_tempos,
  ]

  const filledFields = fields.filter(
    (field) => field && field.trim().length >= DESCRIPTIVE_REPORT_VALIDATION.minFieldLength
  ).length

  return Math.round((filledFields / 5) * 100)
}

/**
 * Check if report can be finalized
 */
export function canFinalizeReport(report: DescriptiveReport): {
  canFinalize: boolean
  missingFields: ExperienceFieldKey[]
} {
  const missingFields: ExperienceFieldKey[] = []

  const fieldsToCheck: { key: ExperienceFieldKey; value: string | null }[] = [
    { key: 'campo_eu_outro_nos', value: report.campo_eu_outro_nos },
    { key: 'campo_corpo_gestos', value: report.campo_corpo_gestos },
    { key: 'campo_tracos_sons', value: report.campo_tracos_sons },
    { key: 'campo_escuta_fala', value: report.campo_escuta_fala },
    { key: 'campo_espacos_tempos', value: report.campo_espacos_tempos },
  ]

  fieldsToCheck.forEach(({ key, value }) => {
    if (!value || value.trim().length < DESCRIPTIVE_REPORT_VALIDATION.minFieldLength) {
      missingFields.push(key)
    }
  })

  return {
    canFinalize: missingFields.length === 0,
    missingFields,
  }
}

/**
 * Format semester for display
 */
export function formatSemester(semestre: SemestreType, anoLetivo: number): string {
  const config = SEMESTER_CONFIG[semestre]
  return `${config.label} de ${anoLetivo}`
}
