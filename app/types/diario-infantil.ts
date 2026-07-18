/**
 * TypeScript types for Diario Infantil (Early Childhood Education)
 * Phase 5: Aluno & Diario Infantil
 *
 * These types support the vivencias (observations/experiences) registration
 * following BNCC's 5 Campos de Experiencia framework.
 *
 * IMPORTANT: BNCC prohibits numerical grades for Educacao Infantil.
 * Only descriptive text is allowed.
 *
 * @see .planning/phases/05-aluno-diario-infantil/05-02-PLAN.md
 * @see .planning/phases/05-aluno-diario-infantil/05-RESEARCH.md
 */

import type { CampoType } from '@/components/ui/campo-experiencia'

// Re-export CampoType for convenience
export type { CampoType } from '@/components/ui/campo-experiencia'

// ============================================================================
// CAMPOS DE EXPERIENCIA CONFIGURATION
// ============================================================================

/**
 * BNCC Campos de Experiencia configuration with official names and colors
 * Colors from existing globals.css (--campo-* variables)
 */
export const CAMPOS_EXPERIENCIA = {
  eu: {
    key: 'eu' as const,
    code: 'EO',
    name: 'O eu, o outro e o nos',
    shortName: 'O eu, o outro e o nos',
    description: 'Desenvolvimento da identidade pessoal e social, construcao de autonomia e nocao de coletividade',
    color: '#ec4899',        // --campo-eu (pink-500)
    bgColor: '#fdf2f8',      // --campo-eu-bg
    lightColor: '#fce7f3',   // --campo-eu-light
    emoji: '🤝'
  },
  corpo: {
    key: 'corpo' as const,
    code: 'CG',
    name: 'Corpo, gestos e movimentos',
    shortName: 'Corpo, gestos e movimentos',
    description: 'Exploracao do corpo, gestos, movimentos, coordenacao motora e expressao corporal',
    color: '#f97316',        // --campo-corpo (orange-500)
    bgColor: '#fff7ed',      // --campo-corpo-bg
    lightColor: '#ffedd5',   // --campo-corpo-light
    emoji: '🏃'
  },
  tracos: {
    key: 'tracos' as const,
    code: 'TS',
    name: 'Tracos, sons, cores e formas',
    shortName: 'Tracos, sons, cores e formas',
    description: 'Exploracao artistica atraves de tracos, sons, cores, formas e expressoes culturais',
    color: '#8b5cf6',        // --campo-tracos (violet-500)
    bgColor: '#f5f3ff',      // --campo-tracos-bg
    lightColor: '#ede9fe',   // --campo-tracos-light
    emoji: '🎵'
  },
  escuta: {
    key: 'escuta' as const,
    code: 'EF',
    name: 'Escuta, fala, pensamento e imaginacao',
    shortName: 'Escuta, fala, pensamento e imaginacao',
    description: 'Desenvolvimento da linguagem oral, escuta ativa, pensamento critico e imaginacao',
    color: '#0ea5e9',        // --campo-escuta (sky-500)
    bgColor: '#f0f9ff',      // --campo-escuta-bg
    lightColor: '#e0f2fe',   // --campo-escuta-light
    emoji: '💬'
  },
  espacos: {
    key: 'espacos' as const,
    code: 'ET',
    name: 'Espacos, tempos, quantidades, relacoes e transformacoes',
    shortName: 'Espacos, tempos, quantidades',
    description: 'Nocoes espaciais, temporais, quantitativas e relacoes de transformacao do mundo',
    color: '#10b981',        // --campo-espacos (emerald-500)
    bgColor: '#ecfdf5',      // --campo-espacos-bg
    lightColor: '#d1fae5',   // --campo-espacos-light
    emoji: '🌍'
  }
} as const

/**
 * Get campo configuration by key
 */
export function getCampoConfig(campo: CampoType) {
  return CAMPOS_EXPERIENCIA[campo]
}

/**
 * Get all campos as array for iteration
 */
export function getAllCampos() {
  return Object.values(CAMPOS_EXPERIENCIA)
}

// ============================================================================
// VIVENCIA TYPES
// ============================================================================

/**
 * Vivencia (observation/experience) record from database
 * Represents a single documented observation of a child
 */
export interface Vivencia {
  id: string
  aluno_id: string
  turma_id: string
  professor_id: string
  data_vivencia: string // ISO date (YYYY-MM-DD)
  campos_experiencia: CampoType[] // Multiple campos allowed per vivencia
  descricao: string // Main observation text
  observacoes?: string | null // Additional notes
  created_at: string
  updated_at: string
}

/**
 * Form data for creating/editing a vivencia
 */
export interface VivenciaFormData {
  data_vivencia: string // ISO date
  campos_experiencia: CampoType[] // At least one required
  descricao: string // Required, minimum 20 characters
  observacoes?: string // Optional additional notes
  aplicar_multiplos?: boolean // Batch mode: apply to multiple students
  alunos_ids?: string[] // For batch mode: list of student IDs
}

/**
 * Input for creating a new vivencia
 */
export interface VivenciaInput {
  aluno_id: string
  turma_id: string
  data_vivencia: string
  campos_experiencia: CampoType[]
  descricao: string
  observacoes?: string
}

/**
 * Filters for querying vivencias
 */
export interface VivenciaFilters {
  aluno_id?: string
  turma_id?: string
  professor_id?: string
  campo?: CampoType
  data_inicio?: string
  data_fim?: string
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validation rules for vivencias
 */
export const VIVENCIA_VALIDATION = {
  minDescricaoLength: 20,
  maxDescricaoLength: 2000,
  maxObservacoesLength: 500,
  minCamposSelected: 1,
} as const

/**
 * Error messages for validation
 */
export const VIVENCIA_ERROR_MESSAGES = {
  descricaoTooShort: `A descricao deve ter pelo menos ${VIVENCIA_VALIDATION.minDescricaoLength} caracteres`,
  descricaoTooLong: `A descricao deve ter no maximo ${VIVENCIA_VALIDATION.maxDescricaoLength} caracteres`,
  noCampoSelected: 'Selecione pelo menos um Campo de Experiencia',
  observacoesTooLong: `As observacoes devem ter no maximo ${VIVENCIA_VALIDATION.maxObservacoesLength} caracteres`,
  dataRequired: 'A data da vivencia e obrigatoria',
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get badge variant for a campo type
 */
export function getCampoBadgeVariant(campo: CampoType): string {
  const variantMap: Record<CampoType, string> = {
    eu: 'campo-eu',
    corpo: 'campo-corpo',
    tracos: 'campo-tracos',
    escuta: 'campo-escuta',
    espacos: 'campo-espacos',
  }
  return variantMap[campo]
}

/**
 * Format campos for display (comma-separated names)
 */
export function formatCamposDisplay(campos: CampoType[]): string {
  return campos.map(c => CAMPOS_EXPERIENCIA[c].shortName).join(', ')
}

/**
 * Group vivencias by date for timeline display
 */
export function groupVivenciasByDate(vivencias: Vivencia[]): Map<string, Vivencia[]> {
  const grouped = new Map<string, Vivencia[]>()

  vivencias.forEach(vivencia => {
    const date = vivencia.data_vivencia
    const existing = grouped.get(date) || []
    grouped.set(date, [...existing, vivencia])
  })

  return grouped
}
