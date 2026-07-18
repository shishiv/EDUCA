/**
 * TypeScript types for Grades System (Sistema de Notas)
 * Task Group 3.1: Sistema de Notas Bimestrais (Fundamental I)
 * OpenSpec Change: 2025-12-04-diario-de-classe
 *
 * Brazilian Educational System:
 * - Notas: 0 to 10 scale with one decimal place
 * - Bimestres: 4 per academic year
 * - Media (average): Calculated automatically from bimester grades
 *
 * Color coding for grades:
 * - Verde (green): >= 7 (passing)
 * - Amarelo (yellow): >= 5 and < 7 (needs attention)
 * - Vermelho (red): < 5 (failing)
 */

import { BNNCSubjectCode, BNCC_SUBJECTS } from './lesson-content'

// ============================================================================
// GRADE CONSTANTS
// ============================================================================

/**
 * Grade value range
 */
export const GRADE_RANGE = {
  min: 0,
  max: 10,
  decimalPlaces: 1,
} as const

/**
 * Bimester range (1-4)
 */
export const BIMESTER_RANGE = {
  min: 1,
  max: 4,
} as const

/**
 * Grade thresholds for color coding
 */
export const GRADE_THRESHOLDS = {
  passing: 7, // >= 7 is green (passing)
  warning: 5, // >= 5 and < 7 is yellow (needs attention)
  // < 5 is red (failing)
} as const

/**
 * Bimester type (1, 2, 3, or 4)
 */
export type Bimester = 1 | 2 | 3 | 4

/**
 * Grade color based on value
 */
export type GradeColor = 'green' | 'yellow' | 'red'

/**
 * Get color for a grade value
 */
export function getGradeColor(nota: number): GradeColor {
  if (nota >= GRADE_THRESHOLDS.passing) return 'green'
  if (nota >= GRADE_THRESHOLDS.warning) return 'yellow'
  return 'red'
}

/**
 * Tailwind CSS classes for grade colors
 */
export const GRADE_COLOR_CLASSES = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-500',
    text: 'text-green-700',
    input: 'focus:ring-green-500 border-green-300',
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-500',
    text: 'text-yellow-700',
    input: 'focus:ring-yellow-500 border-yellow-300',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-500',
    text: 'text-red-700',
    input: 'focus:ring-red-500 border-red-300',
  },
} as const

// ============================================================================
// GRADE TYPES
// ============================================================================

/**
 * Grade record from database
 * Matches the `notas` table schema
 */
export interface Grade {
  id: string
  matricula_id: string
  disciplina: string
  bimestre: Bimester
  nota: number
  tipo_avaliacao: string
  data_avaliacao: string
  observacoes: string | null
  created_at: string
}

/**
 * Input type for creating a grade
 */
export interface GradeInput {
  matricula_id: string
  disciplina: string
  bimestre: Bimester
  nota: number
  tipo_avaliacao: string
  data_avaliacao: string
  observacoes?: string
}

/**
 * Input type for updating a grade
 */
export interface GradeUpdate {
  nota?: number
  tipo_avaliacao?: string
  data_avaliacao?: string
  observacoes?: string
}

/**
 * Grade with student information (for display in grids)
 */
export interface GradeWithStudent extends Grade {
  aluno_id: string
  aluno_nome: string
  aluno_numero?: number
}

/**
 * Bimester grades for a student in a discipline
 */
export interface BimesterGrades {
  matricula_id: string
  disciplina: string
  grades: {
    bimestre: Bimester
    nota: number | null
    gradeId: string | null
  }[]
  average: number | null
  isComplete: boolean
}

/**
 * Average calculation result
 */
export interface AverageResult {
  average: number | null
  bimesterGrades: Grade[]
  isComplete: boolean
  sum: number
  count: number
}

/**
 * Filters for querying grades
 */
export interface GradeFilters {
  matricula_id?: string
  turma_id?: string
  disciplina?: string
  bimestre?: Bimester
  ano_letivo?: number
}

// ============================================================================
// GRADE GRID TYPES
// ============================================================================

/**
 * Row in the grade grid (one per student)
 */
export interface GradeGridRow {
  matricula_id: string
  aluno_id: string
  aluno_nome: string
  aluno_numero?: number
  bimestre1: number | null
  bimestre2: number | null
  bimestre3: number | null
  bimestre4: number | null
  media: number | null
  gradeIds: {
    bimestre1: string | null
    bimestre2: string | null
    bimestre3: string | null
    bimestre4: string | null
  }
}

/**
 * Grade grid data for a class and discipline
 */
export interface GradeGridData {
  turma_id: string
  turma_nome: string
  disciplina: string
  ano_letivo: number
  rows: GradeGridRow[]
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * API response for single grade
 */
export interface GradeResponse {
  data: Grade | null
  error: string | null
}

/**
 * API response for grade list
 */
export interface GradeListResponse {
  data: Grade[] | null
  error: string | null
}

/**
 * API response for average calculation
 */
export interface AverageResponse {
  data: AverageResult | null
  error: string | null
}

/**
 * API response for grade grid
 */
export interface GradeGridResponse {
  data: GradeGridData | null
  error: string | null
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate grade value is within 0-10 range
 */
export function isValidGrade(nota: number): boolean {
  return nota >= GRADE_RANGE.min && nota <= GRADE_RANGE.max
}

/**
 * Validate bimester is 1-4
 */
export function isValidBimester(bimestre: number): bimestre is Bimester {
  return bimestre >= BIMESTER_RANGE.min && bimestre <= BIMESTER_RANGE.max
}

/**
 * Round grade to one decimal place
 */
export function roundGrade(nota: number): number {
  return Math.round(nota * 10) / 10
}

/**
 * Format grade for display
 */
export function formatGrade(nota: number | null): string {
  if (nota === null) return '-'
  return nota.toFixed(1).replace('.', ',')
}

/**
 * Parse grade from string input
 */
export function parseGrade(value: string): number | null {
  // Replace comma with dot for parsing
  const normalized = value.replace(',', '.')
  const parsed = parseFloat(normalized)

  if (isNaN(parsed)) return null
  if (!isValidGrade(parsed)) return null

  return roundGrade(parsed)
}

// ============================================================================
// ERROR MESSAGES
// ============================================================================

/**
 * Error messages for grade validation
 */
export const GRADE_ERROR_MESSAGES = {
  notaRequired: 'Nota e obrigatoria',
  notaInvalid: `Nota deve estar entre ${GRADE_RANGE.min} e ${GRADE_RANGE.max}`,
  bimestreRequired: 'Bimestre e obrigatorio',
  bimestreInvalid: `Bimestre deve ser entre ${BIMESTER_RANGE.min} e ${BIMESTER_RANGE.max}`,
  disciplinaRequired: 'Disciplina e obrigatoria',
  matriculaRequired: 'Matricula e obrigatoria',
  tipoAvaliacaoRequired: 'Tipo de avaliacao e obrigatorio',
  dataAvaliacaoRequired: 'Data da avaliacao e obrigatoria',
} as const

// ============================================================================
// DISCIPLINE OPTIONS
// ============================================================================

/**
 * Get available disciplines for grade entry
 * Uses BNCC subjects from lesson-content types
 */
export function getAvailableDisciplines(): { code: string; name: string }[] {
  return Object.values(BNCC_SUBJECTS).map((subject) => ({
    code: subject.code,
    name: subject.fullName,
  }))
}

/**
 * Get discipline name from code
 */
export function getDisciplineName(code: string): string {
  const subject = BNCC_SUBJECTS[code as BNNCSubjectCode]
  return subject?.fullName || code
}

// ============================================================================
// BIMESTER OPTIONS
// ============================================================================

/**
 * Bimester options for select inputs
 */
export const BIMESTER_OPTIONS: { value: Bimester; label: string }[] = [
  { value: 1, label: '1o Bimestre' },
  { value: 2, label: '2o Bimestre' },
  { value: 3, label: '3o Bimestre' },
  { value: 4, label: '4o Bimestre' },
]

/**
 * Get bimester label
 */
export function getBimesterLabel(bimestre: Bimester): string {
  const option = BIMESTER_OPTIONS.find((opt) => opt.value === bimestre)
  return option?.label || `${bimestre}o Bimestre`
}

// ============================================================================
// EVALUATION TYPE OPTIONS
// ============================================================================

/**
 * Evaluation type options
 */
export const EVALUATION_TYPE_OPTIONS = [
  { value: 'prova', label: 'Prova' },
  { value: 'trabalho', label: 'Trabalho' },
  { value: 'atividade', label: 'Atividade' },
  { value: 'participacao', label: 'Participacao' },
  { value: 'media', label: 'Media Bimestral' },
] as const

export type EvaluationType = typeof EVALUATION_TYPE_OPTIONS[number]['value']
