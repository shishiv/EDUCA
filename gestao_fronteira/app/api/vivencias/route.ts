/**
 * Vivencias Collection API Routes
 * GET /api/vivencias - List vivencias for a student
 * POST /api/vivencias - Create new vivencia
 *
 * @see lib/api/vivencias.ts for VivenciasApiService
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { vivenciasApi, CreateVivenciaInput } from '@/lib/api/vivencias'
import { VIVENCIA_VALIDATION, VIVENCIA_ERROR_MESSAGES, type CampoType } from '@/types/diario-infantil'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const GetQuerySchema = z.object({
  aluno_id: z.string().uuid('ID do aluno inválido'),
  limit: z.coerce.number().min(1).max(100).optional().default(50)
})

const validCampos: CampoType[] = ['eu', 'corpo', 'tracos', 'escuta', 'espacos']

const CreateVivenciaSchema = z.object({
  aluno_id: z.string().uuid('ID do aluno inválido'),
  turma_id: z.string().uuid('ID da turma inválido'),
  data_vivencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (AAAA-MM-DD)'),
  campos_experiencia: z.array(
    z.enum(['eu', 'corpo', 'tracos', 'escuta', 'espacos'], {
      errorMap: () => ({ message: 'Campo de experiência inválido' })
    })
  ).min(VIVENCIA_VALIDATION.minCamposSelected, VIVENCIA_ERROR_MESSAGES.noCampoSelected),
  descricao: z.string()
    .min(VIVENCIA_VALIDATION.minDescricaoLength, VIVENCIA_ERROR_MESSAGES.descricaoTooShort)
    .max(VIVENCIA_VALIDATION.maxDescricaoLength, VIVENCIA_ERROR_MESSAGES.descricaoTooLong),
  observacoes: z.string()
    .max(VIVENCIA_VALIDATION.maxObservacoesLength, VIVENCIA_ERROR_MESSAGES.observacoesTooLong)
    .optional(),
  escopo: z.enum(['individual', 'coletiva']).optional()
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

function getErrorCode(message: string): string {
  if (message.includes('autorizado')) return 'UNAUTHORIZED'
  if (message.includes('encontrado')) return 'NOT_FOUND'
  if (message.includes('Permissões')) return 'INSUFFICIENT_PERMISSIONS'
  return 'BUSINESS_RULE_VIOLATION'
}

// ============================================================================
// GET /api/vivencias
// ============================================================================

/**
 * GET /api/vivencias?aluno_id=X&limit=50
 * Returns vivencias for a specific student
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    await validateAuth(supabase)

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const queryParams = {
      aluno_id: searchParams.get('aluno_id'),
      limit: searchParams.get('limit')
    }

    // Validate query parameters
    if (!queryParams.aluno_id) {
      return NextResponse.json({
        error: 'Parâmetro aluno_id é obrigatório',
        code: 'MISSING_PARAMETER'
      }, { status: 400 })
    }

    const validatedQuery = GetQuerySchema.parse({
      aluno_id: queryParams.aluno_id,
      limit: queryParams.limit ? parseInt(queryParams.limit) : undefined
    })

    // Fetch vivencias
    const vivencias = await vivenciasApi.getByAluno(
      validatedQuery.aluno_id,
      validatedQuery.limit
    )

    return NextResponse.json({
      data: vivencias
    })

  } catch (error) {
    logger.error('Error in GET /api/vivencias:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Parâmetros inválidos',
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
// POST /api/vivencias
// ============================================================================

/**
 * POST /api/vivencias
 * Creates a new vivencia record
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { user, profile } = await validateAuth(supabase)

    // Parse and validate request body
    const body = await request.json()
    const validatedData = CreateVivenciaSchema.parse(body)

    // Validate that user has access to the turma
    const { data: turma, error: turmaError } = await supabase
      .from('turmas')
      .select('id, nome, escola_id, professor_id')
      .eq('id', validatedData.turma_id)
      .single()

    if (turmaError || !turma) {
      return NextResponse.json({
        error: 'Turma não encontrada',
        code: 'NOT_FOUND'
      }, { status: 404 })
    }

    // Access control: professor can only create for their classes
    if (profile.tipo_usuario === 'professor') {
      if (turma.professor_id !== profile.id) {
        return NextResponse.json({
          error: 'Você só pode criar vivências para suas próprias turmas',
          code: 'INSUFFICIENT_PERMISSIONS'
        }, { status: 403 })
      }
    } else if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
      if (turma.escola_id !== profile.escola_id) {
        return NextResponse.json({
          error: 'Você só pode criar vivências para turmas da sua escola',
          code: 'INSUFFICIENT_PERMISSIONS'
        }, { status: 403 })
      }
    } else if (profile.tipo_usuario !== 'admin') {
      return NextResponse.json({
        error: 'Permissões insuficientes para criar vivências',
        code: 'INSUFFICIENT_PERMISSIONS'
      }, { status: 403 })
    }

    // Validate that student belongs to the turma
    const { data: matricula, error: matriculaError } = await supabase
      .from('matriculas')
      .select('id')
      .eq('aluno_id', validatedData.aluno_id)
      .eq('turma_id', validatedData.turma_id)
      .eq('status', 'ativo')
      .single()

    if (matriculaError || !matricula) {
      return NextResponse.json({
        error: 'Aluno não está matriculado nesta turma',
        code: 'BUSINESS_RULE_VIOLATION'
      }, { status: 400 })
    }

    // Create the vivencia
    const createInput: CreateVivenciaInput = {
      aluno_id: validatedData.aluno_id,
      turma_id: validatedData.turma_id,
      professor_id: profile.id,
      data_vivencia: validatedData.data_vivencia,
      campos_experiencia: validatedData.campos_experiencia,
      descricao: validatedData.descricao,
      observacoes: validatedData.observacoes,
      escopo: validatedData.escopo
    }

    const vivencia = await vivenciasApi.create(createInput)

    logger.info('Vivencia created via API', {
      feature: 'diario-infantil',
      action: 'api_create_vivencia',
      userId: profile.id,
      metadata: {
        vivencia_id: vivencia.id,
        aluno_id: validatedData.aluno_id,
        turma_id: validatedData.turma_id
      }
    })

    return NextResponse.json({
      data: vivencia
    }, { status: 201 })

  } catch (error) {
    logger.error('Error in POST /api/vivencias:', error)

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
                        error.message.includes('Permissões') ? 403 : 400

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
