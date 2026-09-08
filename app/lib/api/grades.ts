/**
 * Grades API - bimestral grade CRUD following Brazilian 0–10 scale.  Module is provisioned by pilot gate (currently disabled in pilot/demo).
 */
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
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database'
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

type GradeRow = Tables<'notas'>
type GradeInsert = TablesInsert<'notas'>
type GradeUpdatePayload = TablesUpdate<'notas'>
type TurmaRow = Tables<'turmas'>
type MatriculaRow = Tables<'matriculas'>
type AlunoRow = Tables<'alunos'>
type GradeStudentRow = Pick<AlunoRow, 'id' | 'nome_completo'>
type EscolaRow = Tables<'escolas'>
type UserRow = Tables<'users'>

interface GradeValidation {
  readonly valid: boolean
  readonly errors: string[]
}

interface TurmaNotasResponse {
  readonly data: TurmaNotasData[] | null
  readonly error: string | null
}

interface TurmaNotasFilter {
  readonly activeOnly: boolean
  readonly escolaId?: string
  readonly turmaId?: string
}

interface GradeContext {
  readonly disciplinas: Tables<'disciplinas'>[]
  readonly matriculas: MatriculaRow[]
  readonly escolas: EscolaRow[]
  readonly professores: UserRow[]
  readonly error: Error | null
}

interface GradeDetails {
  readonly alunos: GradeStudentRow[]
  readonly notas: GradeRow[]
  readonly error: Error | null
}

type DisciplinaNotas = TurmaNotasData['alunos'][number]['disciplinas']
type SituacaoNota = NonNullable<DisciplinaNotas[string]['situacao']>

function toGrade(row: GradeRow): Grade | null {
  if (!isValidBimester(row.bimestre) || row.created_at === null) {
    return null
  }

  return {
    id: row.id,
    matricula_id: row.matricula_id,
    disciplina: row.disciplina,
    bimestre: row.bimestre,
    nota: row.nota,
    tipo_avaliacao: row.tipo_avaliacao,
    data_avaliacao: row.data_avaliacao,
    observacoes: row.observacoes,
    created_at: row.created_at,
  }
}

function toGrades(rows: GradeRow[] | null): Grade[] {
  return (rows ?? []).flatMap((row) => {
    const grade = toGrade(row)
    return grade ? [grade] : []
  })
}

function validationResult(errors: Array<string | null>): GradeValidation {
  const messages = errors.filter((error): error is string => error !== null)
  return { valid: messages.length === 0, errors: messages }
}

function requiredValueError(value: string, message: string): string | null {
  return value.trim() === '' ? message : null
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate grade input data
 */
function validateGradeInput(input: GradeInput): GradeValidation {
  return validationResult([
    isValidGrade(input.nota) ? null : GRADE_ERROR_MESSAGES.notaInvalid,
    isValidBimester(input.bimestre) ? null : GRADE_ERROR_MESSAGES.bimestreInvalid,
    requiredValueError(input.disciplina, GRADE_ERROR_MESSAGES.disciplinaRequired),
    requiredValueError(input.matricula_id, GRADE_ERROR_MESSAGES.matriculaRequired),
    requiredValueError(input.tipo_avaliacao, GRADE_ERROR_MESSAGES.tipoAvaliacaoRequired),
    requiredValueError(input.data_avaliacao, GRADE_ERROR_MESSAGES.dataAvaliacaoRequired),
  ])
}

/**
 * Validate grade update data
 */
function validateGradeUpdate(update: GradeUpdate): GradeValidation {
  const notaError = update.nota !== undefined && !isValidGrade(update.nota)
    ? GRADE_ERROR_MESSAGES.notaInvalid
    : null
  return validationResult([notaError])
}

function toGradeInsert(input: GradeInput): GradeInsert {
  return {
    matricula_id: input.matricula_id,
    disciplina: input.disciplina.trim(),
    bimestre: input.bimestre,
    nota: roundGrade(input.nota),
    tipo_avaliacao: input.tipo_avaliacao.trim(),
    data_avaliacao: input.data_avaliacao,
    observacoes: input.observacoes?.trim() || null,
  }
}

function toGradeUpdate(update: GradeUpdate): GradeUpdatePayload {
  const payload: GradeUpdatePayload = {}
  if (update.nota !== undefined) payload.nota = roundGrade(update.nota)
  if (update.tipo_avaliacao !== undefined) payload.tipo_avaliacao = update.tipo_avaliacao.trim()
  if (update.data_avaliacao !== undefined) payload.data_avaliacao = update.data_avaliacao
  if (update.observacoes !== undefined) payload.observacoes = update.observacoes.trim() || null
  return payload
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

    const insertData = toGradeInsert(input)

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
          error: 'Já existe uma nota para este aluno, disciplina e bimestre',
        }
      }

      if (error.code === '23503') {
        return {
          data: null,
          error: 'Matrícula não encontrada',
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
        nota: insertData.nota,
      },
    })

    const grade = data ? toGrade(data) : null
    return grade
      ? { data: grade, error: null }
      : { data: null, error: 'Dados de nota inválidos' }
  } catch (error) {
    logger.error('Exception in createGrade', error instanceof Error ? error : String(error), {
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

    const updateData = toGradeUpdate(update)

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
          error: 'Nota não encontrada',
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

    const grade = data ? toGrade(data) : null
    return grade
      ? { data: grade, error: null }
      : { data: null, error: 'Dados de nota inválidos' }
  } catch (error) {
    logger.error('Exception in updateGrade', error instanceof Error ? error : String(error), {
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
      data: toGrades(data),
      error: null,
    }
  } catch (error) {
    logger.error('Exception in getGradesByStudent', error instanceof Error ? error : String(error), {
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
    return {
      data: toGrades(data),
      error: null,
    }
  } catch (error) {
    logger.error('Exception in getGradesByClass', error instanceof Error ? error : String(error), {
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
        error: 'Erro ao buscar notas para cálculo de média',
      }
    }

    const gradeList = toGrades(grades)

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
    logger.error('Exception in calculateAverage', error instanceof Error ? error : String(error), {
      feature: 'grades',
      action: 'calculate_average_exception',
    })
    return {
      data: null,
      error: 'Erro inesperado ao calcular média',
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
          error: 'Nota não encontrada',
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
    logger.error('Exception in deleteGrade', error instanceof Error ? error : String(error), {
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

    const grade = data ? toGrade(data) : null
    return grade
      ? { data: grade, error: null }
      : { data: null, error: 'Dados de nota inválidos' }
  } catch (error) {
    logger.error('Exception in getGradeById', error instanceof Error ? error : String(error), {
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
      const grade = toGrade(existingGrade)
      return grade
        ? { data: grade, error: null }
        : { data: null, error: 'Dados de nota inválidos' }
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
    logger.error('Exception in getOrCreateGrade', error instanceof Error ? error : String(error), {
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

function subjectSituation(grades: number[], media: number | undefined): SituacaoNota {
  if (grades.length !== 4 || media === undefined) return 'cursando'
  if (media >= 6) return 'aprovado'
  return media >= 4 ? 'recuperacao' : 'reprovado'
}

function subjectGrades(grades: Grade[]): DisciplinaNotas[string] {
  const notas = [1, 2, 3, 4].map((bimestre) => grades.find((grade) => grade.bimestre === bimestre)?.nota)
  const avaliadas = notas.filter((nota): nota is number => nota !== undefined)
  const media = avaliadas.length > 0
    ? roundGrade(avaliadas.reduce((sum, nota) => sum + nota, 0) / avaliadas.length)
    : undefined

  return {
    bimestre1: notas[0],
    bimestre2: notas[1],
    bimestre3: notas[2],
    bimestre4: notas[3],
    media,
    situacao: subjectSituation(avaliadas, media),
  }
}

function disciplinasNotas(grades: Grade[], disciplinas: string[]): DisciplinaNotas {
  const result: DisciplinaNotas = {}
  for (const disciplina of disciplinas) {
    result[disciplina] = subjectGrades(grades.filter((grade) => grade.disciplina === disciplina))
  }
  return result
}

function gradesByMatricula(grades: Grade[]): Map<string, Grade[]> {
  const result = new Map<string, Grade[]>()
  for (const grade of grades) {
    const matriculaGrades = result.get(grade.matricula_id) ?? []
    matriculaGrades.push(grade)
    result.set(grade.matricula_id, matriculaGrades)
  }
  return result
}

function buildAlunoNotas(
  matricula: MatriculaRow,
  aluno: GradeStudentRow | undefined,
  disciplinas: string[],
  notas: Map<string, Grade[]>
): TurmaNotasData['alunos'][number] {
  return {
    id: aluno?.id ?? matricula.id,
    aluno_id: matricula.aluno_id,
    nome_completo: aluno?.nome_completo ?? 'Aluno',
    matricula_id: matricula.id,
    disciplinas: disciplinasNotas(notas.get(matricula.id) ?? [], disciplinas),
  }
}

function buildTurmaNotas(
  turma: TurmaRow,
  matriculas: MatriculaRow[],
  disciplinas: string[],
  alunos: Map<string, GradeStudentRow>,
  escolas: Map<string, EscolaRow>,
  professores: Map<string, UserRow>,
  notas: Map<string, Grade[]>
): TurmaNotasData {
  const turmaAlunos = matriculas
    .filter((matricula) => matricula.turma_id === turma.id)
    .map((matricula) => buildAlunoNotas(matricula, alunos.get(matricula.aluno_id), disciplinas, notas))
    .sort((first, second) => first.nome_completo.localeCompare(second.nome_completo))

  return {
    id: turma.id,
    nome: turma.nome,
    serie: turma.serie,
    escola: escolas.get(turma.escola_id)?.nome ?? 'Escola',
    escola_id: turma.escola_id,
    professor: turma.professor_id ? professores.get(turma.professor_id)?.nome ?? 'Sem professor' : 'Sem professor',
    professor_id: turma.professor_id,
    ano_letivo: turma.ano_letivo,
    disciplinas,
    alunos: turmaAlunos,
  }
}

function firstError(errors: Array<{ readonly error: Error | null }>): Error | null {
  return errors.find((result) => result.error !== null)?.error ?? null
}

async function fetchTurmaRows(
  supabase: SupabaseClient<Database>,
  filter: TurmaNotasFilter
) {
  let query = supabase.from('turmas').select('*')
  if (filter.activeOnly) query = query.eq('ativo', true)
  if (filter.escolaId) query = query.eq('escola_id', filter.escolaId)
  if (filter.turmaId) query = query.eq('id', filter.turmaId)
  return query.order('nome', { ascending: true })
}

async function fetchGradeContext(
  supabase: SupabaseClient<Database>,
  turmas: TurmaRow[]
): Promise<GradeContext> {
  const turmaIds = turmas.map((turma) => turma.id)
  const escolaIds = turmas.map((turma) => turma.escola_id)
  const professorIds = turmas.flatMap((turma) => turma.professor_id ? [turma.professor_id] : [])
  const [disciplinasResult, matriculasResult, escolasResult, professoresResult] = await Promise.all([
    supabase.from('disciplinas').select('*').eq('ativa', true),
    supabase.from('matriculas').select('*').in('turma_id', turmaIds).eq('situacao', 'ativa'),
    supabase.from('escolas').select('*').in('id', escolaIds),
    supabase.from('users').select('*').in('id', professorIds),
  ])

  return {
    disciplinas: disciplinasResult.data ?? [],
    matriculas: matriculasResult.data ?? [],
    escolas: escolasResult.data ?? [],
    professores: professoresResult.data ?? [],
    error: firstError([disciplinasResult, matriculasResult, escolasResult, professoresResult]),
  }
}

async function fetchGradeDetails(
  supabase: SupabaseClient<Database>,
  matriculas: MatriculaRow[]
): Promise<GradeDetails> {
  const matriculaIds = matriculas.map((matricula) => matricula.id)
  const [alunosResult, notasResult] = await Promise.all([
    supabase.from('alunos').select('id, nome_completo').in('id', matriculas.map((matricula) => matricula.aluno_id)),
    supabase.from('notas').select('*').in('matricula_id', matriculaIds),
  ])

  return {
    alunos: alunosResult.data ?? [],
    notas: notasResult.data ?? [],
    error: firstError([alunosResult, notasResult]),
  }
}

async function fetchTurmasNotas(
  supabase: SupabaseClient<Database>,
  filter: TurmaNotasFilter
): Promise<TurmaNotasResponse> {
  const { data: turmas, error: turmasError } = await fetchTurmaRows(supabase, filter)
  if (turmasError) {
    logger.error('Error fetching turmas for notas', turmasError, {
      feature: 'grades',
      action: 'get_turmas_for_notas_failed',
      metadata: { escolaId: filter.escolaId, turmaId: filter.turmaId },
    })
    return { data: null, error: 'Erro ao buscar turmas' }
  }

  const turmaRows = turmas ?? []
  if (turmaRows.length === 0) return { data: [], error: null }

  const context = await fetchGradeContext(supabase, turmaRows)
  if (context.error) {
    logger.error('Error fetching grade context', context.error, {
      feature: 'grades',
      action: 'get_turmas_for_notas_context_failed',
      metadata: { escolaId: filter.escolaId, turmaId: filter.turmaId },
    })
    return { data: null, error: 'Erro ao buscar dados das turmas' }
  }

  const details = await fetchGradeDetails(supabase, context.matriculas)
  if (details.error) {
    logger.error('Error fetching grade details', details.error, {
      feature: 'grades',
      action: 'get_turmas_for_notas_details_failed',
      metadata: { escolaId: filter.escolaId, turmaId: filter.turmaId },
    })
    return { data: null, error: 'Erro ao buscar dados das turmas' }
  }

  const alunos = new Map(details.alunos.map((aluno) => [aluno.id, aluno]))
  const escolas = new Map(context.escolas.map((escola) => [escola.id, escola]))
  const professores = new Map(context.professores.map((professor) => [professor.id, professor]))
  const disciplinas = context.disciplinas.map((disciplina) => disciplina.nome)
  const notas = gradesByMatricula(toGrades(details.notas))
  const data = turmaRows.map((turma) => buildTurmaNotas(turma, context.matriculas, disciplinas, alunos, escolas, professores, notas))

  return { data, error: null }
}

/** Lists active classes and their grade-grid data, optionally for one school. */
export async function getTurmasForNotas(
  supabase: SupabaseClient<Database>,
  escolaId?: string
): Promise<TurmaNotasResponse> {
  try {
    const result = await fetchTurmasNotas(supabase, { activeOnly: true, escolaId })
    if (result.data) {
      logger.info('Turmas for notas fetched successfully', {
        feature: 'grades',
        action: 'get_turmas_for_notas',
        metadata: { count: result.data.length, escolaId },
      })
    }
    return result
  } catch (error) {
    logger.error('Exception in getTurmasForNotas', error instanceof Error ? error : String(error), {
      feature: 'grades',
      action: 'get_turmas_for_notas_exception',
    })
    return { data: null, error: 'Erro inesperado ao buscar turmas' }
  }
}

/** Gets the grade-grid data for one active class. */
export async function getGradesByTurmaWithStudents(
  supabase: SupabaseClient<Database>,
  turmaId: string
): Promise<{ data: TurmaNotasData | null; error: string | null }> {
  try {
    const result = await fetchTurmasNotas(supabase, { activeOnly: false, turmaId })
    const turma = result.data?.[0] ?? null
    if (turma) {
      logger.info('Grades by turma fetched successfully', {
        feature: 'grades',
        action: 'get_grades_by_turma',
        metadata: { turmaId, studentCount: turma.alunos.length },
      })
    }
    return { data: turma, error: result.error }
  } catch (error) {
    logger.error('Exception in getGradesByTurmaWithStudents', error instanceof Error ? error : String(error), {
      feature: 'grades',
      action: 'get_grades_by_turma_exception',
    })
    return { data: null, error: 'Erro inesperado ao buscar notas da turma' }
  }
}
