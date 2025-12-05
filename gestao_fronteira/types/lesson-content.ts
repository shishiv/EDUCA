/**
 * TypeScript types for Lesson Content (Conteudo da Aula) - BNCC Aligned
 * OpenSpec Change: 2025-12-04-diario-de-classe
 * Task Group 2.1: API and Types for Lesson Content
 *
 * BNCC Reference: Base Nacional Comum Curricular
 * - EF: Ensino Fundamental (Elementary School) - Grades 1-9
 * - EI: Educacao Infantil (Early Childhood Education) - Ages 0-5
 */

// ============================================================================
// EDUCATION LEVEL TYPES
// ============================================================================

/**
 * Education level for Brazilian educational system
 */
export type EducationLevel = 'infantil' | 'fundamental'

/**
 * Education level configuration
 */
export const EDUCATION_LEVEL_CONFIG = {
  infantil: {
    label: 'Educacao Infantil',
    description: 'Criancas de 0 a 5 anos',
    bnccPrefix: 'EI',
    usesGrades: false,
    usesExperienceFields: true,
    usesDisciplines: false,
  },
  fundamental: {
    label: 'Ensino Fundamental',
    description: 'Anos Iniciais (1 ao 5 ano)',
    bnccPrefix: 'EF',
    usesGrades: true,
    usesExperienceFields: false,
    usesDisciplines: true,
  },
} as const

// ============================================================================
// BNCC SKILL CODE TYPES
// ============================================================================

/**
 * BNCC skill code pattern
 * Format: E[FI][year][subject][number]
 * Examples:
 * - EF01MA06 (Ensino Fundamental, 1st grade, Math, skill 06)
 * - EI03EO01 (Educacao Infantil, age group 03, Experience Field EO, skill 01)
 */
export type BNNCSkillCode = string

/**
 * BNCC skill code validation regex
 */
export const BNCC_SKILL_CODE_PATTERN = /^E[FI][0-9]{2}[A-Z]{2}[0-9]{2}$/

/**
 * Validate a single BNCC skill code
 */
export function isValidBNNCSkillCode(code: string): boolean {
  return BNCC_SKILL_CODE_PATTERN.test(code)
}

/**
 * Validate an array of BNCC skill codes
 */
export function validateBNNCSkillCodes(codes: string[]): {
  valid: boolean
  invalidCodes: string[]
} {
  const invalidCodes = codes.filter((code) => !isValidBNNCSkillCode(code))
  return {
    valid: invalidCodes.length === 0,
    invalidCodes,
  }
}

/**
 * Extract education level from BNCC code
 */
export function getEducationLevelFromCode(code: string): EducationLevel | null {
  if (code.startsWith('EF')) return 'fundamental'
  if (code.startsWith('EI')) return 'infantil'
  return null
}

// ============================================================================
// BNCC EXPERIENCE FIELDS (CAMPOS DE EXPERIENCIA) - ED. INFANTIL
// ============================================================================

/**
 * BNCC Experience Fields for Educacao Infantil
 * These replace traditional subjects for early childhood education
 */
export type BNNCExperienceFieldCode = 'EO' | 'CG' | 'TS' | 'EF' | 'ET'

export interface BNNCExperienceField {
  code: BNNCExperienceFieldCode
  name: string
  fullName: string
  description: string
}

/**
 * BNCC Experience Fields configuration
 */
export const BNCC_EXPERIENCE_FIELDS: Record<BNNCExperienceFieldCode, BNNCExperienceField> = {
  EO: {
    code: 'EO',
    name: 'O eu, o outro e o nos',
    fullName: 'O eu, o outro e o nos',
    description:
      'Desenvolvimento da identidade pessoal e social, construcao de autonomia e nocao de coletividade',
  },
  CG: {
    code: 'CG',
    name: 'Corpo, gestos e movimentos',
    fullName: 'Corpo, gestos e movimentos',
    description:
      'Exploracao do corpo, gestos, movimentos, coordenacao motora e expressao corporal',
  },
  TS: {
    code: 'TS',
    name: 'Tracos, sons, cores e formas',
    fullName: 'Tracos, sons, cores e formas',
    description:
      'Exploracao artistica atraves de tracos, sons, cores, formas e expressoes culturais',
  },
  EF: {
    code: 'EF',
    name: 'Escuta, fala, pensamento e imaginacao',
    fullName: 'Escuta, fala, pensamento e imaginacao',
    description:
      'Desenvolvimento da linguagem oral, escuta ativa, pensamento critico e imaginacao',
  },
  ET: {
    code: 'ET',
    name: 'Espacos, tempos, quantidades',
    fullName: 'Espacos, tempos, quantidades, relacoes e transformacoes',
    description:
      'Nocoes espaciais, temporais, quantitativas e relacoes de transformacao do mundo',
  },
}

/**
 * Get all Experience Fields as array
 */
export function getAllExperienceFields(): BNNCExperienceField[] {
  return Object.values(BNCC_EXPERIENCE_FIELDS)
}

// ============================================================================
// BNCC SUBJECTS (COMPONENTES CURRICULARES) - ENSINO FUNDAMENTAL
// ============================================================================

/**
 * BNCC Subject codes for Ensino Fundamental
 */
export type BNNCSubjectCode =
  | 'LP'
  | 'MA'
  | 'CI'
  | 'HI'
  | 'GE'
  | 'AR'
  | 'EF'
  | 'ER'
  | 'LI'

export interface BNNCSubject {
  code: BNNCSubjectCode
  name: string
  fullName: string
}

/**
 * BNCC Subjects for Ensino Fundamental
 */
export const BNCC_SUBJECTS: Record<BNNCSubjectCode, BNNCSubject> = {
  LP: { code: 'LP', name: 'Portugues', fullName: 'Lingua Portuguesa' },
  MA: { code: 'MA', name: 'Matematica', fullName: 'Matematica' },
  CI: { code: 'CI', name: 'Ciencias', fullName: 'Ciencias' },
  HI: { code: 'HI', name: 'Historia', fullName: 'Historia' },
  GE: { code: 'GE', name: 'Geografia', fullName: 'Geografia' },
  AR: { code: 'AR', name: 'Arte', fullName: 'Arte' },
  EF: { code: 'EF', name: 'Ed. Fisica', fullName: 'Educacao Fisica' },
  ER: { code: 'ER', name: 'Ensino Religioso', fullName: 'Ensino Religioso' },
  LI: { code: 'LI', name: 'Ingles', fullName: 'Lingua Inglesa' },
}

/**
 * Get all subjects as array
 */
export function getAllSubjects(): BNNCSubject[] {
  return Object.values(BNCC_SUBJECTS)
}

/**
 * Extract subject from BNCC skill code
 */
export function getSubjectFromCode(code: string): BNNCSubjectCode | null {
  if (!isValidBNNCSkillCode(code)) return null
  const subjectPart = code.substring(4, 6)
  return BNCC_SUBJECTS[subjectPart as BNNCSubjectCode]
    ? (subjectPart as BNNCSubjectCode)
    : null
}

// ============================================================================
// LESSON CONTENT TYPES
// ============================================================================

/**
 * Lesson content record from database
 */
export interface LessonContent {
  id: string
  sessao_id: string
  tema: string
  objetivo: string
  habilidades_bncc: BNNCSkillCode[]
  metodologia: string | null
  recursos: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

/**
 * Input type for creating lesson content
 */
export interface LessonContentInput {
  sessao_id: string
  tema: string
  objetivo: string
  habilidades_bncc: BNNCSkillCode[]
  metodologia?: string
  recursos?: string
  observacoes?: string
  education_level?: EducationLevel
}

/**
 * Input type for updating lesson content
 */
export interface LessonContentUpdate {
  tema?: string
  objetivo?: string
  habilidades_bncc?: BNNCSkillCode[]
  metodologia?: string
  recursos?: string
  observacoes?: string
}

/**
 * Filters for querying lesson content history
 */
export interface LessonContentFilters {
  turma_id?: string
  professor_id?: string
  escola_id?: string
  date_from?: string
  date_to?: string
  habilidade_bncc?: string
  limit?: number
  offset?: number
}

/**
 * Detailed lesson content view (with session and class info)
 */
export interface LessonContentDetailed extends LessonContent {
  // Session information
  data_aula: string
  hora_inicio: string | null
  hora_fim: string | null
  status_sessao: string
  // Class information
  turma_id: string
  turma_nome: string
  turma_serie: string
  ano_letivo: number
  // School information
  escola_id: string
  escola_nome: string
  // Teacher information
  professor_id: string
  professor_nome: string
}

/**
 * Lesson content for Ed. Infantil with Experience Fields
 */
export interface LessonContentInfantil extends LessonContent {
  campos_experiencia: BNNCExperienceFieldCode[]
  education_level: 'infantil'
}

/**
 * Lesson content for Ensino Fundamental with subjects
 */
export interface LessonContentFundamental extends LessonContent {
  disciplina: BNNCSubjectCode
  education_level: 'fundamental'
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if lesson content is for Ed. Infantil
 */
export function isLessonContentInfantil(
  content: LessonContent
): content is LessonContentInfantil {
  if (content.habilidades_bncc.length === 0) return false
  return content.habilidades_bncc.every((code) => code.startsWith('EI'))
}

/**
 * Type guard to check if lesson content is for Ensino Fundamental
 */
export function isLessonContentFundamental(
  content: LessonContent
): content is LessonContentFundamental {
  if (content.habilidades_bncc.length === 0) return false
  return content.habilidades_bncc.every((code) => code.startsWith('EF'))
}

/**
 * Determine education level from lesson content
 */
export function getEducationLevelFromContent(
  content: LessonContent
): EducationLevel | 'mixed' | null {
  if (content.habilidades_bncc.length === 0) return null

  const hasEI = content.habilidades_bncc.some((code) => code.startsWith('EI'))
  const hasEF = content.habilidades_bncc.some((code) => code.startsWith('EF'))

  if (hasEI && hasEF) return 'mixed'
  if (hasEI) return 'infantil'
  if (hasEF) return 'fundamental'
  return null
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * API response for single lesson content
 */
export interface LessonContentResponse {
  data: LessonContent | null
  error: string | null
}

/**
 * API response for lesson content list
 */
export interface LessonContentListResponse {
  data: LessonContent[] | null
  error: string | null
  pagination?: {
    limit: number
    offset: number
    total: number
  }
}

/**
 * API response for lesson content detailed view
 */
export interface LessonContentDetailedResponse {
  data: LessonContentDetailed | null
  error: string | null
}

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

/**
 * Validation rules for lesson content
 */
export const LESSON_CONTENT_VALIDATION = {
  minTemaLength: 3,
  maxTemaLength: 200,
  minObjetivoLength: 10,
  maxObjetivoLength: 500,
  maxHabilidadesBNCC: 10,
  maxMetodologiaLength: 1000,
  maxRecursosLength: 500,
  maxObservacoesLength: 1000,
} as const

/**
 * Error messages for lesson content validation
 */
export const LESSON_CONTENT_ERROR_MESSAGES = {
  temaRequired: 'Tema/Conteudo e obrigatorio',
  temaTooShort: `Tema deve ter pelo menos ${LESSON_CONTENT_VALIDATION.minTemaLength} caracteres`,
  temaTooLong: `Tema deve ter no maximo ${LESSON_CONTENT_VALIDATION.maxTemaLength} caracteres`,
  objetivoRequired: 'Objetivo e obrigatorio',
  objetivoTooShort: `Objetivo deve ter pelo menos ${LESSON_CONTENT_VALIDATION.minObjetivoLength} caracteres`,
  objetivoTooLong: `Objetivo deve ter no maximo ${LESSON_CONTENT_VALIDATION.maxObjetivoLength} caracteres`,
  habilidadesInvalid: 'Codigo de habilidade BNCC invalido',
  habilidadesTooMany: `Maximo de ${LESSON_CONTENT_VALIDATION.maxHabilidadesBNCC} habilidades BNCC por aula`,
  metodologiaTooLong: `Metodologia deve ter no maximo ${LESSON_CONTENT_VALIDATION.maxMetodologiaLength} caracteres`,
  recursosTooLong: `Recursos deve ter no maximo ${LESSON_CONTENT_VALIDATION.maxRecursosLength} caracteres`,
  observacoesTooLong: `Observacoes deve ter no maximo ${LESSON_CONTENT_VALIDATION.maxObservacoesLength} caracteres`,
} as const
