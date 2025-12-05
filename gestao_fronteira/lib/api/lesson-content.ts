/**
 * Lesson Content API Layer
 * Brazilian Educational Compliance: BNCC-Aligned Lesson Planning
 *
 * Task Group 2.1: API and Types for Lesson Content
 * OpenSpec Change: 2025-12-04-diario-de-classe
 *
 * This module provides CRUD operations for lesson content (conteudo_aula)
 * linked to class sessions (sessoes_aula) for the Digital Class Diary.
 *
 * BNCC Reference: Base Nacional Comum Curricular
 * - EF: Ensino Fundamental (Elementary School)
 * - EI: Educacao Infantil (Early Childhood Education)
 *
 * IMPORTANT: All functions accept a Supabase client as first parameter.
 * The client should be created in the calling context (API route or Server Component)
 * using createServerClient from @supabase/ssr with proper cookie handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { logger } from '@/lib/logger'
import {
  type LessonContent,
  type LessonContentInput,
  type LessonContentUpdate,
  type LessonContentFilters,
  type LessonContentDetailed,
  type LessonContentResponse,
  type LessonContentListResponse,
  type LessonContentDetailedResponse,
  isValidBNNCSkillCode,
  validateBNNCSkillCodes,
  LESSON_CONTENT_VALIDATION,
  LESSON_CONTENT_ERROR_MESSAGES,
} from '@/types/lesson-content'

// Re-export types for convenience
export type {
  LessonContent,
  LessonContentInput,
  LessonContentUpdate,
  LessonContentFilters,
  LessonContentDetailed,
  LessonContentResponse,
  LessonContentListResponse,
  LessonContentDetailedResponse,
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate lesson content input data
 */
function validateLessonContentInput(input: LessonContentInput): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Validate tema
  if (!input.tema || input.tema.trim() === '') {
    errors.push(LESSON_CONTENT_ERROR_MESSAGES.temaRequired)
  } else if (input.tema.trim().length < LESSON_CONTENT_VALIDATION.minTemaLength) {
    errors.push(LESSON_CONTENT_ERROR_MESSAGES.temaTooShort)
  } else if (input.tema.length > LESSON_CONTENT_VALIDATION.maxTemaLength) {
    errors.push(LESSON_CONTENT_ERROR_MESSAGES.temaTooLong)
  }

  // Validate objetivo
  if (!input.objetivo || input.objetivo.trim() === '') {
    errors.push(LESSON_CONTENT_ERROR_MESSAGES.objetivoRequired)
  } else if (input.objetivo.trim().length < LESSON_CONTENT_VALIDATION.minObjetivoLength) {
    errors.push(LESSON_CONTENT_ERROR_MESSAGES.objetivoTooShort)
  } else if (input.objetivo.length > LESSON_CONTENT_VALIDATION.maxObjetivoLength) {
    errors.push(LESSON_CONTENT_ERROR_MESSAGES.objetivoTooLong)
  }

  // Validate habilidades_bncc
  if (input.habilidades_bncc && input.habilidades_bncc.length > 0) {
    if (input.habilidades_bncc.length > LESSON_CONTENT_VALIDATION.maxHabilidadesBNCC) {
      errors.push(LESSON_CONTENT_ERROR_MESSAGES.habilidadesTooMany)
    } else {
      const validation = validateBNNCSkillCodes(input.habilidades_bncc)
      if (!validation.valid) {
        errors.push(
          `${LESSON_CONTENT_ERROR_MESSAGES.habilidadesInvalid}: ${validation.invalidCodes.join(', ')}`
        )
      }
    }
  }

  // Validate optional fields
  if (
    input.metodologia &&
    input.metodologia.length > LESSON_CONTENT_VALIDATION.maxMetodologiaLength
  ) {
    errors.push(LESSON_CONTENT_ERROR_MESSAGES.metodologiaTooLong)
  }

  if (input.recursos && input.recursos.length > LESSON_CONTENT_VALIDATION.maxRecursosLength) {
    errors.push(LESSON_CONTENT_ERROR_MESSAGES.recursosTooLong)
  }

  if (
    input.observacoes &&
    input.observacoes.length > LESSON_CONTENT_VALIDATION.maxObservacoesLength
  ) {
    errors.push(LESSON_CONTENT_ERROR_MESSAGES.observacoesTooLong)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate lesson content update data
 */
function validateLessonContentUpdate(update: LessonContentUpdate): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Validate tema if provided
  if (update.tema !== undefined) {
    if (update.tema.trim() === '') {
      errors.push(LESSON_CONTENT_ERROR_MESSAGES.temaRequired)
    } else if (update.tema.trim().length < LESSON_CONTENT_VALIDATION.minTemaLength) {
      errors.push(LESSON_CONTENT_ERROR_MESSAGES.temaTooShort)
    } else if (update.tema.length > LESSON_CONTENT_VALIDATION.maxTemaLength) {
      errors.push(LESSON_CONTENT_ERROR_MESSAGES.temaTooLong)
    }
  }

  // Validate objetivo if provided
  if (update.objetivo !== undefined) {
    if (update.objetivo.trim() === '') {
      errors.push(LESSON_CONTENT_ERROR_MESSAGES.objetivoRequired)
    } else if (update.objetivo.trim().length < LESSON_CONTENT_VALIDATION.minObjetivoLength) {
      errors.push(LESSON_CONTENT_ERROR_MESSAGES.objetivoTooShort)
    } else if (update.objetivo.length > LESSON_CONTENT_VALIDATION.maxObjetivoLength) {
      errors.push(LESSON_CONTENT_ERROR_MESSAGES.objetivoTooLong)
    }
  }

  // Validate habilidades_bncc if provided
  if (update.habilidades_bncc !== undefined && update.habilidades_bncc.length > 0) {
    if (update.habilidades_bncc.length > LESSON_CONTENT_VALIDATION.maxHabilidadesBNCC) {
      errors.push(LESSON_CONTENT_ERROR_MESSAGES.habilidadesTooMany)
    } else {
      const validation = validateBNNCSkillCodes(update.habilidades_bncc)
      if (!validation.valid) {
        errors.push(
          `${LESSON_CONTENT_ERROR_MESSAGES.habilidadesInvalid}: ${validation.invalidCodes.join(', ')}`
        )
      }
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
 * Create new lesson content for a session
 *
 * Creates a new lesson content record linked to a class session.
 * Validates all fields according to BNCC requirements.
 *
 * @param supabase - Supabase client instance
 * @param input - Lesson content data to create
 * @returns LessonContentResponse with created content or error
 *
 * @example
 * const result = await createLessonContent(supabase, {
 *   sessao_id: 'session-uuid',
 *   tema: 'Adicao e Subtracao',
 *   objetivo: 'Compreender operacoes basicas',
 *   habilidades_bncc: ['EF01MA06', 'EF01MA08'],
 *   metodologia: 'Aula expositiva',
 *   recursos: 'Material dourado',
 * })
 */
export async function createLessonContent(
  supabase: SupabaseClient<Database>,
  input: LessonContentInput
): Promise<LessonContentResponse> {
  try {
    // Validate input
    const validation = validateLessonContentInput(input)
    if (!validation.valid) {
      logger.warn('Lesson content validation failed', {
        feature: 'lesson-content',
        action: 'create_validation_failed',
        metadata: { errors: validation.errors },
      })
      return {
        data: null,
        error: validation.errors.join('; '),
      }
    }

    // Get current user for created_by field
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Prepare data for insertion
    const insertData = {
      sessao_id: input.sessao_id,
      tema: input.tema.trim(),
      objetivo: input.objetivo.trim(),
      habilidades_bncc: input.habilidades_bncc || [],
      metodologia: input.metodologia?.trim() || null,
      recursos: input.recursos?.trim() || null,
      observacoes: input.observacoes?.trim() || null,
      created_by: user?.id || null,
    }

    // Insert lesson content
    const { data, error } = await supabase
      .from('conteudo_aula')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      logger.error('Error creating lesson content', error, {
        feature: 'lesson-content',
        action: 'create_failed',
      })

      // Handle specific error cases
      if (error.code === '23505') {
        return {
          data: null,
          error: 'Ja existe conteudo registrado para esta sessao de aula',
        }
      }

      if (error.code === '23503') {
        return {
          data: null,
          error: 'Sessao de aula nao encontrada',
        }
      }

      return {
        data: null,
        error: 'Erro ao criar conteudo da aula',
      }
    }

    logger.info('Lesson content created successfully', {
      feature: 'lesson-content',
      action: 'created',
      metadata: { contentId: data.id, sessionId: input.sessao_id },
    })

    return {
      data: data as LessonContent,
      error: null,
    }
  } catch (error) {
    logger.error('Exception in createLessonContent', error as Error, {
      feature: 'lesson-content',
      action: 'create_exception',
    })
    return {
      data: null,
      error: 'Erro inesperado ao criar conteudo da aula',
    }
  }
}

/**
 * Update existing lesson content
 *
 * Updates an existing lesson content record.
 * Only updates provided fields, preserving existing values.
 *
 * @param supabase - Supabase client instance
 * @param contentId - UUID of the lesson content to update
 * @param update - Fields to update
 * @returns LessonContentResponse with updated content or error
 *
 * @example
 * const result = await updateLessonContent(supabase, 'content-uuid', {
 *   observacoes: 'Alunos demonstraram boa compreensao',
 * })
 */
export async function updateLessonContent(
  supabase: SupabaseClient<Database>,
  contentId: string,
  update: LessonContentUpdate
): Promise<LessonContentResponse> {
  try {
    // Validate update data
    const validation = validateLessonContentUpdate(update)
    if (!validation.valid) {
      logger.warn('Lesson content update validation failed', {
        feature: 'lesson-content',
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

    if (update.tema !== undefined) {
      updateData.tema = update.tema.trim()
    }
    if (update.objetivo !== undefined) {
      updateData.objetivo = update.objetivo.trim()
    }
    if (update.habilidades_bncc !== undefined) {
      updateData.habilidades_bncc = update.habilidades_bncc
    }
    if (update.metodologia !== undefined) {
      updateData.metodologia = update.metodologia?.trim() || null
    }
    if (update.recursos !== undefined) {
      updateData.recursos = update.recursos?.trim() || null
    }
    if (update.observacoes !== undefined) {
      updateData.observacoes = update.observacoes?.trim() || null
    }

    // Update lesson content
    const { data, error } = await supabase
      .from('conteudo_aula')
      .update(updateData)
      .eq('id', contentId)
      .select()
      .single()

    if (error) {
      logger.error('Error updating lesson content', error, {
        feature: 'lesson-content',
        action: 'update_failed',
        metadata: { contentId },
      })

      if (error.code === 'PGRST116') {
        return {
          data: null,
          error: 'Conteudo da aula nao encontrado',
        }
      }

      return {
        data: null,
        error: 'Erro ao atualizar conteudo da aula',
      }
    }

    logger.info('Lesson content updated successfully', {
      feature: 'lesson-content',
      action: 'updated',
      metadata: { contentId },
    })

    return {
      data: data as LessonContent,
      error: null,
    }
  } catch (error) {
    logger.error('Exception in updateLessonContent', error as Error, {
      feature: 'lesson-content',
      action: 'update_exception',
    })
    return {
      data: null,
      error: 'Erro inesperado ao atualizar conteudo da aula',
    }
  }
}

/**
 * Get lesson content by session ID
 *
 * Retrieves the lesson content for a specific class session.
 * Returns null if no content exists for the session.
 *
 * @param supabase - Supabase client instance
 * @param sessionId - UUID of the session (sessao_aula)
 * @returns LessonContentResponse with content or null if not found
 *
 * @example
 * const result = await getLessonContentBySession(supabase, 'session-uuid')
 * if (result.data) {
 *   console.log(result.data.tema)
 * }
 */
export async function getLessonContentBySession(
  supabase: SupabaseClient<Database>,
  sessionId: string
): Promise<LessonContentResponse> {
  try {
    const { data, error } = await supabase
      .from('conteudo_aula')
      .select('*')
      .eq('sessao_id', sessionId)
      .single()

    if (error) {
      // No content found is not an error
      if (error.code === 'PGRST116') {
        return {
          data: null,
          error: null,
        }
      }

      logger.error('Error fetching lesson content by session', error, {
        feature: 'lesson-content',
        action: 'get_by_session_failed',
        metadata: { sessionId },
      })
      return {
        data: null,
        error: 'Erro ao buscar conteudo da aula',
      }
    }

    return {
      data: data as LessonContent,
      error: null,
    }
  } catch (error) {
    logger.error('Exception in getLessonContentBySession', error as Error, {
      feature: 'lesson-content',
      action: 'get_by_session_exception',
    })
    return {
      data: null,
      error: 'Erro inesperado ao buscar conteudo da aula',
    }
  }
}

/**
 * Get lesson content history with filters
 *
 * Retrieves a paginated list of lesson content records.
 * Supports filtering by class, teacher, school, date range, and BNCC skill.
 *
 * @param supabase - Supabase client instance
 * @param filters - Optional filters for the query
 * @returns LessonContentListResponse with content list and pagination info
 *
 * @example
 * const result = await getLessonContentHistory(supabase, {
 *   turma_id: 'turma-uuid',
 *   date_from: '2025-02-01',
 *   date_to: '2025-02-28',
 *   limit: 20,
 *   offset: 0,
 * })
 */
export async function getLessonContentHistory(
  supabase: SupabaseClient<Database>,
  filters: LessonContentFilters = {}
): Promise<LessonContentListResponse> {
  try {
    // Build query using the detailed view for easier filtering
    let query = supabase.from('vw_conteudo_aula_detalhado').select('*')

    // Apply filters
    if (filters.turma_id) {
      query = query.eq('turma_id', filters.turma_id)
    }

    if (filters.professor_id) {
      query = query.eq('professor_id', filters.professor_id)
    }

    if (filters.escola_id) {
      query = query.eq('escola_id', filters.escola_id)
    }

    if (filters.date_from) {
      query = query.gte('data_aula', filters.date_from)
    }

    if (filters.date_to) {
      query = query.lte('data_aula', filters.date_to)
    }

    if (filters.habilidade_bncc) {
      query = query.contains('habilidades_bncc', [filters.habilidade_bncc])
    }

    // Order by date descending (most recent first)
    query = query.order('data_aula', { ascending: false })

    // Apply pagination
    const limit = filters.limit || 20
    const offset = filters.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching lesson content history', error, {
        feature: 'lesson-content',
        action: 'get_history_failed',
        metadata: { filters },
      })
      return {
        data: null,
        error: 'Erro ao buscar historico de conteudo',
      }
    }

    return {
      data: (data as LessonContent[]) || [],
      error: null,
      pagination: {
        limit,
        offset,
        total: data?.length || 0,
      },
    }
  } catch (error) {
    logger.error('Exception in getLessonContentHistory', error as Error, {
      feature: 'lesson-content',
      action: 'get_history_exception',
    })
    return {
      data: null,
      error: 'Erro inesperado ao buscar historico de conteudo',
    }
  }
}

/**
 * Get detailed lesson content by ID
 *
 * Retrieves a single lesson content record with full session,
 * class, school, and teacher information.
 *
 * @param supabase - Supabase client instance
 * @param contentId - UUID of the lesson content
 * @returns LessonContentDetailedResponse with detailed content or error
 *
 * @example
 * const result = await getLessonContentDetailed(supabase, 'content-uuid')
 * if (result.data) {
 *   console.log(result.data.turma_nome, result.data.professor_nome)
 * }
 */
export async function getLessonContentDetailed(
  supabase: SupabaseClient<Database>,
  contentId: string
): Promise<LessonContentDetailedResponse> {
  try {
    const { data, error } = await supabase
      .from('vw_conteudo_aula_detalhado')
      .select('*')
      .eq('id', contentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          data: null,
          error: 'Conteudo da aula nao encontrado',
        }
      }

      logger.error('Error fetching detailed lesson content', error, {
        feature: 'lesson-content',
        action: 'get_detailed_failed',
        metadata: { contentId },
      })
      return {
        data: null,
        error: 'Erro ao buscar detalhes do conteudo',
      }
    }

    return {
      data: data as LessonContentDetailed,
      error: null,
    }
  } catch (error) {
    logger.error('Exception in getLessonContentDetailed', error as Error, {
      feature: 'lesson-content',
      action: 'get_detailed_exception',
    })
    return {
      data: null,
      error: 'Erro inesperado ao buscar detalhes do conteudo',
    }
  }
}

/**
 * Delete lesson content by ID
 *
 * Deletes a lesson content record. Only admins can delete content.
 * This action is irreversible.
 *
 * @param supabase - Supabase client instance
 * @param contentId - UUID of the lesson content to delete
 * @returns Object with success status and optional error
 *
 * @example
 * const result = await deleteLessonContent(supabase, 'content-uuid')
 * if (result.success) {
 *   console.log('Content deleted')
 * }
 */
export async function deleteLessonContent(
  supabase: SupabaseClient<Database>,
  contentId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('conteudo_aula').delete().eq('id', contentId)

    if (error) {
      logger.error('Error deleting lesson content', error, {
        feature: 'lesson-content',
        action: 'delete_failed',
        metadata: { contentId },
      })

      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Conteudo da aula nao encontrado',
        }
      }

      return {
        success: false,
        error: 'Erro ao excluir conteudo da aula',
      }
    }

    logger.info('Lesson content deleted successfully', {
      feature: 'lesson-content',
      action: 'deleted',
      metadata: { contentId },
    })

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    logger.error('Exception in deleteLessonContent', error as Error, {
      feature: 'lesson-content',
      action: 'delete_exception',
    })
    return {
      success: false,
      error: 'Erro inesperado ao excluir conteudo da aula',
    }
  }
}

/**
 * Get BNCC skills used in a class over a period
 *
 * Aggregates all BNCC skills used in lesson content for a class,
 * useful for curriculum tracking and reporting.
 *
 * @param supabase - Supabase client instance
 * @param turmaId - UUID of the class
 * @param dateFrom - Start date (optional)
 * @param dateTo - End date (optional)
 * @returns Object with skills array and count
 *
 * @example
 * const result = await getBNNCSkillsUsed(supabase, 'turma-uuid', '2025-02-01', '2025-02-28')
 * console.log(result.skills) // ['EF01MA06', 'EF01MA08', ...]
 */
export async function getBNNCSkillsUsed(
  supabase: SupabaseClient<Database>,
  turmaId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  data: { skills: string[]; skillCounts: Record<string, number> } | null
  error: string | null
}> {
  try {
    let query = supabase
      .from('vw_conteudo_aula_detalhado')
      .select('habilidades_bncc')
      .eq('turma_id', turmaId)

    if (dateFrom) {
      query = query.gte('data_aula', dateFrom)
    }

    if (dateTo) {
      query = query.lte('data_aula', dateTo)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching BNCC skills used', error, {
        feature: 'lesson-content',
        action: 'get_skills_failed',
        metadata: { turmaId },
      })
      return {
        data: null,
        error: 'Erro ao buscar habilidades BNCC utilizadas',
      }
    }

    // Aggregate skills and count occurrences
    const skillCounts: Record<string, number> = {}
    data?.forEach((record: any) => {
      if (record.habilidades_bncc) {
        record.habilidades_bncc.forEach((skill: string) => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1
        })
      }
    })

    const skills = Object.keys(skillCounts).sort()

    return {
      data: { skills, skillCounts },
      error: null,
    }
  } catch (error) {
    logger.error('Exception in getBNNCSkillsUsed', error as Error, {
      feature: 'lesson-content',
      action: 'get_skills_exception',
    })
    return {
      data: null,
      error: 'Erro inesperado ao buscar habilidades BNCC',
    }
  }
}
