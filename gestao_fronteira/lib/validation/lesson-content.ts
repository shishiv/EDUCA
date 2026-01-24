/**
 * Lesson Content Form Validation Schema
 * Task Group 2.2: Formulario de Conteudo Estruturado
 *
 * Zod validation schema for lesson content forms
 * Supports both Ed. Infantil and Ensino Fundamental
 *
 * Features:
 * - Required field validation (tema, objetivo)
 * - BNCC skill code validation (EF/EI patterns)
 * - Portuguese error messages
 * - Education level differentiation
 */

import { z } from 'zod'
import {
  LESSON_CONTENT_VALIDATION,
  LESSON_CONTENT_ERROR_MESSAGES,
  BNCC_SKILL_CODE_PATTERN,
  type EducationLevel,
  type BNNCExperienceFieldCode,
} from '@/types/lesson-content'

// ============================================================================
// BNCC SKILL CODE VALIDATION
// ============================================================================

/**
 * Validate a single BNCC skill code
 */
export function isValidBNNCCode(code: string): boolean {
  return BNCC_SKILL_CODE_PATTERN.test(code.trim().toUpperCase())
}

/**
 * Parse BNCC codes from comma-separated string
 */
export function parseBNNCCodes(input: string): string[] {
  if (!input || input.trim() === '') return []

  return input
    .split(/[,;\s]+/)
    .map((code) => code.trim().toUpperCase())
    .filter((code) => code.length > 0)
}

/**
 * Validate an array of BNCC skill codes
 */
export function validateBNNCCodes(codes: string[]): {
  valid: boolean
  invalidCodes: string[]
  validCodes: string[]
} {
  const validCodes: string[] = []
  const invalidCodes: string[] = []

  codes.forEach((code) => {
    if (isValidBNNCCode(code)) {
      validCodes.push(code)
    } else {
      invalidCodes.push(code)
    }
  })

  return {
    valid: invalidCodes.length === 0,
    invalidCodes,
    validCodes,
  }
}

// ============================================================================
// FORM SCHEMAS
// ============================================================================

/**
 * Base lesson content schema for form validation
 */
export const lessonContentFormSchema = z.object({
  tema: z
    .string()
    .min(1, LESSON_CONTENT_ERROR_MESSAGES.temaRequired)
    .min(
      LESSON_CONTENT_VALIDATION.minTemaLength,
      LESSON_CONTENT_ERROR_MESSAGES.temaTooShort
    )
    .max(
      LESSON_CONTENT_VALIDATION.maxTemaLength,
      LESSON_CONTENT_ERROR_MESSAGES.temaTooLong
    ),

  objetivo: z
    .string()
    .min(1, LESSON_CONTENT_ERROR_MESSAGES.objetivoRequired)
    .min(
      LESSON_CONTENT_VALIDATION.minObjetivoLength,
      LESSON_CONTENT_ERROR_MESSAGES.objetivoTooShort
    )
    .max(
      LESSON_CONTENT_VALIDATION.maxObjetivoLength,
      LESSON_CONTENT_ERROR_MESSAGES.objetivoTooLong
    ),

  habilidades_bncc_input: z
    .string()
    .optional()
    .default('')
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true
        const codes = parseBNNCCodes(val)
        return codes.length <= LESSON_CONTENT_VALIDATION.maxHabilidadesBNCC
      },
      LESSON_CONTENT_ERROR_MESSAGES.habilidadesTooMany
    )
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true
        const codes = parseBNNCCodes(val)
        const validation = validateBNNCCodes(codes)
        return validation.valid
      },
      (val) => {
        const codes = parseBNNCCodes(val || '')
        const validation = validateBNNCCodes(codes)
        return {
          message: `${LESSON_CONTENT_ERROR_MESSAGES.habilidadesInvalid}: ${validation.invalidCodes.join(', ')}`,
        }
      }
    ),

  metodologia: z
    .string()
    .max(
      LESSON_CONTENT_VALIDATION.maxMetodologiaLength,
      LESSON_CONTENT_ERROR_MESSAGES.metodologiaTooLong
    )
    .optional()
    .or(z.literal('')),

  recursos: z
    .string()
    .max(
      LESSON_CONTENT_VALIDATION.maxRecursosLength,
      LESSON_CONTENT_ERROR_MESSAGES.recursosTooLong
    )
    .optional()
    .or(z.literal('')),

  observacoes: z
    .string()
    .max(
      LESSON_CONTENT_VALIDATION.maxObservacoesLength,
      LESSON_CONTENT_ERROR_MESSAGES.observacoesTooLong
    )
    .optional()
    .or(z.literal('')),

  // Ed. Infantil specific: Campos de Experiencia
  campos_experiencia: z
    .array(z.enum(['EO', 'CG', 'TS', 'EF', 'ET']))
    .optional()
    .default([]),

  // Education level
  education_level: z.enum(['infantil', 'fundamental']).optional().default('fundamental'),
})

/**
 * Schema for Ensino Fundamental lesson content
 */
export const lessonContentFundamentalSchema = lessonContentFormSchema.extend({
  education_level: z.literal('fundamental'),
})

/**
 * Schema for Ed. Infantil lesson content
 */
export const lessonContentInfantilSchema = lessonContentFormSchema.extend({
  education_level: z.literal('infantil'),
  campos_experiencia: z
    .array(z.enum(['EO', 'CG', 'TS', 'EF', 'ET']))
    .min(1, 'Selecione pelo menos um Campo de Experiencia'),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Form data type for lesson content
 */
export type LessonContentFormData = z.infer<typeof lessonContentFormSchema>

/**
 * Form data type for Ensino Fundamental
 */
export type LessonContentFundamentalFormData = z.infer<typeof lessonContentFundamentalSchema>

/**
 * Form data type for Ed. Infantil
 */
export type LessonContentInfantilFormData = z.infer<typeof lessonContentInfantilSchema>

// ============================================================================
// FORM DATA TRANSFORMATION
// ============================================================================

/**
 * Transform form data to API input format
 */
export function transformFormDataToInput(
  formData: LessonContentFormData,
  sessionId: string
) {
  // Parse BNCC codes from string input to array
  const habilidadesBncc = formData.habilidades_bncc_input
    ? parseBNNCCodes(formData.habilidades_bncc_input)
    : []

  return {
    sessao_id: sessionId,
    tema: formData.tema.trim(),
    objetivo: formData.objetivo.trim(),
    habilidades_bncc: habilidadesBncc,
    metodologia: formData.metodologia?.trim() || null,
    recursos: formData.recursos?.trim() || null,
    observacoes: formData.observacoes?.trim() || null,
    education_level: formData.education_level,
  }
}

/**
 * Transform API data to form initial values
 */
export function transformApiDataToForm(
  apiData: {
    tema?: string
    objetivo?: string
    habilidades_bncc?: string[]
    metodologia?: string | null
    recursos?: string | null
    observacoes?: string | null
  } | null
): Partial<LessonContentFormData> {
  if (!apiData) return {}

  return {
    tema: apiData.tema || '',
    objetivo: apiData.objetivo || '',
    habilidades_bncc_input: apiData.habilidades_bncc?.join(', ') || '',
    metodologia: apiData.metodologia || '',
    recursos: apiData.recursos || '',
    observacoes: apiData.observacoes || '',
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Get validation schema based on education level
 */
export function getValidationSchema(educationLevel: EducationLevel = 'fundamental') {
  switch (educationLevel) {
    case 'infantil':
      return lessonContentInfantilSchema
    case 'fundamental':
    default:
      return lessonContentFundamentalSchema
  }
}

/**
 * Validate form data and return errors
 */
export function validateLessonContentForm(
  data: unknown,
  educationLevel: EducationLevel = 'fundamental'
): {
  success: boolean
  data: LessonContentFormData | null
  errors: { path: string; message: string }[] | null
} {
  try {
    const schema = getValidationSchema(educationLevel)
    const result = schema.parse(data)
    return {
      success: true,
      data: result as LessonContentFormData,
      errors: null,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      }
    }
    throw error
  }
}

// ============================================================================
// EXPERIENCE FIELD HELPERS
// ============================================================================

/**
 * Experience fields for Ed. Infantil selection
 */
export const EXPERIENCE_FIELD_OPTIONS: {
  code: BNNCExperienceFieldCode
  label: string
  description: string
}[] = [
  {
    code: 'EO',
    label: 'O eu, o outro e o nos',
    description: 'Identidade, autonomia e coletividade',
  },
  {
    code: 'CG',
    label: 'Corpo, gestos e movimentos',
    description: 'Coordenacao motora e expressao corporal',
  },
  {
    code: 'TS',
    label: 'Tracos, sons, cores e formas',
    description: 'Exploracao artistica e cultural',
  },
  {
    code: 'EF',
    label: 'Escuta, fala, pensamento e imaginacao',
    description: 'Linguagem oral e pensamento critico',
  },
  {
    code: 'ET',
    label: 'Espacos, tempos, quantidades',
    description: 'Nocoes espaciais, temporais e quantitativas',
  },
]

/**
 * Get experience field by code
 */
export function getExperienceField(code: BNNCExperienceFieldCode) {
  return EXPERIENCE_FIELD_OPTIONS.find((field) => field.code === code)
}
