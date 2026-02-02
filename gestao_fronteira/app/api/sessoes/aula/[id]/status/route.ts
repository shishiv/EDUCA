/**
 * Enhanced Session Status Management API
 * Handles three-phase workflow transitions with Brazilian legal compliance
 * PUT /api/sessoes/aula/[id]/status
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

// Validation schemas
const SessionParamsSchema = z.object({
  id: z.string().uuid('ID da sessão inválido')
})

const StatusUpdateSchema = z.object({
  status: z.enum(['PLANEJADA', 'ABERTA', 'FECHADA', 'CANCELADA'], {
    errorMap: () => ({ message: 'Status deve ser: PLANEJADA, ABERTA, FECHADA ou CANCELADA' })
  }),
  conteudo_ministrado: z.string()
    .min(10, 'Conteúdo ministrado deve ter pelo menos 10 caracteres')
    .max(1000, 'Conteúdo ministrado muito longo (máximo 1000 caracteres)')
    .optional(),
  observacoes_fechamento: z.string()
    .max(500, 'Observações muito longas (máximo 500 caracteres)')
    .optional(),
  motivo_cancelamento: z.string()
    .min(5, 'Motivo do cancelamento deve ter pelo menos 5 caracteres')
    .max(500, 'Motivo muito longo (máximo 500 caracteres)')
    .optional()
})

// Validate authentication
async function validateAuth(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Não autorizado')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, tipo_usuario, escola_id, nome')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new Error('Perfil do usuário não encontrado')
  }

  return { user, profile }
}

// Validate session access permissions
async function validateSessionAccess(supabase: any, sessionId: string, profile: any) {
  const { data: session, error } = await supabase
    .from('sessoes_aula')
    .select(`
      id,
      turma_id,
      professor_id,
      escola_id,
      status,
      data_aula,
      hash_legal,
      conteudo_programatico
    `)
    .eq('id', sessionId)
    .single()

  if (error || !session) {
    throw new Error('Sessao nao encontrada')
  }

  // Access control validation
  if (profile.tipo_usuario === 'professor') {
    if (session.professor_id !== profile.id) {
      throw new Error('Voce so pode modificar suas proprias sessoes')
    }
  } else if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
    // Use escola_id directly from sessoes_aula
    if (session.escola_id !== profile.escola_id) {
      throw new Error('Voce so pode modificar sessoes da sua escola')
    }
  } else if (profile.tipo_usuario !== 'admin') {
    throw new Error('Permissoes insuficientes para modificar esta sessao')
  }

  return session
}

// Validate status transitions according to Brazilian educational workflow
function validateStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'PLANEJADA': ['ABERTA', 'CANCELADA'],
    'ABERTA': ['FECHADA', 'CANCELADA'],
    'FECHADA': [], // Cannot transition from closed state (não existe o esquecer)
    'CANCELADA': [] // Cannot transition from cancelled state
  }

  return validTransitions[currentStatus]?.includes(newStatus) ?? false
}

// Generate legal compliance hash for closed sessions
function generateLegalHash(sessionData: any): string {
  const hashInput = [
    sessionData.turma_id,
    sessionData.professor_id,
    sessionData.data_aula,
    sessionData.aberta_em || sessionData.created_at,
    sessionData.fechada_em || new Date().toISOString(),
    sessionData.conteudo_programatico || ''
  ].join('|')

  // In production, use crypto.subtle.digest with SHA-256
  // For now, simulate hash generation
  return require('crypto')
    .createHash('sha256')
    .update(hashInput)
    .digest('hex')
}

/**
 * PUT /api/sessoes/aula/[id]/status
 * Update session status with legal compliance validation
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { profile } = await validateAuth(supabase)
    const { id } = await params

    // Validate request parameters
    const validatedParams = SessionParamsSchema.parse({ id })
    const body = await request.json()
    const validatedData = StatusUpdateSchema.parse(body)

    // Get current session and validate access
    const session = await validateSessionAccess(supabase, validatedParams.id, profile)

    // Validate status transition
    if (!validateStatusTransition(session.status, validatedData.status)) {
      return NextResponse.json({
        error: `Transição inválida de ${session.status} para ${validatedData.status}`,
        valid_transitions: getValidTransitions(session.status),
        code: 'INVALID_TRANSITION'
      }, { status: 400 })
    }

    // Check for "não existe o esquecer" principle
    if (session.status === 'FECHADA' && session.hash_legal) {
      return NextResponse.json({
        error: 'Não é possível modificar sessões já fechadas (princípio "não existe o esquecer")',
        code: 'SESSION_IMMUTABLE'
      }, { status: 403 })
    }

    // Prepare update data based on status transition
    const updateData = await prepareUpdateData(session, validatedData, supabase)

    // Perform the status update
    const { data: updatedSession, error: updateError } = await supabase
      .from('sessoes_aula')
      .update(updateData)
      .eq('id', validatedParams.id)
      .select(`
        id,
        turma_id,
        professor_id,
        disciplina_id,
        data_aula,
        status,
        created_at,
        aberta_em,
        fechada_em,
        cancelada_em,
        conteudo_programatico,
        observacoes_fechamento,
        hash_legal,
        tempo_total_aula,
        auto_fechamento_agendado,
        turmas:turma_id (
          nome,
          ano_letivo
        ),
        users:professor_id (
          nome
        ),
        disciplinas:disciplina_id (
          nome,
          codigo
        )
      `)
      .single()

    if (updateError) {
      logger.error('Erro ao atualizar status da sessao:', updateError?.message || 'Unknown error')
      throw new Error('Falha ao atualizar status da sessao')
    }

    // Log the status change
    logger.info(`Status da sessão ${validatedParams.id} alterado de ${session.status} para ${validatedData.status}`)

    // Type-safe access to updatedSession
    const sessionData = updatedSession as {
      id: string
      turma_id: string
      professor_id: string
      disciplina_id: string | null
      data_aula: string
      status: string
      created_at: string | null
      aberta_em: string | null
      fechada_em: string | null
      cancelada_em: string | null
      conteudo_programatico: string
      observacoes_fechamento: string | null
      hash_legal: string | null
      tempo_total_aula: unknown
      auto_fechamento_agendado: string | null
      turmas: { nome: string; ano_letivo: number } | null
      users: { nome: string } | null
      disciplinas: { nome: string; codigo: string } | null
    }

    // Return success response with workflow information
    return NextResponse.json({
      success: true,
      message: getStatusChangeMessage(session.status, validatedData.status),
      session: {
        ...sessionData,
        compliance_status: getComplianceStatus(sessionData),
        can_modify: canModifySession(sessionData),
        workflow_status: {
          previous_phase: session.status,
          current_phase: validatedData.status,
          next_allowed_transitions: getValidTransitions(validatedData.status),
          legal_compliance: sessionData.hash_legal ? 'compliant' : 'pending'
        },
        audit_info: {
          changed_by: profile.nome,
          changed_at: new Date().toISOString(),
          change_type: getChangeType(session.status, validatedData.status)
        }
      }
    })

  } catch (error) {
    logger.error('Erro no endpoint de status da sessao:', error instanceof Error ? error.message : String(error))

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

// Helper function to prepare update data based on status transition
async function prepareUpdateData(session: any, validatedData: any, supabase: any) {
  const updateData: any = {
    status: validatedData.status
  }

  switch (validatedData.status) {
    case 'ABERTA':
      updateData.aberta_em = new Date().toISOString()
      // Auto-closure is already set during creation
      break

    case 'FECHADA':
      updateData.fechada_em = new Date().toISOString()

      // Content is required for closing - use conteudo_programatico
      if (validatedData.conteudo_ministrado) {
        updateData.conteudo_programatico = validatedData.conteudo_ministrado
      }

      if (validatedData.observacoes_fechamento) {
        updateData.observacoes_fechamento = validatedData.observacoes_fechamento
      }

      // Generate legal compliance hash
      const hashData = {
        ...session,
        ...updateData,
        conteudo_programatico: validatedData.conteudo_ministrado || session.conteudo_programatico
      }
      updateData.hash_legal = generateLegalHash(hashData)
      break

    case 'CANCELADA':
      updateData.cancelada_em = new Date().toISOString()

      if (validatedData.motivo_cancelamento) {
        updateData.observacoes_fechamento = `CANCELADA: ${validatedData.motivo_cancelamento}`
      }
      break
  }

  return updateData
}

// Helper functions
function getValidTransitions(status: string): string[] {
  const transitions: Record<string, string[]> = {
    'PLANEJADA': ['ABERTA', 'CANCELADA'],
    'ABERTA': ['FECHADA', 'CANCELADA'],
    'FECHADA': [],
    'CANCELADA': []
  }
  return transitions[status] || []
}

function getStatusChangeMessage(oldStatus: string, newStatus: string): string {
  const messages: Record<string, Record<string, string>> = {
    'PLANEJADA': {
      'ABERTA': 'Aula aberta com sucesso. A chamada pode ser realizada.',
      'CANCELADA': 'Sessão cancelada com sucesso.'
    },
    'ABERTA': {
      'FECHADA': 'Aula fechada com sucesso. Registro legal criado.',
      'CANCELADA': 'Sessão cancelada durante a aula.'
    }
  }
  return messages[oldStatus]?.[newStatus] || 'Status atualizado com sucesso'
}

function getComplianceStatus(session: any): string {
  if (session.status === 'FECHADA' && session.hash_legal) {
    return 'compliant'
  }
  if (session.status === 'CANCELADA') {
    return 'cancelled'
  }
  if (session.status === 'ABERTA') {
    return 'active'
  }
  return 'pending'
}

function canModifySession(session: any): boolean {
  return session.status !== 'FECHADA' && !session.hash_legal
}

function getChangeType(oldStatus: string, newStatus: string): string {
  if (oldStatus === 'PLANEJADA' && newStatus === 'ABERTA') return 'session_opened'
  if (oldStatus === 'ABERTA' && newStatus === 'FECHADA') return 'session_closed'
  if (newStatus === 'CANCELADA') return 'session_cancelled'
  return 'status_changed'
}

function getErrorCode(message: string): string {
  if (message.includes('autorizado')) return 'UNAUTHORIZED'
  if (message.includes('encontrado')) return 'NOT_FOUND'
  if (message.includes('Permissões')) return 'INSUFFICIENT_PERMISSIONS'
  return 'BUSINESS_RULE_VIOLATION'
}