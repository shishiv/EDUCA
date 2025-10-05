/**
 * Enhanced "Abrir Aula" Endpoint - Session Opening
 * Implements the three-phase attendance workflow with Brazilian legal compliance
 * POST /api/sessoes-aula/abrir
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Validation schema for opening a session
const AbrirAulaSchema = z.object({
  turma_id: z.string().uuid('ID da turma inválido'),
  professor_id: z.string().uuid('ID do professor inválido'),
  disciplina_id: z.string().uuid('ID da disciplina inválido').optional(),
  data_aula: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (AAAA-MM-DD)'),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:MM)').optional(),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:MM)').optional(),
  observacoes: z.string().max(500, 'Observações muito longas (máximo 500 caracteres)').optional()
})

// Create Supabase client with proper cookie handling
async function createSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

// Validate user authentication and permissions
async function validateAuth(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Não autorizado')
  }

  // Get user profile with school information
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

// Validate business rules for session creation
async function validateSessionCreation(supabase: any, data: any, profile: any) {
  // Check if turma exists and user has access
  const { data: turma, error: turmaError } = await supabase
    .from('turmas')
    .select('id, nome, escola_id, professor_id, ano_letivo')
    .eq('id', data.turma_id)
    .single()

  if (turmaError || !turma) {
    throw new Error('Turma não encontrada')
  }

  // Access control validation
  if (profile.tipo_usuario === 'professor') {
    if (turma.professor_id !== profile.id) {
      throw new Error('Você só pode criar sessões para suas próprias turmas')
    }
  } else if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
    if (turma.escola_id !== profile.escola_id) {
      throw new Error('Você só pode criar sessões para turmas da sua escola')
    }
  } else if (profile.tipo_usuario !== 'admin') {
    throw new Error('Permissões insuficientes para criar sessões')
  }

  // Check for existing session on the same date
  const { data: existingSession } = await supabase
    .from('sessoes_aula')
    .select('id, status')
    .eq('turma_id', data.turma_id)
    .eq('data_aula', data.data_aula)
    .single()

  if (existingSession) {
    throw new Error(`Já existe uma sessão para esta turma em ${data.data_aula}`)
  }

  // Validate date constraints
  const sessionDate = new Date(data.data_aula)
  const today = new Date()
  const maxFutureDate = new Date()
  maxFutureDate.setDate(maxFutureDate.getDate() + 30)

  if (sessionDate > maxFutureDate) {
    throw new Error('Não é possível criar sessões com mais de 30 dias de antecedência')
  }

  // Validate academic calendar (if session date is too far in the past)
  const minPastDate = new Date()
  minPastDate.setDate(minPastDate.getDate() - 7)

  if (sessionDate < minPastDate) {
    throw new Error('Não é possível criar sessões com mais de 7 dias no passado')
  }

  return turma
}

// Calculate auto-closure time (6 PM São Paulo time)
function calculateAutoClosureTime(sessionDate: string): string {
  const date = new Date(sessionDate)

  // Set to 6 PM São Paulo time (UTC-3)
  const closureTime = new Date(date)
  closureTime.setUTCHours(21, 0, 0, 0) // 18:00 São Paulo = 21:00 UTC

  return closureTime.toISOString()
}

/**
 * POST /api/sessoes-aula/abrir
 * Creates a new session in PLANEJADA state with Brazilian compliance
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient()
    const { profile } = await validateAuth(supabase)

    // Parse and validate request body
    const body = await request.json()
    const validatedData = AbrirAulaSchema.parse(body)

    // Validate business rules
    const turma = await validateSessionCreation(supabase, validatedData, profile)

    // Calculate auto-closure time
    const autoClosureTime = calculateAutoClosureTime(validatedData.data_aula)

    // Create session with Brazilian compliance features
    const sessionData = {
      turma_id: validatedData.turma_id,
      professor_id: validatedData.professor_id,
      disciplina_id: validatedData.disciplina_id || null,
      data_aula: validatedData.data_aula,
      hora_inicio: validatedData.hora_inicio || null,
      hora_fim: validatedData.hora_fim || null,
      status: 'PLANEJADA', // Always start in planning phase
      auto_fechamento_agendado: autoClosureTime,
      conteudo_ministrado: validatedData.observacoes || null,
      criada_em: new Date().toISOString()
    }

    const { data: newSession, error: insertError } = await supabase
      .from('sessoes_aula')
      .insert(sessionData)
      .select(`
        id,
        turma_id,
        professor_id,
        disciplina_id,
        data_aula,
        hora_inicio,
        hora_fim,
        status,
        auto_fechamento_agendado,
        criada_em,
        aberta_em,
        fechada_em,
        conteudo_ministrado,
        tempo_total_aula,
        turmas:turma_id (
          id,
          nome,
          ano_letivo,
          escola_id
        ),
        users:professor_id (
          id,
          nome_completo
        ),
        disciplinas:disciplina_id (
          id,
          nome,
          codigo
        )
      `)
      .single()

    if (insertError) {
      logger.error('Erro ao criar sessão', { error: insertError, turma_id: validatedData.turma_id, professor_id: validatedData.professor_id })

      // Handle specific database errors
      if (insertError.code === '23505') { // Unique constraint violation
        return NextResponse.json({
          error: 'Já existe uma sessão para esta turma nesta data',
          code: 'DUPLICATE_SESSION'
        }, { status: 409 })
      }

      if (insertError.code === '23503') { // Foreign key violation
        return NextResponse.json({
          error: 'Referência inválida (turma, professor ou disciplina não encontrada)',
          code: 'INVALID_REFERENCE'
        }, { status: 400 })
      }

      throw new Error('Falha ao criar sessão no banco de dados')
    }

    // Log successful session creation
    logger.info('Sessão criada com sucesso', { session_id: newSession.id, turma: turma.nome, professor_id: profile.id })

    // Return success response with enhanced session data
    return NextResponse.json({
      success: true,
      message: 'Sessão criada com sucesso',
      session: {
        ...newSession,
        compliance_status: 'criada',
        can_modify: true,
        auto_closure_info: {
          scheduled_time: autoClosureTime,
          sao_paulo_timezone: 'America/Sao_Paulo',
          closure_hour: '18:00'
        },
        workflow_status: {
          current_phase: 'PLANEJADA',
          next_allowed_transitions: ['ABERTA', 'CANCELADA'],
          legal_compliance: 'pending'
        }
      }
    }, { status: 201 })

  } catch (error) {
    logger.error('Erro no endpoint abrir aula', { error })

    // Handle validation errors
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

    // Handle business logic errors
    if (error instanceof Error) {
      const statusCode = error.message.includes('autorizado') ? 401 :
                        error.message.includes('encontrado') ? 404 :
                        error.message.includes('Permissões') ? 403 :
                        error.message.includes('existe') ? 409 : 400

      return NextResponse.json({
        error: error.message,
        code: getErrorCode(error.message)
      }, { status: statusCode })
    }

    // Handle unexpected errors
    return NextResponse.json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// Helper function to generate error codes
function getErrorCode(message: string): string {
  if (message.includes('autorizado')) return 'UNAUTHORIZED'
  if (message.includes('encontrado')) return 'NOT_FOUND'
  if (message.includes('Permissões')) return 'INSUFFICIENT_PERMISSIONS'
  if (message.includes('existe')) return 'DUPLICATE_SESSION'
  if (message.includes('antecedência')) return 'FUTURE_DATE_LIMIT'
  if (message.includes('passado')) return 'PAST_DATE_LIMIT'
  return 'BUSINESS_RULE_VIOLATION'
}