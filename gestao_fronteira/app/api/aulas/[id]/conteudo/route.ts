/**
 * Lesson Content API Route
 * Brazilian Educational Compliance: BNCC-Aligned Lesson Planning
 *
 * Task Group 2.1: API and Types for Lesson Content
 * OpenSpec Change: 2025-12-04-diario-de-classe
 *
 * Endpoints:
 * - GET /api/aulas/[id]/conteudo - Get lesson content for a session
 * - POST /api/aulas/[id]/conteudo - Create lesson content for a session
 * - PATCH /api/aulas/[id]/conteudo - Update lesson content for a session
 *
 * BNCC Reference: Base Nacional Comum Curricular
 * - EF: Ensino Fundamental (Elementary School)
 * - EI: Educacao Infantil (Early Childhood Education)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  createLessonContent,
  updateLessonContent,
  getLessonContentBySession,
} from '@/lib/api/lesson-content'
import {
  BNCC_SKILL_CODE_PATTERN,
  LESSON_CONTENT_VALIDATION,
} from '@/types/lesson-content'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for creating lesson content
 */
const CreateLessonContentSchema = z.object({
  tema: z
    .string()
    .min(
      LESSON_CONTENT_VALIDATION.minTemaLength,
      `Tema deve ter pelo menos ${LESSON_CONTENT_VALIDATION.minTemaLength} caracteres`
    )
    .max(
      LESSON_CONTENT_VALIDATION.maxTemaLength,
      `Tema deve ter no maximo ${LESSON_CONTENT_VALIDATION.maxTemaLength} caracteres`
    ),
  objetivo: z
    .string()
    .min(
      LESSON_CONTENT_VALIDATION.minObjetivoLength,
      `Objetivo deve ter pelo menos ${LESSON_CONTENT_VALIDATION.minObjetivoLength} caracteres`
    )
    .max(
      LESSON_CONTENT_VALIDATION.maxObjetivoLength,
      `Objetivo deve ter no maximo ${LESSON_CONTENT_VALIDATION.maxObjetivoLength} caracteres`
    ),
  habilidades_bncc: z
    .array(
      z.string().regex(BNCC_SKILL_CODE_PATTERN, 'Codigo BNCC invalido')
    )
    .max(
      LESSON_CONTENT_VALIDATION.maxHabilidadesBNCC,
      `Maximo de ${LESSON_CONTENT_VALIDATION.maxHabilidadesBNCC} habilidades BNCC`
    )
    .optional()
    .default([]),
  metodologia: z
    .string()
    .max(
      LESSON_CONTENT_VALIDATION.maxMetodologiaLength,
      `Metodologia deve ter no maximo ${LESSON_CONTENT_VALIDATION.maxMetodologiaLength} caracteres`
    )
    .optional(),
  recursos: z
    .string()
    .max(
      LESSON_CONTENT_VALIDATION.maxRecursosLength,
      `Recursos deve ter no maximo ${LESSON_CONTENT_VALIDATION.maxRecursosLength} caracteres`
    )
    .optional(),
  observacoes: z
    .string()
    .max(
      LESSON_CONTENT_VALIDATION.maxObservacoesLength,
      `Observacoes deve ter no maximo ${LESSON_CONTENT_VALIDATION.maxObservacoesLength} caracteres`
    )
    .optional(),
})

/**
 * Schema for updating lesson content
 */
const UpdateLessonContentSchema = z.object({
  tema: z
    .string()
    .min(
      LESSON_CONTENT_VALIDATION.minTemaLength,
      `Tema deve ter pelo menos ${LESSON_CONTENT_VALIDATION.minTemaLength} caracteres`
    )
    .max(
      LESSON_CONTENT_VALIDATION.maxTemaLength,
      `Tema deve ter no maximo ${LESSON_CONTENT_VALIDATION.maxTemaLength} caracteres`
    )
    .optional(),
  objetivo: z
    .string()
    .min(
      LESSON_CONTENT_VALIDATION.minObjetivoLength,
      `Objetivo deve ter pelo menos ${LESSON_CONTENT_VALIDATION.minObjetivoLength} caracteres`
    )
    .max(
      LESSON_CONTENT_VALIDATION.maxObjetivoLength,
      `Objetivo deve ter no maximo ${LESSON_CONTENT_VALIDATION.maxObjetivoLength} caracteres`
    )
    .optional(),
  habilidades_bncc: z
    .array(
      z.string().regex(BNCC_SKILL_CODE_PATTERN, 'Codigo BNCC invalido')
    )
    .max(
      LESSON_CONTENT_VALIDATION.maxHabilidadesBNCC,
      `Maximo de ${LESSON_CONTENT_VALIDATION.maxHabilidadesBNCC} habilidades BNCC`
    )
    .optional(),
  metodologia: z
    .string()
    .max(
      LESSON_CONTENT_VALIDATION.maxMetodologiaLength,
      `Metodologia deve ter no maximo ${LESSON_CONTENT_VALIDATION.maxMetodologiaLength} caracteres`
    )
    .optional(),
  recursos: z
    .string()
    .max(
      LESSON_CONTENT_VALIDATION.maxRecursosLength,
      `Recursos deve ter no maximo ${LESSON_CONTENT_VALIDATION.maxRecursosLength} caracteres`
    )
    .optional(),
  observacoes: z
    .string()
    .max(
      LESSON_CONTENT_VALIDATION.maxObservacoesLength,
      `Observacoes deve ter no maximo ${LESSON_CONTENT_VALIDATION.maxObservacoesLength} caracteres`
    )
    .optional(),
})

// ============================================================================
// ROUTE PARAMS TYPE
// ============================================================================

type RouteParams = {
  params: Promise<{ id: string }>
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate user authentication and get profile
 */
async function validateAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  // Get user profile with school information
  const { data: profile } = await supabase
    .from('users')
    .select('id, tipo_usuario, escola_id, nome')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new Error('User profile not found')
  }

  return { user, profile }
}

/**
 * Verify session exists and user has access
 */
async function verifySessionAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  profile: { id: string; tipo_usuario: string; escola_id: string | null }
) {
  const { data: session, error } = await supabase
    .from('sessoes_aula')
    .select(
      `
      id,
      professor_id,
      turma_id,
      status,
      turmas!inner(
        id,
        escola_id
      )
    `
    )
    .eq('id', sessionId)
    .single()

  if (error || !session) {
    return { authorized: false, session: null, error: 'Sessao de aula nao encontrada' }
  }

  const turma = session.turmas as any

  // Admin can access all sessions
  if (profile.tipo_usuario === 'admin') {
    return { authorized: true, session, error: null }
  }

  // Teacher can only access their own sessions
  if (profile.tipo_usuario === 'professor') {
    if (session.professor_id !== profile.id) {
      return { authorized: false, session: null, error: 'Acesso negado a esta sessao' }
    }
    return { authorized: true, session, error: null }
  }

  // Director/Secretary can access sessions from their school
  if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
    if (turma?.escola_id !== profile.escola_id) {
      return { authorized: false, session: null, error: 'Acesso negado a esta sessao' }
    }
    return { authorized: true, session, error: null }
  }

  return { authorized: false, session: null, error: 'Permissao insuficiente' }
}

// ============================================================================
// GET /api/aulas/[id]/conteudo
// Get lesson content for a session
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: sessionId } = await params
    const supabase = await createClient()

    // Validate authentication
    const { profile } = await validateAuth(supabase)

    // Verify session access
    const accessCheck = await verifySessionAccess(supabase, sessionId, profile)
    if (!accessCheck.authorized) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.error === 'Sessao de aula nao encontrada' ? 404 : 403 }
      )
    }

    // Get lesson content
    const result = await getLessonContentBySession(supabase, sessionId)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Return content (may be null if no content exists yet)
    return NextResponse.json({
      content: result.data,
      session_id: sessionId,
    })
  } catch (error) {
    logger.error('GET /api/aulas/[id]/conteudo error:', error as Error, {
      feature: 'lesson-content-api',
      action: 'get_error',
    })

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// ============================================================================
// POST /api/aulas/[id]/conteudo
// Create lesson content for a session
// ============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: sessionId } = await params
    const supabase = await createClient()

    // Validate authentication
    const { profile } = await validateAuth(supabase)

    // Verify session access
    const accessCheck = await verifySessionAccess(supabase, sessionId, profile)
    if (!accessCheck.authorized) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.error === 'Sessao de aula nao encontrada' ? 404 : 403 }
      )
    }

    // Only teachers and admins can create content
    if (!['admin', 'professor'].includes(profile.tipo_usuario)) {
      return NextResponse.json(
        { error: 'Apenas professores podem criar conteudo de aula' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = CreateLessonContentSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Dados invalidos',
          details: validationResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    // Create lesson content
    const result = await createLessonContent(supabase, {
      sessao_id: sessionId,
      ...validationResult.data,
    })

    if (result.error) {
      // Check for duplicate content error
      if (result.error.includes('Ja existe conteudo')) {
        return NextResponse.json({ error: result.error }, { status: 409 })
      }
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(
      {
        content: result.data,
        message: 'Conteudo da aula criado com sucesso',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('POST /api/aulas/[id]/conteudo error:', error as Error, {
      feature: 'lesson-content-api',
      action: 'create_error',
    })

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// ============================================================================
// PATCH /api/aulas/[id]/conteudo
// Update lesson content for a session
// ============================================================================

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: sessionId } = await params
    const supabase = await createClient()

    // Validate authentication
    const { profile } = await validateAuth(supabase)

    // Verify session access
    const accessCheck = await verifySessionAccess(supabase, sessionId, profile)
    if (!accessCheck.authorized) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.error === 'Sessao de aula nao encontrada' ? 404 : 403 }
      )
    }

    // Only teachers and admins can update content
    if (!['admin', 'professor'].includes(profile.tipo_usuario)) {
      return NextResponse.json(
        { error: 'Apenas professores podem atualizar conteudo de aula' },
        { status: 403 }
      )
    }

    // Get existing content
    const existingContent = await getLessonContentBySession(supabase, sessionId)
    if (!existingContent.data) {
      return NextResponse.json(
        { error: 'Conteudo da aula nao encontrado para esta sessao' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = UpdateLessonContentSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Dados invalidos',
          details: validationResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    // Check if there are any fields to update
    const updateData = validationResult.data
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo para atualizar' },
        { status: 400 }
      )
    }

    // Update lesson content
    const result = await updateLessonContent(
      supabase,
      existingContent.data.id,
      updateData
    )

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      content: result.data,
      message: 'Conteudo da aula atualizado com sucesso',
    })
  } catch (error) {
    logger.error('PATCH /api/aulas/[id]/conteudo error:', error as Error, {
      feature: 'lesson-content-api',
      action: 'update_error',
    })

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
