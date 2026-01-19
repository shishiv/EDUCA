/**
 * Single Vivencia API Routes
 * GET /api/vivencias/[id] - Get single vivencia
 * PUT /api/vivencias/[id] - Update vivencia
 * DELETE /api/vivencias/[id] - Delete vivencia
 *
 * @see lib/api/vivencias.ts for VivenciasApiService
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { vivenciasApi, UpdateVivenciaInput } from '@/lib/api/vivencias'
import { VIVENCIA_VALIDATION, VIVENCIA_ERROR_MESSAGES } from '@/types/diario-infantil'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ParamsSchema = z.object({
  id: z.string().uuid('ID da vivência inválido')
})

const UpdateVivenciaSchema = z.object({
  campos_experiencia: z.array(
    z.enum(['eu', 'corpo', 'tracos', 'escuta', 'espacos'], {
      errorMap: () => ({ message: 'Campo de experiência inválido' })
    })
  ).min(VIVENCIA_VALIDATION.minCamposSelected, VIVENCIA_ERROR_MESSAGES.noCampoSelected).optional(),
  descricao: z.string()
    .min(VIVENCIA_VALIDATION.minDescricaoLength, VIVENCIA_ERROR_MESSAGES.descricaoTooShort)
    .max(VIVENCIA_VALIDATION.maxDescricaoLength, VIVENCIA_ERROR_MESSAGES.descricaoTooLong)
    .optional(),
  observacoes: z.string()
    .max(VIVENCIA_VALIDATION.maxObservacoesLength, VIVENCIA_ERROR_MESSAGES.observacoesTooLong)
    .optional()
    .nullable()
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function validateAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Não autorizado')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, tipo_usuario, escola_id, nome_completo')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new Error('Perfil do usuário não encontrado')
  }

  return { user, profile }
}

async function validateVivenciaOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  vivenciaId: string,
  profile: { id: string; tipo_usuario: string; escola_id: string | null }
) {
  // Get vivencia with turma info for access control
  const { data: vivencia, error } = await supabase
    .from('vivencias')
    .select(`
      id,
      professor_id,
      turma_id,
      turmas:turma_id (
        escola_id
      )
    `)
    .eq('id', vivenciaId)
    .single()

  if (error || !vivencia) {
    return { valid: false, error: 'Vivência não encontrada', status: 404 }
  }

  // Access control validation
  if (profile.tipo_usuario === 'professor') {
    if (vivencia.professor_id !== profile.id) {
      return {
        valid: false,
        error: 'Você só pode modificar suas próprias vivências',
        status: 403
      }
    }
  } else if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
    const turmaEscolaId = (vivencia.turmas as unknown as { escola_id: string })?.escola_id
    if (turmaEscolaId !== profile.escola_id) {
      return {
        valid: false,
        error: 'Você só pode modificar vivências da sua escola',
        status: 403
      }
    }
  } else if (profile.tipo_usuario !== 'admin') {
    return {
      valid: false,
      error: 'Permissões insuficientes para modificar esta vivência',
      status: 403
    }
  }

  return { valid: true, vivencia }
}

function getErrorCode(message: string): string {
  if (message.includes('autorizado')) return 'UNAUTHORIZED'
  if (message.includes('encontrado')) return 'NOT_FOUND'
  if (message.includes('Permissões') || message.includes('modificar')) return 'INSUFFICIENT_PERMISSIONS'
  return 'BUSINESS_RULE_VIOLATION'
}

// ============================================================================
// GET /api/vivencias/[id]
// ============================================================================

/**
 * GET /api/vivencias/[id]
 * Returns a single vivencia by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    await validateAuth(supabase)

    const { id } = await params
    const validatedParams = ParamsSchema.parse({ id })

    const vivencia = await vivenciasApi.getById(validatedParams.id)

    if (!vivencia) {
      return NextResponse.json({
        error: 'Vivência não encontrada',
        code: 'NOT_FOUND'
      }, { status: 404 })
    }

    return NextResponse.json({
      data: vivencia
    })

  } catch (error) {
    logger.error('Error in GET /api/vivencias/[id]:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'ID inválido',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })),
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    if (error instanceof Error) {
      const statusCode = error.message.includes('autorizado') ? 401 :
                        error.message.includes('encontrado') ? 404 : 400

      return NextResponse.json({
        error: error.message,
        code: getErrorCode(error.message)
      }, { status: statusCode })
    }

    return NextResponse.json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// ============================================================================
// PUT /api/vivencias/[id]
// ============================================================================

/**
 * PUT /api/vivencias/[id]
 * Updates an existing vivencia
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { profile } = await validateAuth(supabase)

    const { id } = await params
    const validatedParams = ParamsSchema.parse({ id })

    // Validate ownership
    const ownershipCheck = await validateVivenciaOwnership(
      supabase,
      validatedParams.id,
      profile
    )

    if (!ownershipCheck.valid) {
      return NextResponse.json({
        error: ownershipCheck.error,
        code: getErrorCode(ownershipCheck.error || '')
      }, { status: ownershipCheck.status })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = UpdateVivenciaSchema.parse(body)

    // Check if there's anything to update
    if (!validatedData.campos_experiencia && !validatedData.descricao && validatedData.observacoes === undefined) {
      return NextResponse.json({
        error: 'Nenhum campo para atualizar',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    // Build update input
    const updateInput: UpdateVivenciaInput = {}
    if (validatedData.campos_experiencia) {
      updateInput.campos_experiencia = validatedData.campos_experiencia
    }
    if (validatedData.descricao) {
      updateInput.descricao = validatedData.descricao
    }
    if (validatedData.observacoes !== undefined) {
      updateInput.observacoes = validatedData.observacoes || undefined
    }

    const vivencia = await vivenciasApi.update(validatedParams.id, updateInput)

    logger.info('Vivencia updated via API', {
      feature: 'diario-infantil',
      action: 'api_update_vivencia',
      userId: profile.id,
      metadata: {
        vivencia_id: validatedParams.id,
        updated_fields: Object.keys(updateInput)
      }
    })

    return NextResponse.json({
      data: vivencia
    })

  } catch (error) {
    logger.error('Error in PUT /api/vivencias/[id]:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Dados de entrada inválidos',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })),
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    if (error instanceof Error) {
      const statusCode = error.message.includes('autorizado') ? 401 :
                        error.message.includes('encontrado') ? 404 :
                        error.message.includes('Permissões') || error.message.includes('modificar') ? 403 : 400

      return NextResponse.json({
        error: error.message,
        code: getErrorCode(error.message)
      }, { status: statusCode })
    }

    return NextResponse.json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// ============================================================================
// DELETE /api/vivencias/[id]
// ============================================================================

/**
 * DELETE /api/vivencias/[id]
 * Deletes a vivencia
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { profile } = await validateAuth(supabase)

    const { id } = await params
    const validatedParams = ParamsSchema.parse({ id })

    // Validate ownership
    const ownershipCheck = await validateVivenciaOwnership(
      supabase,
      validatedParams.id,
      profile
    )

    if (!ownershipCheck.valid) {
      return NextResponse.json({
        error: ownershipCheck.error,
        code: getErrorCode(ownershipCheck.error || '')
      }, { status: ownershipCheck.status })
    }

    await vivenciasApi.delete(validatedParams.id)

    logger.info('Vivencia deleted via API', {
      feature: 'diario-infantil',
      action: 'api_delete_vivencia',
      userId: profile.id,
      metadata: { vivencia_id: validatedParams.id }
    })

    return new NextResponse(null, { status: 204 })

  } catch (error) {
    logger.error('Error in DELETE /api/vivencias/[id]:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'ID inválido',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })),
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    if (error instanceof Error) {
      const statusCode = error.message.includes('autorizado') ? 401 :
                        error.message.includes('encontrado') ? 404 :
                        error.message.includes('Permissões') || error.message.includes('modificar') ? 403 : 400

      return NextResponse.json({
        error: error.message,
        code: getErrorCode(error.message)
      }, { status: statusCode })
    }

    return NextResponse.json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}
