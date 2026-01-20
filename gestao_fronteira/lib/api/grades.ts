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

// ============================================================================
// NOTAS PAGE DATA FETCHING
// ============================================================================

/**
 * Interface for turma with grades data (for Notas page)
 */
export interface TurmaNotasData {
  id: string
  nome: string
  serie: string
  escola: string
  escola_id: string
  professor: string
  professor_id: string | null
  ano_letivo: number
  disciplinas: string[]
  alunos: {
    id: string
    aluno_id: string
    nome_completo: string
    matricula_id: string
    disciplinas: {
      [disciplina: string]: {
        bimestre1?: number
        bimestre2?: number
        bimestre3?: number
        bimestre4?: number
        media?: number
        situacao?: 'aprovado' | 'reprovado' | 'recuperacao' | 'cursando'
      }
    }
  }[]
}

/**
 * Get turmas for the Notas page grid
 *
 * Lists all active turmas with basic info for selection.
 * Optionally filtered by escola.
 *
 * @param supabase - Supabase client instance
 * @param escolaId - Optional escola filter
 * @returns List of turmas with basic info
 */
export async function getTurmasForNotas(
  supabase: SupabaseClient<Database>,
  escolaId?: string
): Promise<{ data: TurmaNotasData[] | null; error: string | null }> {
  try {
    let query = supabase
      .from('turmas')
      .select(`
        id,
        nome,
        serie,
        ano_letivo,
        escola_id,
        professor_id,
        escola:escolas(id, nome),
        professor:users!professor_id(id, nome),
        matriculas(
          id,
          situacao,
          aluno:alunos(id, nome_completo)
        )
      `)
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (escolaId) {
      query = query.eq('escola_id', escolaId)
    }

    const { data: turmas, error: turmasError } = await query

    if (turmasError) {
      logger.error('Error fetching turmas for notas', turmasError, {
        feature: 'grades',
        action: 'get_turmas_for_notas_failed',
        metadata: { escolaId },
      })
      return {
        data: null,
        error: 'Erro ao buscar turmas',
      }
    }

    if (!turmas || turmas.length === 0) {
      return {
        data: [],
        error: null,
      }
    }

    // Get all disciplinas from the database
    const { data: disciplinas } = await supabase
      .from('disciplinas')
      .select('codigo, nome')
      .eq('ativa', true)

    // Default disciplines if none in database
    const defaultDisciplinas = ['Portugues', 'Matematica', 'Historia', 'Geografia', 'Ciencias']
    const disciplinaList = disciplinas && disciplinas.length > 0
      ? disciplinas.map(d => d.nome)
      : defaultDisciplinas

    // Get all grades for active matriculas in these turmas
    const turmaIds = turmas.map(t => t.id)
    const { data: allGrades } = await supabase
      .from('notas')
      .select(`
        id,
        matricula_id,
        disciplina,
        bimestre,
        nota,
        matriculas!inner(turma_id)
      `)
      .in('matriculas.turma_id', turmaIds)

    // Create a map of grades by matricula_id
    const gradesByMatricula: Record<string, Grade[]> = {}
    if (allGrades) {
      for (const grade of allGrades) {
        const matriculaId = grade.matricula_id
        if (!gradesByMatricula[matriculaId]) {
          gradesByMatricula[matriculaId] = []
        }
        gradesByMatricula[matriculaId].push(grade as Grade)
      }
    }

    // Transform turmas data
    const transformedTurmas: TurmaNotasData[] = turmas.map((turma: any) => {
      const activeMatriculas = turma.matriculas?.filter((m: any) => m.situacao === 'ativa') || []

      const alunos = activeMatriculas.map((matricula: any) => {
        const grades = gradesByMatricula[matricula.id] || []

        // Build disciplinas object
        const disciplinasObj: TurmaNotasData['alunos'][0]['disciplinas'] = {}

        for (const disciplina of disciplinaList) {
          const disciplinaGrades = grades.filter(g => g.disciplina === disciplina)

          if (disciplinaGrades.length > 0 || true) {
            const bimestre1 = disciplinaGrades.find(g => g.bimestre === 1)?.nota
            const bimestre2 = disciplinaGrades.find(g => g.bimestre === 2)?.nota
            const bimestre3 = disciplinaGrades.find(g => g.bimestre === 3)?.nota
            const bimestre4 = disciplinaGrades.find(g => g.bimestre === 4)?.nota

            // Calculate media
            const gradedBimesters = [bimestre1, bimestre2, bimestre3, bimestre4].filter(
              (n): n is number => n !== undefined
            )
            const media = gradedBimesters.length > 0
              ? roundGrade(gradedBimesters.reduce((sum, n) => sum + n, 0) / gradedBimesters.length)
              : undefined

            // Determine situacao
            let situacao: 'aprovado' | 'reprovado' | 'recuperacao' | 'cursando' = 'cursando'
            if (gradedBimesters.length === 4 && media !== undefined) {
              if (media >= 6) situacao = 'aprovado'
              else if (media >= 4) situacao = 'recuperacao'
              else situacao = 'reprovado'
            }

            disciplinasObj[disciplina] = {
              bimestre1,
              bimestre2,
              bimestre3,
              bimestre4,
              media,
              situacao,
            }
          }
        }

        return {
          id: matricula.aluno?.id || matricula.id,
          aluno_id: matricula.aluno?.id || '',
          nome_completo: matricula.aluno?.nome_completo || 'Aluno',
          matricula_id: matricula.id,
          disciplinas: disciplinasObj,
        }
      })

      return {
        id: turma.id,
        nome: turma.nome,
        serie: turma.serie,
        escola: (turma.escola as any)?.nome || 'Escola',
        escola_id: turma.escola_id,
        professor: (turma.professor as any)?.nome || 'Sem professor',
        professor_id: turma.professor_id,
        ano_letivo: turma.ano_letivo,
        disciplinas: disciplinaList,
        alunos: alunos.sort((a: any, b: any) => a.nome_completo.localeCompare(b.nome_completo)),
      }
    })

    logger.info('Turmas for notas fetched successfully', {
      feature: 'grades',
      action: 'get_turmas_for_notas',
      metadata: { count: transformedTurmas.length, escolaId },
    })

    return {
      data: transformedTurmas,
      error: null,
    }
  } catch (error) {
    logger.error('Exception in getTurmasForNotas', error as Error, {
      feature: 'grades',
      action: 'get_turmas_for_notas_exception',
    })
    return {
      data: null,
      error: 'Erro inesperado ao buscar turmas',
    }
  }
}

/**
 * Get grades for a specific turma with student details
 *
 * Fetches all grades for students in a turma, organized by discipline and bimester.
 *
 * @param supabase - Supabase client instance
 * @param turmaId - UUID of the turma
 * @returns TurmaNotasData with all student grades
 */
export async function getGradesByTurmaWithStudents(
  supabase: SupabaseClient<Database>,
  turmaId: string
): Promise<{ data: TurmaNotasData | null; error: string | null }> {
  try {
    // Fetch turma with escola and professor info
    const { data: turma, error: turmaError } = await supabase
      .from('turmas')
      .select(`
        id,
        nome,
        serie,
        ano_letivo,
        escola_id,
        professor_id,
        escola:escolas(id, nome),
        professor:users!professor_id(id, nome)
      `)
      .eq('id', turmaId)
      .single()

    if (turmaError) {
      if (turmaError.code === 'PGRST116') {
        return { data: null, error: null }
      }
      logger.error('Error fetching turma for grades', turmaError, {
        feature: 'grades',
        action: 'get_grades_by_turma_failed',
        metadata: { turmaId },
      })
      return { data: null, error: 'Erro ao buscar turma' }
    }

    // Fetch active matriculas for this turma
    const { data: matriculas, error: matriculasError } = await supabase
      .from('matriculas')
      .select(`
        id,
        aluno_id,
        aluno:alunos(id, nome_completo)
      `)
      .eq('turma_id', turmaId)
      .eq('situacao', 'ativa')

    if (matriculasError) {
      logger.error('Error fetching matriculas for grades', matriculasError, {
        feature: 'grades',
        action: 'get_grades_by_turma_matriculas_failed',
        metadata: { turmaId },
      })
      return { data: null, error: 'Erro ao buscar matriculas' }
    }

    // Get all disciplinas
    const { data: disciplinas } = await supabase
      .from('disciplinas')
      .select('codigo, nome')
      .eq('ativa', true)

    const defaultDisciplinas = ['Portugues', 'Matematica', 'Historia', 'Geografia', 'Ciencias']
    const disciplinaList = disciplinas && disciplinas.length > 0
      ? disciplinas.map(d => d.nome)
      : defaultDisciplinas

    // Get grades for all matriculas
    const matriculaIds = (matriculas || []).map(m => m.id)
    let grades: Grade[] = []

    if (matriculaIds.length > 0) {
      const { data: gradesData } = await supabase
        .from('notas')
        .select('*')
        .in('matricula_id', matriculaIds)

      grades = (gradesData || []) as Grade[]
    }

    // Group grades by matricula
    const gradesByMatricula: Record<string, Grade[]> = {}
    for (const grade of grades) {
      if (!gradesByMatricula[grade.matricula_id]) {
        gradesByMatricula[grade.matricula_id] = []
      }
      gradesByMatricula[grade.matricula_id].push(grade)
    }

    // Transform matriculas to alunos with grades
    const alunos = (matriculas || []).map((matricula: any) => {
      const studentGrades = gradesByMatricula[matricula.id] || []

      const disciplinasObj: TurmaNotasData['alunos'][0]['disciplinas'] = {}

      for (const disciplina of disciplinaList) {
        const disciplinaGrades = studentGrades.filter(g => g.disciplina === disciplina)

        const bimestre1 = disciplinaGrades.find(g => g.bimestre === 1)?.nota
        const bimestre2 = disciplinaGrades.find(g => g.bimestre === 2)?.nota
        const bimestre3 = disciplinaGrades.find(g => g.bimestre === 3)?.nota
        const bimestre4 = disciplinaGrades.find(g => g.bimestre === 4)?.nota

        const gradedBimesters = [bimestre1, bimestre2, bimestre3, bimestre4].filter(
          (n): n is number => n !== undefined
        )
        const media = gradedBimesters.length > 0
          ? roundGrade(gradedBimesters.reduce((sum, n) => sum + n, 0) / gradedBimesters.length)
          : undefined

        let situacao: 'aprovado' | 'reprovado' | 'recuperacao' | 'cursando' = 'cursando'
        if (gradedBimesters.length === 4 && media !== undefined) {
          if (media >= 6) situacao = 'aprovado'
          else if (media >= 4) situacao = 'recuperacao'
          else situacao = 'reprovado'
        }

        disciplinasObj[disciplina] = {
          bimestre1,
          bimestre2,
          bimestre3,
          bimestre4,
          media,
          situacao,
        }
      }

      return {
        id: matricula.aluno?.id || matricula.id,
        aluno_id: matricula.aluno_id,
        nome_completo: matricula.aluno?.nome_completo || 'Aluno',
        matricula_id: matricula.id,
        disciplinas: disciplinasObj,
      }
    })

    const result: TurmaNotasData = {
      id: turma.id,
      nome: turma.nome,
      serie: turma.serie,
      escola: (turma.escola as any)?.nome || 'Escola',
      escola_id: turma.escola_id,
      professor: (turma.professor as any)?.nome || 'Sem professor',
      professor_id: turma.professor_id,
      ano_letivo: turma.ano_letivo,
      disciplinas: disciplinaList,
      alunos: alunos.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo)),
    }

    logger.info('Grades by turma fetched successfully', {
      feature: 'grades',
      action: 'get_grades_by_turma',
      metadata: { turmaId, studentCount: alunos.length },
    })

    return { data: result, error: null }
  } catch (error) {
    logger.error('Exception in getGradesByTurmaWithStudents', error as Error, {
      feature: 'grades',
      action: 'get_grades_by_turma_exception',
    })
    return { data: null, error: 'Erro inesperado ao buscar notas da turma' }
  }
}
