/**
 * Descriptive Report Form Validation Schema
 * Task Group 3.2: Relatorios Descritivos (Ed. Infantil)
 *
 * Zod validation schema for descriptive report forms
 * Supports the 5 Experience Fields from BNCC
 *
 * Features:
 * - Field length validation
 * - Portuguese error messages
 * - Draft vs finalized validation
 */

import { z } from 'zod'
import {
  DESCRIPTIVE_REPORT_VALIDATION,
  EXPERIENCE_FIELDS_CONFIG,
  type DescriptiveReportFormData,
  type ExperienceFieldKey,
  type ReportStatus,
  type SemestreType,
} from '@/types/descriptive-report'

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

const MIN_FIELD_LENGTH = DESCRIPTIVE_REPORT_VALIDATION.minFieldLength
const MAX_FIELD_LENGTH = DESCRIPTIVE_REPORT_VALIDATION.maxFieldLength
const MAX_OBSERVACOES_LENGTH = DESCRIPTIVE_REPORT_VALIDATION.maxObservacoesLength

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const FORM_ERROR_MESSAGES = {
  fieldTooShort: (fieldName: string) =>
    `${fieldName} deve ter pelo menos ${MIN_FIELD_LENGTH} caracteres`,
  fieldTooLong: (fieldName: string) =>
    `${fieldName} deve ter no maximo ${MAX_FIELD_LENGTH} caracteres`,
  observacoesTooLong: `Observacoes devem ter no maximo ${MAX_OBSERVACOES_LENGTH} caracteres`,
  allFieldsRequired: 'Todos os 5 Campos de Experiencia devem ser preenchidos para finalizar',
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get field label by key
 */
function getFieldLabel(key: ExperienceFieldKey): string {
  const config = EXPERIENCE_FIELDS_CONFIG.find((f) => f.key === key)
  return config?.label || key
}

// ============================================================================
// FORM SCHEMAS
// ============================================================================

/**
 * Experience field schema with optional validation (for drafts)
 */
const experienceFieldOptional = z
  .string()
  .max(MAX_FIELD_LENGTH, { message: FORM_ERROR_MESSAGES.fieldTooLong('Este campo') })
  .optional()
  .or(z.literal(''))

/**
 * Experience field schema with required validation (for finalization)
 */
const createExperienceFieldRequired = (fieldName: string) =>
  z
    .string()
    .min(MIN_FIELD_LENGTH, { message: FORM_ERROR_MESSAGES.fieldTooShort(fieldName) })
    .max(MAX_FIELD_LENGTH, { message: FORM_ERROR_MESSAGES.fieldTooLong(fieldName) })

/**
 * Base schema for draft reports (all fields optional)
 */
export const descriptiveReportDraftSchema = z.object({
  campo_eu_outro_nos: experienceFieldOptional,
  campo_corpo_gestos: experienceFieldOptional,
  campo_tracos_sons: experienceFieldOptional,
  campo_escuta_fala: experienceFieldOptional,
  campo_espacos_tempos: experienceFieldOptional,
  observacoes_gerais: z
    .string()
    .max(MAX_OBSERVACOES_LENGTH, { message: FORM_ERROR_MESSAGES.observacoesTooLong })
    .optional()
    .or(z.literal('')),
})

/**
 * Schema for finalized reports (all fields required)
 */
export const descriptiveReportFinalSchema = z.object({
  campo_eu_outro_nos: createExperienceFieldRequired('O eu, o outro e o nos'),
  campo_corpo_gestos: createExperienceFieldRequired('Corpo, gestos e movimentos'),
  campo_tracos_sons: createExperienceFieldRequired('Tracos, sons, cores e formas'),
  campo_escuta_fala: createExperienceFieldRequired('Escuta, fala, pensamento e imaginacao'),
  campo_espacos_tempos: createExperienceFieldRequired('Espacos, tempos, quantidades'),
  observacoes_gerais: z
    .string()
    .max(MAX_OBSERVACOES_LENGTH, { message: FORM_ERROR_MESSAGES.observacoesTooLong })
    .optional()
    .or(z.literal('')),
})

/**
 * Combined form schema that adapts based on status
 */
export const descriptiveReportFormSchema = descriptiveReportDraftSchema

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Form data type for draft reports
 */
export type DescriptiveReportDraftFormData = z.infer<typeof descriptiveReportDraftSchema>

/**
 * Form data type for finalized reports
 */
export type DescriptiveReportFinalFormData = z.infer<typeof descriptiveReportFinalSchema>

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate form data for draft
 */
export function validateDraftForm(data: unknown): {
  success: boolean
  data: DescriptiveReportDraftFormData | null
  errors: { path: string; message: string }[] | null
} {
  try {
    const result = descriptiveReportDraftSchema.parse(data)
    return {
      success: true,
      data: result,
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

/**
 * Validate form data for finalization
 */
export function validateFinalForm(data: unknown): {
  success: boolean
  data: DescriptiveReportFinalFormData | null
  errors: { path: string; message: string }[] | null
} {
  try {
    const result = descriptiveReportFinalSchema.parse(data)
    return {
      success: true,
      data: result,
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

/**
 * Get validation schema based on report status
 */
export function getValidationSchema(status: ReportStatus = 'rascunho') {
  return status === 'finalizado' ? descriptiveReportFinalSchema : descriptiveReportDraftSchema
}

/**
 * Validate and check if can finalize
 */
export function canFinalize(formData: DescriptiveReportDraftFormData): {
  canFinalize: boolean
  missingFields: string[]
  fieldErrors: { field: string; message: string }[]
} {
  const missingFields: string[] = []
  const fieldErrors: { field: string; message: string }[] = []

  const fieldsToCheck: { key: ExperienceFieldKey; value: string | undefined }[] = [
    { key: 'campo_eu_outro_nos', value: formData.campo_eu_outro_nos },
    { key: 'campo_corpo_gestos', value: formData.campo_corpo_gestos },
    { key: 'campo_tracos_sons', value: formData.campo_tracos_sons },
    { key: 'campo_escuta_fala', value: formData.campo_escuta_fala },
    { key: 'campo_espacos_tempos', value: formData.campo_espacos_tempos },
  ]

  fieldsToCheck.forEach(({ key, value }) => {
    const label = getFieldLabel(key)
    if (!value || value.trim() === '') {
      missingFields.push(label)
      fieldErrors.push({ field: key, message: `${label} e obrigatorio para finalizar` })
    } else if (value.trim().length < MIN_FIELD_LENGTH) {
      fieldErrors.push({
        field: key,
        message: FORM_ERROR_MESSAGES.fieldTooShort(label),
      })
    }
  })

  return {
    canFinalize: missingFields.length === 0 && fieldErrors.length === 0,
    missingFields,
    fieldErrors,
  }
}

// ============================================================================
// TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transform form data to API input format
 */
export function transformFormDataToInput(
  formData: DescriptiveReportDraftFormData,
  reportId?: string
): {
  campo_eu_outro_nos: string | null
  campo_corpo_gestos: string | null
  campo_tracos_sons: string | null
  campo_escuta_fala: string | null
  campo_espacos_tempos: string | null
  observacoes_gerais: string | null
} {
  return {
    campo_eu_outro_nos: formData.campo_eu_outro_nos?.trim() || null,
    campo_corpo_gestos: formData.campo_corpo_gestos?.trim() || null,
    campo_tracos_sons: formData.campo_tracos_sons?.trim() || null,
    campo_escuta_fala: formData.campo_escuta_fala?.trim() || null,
    campo_espacos_tempos: formData.campo_espacos_tempos?.trim() || null,
    observacoes_gerais: formData.observacoes_gerais?.trim() || null,
  }
}

/**
 * Transform API data to form initial values
 */
export function transformApiDataToForm(
  apiData: {
    campo_eu_outro_nos?: string | null
    campo_corpo_gestos?: string | null
    campo_tracos_sons?: string | null
    campo_escuta_fala?: string | null
    campo_espacos_tempos?: string | null
    observacoes_gerais?: string | null
  } | null
): DescriptiveReportDraftFormData {
  if (!apiData) {
    return {
      campo_eu_outro_nos: '',
      campo_corpo_gestos: '',
      campo_tracos_sons: '',
      campo_escuta_fala: '',
      campo_espacos_tempos: '',
      observacoes_gerais: '',
    }
  }

  return {
    campo_eu_outro_nos: apiData.campo_eu_outro_nos || '',
    campo_corpo_gestos: apiData.campo_corpo_gestos || '',
    campo_tracos_sons: apiData.campo_tracos_sons || '',
    campo_escuta_fala: apiData.campo_escuta_fala || '',
    campo_espacos_tempos: apiData.campo_espacos_tempos || '',
    observacoes_gerais: apiData.observacoes_gerais || '',
  }
}

// ============================================================================
// PROGRESS CALCULATION
// ============================================================================

/**
 * Calculate form completion progress
 */
export function calculateFormProgress(formData: DescriptiveReportDraftFormData): {
  filledFields: number
  totalFields: number
  percentage: number
  fieldStatus: Record<ExperienceFieldKey, 'empty' | 'partial' | 'complete'>
} {
  const fields: { key: ExperienceFieldKey; value: string | undefined }[] = [
    { key: 'campo_eu_outro_nos', value: formData.campo_eu_outro_nos },
    { key: 'campo_corpo_gestos', value: formData.campo_corpo_gestos },
    { key: 'campo_tracos_sons', value: formData.campo_tracos_sons },
    { key: 'campo_escuta_fala', value: formData.campo_escuta_fala },
    { key: 'campo_espacos_tempos', value: formData.campo_espacos_tempos },
  ]

  const fieldStatus: Record<ExperienceFieldKey, 'empty' | 'partial' | 'complete'> = {
    campo_eu_outro_nos: 'empty',
    campo_corpo_gestos: 'empty',
    campo_tracos_sons: 'empty',
    campo_escuta_fala: 'empty',
    campo_espacos_tempos: 'empty',
  }

  let filledFields = 0

  fields.forEach(({ key, value }) => {
    const trimmedValue = value?.trim() || ''
    if (trimmedValue.length >= MIN_FIELD_LENGTH) {
      fieldStatus[key] = 'complete'
      filledFields++
    } else if (trimmedValue.length > 0) {
      fieldStatus[key] = 'partial'
    }
  })

  return {
    filledFields,
    totalFields: 5,
    percentage: Math.round((filledFields / 5) * 100),
    fieldStatus,
  }
}
