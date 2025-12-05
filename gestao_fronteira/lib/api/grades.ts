/**
 * Grades API Layer
 * Brazilian Educational Compliance: Sistema de Notas Bimestrais
 *
 * Task Group 3.1: Sistema de Notas Bimestrais (Fundamental I)
 * OpenSpec Change: 2025-12-04-diario-de-classe
 *
 * This module provides CRUD operations for student grades (notas)
 * following Brazilian educational standards:
 * - Notas: 0 to 10 scale with one decimal place
 * - Bimestres: 4 per academic year
 * - Media: Automatic average calculation
 *
 * IMPORTANT: All functions accept a Supabase client as first parameter.
 * The client should be created in the calling context (API route or Server Component)
 * using createServerClient from @supabase/ssr with proper cookie handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { logger } from '@/lib/logger'
import {
  type Grade,
  type GradeInput,
  type GradeUpdate,
  type GradeResponse,
  type GradeListResponse,
  type AverageResponse,
  type AverageResult,
  type Bimester,
  isValidGrade,
  isValidBimester,
  roundGrade,
  GRADE_ERROR_MESSAGES,
  GRADE_RANGE,
  BIMESTER_RANGE,
} from '@/types/grades'

// Re-export types for convenience
export type {
  Grade,
  GradeInput,
  GradeUpdate,
  GradeResponse,
  GradeListResponse,
  AverageResponse,
  AverageResult,
  Bimester,
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate grade input data
 */
function validateGradeInput(input: GradeInput): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Validate nota (grade value)
  if (input.nota === undefined || input.nota === null) {
    errors.push(GRADE_ERROR_MESSAGES.notaRequired)
  } else if (!isValidGrade(input.nota)) {
    errors.push(GRADE_ERROR_MESSAGES.notaInvalid)
  }

  // Validate bimestre
  if (!input.bimestre) {
    errors.push(GRADE_ERROR_MESSAGES.bimestreRequired)
  } else if (!isValidBimester(input.bimestre)) {
    errors.push(GRADE_ERROR_MESSAGES.bimestreInvalid)
  }

  // Validate disciplina
  if (!input.disciplina || input.disciplina.trim() === '') {
    errors.push(GRADE_ERROR_MESSAGES.disciplinaRequired)
  }

  // Validate matricula_id
  if (!input.matricula_id || input.matricula_id.trim() === '') {
    errors.push(GRADE_ERROR_MESSAGES.matriculaRequired)
  }

  // Validate tipo_avaliacao
  if (!input.tipo_avaliacao || input.tipo_avaliacao.trim() === '') {
    errors.push(GRADE_ERROR_MESSAGES.tipoAvaliacaoRequired)
  }

  // Validate data_avaliacao
  if (!input.data_avaliacao || input.data_avaliacao.trim() === '') {
    errors.push(GRADE_ERROR_MESSAGES.dataAvaliacaoRequired)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate grade update data
 */
function validateGradeUpdate(update: GradeUpdate): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Validate nota if provided
  if (update.nota !== undefined && update.nota !== null) {
    if (!isValidGrade(update.nota)) {
      errors.push(GRADE_ERROR_MESSAGES.notaInvalid)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Create a new grade (Lancar nota bimestral)
 *
 * Creates a new grade record for a student's enrollment in a discipline.
 * Validates grade value (0-10) and bimester (1-4).
 *
 * @param supabase - Supabase client instance
 * @param input - Grade data to create
 * @returns GradeResponse with created grade or error
 *
 * @example
 * const result = await createGrade(supabase, {
 *   matricula_id: 'matricula-uuid',
 *   disciplina: 'MA',
 *   bimestre: 1,
 *   nota: 8.5,
 *   tipo_avaliacao: 'prova',
 *   data_avaliacao: '2025-03-15',
 * })
 */
export async function createGrade(
  supabase: SupabaseClient<Database>,
  input: GradeInput
): Promise<GradeResponse> {
  try {
    // Validate input
    const validation = validateGradeInput(input)
    if (!validation.valid) {
      logger.warn('Grade validation failed', {
        feature: 'grades',
        action: 'create_validation_failed',
        metadata: { errors: validation.errors },
      })
      return {
        data: null,
        error: validation.errors.join('; '),
      }
    }

    // Round grade to one decimal place
    const roundedNota = roundGrade(input.nota)

    // Prepare data for insertion
    const insertData = {
      matricula_id: input.matricula_id,
      disciplina: input.disciplina.trim(),
      bimestre: input.bimestre,
      nota: roundedNota,
      tipo_avaliacao: input.tipo_avaliacao.trim(),
      data_avaliacao: input.data_avaliacao,
      observacoes: input.observacoes?.trim() || null,
    }

    // Insert grade
    const { data, error } = await supabase
      .from('notas')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      logger.error('Error creating grade', error, {
        feature: 'grades',
        action: 'create_failed',
      })

      // Handle specific error cases
      if (error.code === '23505') {
        return {
          data: null,
          error: 'Ja existe uma nota para este aluno, disciplina e bimestre',
        }
      }

      if (error.code === '23503') {
        return {
          data: null,
          error: 'Matricula nao encontrada',
        }
      }

      return {
        data: null,
        error: 'Erro ao lancar nota',
      }
    }

    logger.info('Grade created successfully', {
      feature: 'grades',
      action: 'created',
      metadata: {
        gradeId: data.id,
        matriculaId: input.matricula_id,
        disciplina: input.disciplina,
        bimestre: input.bimestre,
        nota: roundedNota,
      },
    })

    return {
      data: data as Grade,
      error: null,
    }
  } catch (error) {
    logger.error('Exception in createGrade', error as Error, {
      feature: 'grades',
      action: 'create_exception',
    })
    return {
      data: null,
      error: 'Erro inesperado ao lancar nota',
    }
  }
}

/**
 * Update an existing grade
 *
 * Updates an existing grade record.
 * Only updates provided fields, preserving existing values.
 *
 * @param supabase - Supabase client instance
 * @param gradeId - UUID of the grade to update
 * @param update - Fields to update
 * @returns GradeResponse with updated grade or error
 *
 * @example
 * const result = await updateGrade(supabase, 'grade-uuid', {
 *   nota: 9.0,
 *   observacoes: 'Revisao da nota',
 * })
 */
export async function updateGrade(
  supabase: SupabaseClient<Database>,
  gradeId: string,
  update: GradeUpdate
): Promise<GradeResponse> {
  try {
    // Validate update data
    const validation = validateGradeUpdate(update)
    if (!validation.valid) {
      logger.warn('Grade update validation failed', {
        feature: 'grades',
        action: 'update_validation_failed',
        metadata: { errors: validation.errors },
      })
      return {
        data: null,
        error: validation.errors.join('; '),
      }
    }

    // Prepare update data (only include non-undefined fields)
    const updateData: Record<string, any> = {}

    if (update.nota !== undefined) {
      updateData.nota = roundGrade(update.nota)
    }
    if (update.tipo_avaliacao !== undefined) {
      updateData.tipo_avaliacao = update.tipo_avaliacao.trim()
    }
    if (update.data_avaliacao !== undefined) {
      updateData.data_avaliacao = update.data_avaliacao
    }
    if (update.observacoes !== undefined) {
      updateData.observacoes = update.observacoes?.trim() || null
    }

    // Update grade
    const { data, error } = await supabase
      .from('notas')
      .update(updateData)
      .eq('id', gradeId)
      .select()
      .single()

    if (error) {
      logger.error('Error updating grade', error, {
        feature: 'grades',
        action: 'update_failed',
        metadata: { gradeId },
      })

      if (error.code === 'PGRST116') {
        return {
          data: null,
          error: 'Nota nao encontrada',
        }
      }

      return {
        data: null,
        error: 'Erro ao atualizar nota',
      }
    }

    logger.info('Grade updated successfully', {
      feature: 'grades',
      action: 'updated',
      metadata: { gradeId },
    })

    return {
      data: data as Grade,
      error: null,
    }
  } catch (error) {
    logger.error('Exception in updateGrade', error as Error, {
      feature: 'grades',
      action: 'update_exception',
    })
    return {
      data: null,
      error: 'Erro inesperado ao atualizar nota',
    }
  }
}

/**
 * Get grades by student (matricula)
 *
 * Retrieves all grades for a specific student enrollment.
 * Optionally filters by discipline.
 *
 * @param supabase - Supabase client instance
 * @param matriculaId - UUID of the student enrollment (matricula)
 * @param disciplina - Optional discipline filter
 * @returns GradeListResponse with grades or error
 *
 * @example
 * const result = await getGradesByStudent(supabase, 'matricula-uuid')
 * const mathGrades = await getGradesByStudent(supabase, 'matricula-uuid', 'MA')
 */
export async function getGradesByStudent(
  supabase: SupabaseClient<Database>,
  matriculaId: string,
  disciplina?: string
): Promise<GradeListResponse> {
  try {
    let query = supabase
      .from('notas')
      .select('*')
      .eq('matricula_id', matriculaId)

    if (disciplina) {
      query = query.eq('disciplina', disciplina)
    }

    const { data, error } = await query.order('bimestre', { ascending: true })

    if (error) {
      logger.error('Error fetching grades by student', error, {
        feature: 'grades',
        action: 'get_by_student_failed',
        metadata: { matriculaId },
      })
      return {
        data: null,
        error: 'Erro ao buscar notas do aluno',
      }
    }

    return {
      data: (data as Grade[]) || [],
      error: null,
    }
  } catch (error) {
    logger.error('Exception in getGradesByStudent', error as Error, {
      feature: 'grades',
      action: 'get_by_student_exception',
    })
    return {
      data: null,
      error: 'Erro inesperado ao buscar notas',
    }
  }
}

/**
 * Get grades by class (turma)
 *
 * Retrieves all grades for a class, filtered by discipline and bimester.
 * Uses a view or join to get student information.
 *
 * @param supabase - Supabase client instance
 * @param turmaId - UUID of the class (turma)
 * @param disciplina - Discipline code
 * @param bimestre - Optional bimester filter (1-4)
 * @returns GradeListResponse with grades including student info or error
 *
 * @example
 * const result = await getGradesByClass(supabase, 'turma-uuid', 'MA', 1)
 */
export async function getGradesByClass(
  supabase: SupabaseClient<Database>,
  turmaId: string,
  disciplina: string,
  bimestre?: Bimester
): Promise<GradeListResponse> {
  try {
    // Query notas through matriculas to get class grades
    let query = supabase
      .from('notas')
      .select(`
        *,
        matriculas!inner (
          id,
          aluno_id,
          turma_id,
          alunos!inner (
            id,
            nome_completo
          )
        )
      `)
      .eq('matriculas.turma_id', turmaId)
      .eq('disciplina', disciplina)

    if (bimestre) {
      query = query.eq('bimestre', bimestre)
    }

    const { data, error } = await query.order('matriculas.alunos.nome_completo', { ascending: true })

    if (error) {
      logger.error('Error fetching grades by class', error, {
        feature: 'grades',
        action: 'get_by_class_failed',
        metadata: { turmaId, disciplina, bimestre },
      })
      return {
        data: null,
        error: 'Erro ao buscar notas da turma',
      }
    }

    // Transform data to include student info at top level
    const transformedData = (data || []).map((record: any) => ({
      ...record,
      aluno_id: record.matriculas?.alunos?.id,
      aluno_nome: record.matriculas?.alunos?.nome_completo,
      matriculas: undefined, // Remove nested structure
    }))

    return {
      data: transformedData as Grade[],
      error: null,
    }
  } catch (error) {
    logger.error('Exception in getGradesByClass', error as Error, {
      feature: 'grades',
      action: 'get_by_class_exception',
    })
    return {
      data: null,
      error: 'Erro inesperado ao buscar notas da turma',
    }
  }
}

/**
 * Calculate average grade for a student in a discipline
 *
 * Calculates the arithmetic mean of all bimester grades.
 * Returns partial average if not all bimesters have grades.
 *
 * @param supabase - Supabase client instance
 * @param matriculaId - UUID of the student enrollment
 * @param disciplina - Discipline code
 * @returns AverageResponse with average calculation or error
 *
 * @example
 * const result = await calculateAverage(supabase, 'matricula-uuid', 'MA')
 * if (result.data?.isComplete) {
 *   console.log(`Media final: ${result.data.average}`)
 * }
 */
export async function calculateAverage(
  supabase: SupabaseClient<Database>,
  matriculaId: string,
  disciplina: string
): Promise<AverageResponse> {
  try {
    // Get all grades for this student and discipline
    const { data: grades, error } = await supabase
      .from('notas')
      .select('*')
      .eq('matricula_id', matriculaId)
      .eq('disciplina', disciplina)
      .order('bimestre', { ascending: true })

    if (error) {
      logger.error('Error fetching grades for average', error, {
        feature: 'grades',
        action: 'calculate_average_failed',
        metadata: { matriculaId, disciplina },
      })
      return {
        data: null,
        error: 'Erro ao buscar notas para calculo de media',
      }
    }

    const gradeList = (grades || []) as Grade[]

    // Handle empty grades
    if (gradeList.length === 0) {
      return {
        data: {
          average: null,
          bimesterGrades: [],
          isComplete: false,
          sum: 0,
          count: 0,
        },
        error: null,
      }
    }

    // Calculate sum and average
    const sum = gradeList.reduce((acc, grade) => acc + grade.nota, 0)
    const count = gradeList.length
    const average = roundGrade(sum / count)

    // Check if all 4 bimesters have grades
    const isComplete = count === 4

    const result: AverageResult = {
      average,
      bimesterGrades: gradeList,
      isComplete,
      sum,
      count,
    }

    logger.info('Average calculated successfully', {
      feature: 'grades',
      action: 'average_calculated',
      metadata: {
        matriculaId,
        disciplina,
        average,
        count,
        isComplete,
      },
    })

    return {
      data: result,
      error: null,
    }
  } catch (error) {
    logger.error('Exception in calculateAverage', error as Error, {
      feature: 'grades',
      action: 'calculate_average_exception',
    })
    return {
      data: null,
      error: 'Erro inesperado ao calcular media',
    }
  }
}

/**
 * Delete a grade by ID
 *
 * Deletes a grade record. Only authorized users can delete grades.
 *
 * @param supabase - Supabase client instance
 * @param gradeId - UUID of the grade to delete
 * @returns Object with success status and optional error
 *
 * @example
 * const result = await deleteGrade(supabase, 'grade-uuid')
 * if (result.success) {
 *   console.log('Nota excluida')
 * }
 */
export async function deleteGrade(
  supabase: SupabaseClient<Database>,
  gradeId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('notas').delete().eq('id', gradeId)

    if (error) {
      logger.error('Error deleting grade', error, {
        feature: 'grades',
        action: 'delete_failed',
        metadata: { gradeId },
      })

      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Nota nao encontrada',
        }
      }

      return {
        success: false,
        error: 'Erro ao excluir nota',
      }
    }

    logger.info('Grade deleted successfully', {
      feature: 'grades',
      action: 'deleted',
      metadata: { gradeId },
    })

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    logger.error('Exception in deleteGrade', error as Error, {
      feature: 'grades',
      action: 'delete_exception',
    })
    return {
      success: false,
      error: 'Erro inesperado ao excluir nota',
    }
  }
}

/**
 * Get grade by ID
 *
 * Retrieves a single grade record by its UUID.
 *
 * @param supabase - Supabase client instance
 * @param gradeId - UUID of the grade
 * @returns GradeResponse with grade or error
 */
export async function getGradeById(
  supabase: SupabaseClient<Database>,
  gradeId: string
): Promise<GradeResponse> {
  try {
    const { data, error } = await supabase
      .from('notas')
      .select('*')
      .eq('id', gradeId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          data: null,
          error: null, // Not found is not an error
        }
      }

      logger.error('Error fetching grade by ID', error, {
        feature: 'grades',
        action: 'get_by_id_failed',
        metadata: { gradeId },
      })
      return {
        data: null,
        error: 'Erro ao buscar nota',
      }
    }

    return {
      data: data as Grade,
      error: null,
    }
  } catch (error) {
    logger.error('Exception in getGradeById', error as Error, {
      feature: 'grades',
      action: 'get_by_id_exception',
    })
    return {
      data: null,
      error: 'Erro inesperado ao buscar nota',
    }
  }
}

/**
 * Get or create grade for a specific student/discipline/bimester combination
 *
 * Useful for the grade grid: either returns existing grade or creates placeholder.
 *
 * @param supabase - Supabase client instance
 * @param matriculaId - UUID of the student enrollment
 * @param disciplina - Discipline code
 * @param bimestre - Bimester (1-4)
 * @returns GradeResponse with existing or newly created grade
 */
export async function getOrCreateGrade(
  supabase: SupabaseClient<Database>,
  matriculaId: string,
  disciplina: string,
  bimestre: Bimester
): Promise<GradeResponse> {
  try {
    // First try to get existing grade
    const { data: existingGrade, error: fetchError } = await supabase
      .from('notas')
      .select('*')
      .eq('matricula_id', matriculaId)
      .eq('disciplina', disciplina)
      .eq('bimestre', bimestre)
      .single()

    if (!fetchError && existingGrade) {
      return {
        data: existingGrade as Grade,
        error: null,
      }
    }

    // Not found - this is expected for new grades
    if (fetchError?.code === 'PGRST116') {
      return {
        data: null,
        error: null,
      }
    }

    // Some other error occurred
    if (fetchError) {
      logger.error('Error in getOrCreateGrade', fetchError, {
        feature: 'grades',
        action: 'get_or_create_failed',
        metadata: { matriculaId, disciplina, bimestre },
      })
      return {
        data: null,
        error: 'Erro ao buscar nota',
      }
    }

    return {
      data: null,
      error: null,
    }
  } catch (error) {
    logger.error('Exception in getOrCreateGrade', error as Error, {
      feature: 'grades',
      action: 'get_or_create_exception',
    })
    return {
      data: null,
      error: 'Erro inesperado',
    }
  }
}
